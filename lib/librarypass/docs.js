const { CATALOG } = require('./catalog')

// ── GitHub doc source map ─────────────────────────────────────────────────────
// Tries to fetch component-level docs from the library's public GitHub repo.
// Falls back to npm registry README, then to the catalog's usage example.

const GITHUB_SOURCES = {
  'shadcn': (component) => {
    const slug = component.toLowerCase().replace(/\s+/g, '-')
    return `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/content/docs/components/${slug}.mdx`
  },
  'mantine': (component) => {
    const slug = component.toLowerCase().replace(/\s+/g, '-')
    return `https://raw.githubusercontent.com/mantinedev/mantine/master/apps/mantine.dev/src/pages/core/${slug}.mdx`
  },
}

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchWithTimeout(url, ms = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

// ── Truncate markdown to a useful length ─────────────────────────────────────
function trimDocs(text, maxChars = 3000) {
  if (text.length <= maxChars) return text
  const cut = text.lastIndexOf('\n', maxChars)
  return text.slice(0, cut > 0 ? cut : maxChars) + '\n\n… (see full docs at the library homepage)'
}

// ── Strip MDX frontmatter and JSX imports ─────────────────────────────────────
function cleanMarkdown(text) {
  return text
    .replace(/^---[\s\S]*?---\n/, '')          // frontmatter
    .replace(/^import .+\n/gm, '')             // MDX imports
    .replace(/^export .+\n/gm, '')             // MDX exports
    .trim()
}

// ── Live component doc fetch ──────────────────────────────────────────────────
async function fetchComponentDocs(libraryKey, componentName) {
  const entry = CATALOG[libraryKey]
  if (!entry) return null

  // Try GitHub source first
  const githubFn = GITHUB_SOURCES[libraryKey]
  if (githubFn) {
    try {
      const url = githubFn(componentName)
      const res = await fetchWithTimeout(url)
      if (res.ok) {
        const text = await res.text()
        return {
          source: 'github',
          url,
          content: trimDocs(cleanMarkdown(text)),
        }
      }
    } catch (_) {}
  }

  // Fall back to npm README
  try {
    const pkg = entry.package
    const registryRes = await fetchWithTimeout(`https://registry.npmjs.org/${encodeURIComponent(pkg).replace('%40', '@')}`)
    if (registryRes.ok) {
      const data = await registryRes.json()
      const readme = data.readme || ''
      if (readme.length > 100) {
        return {
          source: 'npm-readme',
          url: `https://www.npmjs.com/package/${pkg}`,
          content: trimDocs(readme),
        }
      }
    }
  } catch (_) {}

  // Final fallback: return the usage example from catalog
  if (entry.install?.usage) {
    return {
      source: 'catalog',
      url: entry.homepage,
      content: `## ${entry.display} — ${componentName}\n\n${entry.install.usage}`,
    }
  }

  return null
}

// ── Configure code generators ─────────────────────────────────────────────────
// Returns ready-to-paste code for common library configuration requests.

function getConfigureCode(libraryKey, optionsString) {
  const entry = CATALOG[libraryKey]
  if (!entry) return null

  const opts = (optionsString || '').toLowerCase()

  // Icon stroke width (lucide, heroicons)
  const strokeMatch = opts.match(/(\d+(?:\.\d+)?)\s*px\s*stroke|stroke\s*(?:width\s*)?(\d+(?:\.\d+)?)/i)
    || optionsString.match(/(\d+(?:\.\d+)?)/)?.[0]

  if (entry.configure?.stroke && (opts.includes('stroke') || opts.includes('px'))) {
    const value = strokeMatch ? (strokeMatch[1] || strokeMatch[2] || strokeMatch[0]) : '1.5'
    return {
      type: 'configure',
      library: entry.display,
      option: `stroke-width: ${value}`,
      code: entry.configure.stroke(value),
    }
  }

  // Dark mode
  if (opts.includes('dark')) {
    return {
      type: 'configure',
      library: entry.display,
      option: 'dark mode',
      code: generateDarkModeConfig(libraryKey),
    }
  }

  // CSS variables / theming
  if (opts.includes('theme') || opts.includes('css variable') || opts.includes('color')) {
    return {
      type: 'configure',
      library: entry.display,
      option: 'theming',
      code: generateThemeConfig(libraryKey),
    }
  }

  return {
    type: 'configure',
    library: entry.display,
    option: optionsString,
    code: null,
    message: `No pre-built recipe for "${optionsString}" on ${entry.display}. Claude can help — describe what you need and the library's theming API will guide the implementation. Docs: ${entry.homepage}`,
  }
}

function generateDarkModeConfig(libraryKey) {
  switch (libraryKey) {
    case 'tailwind':
      return `// tailwind.config.js — enable class-based dark mode
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',   // toggle dark mode by adding class="dark" to <html>
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}

// Toggle dark mode in JS:
document.documentElement.classList.toggle('dark')

// Usage in JSX:
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>`

    case 'shadcn':
      return `// shadcn/ui uses next-themes for dark mode

// 1. Install
npm install next-themes

// 2. Wrap your root layout
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

// 3. Toggle theme
import { useTheme } from 'next-themes'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle theme
    </button>
  )
}`

    case 'mantine':
      return `// Mantine has built-in dark mode via ColorSchemeScript + MantineProvider

// Root layout
import '@mantine/core/styles.css'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="auto">
          {children}
        </MantineProvider>
      </body>
    </html>
  )
}

// Toggle
import { useMantineColorScheme } from '@mantine/core'

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  return <button onClick={toggleColorScheme}>Toggle ({colorScheme})</button>
}`

    default:
      return `// For ${libraryKey}, check the library's theming docs for dark mode configuration.\n// Docs: ${CATALOG[libraryKey]?.homepage || ''}`
  }
}

function generateThemeConfig(libraryKey) {
  switch (libraryKey) {
    case 'tailwind':
      return `// tailwind.config.js — extend the theme with your design tokens
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          500: '#4f6ef7',
          600: '#3b5bf5',
          700: '#2a4ae8',
          900: '#1a2d9e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
}

// Usage:
<div className="bg-brand-500 text-white font-sans rounded-4xl">`

    case 'shadcn':
      return `// shadcn/ui uses CSS variables for theming — edit in src/app/globals.css

@layer base {
  :root {
    --background:   0 0% 100%;
    --foreground:   222.2 84% 4.9%;
    --primary:      221.2 83.2% 53.3%;   /* Change this to your brand color (HSL) */
    --primary-foreground: 210 40% 98%;
    --secondary:    210 40% 96.1%;
    --accent:       210 40% 96.1%;
    --border:       214.3 31.8% 91.4%;
    --radius:       0.5rem;              /* Global border radius */
  }

  .dark {
    --background:   222.2 84% 4.9%;
    --foreground:   210 40% 98%;
    --primary:      217.2 91.2% 59.8%;
    --border:       217.2 32.6% 17.5%;
  }
}

// Convert your hex color to HSL at hslpicker.com, then paste the H S% L% values.`

    default:
      return `// Check the theming docs for ${CATALOG[libraryKey]?.display || libraryKey}\n// Docs: ${CATALOG[libraryKey]?.homepage || ''}`
  }
}

module.exports = { fetchComponentDocs, getConfigureCode }
