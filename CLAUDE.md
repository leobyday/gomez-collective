# Gomez Collective — Site Reference for Claude

## Live domain
https://gomezcollective.com

---

## URL structure and page types

| URL | File | Type | Robots |
|---|---|---|---|
| `/` | `index.html` | Static HTML | index |
| `/roku` | `roku.html` | Static HTML | index |
| `/aminochain` | `aminochain.html` | Static HTML | index |
| `/symmetry` | `symmetry.html` | Static HTML | noindex |
| `/disneyplus` | `disneyplus.html` | Static HTML | noindex |
| `/referrals` | `referrals.html` | Static HTML | noindex |
| `/faire` | `faire.html` | Static HTML | noindex |
| `/international` | `international.html` | Static HTML | noindex |
| `/mcp` | `mcp/index.html` | Static HTML | noindex |
| `/mcp/librarypass` | `api/mcp/librarypass.js` | Vercel serverless function (GET = HTML, POST = MCP protocol) | noindex |

`cleanUrls: true` in `vercel.json` — `.html` extensions are stripped automatically.

---

## Vercel routing rules (`vercel.json`)

```json
{
  "cleanUrls": true,
  "rewrites": [
    { "source": "/mcp/librarypass", "destination": "/api/mcp/librarypass" }
  ]
}
```

The `/mcp/librarypass` rewrite is what makes the serverless function serve the Librarypass landing page and MCP protocol at the same URL.

---

## Key pages

### `index.html` — Portfolio homepage
- Hero with scramble animation (ascii-effect.js)
- Three subnav tabs: **Startups**, **Consumer**, **Design Engineering**
- Cards use `<company-card>` web component (`components/company-card.js`)
- Filter JS in `script.js`

**Design Engineering cards (in order):**
1. Spin or Flip — `href="https://www.spinorflip.com/learn.html"`, `site="https://www.spinorflip.com/"`, video thumbnail
2. Claude Scaffolding — `href="https://github.com/leobyday/Claude-Scaffolding"`, image thumbnail
3. Librarypass — `href="/mcp/librarypass"`, badge="WIP", image thumbnail

### `/mcp` — MCP hub page
Lists all MCP connectors built by Gomez Collective. Links to `/mcp/librarypass`.

### `/mcp/librarypass` — Librarypass landing + MCP endpoint
- GET: serves the full Librarypass marketing/docs page (HTML inside `api/mcp/librarypass.js`)
- POST: MCP protocol (tools/list, tools/call, prompts/list, etc.)
- Install tabs: Claude Desktop / Claude Code / CLI
- MCP URL to install: `https://gomezcollective.com/mcp/librarypass`

---

## Key files

| File | Purpose |
|---|---|
| `index.html` | Homepage |
| `style.css` | Global styles |
| `script.js` | Tab filtering, password gate, scroll behavior |
| `ascii-effect.js` | Scramble animation (hero, tabs, cards) |
| `components/company-card.js` | Web component for portfolio cards |
| `components/company-card.css` | Card styles (may be empty — most styles are in style.css) |
| `api/mcp/librarypass.js` | Librarypass serverless function (landing page + MCP) |
| `lib/librarypass/catalog.js` | Library catalog data |
| `lib/librarypass/npm.js` | npm API calls |
| `lib/librarypass/docs.js` | Component docs fetching |
| `design.md` | Design system tokens, colors, fonts, spacing |
| `vercel.json` | Vercel config (cleanUrls, rewrites) |
| `sitemap.xml` | Sitemap (only indexable pages) |

---

## Assets

All assets live in `assets/`. They must be **git committed** before deploying — Vercel only serves tracked files.

| Path | Used by |
|---|---|
| `assets/00_Thumbnails/` | Portfolio card thumbnails |
| `assets/00_Thumbnails/MCPIntegration.mp4` | Spin or Flip card |
| `assets/00_Thumbnails/ClaudeScaffolding.png` | Claude Scaffolding card |
| `assets/librarypass/cloud-sky.png` | Librarypass card |
| `assets/librarypass/favicon.svg` | Librarypass favicon |
| `assets/Emoji.png` | Site favicon |

---

## company-card attributes

| Attribute | Purpose |
|---|---|
| `name` | Card heading |
| `category` | Italic subtitle (olive color) |
| `bio` | Description paragraph |
| `lang` | Tech stack tags — mono, uppercase, dim color |
| `href` | VIEW MORE link (external = new tab) |
| `site` | VISIT SITE link (always new tab, bottom right) |
| `access` | `"locked"` = UPON REQUEST, `"password"` = password gate |
| `badge` | Small outlined pill next to name (e.g. `badge="WIP"`) |
| `thumb` | Thumbnail layout variant: `media` / `fit` / `phones` / `lottie` / `spotify` / `phone-only` |
| `data-category` | Filter bucket: `startups` / `consumer` / `design-engineering` |
| `data-scramble-from` | Intermediate label shown during scramble animation |

---

## Rules

- **Never commit credentials.** POSTHOG_API_KEY and all secrets live in Vercel env vars only.
- **Never deploy without explicit "Deploy" from user.**
- **Always commit assets before deploying** — untracked files won't appear on the live site.
- **No em dashes in copy** — use commas or colons instead.
- **`librarypass-prd.md` is gitignored** — internal only, never goes to GitHub.
- **`/mcp/librarypass` is one page, not two** — the serverless function handles both the landing page (GET) and MCP protocol (POST) at the same URL.
