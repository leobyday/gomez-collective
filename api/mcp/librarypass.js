const { CATALOG, RECOMMENDATIONS, CATEGORIES } = require('../../lib/librarypass/catalog')
const npm = require('../../lib/librarypass/npm')
const { fetchComponentDocs, getConfigureCode } = require('../../lib/librarypass/docs')
const { PostHog } = require('posthog-node')

// ── Analytics ─────────────────────────────────────────────────────────────────
// Fires server-side events to PostHog. POSTHOG_API_KEY set in Vercel env vars.
// Uses a distinct_id of 'anonymous' for Alpha (no user auth yet).
// flushAt:1 + shutdownAsync() ensures events send before Vercel kills the function.
let _ph = null
function getPostHog() {
  if (!_ph && process.env.POSTHOG_API_KEY) {
    _ph = new PostHog(process.env.POSTHOG_API_KEY, {
      host: 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return _ph
}

async function track(event, properties = {}) {
  const ph = getPostHog()
  if (!ph) return
  try {
    ph.capture({ distinctId: properties.ip || 'anonymous', event, properties: { source: 'librarypass', ...properties } })
    await ph.shutdownAsync()
  } catch (_) {}
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// Currently unenforced — every request gets free/anonymous access.
// Structure is ready: swap the return value for a real DB lookup when needed.
//
// To activate paid tiers:
// 1. Create an api_keys table: (id, key, user_id, tier, created_at, last_used_at)
// 2. Choose a store: Supabase, PlanetScale, Upstash, or any KV
// 3. Replace the stub below with a lookup, e.g.:
//    const token = req.headers.authorization?.replace('Bearer ', '')
//    if (!token) return { user: null, tier: 'free', error: null }
//    const row = await db.from('api_keys').select('user_id,tier').eq('key', token).single()
//    if (!row) return { user: null, tier: null, error: 'Invalid API key' }
//    return { user: row.user_id, tier: row.tier, error: null }
function authenticate(req) {
  return { user: 'anonymous', tier: 'free', error: null }
}

// ── Rate limiting (in-memory, per cold-start) ─────────────────────────────────
// Resets on function restart. Upgrade to Upstash Redis for persistent limiting.
const _rateMap = new Map()
function isRateLimited(ip) {
  const now = Date.now()
  const window = 60_000  // 1 minute
  const limit  = 60      // requests per minute per IP
  const record = _rateMap.get(ip) || { count: 0, reset: now + window }
  if (now > record.reset) { record.count = 1; record.reset = now + window }
  else record.count++
  _rateMap.set(ip, record)
  return record.count > limit
}

// ── Input sanitization ────────────────────────────────────────────────────────
function sanitize(val, max = 120) {
  if (typeof val !== 'string') return ''
  return val.replace(/[<>"';\\]/g, '').trim().slice(0, max)
}

// ── Tool definitions (shown in Claude's tools/list) ───────────────────────────
const TOOLS = [
  {
    name: 'recommend',
    description: 'Get a curated library stack for a use case. Use this when you don\'t know which libraries to pick.',
    inputSchema: {
      type: 'object',
      properties: {
        use_case: {
          type: 'string',
          description: 'Describe your project, e.g. "mobile app", "dashboard", "landing page", "saas product", "forms", "ecommerce", "animation"',
        },
      },
      required: ['use_case'],
    },
  },
  {
    name: 'install',
    description: 'Get the full installation scaffold for a library — commands, config files, and a usage example.',
    inputSchema: {
      type: 'object',
      properties: {
        library:  { type: 'string', description: 'Library name, e.g. shadcn, tailwind, mui, framer, lucide, zustand' },
        options:  { type: 'string', description: 'Optional config flags, e.g. "icons only", "with dark mode", "TypeScript"' },
      },
      required: ['library'],
    },
  },
  {
    name: 'component',
    description: 'Get live documentation and usage examples for a specific component in a library.',
    inputSchema: {
      type: 'object',
      properties: {
        library:   { type: 'string', description: 'Library name, e.g. shadcn, mantine, mui' },
        component: { type: 'string', description: 'Component name, e.g. button, dialog, dropdown, table, form' },
      },
      required: ['library', 'component'],
    },
  },
  {
    name: 'list',
    description: 'Show all supported libraries, or all components within a specific library.',
    inputSchema: {
      type: 'object',
      properties: {
        library: { type: 'string', description: 'Optional: filter to a specific library\'s component list' },
      },
    },
  },
  {
    name: 'configure',
    description: 'Generate ready-to-paste configuration code for a library — themes, stroke width, dark mode, CSS variables.',
    inputSchema: {
      type: 'object',
      properties: {
        library: { type: 'string', description: 'Library name, e.g. lucide, tailwind, shadcn, mantine' },
        options: { type: 'string', description: 'What to configure, e.g. "stroke 1.5px", "dark mode", "custom theme colors"' },
      },
      required: ['library', 'options'],
    },
  },
  {
    name: 'request',
    description: 'Submit a request to add support for a new library.',
    inputSchema: {
      type: 'object',
      properties: {
        library:     { type: 'string', description: 'Library name you\'d like added' },
        description: { type: 'string', description: 'Optional: brief note on what you use it for' },
      },
      required: ['library'],
    },
  },
]

// ── MCP Prompts (appear as slash commands in Claude Code) ─────────────────────
const PROMPTS = [
  {
    name: 'recommend',
    description: 'Get a curated library stack for your project type',
    arguments: [
      { name: 'use_case', description: 'e.g. mobile app, dashboard, landing page, saas, forms, ecommerce', required: true },
    ],
  },
  {
    name: 'install',
    description: 'Scaffold a library with full setup — commands, config files, and usage examples',
    arguments: [
      { name: 'library', description: 'Library name, e.g. shadcn, tailwind, mui, framer, lucide', required: true },
      { name: 'options', description: 'Optional: icons only, dark mode, TypeScript, stroke 2px', required: false },
    ],
  },
  {
    name: 'component',
    description: 'Get live docs and usage examples for a specific component',
    arguments: [
      { name: 'library',   description: 'Library name, e.g. shadcn, mantine, mui', required: true },
      { name: 'component', description: 'Component name, e.g. button, dialog, dropdown', required: true },
    ],
  },
  {
    name: 'list',
    description: 'Show all supported libraries, or all components in a specific library',
    arguments: [
      { name: 'library', description: 'Optional: filter to a specific library', required: false },
    ],
  },
  {
    name: 'configure',
    description: 'Generate configuration code for a library — themes, stroke, dark mode',
    arguments: [
      { name: 'library', description: 'Library name, e.g. lucide, tailwind, shadcn', required: true },
      { name: 'options', description: 'What to configure, e.g. stroke 1.5px, dark mode, custom colors', required: true },
    ],
  },
  {
    name: 'request',
    description: 'Request support for a new library',
    arguments: [
      { name: 'library',     description: 'Library you\'d like added', required: true },
      { name: 'description', description: 'Optional: what you use it for', required: false },
    ],
  },
]

// ── Tool handlers ─────────────────────────────────────────────────────────────

function handleRecommend(args) {
  const query = sanitize(args.use_case || '').toLowerCase()

  // Find best matching use case
  const exactMatch = Object.entries(RECOMMENDATIONS).find(([key, rec]) =>
    key === query || rec.label.toLowerCase().includes(query) || query.includes(key)
  )

  if (exactMatch) {
    const [, rec] = exactMatch
    return {
      use_case: rec.label,
      description: rec.description,
      recommended_stack: rec.stack.map(({ key, reason }) => {
        const entry = CATALOG[key]
        return {
          library: entry?.display || key,
          package: entry?.package || key,
          category: CATEGORIES[entry?.category] || entry?.category,
          reason,
          install: `npm install ${entry?.package || key}`,
          homepage: entry?.homepage,
        }
      }),
      next_step: `Run /librarypass:install [library] to scaffold any of these — starting with the first one is usually the right call.`,
    }
  }

  // Fuzzy: return all options
  return {
    message: `No exact match for "${args.use_case}". Here are all available use cases:`,
    use_cases: Object.entries(RECOMMENDATIONS).map(([key, rec]) => ({
      key,
      label: rec.label,
      description: rec.description,
      libraries: rec.stack.map(s => CATALOG[s.key]?.display || s.key),
    })),
    tip: `Try: /librarypass:recommend dashboard — or describe your project and I'll pick the closest match.`,
  }
}

function handleInstall(args) {
  const key = npm.resolveKey(sanitize(args.library))
  const entry = CATALOG[key]

  if (!entry) {
    const suggestions = Object.entries(CATALOG)
      .filter(([k, e]) => k.includes(sanitize(args.library).toLowerCase()) || e.display.toLowerCase().includes(sanitize(args.library).toLowerCase()))
      .slice(0, 5)
      .map(([k, e]) => `${e.display} (${k})`)
    return {
      error: `Library "${args.library}" not found in Librarypass catalog.`,
      suggestions: suggestions.length ? suggestions : undefined,
      tip: 'Run /librarypass:list to see all supported libraries, or /librarypass:request to suggest one.',
    }
  }

  return {
    library: entry.display,
    package: entry.package,
    category: CATEGORIES[entry.category] || entry.category,
    description: entry.description,
    homepage: entry.homepage,
    requires: entry.requires?.length
      ? `Requires: ${entry.requires.join(', ')} — install those first if not already set up.`
      : null,
    commands: entry.install.commands,
    setup_steps: entry.install.setup,
    config_files: Object.keys(entry.install.configFiles || {}).length
      ? entry.install.configFiles
      : null,
    usage_example: entry.install.usage,
    note: entry.install.note || null,
    tip: `Run /librarypass:component ${key} [component-name] to get docs for a specific component.`,
  }
}

async function handleComponent(args) {
  const key   = npm.resolveKey(sanitize(args.library))
  const entry = CATALOG[key]
  const comp  = sanitize(args.component, 80)

  if (!entry) {
    return {
      error: `Library "${args.library}" not found. Run /librarypass:list to see supported libraries.`,
    }
  }

  // Check if component exists in catalog list (if the library has one)
  if (entry.components.length > 0) {
    const match = entry.components.find(c => c.toLowerCase() === comp.toLowerCase())
    if (!match) {
      const close = entry.components.filter(c =>
        c.toLowerCase().includes(comp.toLowerCase()) || comp.toLowerCase().includes(c.toLowerCase().slice(0, 4))
      ).slice(0, 5)
      return {
        error: `"${comp}" not found in ${entry.display}.`,
        did_you_mean: close.length ? close : undefined,
        all_components: entry.components,
        docs: entry.homepage,
      }
    }
  }

  // Fetch live docs
  const docs = await fetchComponentDocs(key, comp)

  return {
    library: entry.display,
    component: comp,
    source: docs?.source || 'catalog',
    docs_url: docs?.url || entry.homepage,
    content: docs?.content || `See full docs at ${entry.homepage}`,
  }
}

function handleList(args) {
  const filterKey = args.library ? npm.resolveKey(sanitize(args.library)) : null

  if (filterKey && CATALOG[filterKey]) {
    const entry = CATALOG[filterKey]
    return {
      library: entry.display,
      package: entry.package,
      description: entry.description,
      component_count: entry.components.length,
      components: entry.components.length
        ? entry.components
        : `${entry.display} doesn't have a fixed component list — it's a utility library. Check ${entry.homepage}`,
    }
  }

  // Full catalog grouped by category
  const grouped = {}
  for (const [key, entry] of Object.entries(CATALOG)) {
    const cat = CATEGORIES[entry.category] || entry.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push({
      key,
      library: entry.display,
      package: entry.package,
      description: entry.description,
    })
  }

  return {
    total: Object.keys(CATALOG).length,
    catalog: grouped,
    use_cases: Object.keys(RECOMMENDATIONS),
    tip: 'Run /librarypass:recommend [use case] to get a curated stack, or /librarypass:install [library] to get started.',
  }
}

function handleConfigure(args) {
  const key = npm.resolveKey(sanitize(args.library))
  const result = getConfigureCode(key, sanitize(args.options, 200))

  if (!result) {
    return {
      error: `Library "${args.library}" not found. Run /librarypass:list to see supported libraries.`,
    }
  }

  return result
}

function handleRequest(args) {
  const library = sanitize(args.library, 100)
  const description = sanitize(args.description || '', 300)

  const issueTitle = encodeURIComponent(`Add support for: ${library}`)
  const issueBody = encodeURIComponent(
    `**Library:** ${library}\n${description ? `**Use case:** ${description}\n` : ''}\n**npm:** https://www.npmjs.com/package/${library}`
  )
  const issueUrl = `https://github.com/leobyday/librarypass/issues/new?title=${issueTitle}&body=${issueBody}&labels=library-request`

  return {
    message: `Thanks for the request! "${library}" has been noted.`,
    library,
    what_happens_next: 'Requests are reviewed and added to the catalog when there\'s enough demand. Popular libraries are prioritized.',
    submit_request: issueUrl,
    currently_supported: Object.keys(CATALOG).length,
    tip: `In the meantime, Claude can help you install "${library}" manually — just ask: "How do I install ${library}?"`,
  }
}

// ── MCP protocol router ───────────────────────────────────────────────────────
async function handleMcp(body) {
  const { method, params, id } = body || {}
  const respond = (result) => ({ jsonrpc: '2.0', id: id ?? null, result })
  const error   = (code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })

  if (method === 'initialize') {
    return respond({
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'librarypass', version: '2.0.0' },
      capabilities: { tools: {}, prompts: {} },
    })
  }

  if (method === 'tools/list')   return respond({ tools: TOOLS })
  if (method === 'prompts/list') return respond({ prompts: PROMPTS })

  if (method === 'prompts/get') {
    const name = params?.name
    const args = params?.arguments || {}
    const prompt = PROMPTS.find(p => p.name === name)
    if (!prompt) return error(-32602, `Prompt "${name}" not found`)

    const text = {
      recommend: () => `Use the librarypass recommend tool with use_case: "${args.use_case || 'general'}"`,
      install:   () => `Use the librarypass install tool for library: "${args.library || ''}"${args.options ? `, options: "${args.options}"` : ''}`,
      component: () => `Use the librarypass component tool for library: "${args.library || ''}", component: "${args.component || ''}"`,
      list:      () => `Use the librarypass list tool${args.library ? ` with library: "${args.library}"` : ''}`,
      configure: () => `Use the librarypass configure tool for library: "${args.library || ''}", options: "${args.options || ''}"`,
      request:   () => `Use the librarypass request tool for library: "${args.library || ''}"${args.description ? `, description: "${args.description}"` : ''}`,
    }[name]

    return respond({
      description: prompt.description,
      messages: [{ role: 'user', content: { type: 'text', text: text ? text() : name } }],
    })
  }

  if (method === 'tools/call') {
    const name = params?.name
    const args = params?.arguments || {}
    if (!name) return error(-32602, 'Missing tool name')

    try {
      let result
      switch (name) {
        case 'recommend':  result = handleRecommend(args);       break
        case 'install':    result = handleInstall(args);          break
        case 'component':  result = await handleComponent(args); break
        case 'list':       result = handleList(args);             break
        case 'configure':  result = handleConfigure(args);        break
        case 'request':    result = handleRequest(args);          break
        default:           return error(-32601, `Unknown tool: ${name}`)
      }

      // Track tool call
      const library = sanitize(args.library || args.use_case || '')
      const isUnmatched = result?.error && result.error.includes('not found')
      await track('tool_called', { tool: name, library, ip: body._ip })
      if (isUnmatched) await track('query_unmatched', { tool: name, query: library, ip: body._ip })
      if (name === 'request') await track('request_submitted', { library, ip: body._ip })

      return respond({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] })
    } catch (err) {
      return error(-32603, err.message)
    }
  }

  return error(-32601, `Method not found: ${method}`)
}

// ── Landing page HTML ─────────────────────────────────────────────────────────
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Librarypass — Design Library MCP for Claude</title>
  <meta name="description" content="Connect Claude to live npm data for every major design library. Get accurate versions, components, Tailwind docs, and changelogs — always up to date.">
  <meta name="robots" content="noindex, nofollow">
  <meta name="keywords" content="MCP, Claude, Claude Code, design libraries, Tailwind, shadcn, Radix UI, Framer Motion, npm, AI tools for designers">
  <meta property="og:title" content="Librarypass — Design Library MCP for Claude">
  <meta property="og:description" content="Live design library data for Claude. Always current, never stale.">
  <meta property="og:url" content="https://gomezcollective.com/mcp/librarypass">
  <meta property="og:type" content="website">
  <link rel="canonical" href="https://gomezcollective.com/mcp/librarypass">
  <link rel="icon" href="/assets/librarypass/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/Emoji.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sorts+Mill+Goudy:ital@0;1&family=Jost:wght@300;400&family=Source+Code+Pro&family=Nabla&display=swap" rel="stylesheet">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Librarypass","applicationCategory":"DeveloperApplication","description":"MCP connector that gives Claude live access to React and UI library data — installation scaffolds, component docs, recommendations, and changelogs.","url":"https://gomezcollective.com/mcp/librarypass","provider":{"@type":"Organization","name":"Gomez Collective","url":"https://gomezcollective.com"},"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}</script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#ecf1f3;--surface:#ffffff;--text:#3d3838;--body:#706b6b;
      --olive:#847e65;--dim:#b8b7b7;--divider:#d9d9d9;--dark:#333333;
      --serif:'Sorts Mill Goudy',Georgia,serif;
      --sans:'Jost',sans-serif;--mono:'Source Code Pro',monospace;
    }
    @font-palette-values --nabla-sunset {
      font-family: 'Nabla';
      base-palette: 0;
      override-colors:
        0 #e070c8,
        1 #cc44b0,
        2 #a038c0,
        3 #7750e0,
        4 #5566e8,
        5 #3355cc,
        6 #0e1438,
        7 #cc60d0,
        8 #f0a0e0,
        9 #0a0e30,
        10 #8844cc,
        11 #bb55c8,
        12 #4455cc,
        13 #141840,
        14 #6644d0,
        15 #080c28;
    }

    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

    html,body{background:var(--bg);color:var(--text);font-family:var(--sans);font-weight:300;line-height:1.6;-webkit-font-smoothing:antialiased}

    .site-nav{display:flex;align-items:center;padding:18px 80px;border-bottom:1px solid var(--divider);background:var(--surface)}
    .nav-back{font-size:14px;font-weight:400;letter-spacing:.06em;color:var(--olive);text-decoration:none;opacity:.8;transition:opacity .2s}
    .nav-back:hover{opacity:1}

    .page{max-width:900px;margin:0 auto;padding:0 80px 100px}

    .hero{min-height:calc(100vh - 57px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 0;border-bottom:1px solid var(--divider)}
    .hero-eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.08em;color:var(--olive);margin-bottom:16px;animation:fadeUp .6s ease both;animation-delay:.1s}
    .hero-headline{font-size:clamp(52px,8vw,96px);font-weight:400;line-height:1;margin-bottom:12px;animation:fadeUp .6s ease both;animation-delay:.25s}
    .hero-headline span{font-family:'Nabla',sans-serif;font-palette:--nabla-sunset;letter-spacing:-.01em}
    .nabla-inline{font-family:'Nabla',sans-serif;font-palette:--nabla-sunset;font-size:15px;letter-spacing:-.01em;vertical-align:middle;line-height:1;display:inline-block}
    .hero-tagline{font-size:18px;color:var(--dark);margin-bottom:0;line-height:1.65;max-width:520px;animation:fadeUp .6s ease both;animation-delay:.4s}
    .hero-marquee{width:100%;overflow:hidden;margin:100px 0;-webkit-mask:linear-gradient(to right,transparent,black 12%,black 88%,transparent);mask:linear-gradient(to right,transparent,black 12%,black 88%,transparent);animation:fadeUp .6s ease both;animation-delay:.55s}
    .hero-marquee:hover .hero-marquee-track{animation-play-state:paused}
    .hero-marquee-track{display:flex;gap:48px;animation:marquee 56s linear infinite;width:max-content}
    .hero-marquee-item{display:flex;align-items:center;gap:12px;flex-shrink:0}
    .hero-icon{width:45px;height:45px;opacity:.65;flex-shrink:0}
    .hero-icon-name{font-size:13px;color:var(--dark);font-family:var(--sans);white-space:nowrap}
    .url-box{display:inline-flex;align-items:center;background:var(--surface);border:1px solid var(--divider);border-radius:8px;overflow:hidden;max-width:100%;animation:fadeUp .6s ease both;animation-delay:.7s}
    .url-text{font-family:var(--mono);font-size:14px;color:var(--text);padding:12px 18px;letter-spacing:.02em;user-select:all;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .url-divider{width:1px;background:var(--divider);align-self:stretch;flex-shrink:0}
    .url-copy{display:flex;align-items:center;justify-content:center;width:46px;height:46px;background:var(--text);color:var(--bg);border:none;cursor:pointer;transition:opacity .2s,background .25s;flex-shrink:0}
    .url-copy:hover{opacity:.75}
    .url-copy.copied{background:var(--olive)}
    .url-copy .icon-check{display:none}
    .url-copy.copied .icon-copy{display:none}
    .url-copy.copied .icon-check{display:block}

    .section{padding:64px 0;border-bottom:1px solid var(--divider)}
    .section:last-of-type{border-bottom:none}
    .section-label{font-family:var(--mono);font-size:12px;letter-spacing:.08em;color:var(--olive);margin-bottom:28px;text-align:center}
    .section-title{font-family:var(--serif);font-size:clamp(24px,3vw,36px);font-weight:400;color:var(--text);margin-bottom:36px;line-height:1.2;text-align:center}

    .steps-list{display:flex;flex-direction:column}
    .step{display:grid;grid-template-columns:40px 1fr;gap:20px;padding:24px 0;border-top:1px solid var(--divider);align-items:start}
    .step-num{font-family:var(--serif);font-size:22px;color:var(--dim);line-height:1.4;padding-top:2px}
    .step-head{font-size:18px;font-weight:400;color:var(--text);margin-bottom:8px}
    .step-body{font-size:16px;color:var(--body);line-height:1.75}
    .step-codes{display:flex;flex-direction:column;gap:6px;margin-top:10px}
    .step-code{display:inline-block;font-family:var(--mono);font-size:13px;background:var(--bg);border:1px solid var(--divider);border-radius:4px;padding:4px 10px;color:var(--text)}
    .step-copy-wrap{display:inline-flex;align-items:stretch;border:1px solid var(--divider);border-radius:4px;overflow:hidden;margin-top:10px}
    .step-copy-wrap .step-code{border:none;border-radius:0;margin:0;padding:8px 14px}
    .step-copy-btn{display:flex;align-items:center;justify-content:center;width:40px;background:var(--text);color:var(--bg);border:none;cursor:pointer;transition:opacity .2s,background .25s;flex-shrink:0;padding:0}
    .step-copy-btn:hover{opacity:.75}
    .step-copy-btn.copied{background:var(--olive)}
    .step-copy-btn .icon-check{display:none}
    .step-copy-btn.copied .icon-copy{display:none}
    .step-copy-btn.copied .icon-check{display:block}

    .install-tabs{display:flex;gap:0;margin-bottom:32px;border-bottom:1px solid var(--divider)}
    .install-tab{font-family:var(--mono);font-size:12px;letter-spacing:.08em;color:var(--body);background:none;border:none;border-bottom:2px solid transparent;padding:10px 20px 10px 0;cursor:pointer;transition:color .2s;margin-bottom:-1px}
    .install-tab.active{color:var(--text);border-bottom-color:var(--text)}
    .install-tab:hover:not(.active){color:var(--text)}
    .install-panel{display:none}
    .install-panel.active{display:block}

    .commands-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--divider);border:1px solid var(--divider);border-radius:10px;overflow:hidden}
    .command-card{background:var(--surface);padding:24px 28px}
    .command-name{font-family:var(--mono);font-size:13px;color:var(--olive);margin-bottom:8px;letter-spacing:.04em}
    .command-desc{font-size:15px;color:var(--text);line-height:1.6;margin-bottom:10px}
    .command-example{font-family:var(--mono);font-size:12px;color:var(--dim);line-height:1.6}

    .lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px}
    .lib-item{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--divider);border-radius:6px;padding:11px 14px;transition:border-color .2s;text-decoration:none;color:inherit}
    .lib-item:hover{border-color:var(--olive)}
    .lib-icon{width:16px;height:16px;flex-shrink:0;opacity:.75}
    .lib-name{font-size:13px;color:var(--body);font-family:var(--sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

    .prompts-list{display:flex;flex-direction:column;gap:10px}
    .prompt-item{display:flex;align-items:flex-start;gap:14px;background:var(--surface);border:1px solid var(--divider);border-radius:8px;padding:14px 20px;cursor:pointer;transition:border-color .2s}
    .prompt-item:hover{border-color:var(--olive)}
    .prompt-arrow{font-size:14px;color:var(--olive);margin-top:1px;flex-shrink:0}
    .prompt-text{font-family:var(--mono);font-size:13px;color:var(--text);line-height:1.65;flex:1}
    .prompt-copy-btn{display:flex;align-items:center;color:var(--dim);flex-shrink:0;transition:color .2s}
    .prompt-item:hover .prompt-copy-btn{color:var(--olive)}
    .prompt-copy-btn .icon-check{display:none}
    .prompt-copy-btn.copied{color:var(--olive)}
    .prompt-copy-btn.copied .icon-copy{display:none}
    .prompt-copy-btn.copied .icon-check{display:block}

    .free-badge{display:inline-block;font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--olive);border:1px solid var(--divider);border-radius:4px;padding:3px 10px;margin-left:12px;vertical-align:middle}

    .story-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}
    .story-col{opacity:0;transform:translateY(16px);transition:opacity .7s ease,transform .7s ease}
    .story-grid.in-view .story-col{opacity:1;transform:translateY(0)}
    .story-grid.in-view .story-col:last-child{transition-delay:1.5s}
    .story-col-label{font-family:var(--mono);font-size:11px;letter-spacing:.08em;margin-bottom:20px}
    .story-col-label.before{color:var(--text)}
    .story-col-label.after{color:var(--olive)}
    .story-steps{display:flex;flex-direction:column;gap:0}
    .story-step{display:flex;gap:14px;padding:14px 0;border-top:1px solid var(--divider);align-items:flex-start}
    .story-step:last-child{border-bottom:1px solid var(--divider)}
    .story-num{font-family:var(--mono);font-size:11px;color:var(--dim);margin-top:3px;flex-shrink:0;width:20px;text-align:center;letter-spacing:.04em}
    .story-col:last-child .story-num{color:var(--olive)}
    .story-text{font-size:15px;color:var(--text);line-height:1.6}
    .story-text strong{color:var(--text);font-weight:400}
    @media(max-width:768px){.story-grid{grid-template-columns:1fr;gap:32px}}

    .site-footer{padding:40px 80px;border-top:1px solid var(--divider);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
    .footer-links{display:flex;gap:28px}
    .footer-link{font-size:13px;letter-spacing:.06em;color:var(--olive);text-decoration:none;opacity:.7;transition:opacity .2s}
    .footer-link:hover{opacity:1}
    .footer-credit{font-family:var(--mono);font-size:12px;color:var(--dim)}

    @media(max-width:768px){
      .site-nav,.page,.site-footer{padding-left:20px;padding-right:20px}
      .hero{padding:60px 0;min-height:calc(100vh - 57px)}
      .hero-icons{gap:14px}
      .url-box{width:100%;max-width:420px}
      .url-divider{width:auto;height:1px}
      .url-copy{width:100%;height:44px}
      .commands-grid{grid-template-columns:1fr}
      .section{padding:48px 0}
      .story-grid{grid-template-columns:1fr;gap:32px}
      .footer-links{flex-wrap:wrap;gap:16px}
    }
  </style>
</head>
<body>

<nav class="site-nav">
  <a href="/" class="nav-back">&larr; Portfolio</a>
</nav>

<div class="page">

  <section class="hero">
    <p class="hero-eyebrow">MCP connector for Claude Code</p>
    <h1 class="hero-headline"><span>Librarypass</span></h1>
    <p class="hero-tagline">Install, learn, and stay current with React and UI libraries,<br>directly in Claude Code.<br>No guessing versions. No stale docs. No looking things up.</p>
    <div class="hero-marquee">
      <div class="hero-marquee-track">
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/tailwindcss/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Tailwind CSS</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/shadcnui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">shadcn/ui</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/mui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">MUI</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/mantine/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Mantine</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/chakraui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Chakra UI</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/nextui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">NextUI</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/radixui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Radix UI</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/headlessui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Headless UI</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/lucide/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Lucide</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/framer/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Framer Motion</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/reacthookform/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">React Hook Form</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/zod/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Zod</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/reactquery/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">TanStack Query</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/tanstack/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">TanStack Table</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/dayjs/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Day.js</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">Zustand</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">Recharts</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">React Icons</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">Heroicons</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">AutoAnimate</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">clsx</span></div>
        <!-- duplicate for seamless loop -->
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/tailwindcss/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Tailwind CSS</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/shadcnui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">shadcn/ui</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/mui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">MUI</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/mantine/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Mantine</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/chakraui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Chakra UI</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/nextui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">NextUI</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/radixui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Radix UI</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/headlessui/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Headless UI</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/lucide/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Lucide</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/framer/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Framer Motion</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/reacthookform/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">React Hook Form</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/zod/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Zod</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/reactquery/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">TanStack Query</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/tanstack/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">TanStack Table</span></div>
        <div class="hero-marquee-item"><img class="hero-icon" src="https://cdn.simpleicons.org/dayjs/706b6b" alt="" onerror="this.style.display='none'"><span class="hero-icon-name">Day.js</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">Zustand</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">Recharts</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">React Icons</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">Heroicons</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">AutoAnimate</span></div>
        <div class="hero-marquee-item"><span class="hero-icon-name">clsx</span></div>
      </div>
    </div>
    <div class="url-box">
      <span class="url-text">https://gomezcollective.com/mcp/librarypass</span>
      <div class="url-divider"></div>
      <button class="url-copy" id="copyBtn" onclick="copyUrl()" aria-label="Copy URL">
        <svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    </div>
  </section>

  <section class="section">
    <p class="section-label">Why it exists</p>
    <h2 class="section-title">Setting up a library used to take an hour</h2>
    <div class="story-grid">
      <div class="story-col">
        <p class="story-col-label before">Without Librarypass</p>
        <div class="story-steps">
          <div class="story-step">
            <span class="story-num">1</span>
            <p class="story-text">Open a new tab. Search for the library. Find the docs site, hope it hasn&rsquo;t moved.</p>
          </div>
          <div class="story-step">
            <span class="story-num">2</span>
            <p class="story-text">Ask Claude to help install it. Claude gives you <strong>commands from six months ago</strong>, before the breaking change.</p>
          </div>
          <div class="story-step">
            <span class="story-num">3</span>
            <p class="story-text">You hit an error. Go back to the docs. The config file format changed. The import path changed.</p>
          </div>
          <div class="story-step">
            <span class="story-num">4</span>
            <p class="story-text">Find the right version, copy the setup steps manually, wire the provider into your root layout.</p>
          </div>
          <div class="story-step">
            <span class="story-num">5</span>
            <p class="story-text"><strong>45 minutes later</strong>, you&rsquo;re set up. You haven&rsquo;t written a single line of product code.</p>
          </div>
        </div>
      </div>
      <div class="story-col">
        <p class="story-col-label after">With <span class="nabla-inline">Librarypass</span></p>
        <div class="story-steps">
          <div class="story-step">
            <span class="story-num">1</span>
            <p class="story-text">Type <span style="font-family:var(--mono);font-size:13px">/librarypass:install shadcn</span> in Claude Code.</p>
          </div>
          <div class="story-step">
            <span class="story-num">2</span>
            <p class="story-text">Get the <strong>current</strong> install commands, config files, and a working usage example, pulled live from npm and GitHub.</p>
          </div>
          <div class="story-step">
            <span class="story-num">3</span>
            <p class="story-text">Claude runs the scaffold, wires everything up. You&rsquo;re writing product code in minutes.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="install-steps">
    <p class="section-label">Getting started</p>
    <h2 class="section-title">Three steps <span class="free-badge">Free</span></h2>

    <div class="install-tabs">
      <button class="install-tab active" onclick="switchTab('vscode', this)">Claude Code</button>
      <button class="install-tab" onclick="switchTab('cli', this)">CLI</button>
    </div>

    <!-- Claude Code (VS Code extension) -->
    <div class="install-panel active" id="panel-vscode">
      <div class="steps-list">
        <div class="step">
          <p class="step-num">01</p>
          <div>
            <p class="step-head">Open Settings &rarr; Connectors &rarr; Add custom connector</p>
            <p class="step-body">In the Claude Code panel in VS Code, click the settings icon and go to Connectors.</p>
          </div>
        </div>
        <div class="step">
          <p class="step-num">02</p>
          <div>
            <p class="step-head">Paste the connector URL</p>
            <div class="step-copy-wrap">
              <span class="step-code">https://gomezcollective.com/mcp/librarypass</span>
              <button class="step-copy-btn" id="stepCopyBtn" onclick="copyStepUrl()" aria-label="Copy URL">
                <svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="step">
          <p class="step-num">03</p>
          <div>
            <p class="step-head">Ask Claude to use Librarypass</p>
            <p class="step-body">Claude picks up the tools automatically. Just describe what you need.</p>
            <div class="step-codes">
              <span class="step-code">Use librarypass to recommend a stack for my dashboard</span>
              <span class="step-code">Use librarypass to install shadcn</span>
              <span class="step-code">Use librarypass to get docs for the shadcn dialog</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CLI -->
    <div class="install-panel" id="panel-cli">
      <div class="steps-list">
        <div class="step">
          <p class="step-num">01</p>
          <div>
            <p class="step-head">Add the connector</p>
            <p class="step-body">Run this once in your terminal. Works across all projects.</p>
            <div class="step-copy-wrap" style="margin-top:10px">
              <span class="step-code">claude mcp add librarypass --transport http https://gomezcollective.com/mcp/librarypass</span>
              <button class="step-copy-btn" id="cliCopyBtn" onclick="copyCliCmd()" aria-label="Copy command">
                <svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="step">
          <p class="step-num">02</p>
          <div>
            <p class="step-head">Open Claude in your project</p>
            <div class="step-codes">
              <span class="step-code">cd my-project && claude</span>
            </div>
          </div>
        </div>
        <div class="step">
          <p class="step-num">03</p>
          <div>
            <p class="step-head">Use slash commands with full autocomplete</p>
            <div class="step-codes">
              <span class="step-code">/librarypass:recommend mobile app</span>
              <span class="step-code">/librarypass:install shadcn</span>
              <span class="step-code">/librarypass:component shadcn dialog</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <p class="section-label">Slash commands</p>
    <h2 class="section-title">Everything you need to ask</h2>
    <div class="commands-grid">
      <div class="command-card">
        <p class="command-name">/librarypass:recommend</p>
        <p class="command-desc">Don&rsquo;t know where to start? Describe your project and get a curated library stack with reasoning.</p>
        <p class="command-example">/librarypass:recommend saas product</p>
      </div>
      <div class="command-card">
        <p class="command-name">/librarypass:install</p>
        <p class="command-desc">Get the full scaffold &mdash; exact commands, config files, and a working usage example.</p>
        <p class="command-example">/librarypass:install tailwind</p>
      </div>
      <div class="command-card">
        <p class="command-name">/librarypass:component</p>
        <p class="command-desc">Pull live component docs into context. Props, usage, import path &mdash; always current.</p>
        <p class="command-example">/librarypass:component mantine drawer</p>
      </div>
      <div class="command-card">
        <p class="command-name">/librarypass:list</p>
        <p class="command-desc">Show everything Librarypass supports, or list all components in a specific library.</p>
        <p class="command-example">/librarypass:list shadcn</p>
      </div>
      <div class="command-card">
        <p class="command-name">/librarypass:configure</p>
        <p class="command-desc">Generate configuration code &mdash; custom themes, icon stroke width, dark mode, CSS variables.</p>
        <p class="command-example">/librarypass:configure lucide stroke 1.5px</p>
      </div>
      <div class="command-card">
        <p class="command-name">/librarypass:request</p>
        <p class="command-desc">Library missing? Request it and it gets added when there&rsquo;s enough demand.</p>
        <p class="command-example">/librarypass:request react-spring</p>
      </div>
    </div>
  </section>

  <section class="section">
    <p class="section-label">Supported libraries</p>
    <h2 class="section-title">The libraries you already use</h2>
    <div class="lib-grid">
      <a class="lib-item" href="https://tailwindcss.com" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/tailwindcss/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">Tailwind CSS</span></a>
      <a class="lib-item" href="https://ui.shadcn.com" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/shadcnui/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">shadcn/ui</span></a>
      <a class="lib-item" href="https://mui.com" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/mui/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">MUI</span></a>
      <a class="lib-item" href="https://mantine.dev" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/mantine/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">Mantine</span></a>
      <a class="lib-item" href="https://chakra-ui.com" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/chakraui/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">Chakra UI</span></a>
      <a class="lib-item" href="https://nextui.org" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/nextui/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">NextUI</span></a>
      <a class="lib-item" href="https://www.radix-ui.com" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/radixui/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">Radix UI</span></a>
      <a class="lib-item" href="https://headlessui.com" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/headlessui/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">Headless UI</span></a>
      <a class="lib-item" href="https://lucide.dev" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/lucide/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">Lucide</span></a>
      <a class="lib-item" href="https://www.framer.com/motion" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/framer/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">Framer Motion</span></a>
      <a class="lib-item" href="https://react-hook-form.com" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/reacthookform/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">React Hook Form</span></a>
      <a class="lib-item" href="https://zod.dev" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/zod/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">Zod</span></a>
      <a class="lib-item" href="https://tanstack.com/query" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/reactquery/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">TanStack Query</span></a>
      <a class="lib-item" href="https://tanstack.com/table" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/tanstack/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">TanStack Table</span></a>
      <a class="lib-item" href="https://day.js.org" target="_blank" rel="noopener"><img class="lib-icon" src="https://cdn.simpleicons.org/dayjs/706b6b" alt="" onerror="this.style.display='none'"><span class="lib-name">Day.js</span></a>
      <a class="lib-item" href="https://react-icons.github.io/react-icons" target="_blank" rel="noopener"><span class="lib-name">React Icons</span></a>
      <a class="lib-item" href="https://heroicons.com" target="_blank" rel="noopener"><span class="lib-name">Heroicons</span></a>
      <a class="lib-item" href="https://auto-animate.formkit.com" target="_blank" rel="noopener"><span class="lib-name">AutoAnimate</span></a>
      <a class="lib-item" href="https://zustand.docs.pmnd.rs" target="_blank" rel="noopener"><span class="lib-name">Zustand</span></a>
      <a class="lib-item" href="https://recharts.org" target="_blank" rel="noopener"><span class="lib-name">Recharts</span></a>
      <a class="lib-item" href="https://github.com/lukeed/clsx" target="_blank" rel="noopener"><span class="lib-name">clsx + tw-merge</span></a>
    </div>
  </section>

  <section class="section">
    <p class="section-label">Example prompts</p>
    <h2 class="section-title">Copy and paste these into Claude Code</h2>
    <div class="prompts-list">
      <div class="prompt-item" onclick="copyPrompt(this)">
        <span class="prompt-arrow">&rarr;</span>
        <span class="prompt-text">/librarypass:recommend I'm building a SaaS dashboard with real-time data, tables, and charts</span>
        <span class="prompt-copy-btn"><svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      </div>
      <div class="prompt-item" onclick="copyPrompt(this)">
        <span class="prompt-arrow">&rarr;</span>
        <span class="prompt-text">/librarypass:install shadcn</span>
        <span class="prompt-copy-btn"><svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      </div>
      <div class="prompt-item" onclick="copyPrompt(this)">
        <span class="prompt-arrow">&rarr;</span>
        <span class="prompt-text">/librarypass:component shadcn data table</span>
        <span class="prompt-copy-btn"><svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      </div>
      <div class="prompt-item" onclick="copyPrompt(this)">
        <span class="prompt-arrow">&rarr;</span>
        <span class="prompt-text">/librarypass:configure lucide icons stroke 1.5px</span>
        <span class="prompt-copy-btn"><svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      </div>
      <div class="prompt-item" onclick="copyPrompt(this)">
        <span class="prompt-arrow">&rarr;</span>
        <span class="prompt-text">/librarypass:install tailwind with dark mode</span>
        <span class="prompt-copy-btn"><svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      </div>
      <div class="prompt-item" onclick="copyPrompt(this)">
        <span class="prompt-arrow">&rarr;</span>
        <span class="prompt-text">/librarypass:recommend mobile app</span>
        <span class="prompt-copy-btn"><svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      </div>
      <div class="prompt-item" onclick="copyPrompt(this)">
        <span class="prompt-arrow">&rarr;</span>
        <span class="prompt-text">/librarypass:list mantine</span>
        <span class="prompt-copy-btn"><svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      </div>
      <div class="prompt-item" onclick="copyPrompt(this)">
        <span class="prompt-arrow">&rarr;</span>
        <span class="prompt-text">/librarypass:request react-spring for spring physics animations</span>
        <span class="prompt-copy-btn"><svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      </div>
    </div>
  </section>

</div>

<footer class="site-footer">
  <div class="footer-links">
    <a href="/" class="footer-link">&larr; gomezcollective.com</a>
    <a href="/mcp" class="footer-link">All connectors</a>
  </div>
  <p class="footer-credit">Built by Gomez Collective</p>
</footer>

<script defer src="/_vercel/insights/script.js"></script>
<script>
  function copyUrl() {
    navigator.clipboard.writeText('https://gomezcollective.com/mcp/librarypass').then(() => {
      const btn = document.getElementById('copyBtn')
      btn.classList.add('copied')
      window.va?.track('librarypass_url_copied')
      setTimeout(() => btn.classList.remove('copied'), 2000)
    })
  }

  function copyStepUrl() {
    navigator.clipboard.writeText('https://gomezcollective.com/mcp/librarypass').then(() => {
      const btn = document.getElementById('stepCopyBtn')
      btn.classList.add('copied')
      setTimeout(() => btn.classList.remove('copied'), 2000)
    })
  }

  function copyCliCmd() {
    navigator.clipboard.writeText('claude mcp add librarypass --transport http https://gomezcollective.com/mcp/librarypass').then(() => {
      const btn = document.getElementById('cliCopyBtn')
      btn.classList.add('copied')
      setTimeout(() => btn.classList.remove('copied'), 2000)
    })
  }

  function switchTab(id, btn) {
    document.querySelectorAll('.install-panel').forEach(p => p.classList.remove('active'))
    document.querySelectorAll('.install-tab').forEach(t => t.classList.remove('active'))
    document.getElementById('panel-' + id).classList.add('active')
    btn.classList.add('active')
  }

  function copyPrompt(el) {
    const text = el.querySelector('.prompt-text').textContent.trim()
    navigator.clipboard.writeText(text).then(() => {
      const btn = el.querySelector('.prompt-copy-btn')
      btn.classList.add('copied')
      setTimeout(() => btn.classList.remove('copied'), 1500)
    })
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Animate story columns when scrolled into view
    const storyGrid = document.querySelector('.story-grid')
    if (storyGrid) {
      new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view')
            window.va?.track('librarypass_story_viewed')
          }
        })
      }, { threshold: 0.2 }).observe(storyGrid)
    }

    // Track install steps viewed
    const steps = document.querySelector('#install-steps')
    if (steps) {
      new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) window.va?.track('librarypass_install_steps_viewed') })
      }, { threshold: 0.8 }).observe(steps)
    }
  })
</script>
</body>
</html>`

// ── Main Vercel handler ───────────────────────────────────────────────────────
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' })
  }

  // Auth check (currently unenforced)
  const auth = authenticate(req)
  if (auth.error) return res.status(401).json({ error: auth.error })

  // GET — serve landing page
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.send(LANDING_HTML)
  }

  // POST — MCP protocol
  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch (_) { body = {} }
    }
    res.setHeader('Content-Type', 'application/json')
    body._ip = ip
    const response = await handleMcp(body)
    return res.status(200).json(response)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
