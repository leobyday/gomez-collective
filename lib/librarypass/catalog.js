// ── Library catalog ───────────────────────────────────────────────────────────
// Each entry: display name, npm package, description, category, use-cases,
// install scaffold (commands + config files + usage example), component list,
// docs source, and optional configure recipes.

const CATALOG = {

  // ── UI Libraries ────────────────────────────────────────────────────────────

  shadcn: {
    display: 'shadcn/ui',
    package: 'shadcn',
    description: 'Copy-paste components built on Radix UI and Tailwind. You own the code — not a dependency.',
    category: 'ui',
    useCases: ['dashboard', 'saas', 'landing', 'forms', 'mobile'],
    requires: ['tailwind'],
    install: {
      commands: [
        'npx shadcn@latest init',
        '# Then add individual components:',
        'npx shadcn@latest add button input dialog',
        '# Or add all at once:',
        'npx shadcn@latest add --all',
      ],
      setup: [
        '1. Run `npx shadcn@latest init` and answer the prompts (TypeScript, style, base color, CSS variables)',
        '2. Components are added to src/components/ui/ — you own and edit them directly',
        '3. Add more components any time with `npx shadcn@latest add [component-name]`',
      ],
      configFiles: {},
      usage: `import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function Example() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <Input placeholder="Name" />
        <Button type="submit">Save</Button>
      </DialogContent>
    </Dialog>
  )
}`,
      note: 'Requires Tailwind CSS. Run: /librarypass install tailwind — if not already set up.',
    },
    components: [
      'Accordion','Alert','Alert Dialog','Aspect Ratio','Avatar','Badge',
      'Breadcrumb','Button','Calendar','Card','Carousel','Chart','Checkbox',
      'Collapsible','Combobox','Command','Context Menu','Data Table','Date Picker',
      'Dialog','Drawer','Dropdown Menu','Form','Hover Card','Input','Input OTP',
      'Label','Menubar','Navigation Menu','Pagination','Popover','Progress',
      'Radio Group','Resizable','Scroll Area','Select','Separator','Sheet',
      'Sidebar','Skeleton','Slider','Sonner','Switch','Table','Tabs',
      'Textarea','Toast','Toggle','Toggle Group','Tooltip',
    ],
    homepage: 'https://ui.shadcn.com',
    docsBase: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/content/docs/components',
    docsExt: 'mdx',
  },

  tailwind: {
    display: 'Tailwind CSS',
    package: 'tailwindcss',
    description: 'Utility-first CSS. Write styles as class names directly in your JSX — no separate CSS files.',
    category: 'styling',
    useCases: ['dashboard', 'saas', 'landing', 'forms', 'mobile', 'ecommerce'],
    requires: [],
    install: {
      commands: [
        'npm install -D tailwindcss postcss autoprefixer',
        'npx tailwindcss init -p',
      ],
      setup: [
        '1. Run the install commands above',
        '2. Update tailwind.config.js content paths to include your source files',
        '3. Add @tailwind directives to your main CSS file (e.g. src/index.css)',
        '4. Import that CSS file in your root component',
      ],
      configFiles: {
        'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
        'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      },
      usage: `// Use utility classes directly in JSX — no CSS file needed
export default function Card({ title, body }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
    </div>
  )
}`,
      note: 'For Next.js, Tailwind is built-in via `create-next-app`. For Vite, use the commands above.',
    },
    components: [],
    homepage: 'https://tailwindcss.com/docs',
    docsBase: null,
  },

  mui: {
    display: 'Material UI (MUI)',
    package: '@mui/material',
    description: "Google's Material Design for React. The most widely used component library — official Figma kit included.",
    category: 'ui',
    useCases: ['dashboard', 'saas', 'forms', 'enterprise'],
    requires: [],
    install: {
      commands: [
        'npm install @mui/material @emotion/react @emotion/styled',
        'npm install @mui/icons-material',
      ],
      setup: [
        '1. Wrap your app root in ThemeProvider with a theme',
        '2. Add CssBaseline inside ThemeProvider to normalize browser styles',
        '3. Optionally customize the theme with your brand colors and typography',
      ],
      configFiles: {},
      usage: `import { ThemeProvider, createTheme, CssBaseline, Button, TextField, Stack } from '@mui/material'

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  },
})

// Root layout
export default function App({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

// Usage anywhere
<Stack spacing={2}>
  <TextField label="Email" type="email" variant="outlined" />
  <Button variant="contained">Sign in</Button>
</Stack>`,
    },
    components: [
      'Accordion','Alert','AppBar','Autocomplete','Avatar','Badge',
      'BottomNavigation','Box','Breadcrumbs','Button','ButtonGroup','Card',
      'Checkbox','Chip','CircularProgress','Container','DatePicker','Dialog',
      'Divider','Drawer','Fab','FormControl','Grid','Grid2','Icon','IconButton',
      'ImageList','Input','LinearProgress','Link','List','Menu','MenuItem',
      'MobileStepper','Modal','Pagination','Paper','Popover','Popper','Radio',
      'Rating','Select','Skeleton','Slider','Snackbar','SpeedDial','Stack',
      'Stepper','Switch','Table','Tabs','TextField','Timeline','ToggleButton',
      'Tooltip','Typography',
    ],
    homepage: 'https://mui.com/material-ui/',
    docsBase: 'https://raw.githubusercontent.com/mui/material-ui/master/docs/data/material/components',
  },

  mantine: {
    display: 'Mantine',
    package: '@mantine/core',
    description: '100+ accessible React components with built-in dark mode, hooks, and form handling.',
    category: 'ui',
    useCases: ['dashboard', 'saas', 'forms', 'landing'],
    requires: [],
    install: {
      commands: [
        'npm install @mantine/core @mantine/hooks',
        'npm install --save-dev postcss postcss-preset-mantine postcss-simple-vars',
      ],
      setup: [
        "1. Create postcss.config.cjs (see config file below)",
        "2. Import '@mantine/core/styles.css' at the top of your root file",
        '3. Wrap your app in MantineProvider',
      ],
      configFiles: {
        'postcss.config.cjs': `module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
}`,
      },
      usage: `// Root layout
import '@mantine/core/styles.css'
import { MantineProvider } from '@mantine/core'

export default function App({ children }) {
  return (
    <MantineProvider>
      {children}
    </MantineProvider>
  )
}

// Usage
import { Button, TextInput, Stack, Paper } from '@mantine/core'

<Paper p="xl" radius="md" withBorder>
  <Stack gap="md">
    <TextInput label="Email" placeholder="you@example.com" />
    <Button variant="filled">Sign in</Button>
  </Stack>
</Paper>`,
    },
    components: [
      'Accordion','ActionIcon','Alert','Anchor','AppShell','Autocomplete','Avatar',
      'Badge','Blockquote','Box','Breadcrumbs','Burger','Button','Card','Center',
      'Checkbox','Chip','CloseButton','Code','ColorInput','ColorPicker','Combobox',
      'Container','CopyButton','Divider','Drawer','Fieldset','FileInput','Flex',
      'Grid','Group','HoverCard','Indicator','Input','JsonInput','Kbd','Loader',
      'Menu','Modal','MultiSelect','NativeSelect','NavLink','Notification',
      'NumberInput','Overlay','Pagination','Paper','PasswordInput','Pill','Popover',
      'Progress','Radio','Rating','RingProgress','SegmentedControl','Select',
      'SimpleGrid','Skeleton','Slider','Stack','Stepper','Switch','Table','Tabs',
      'TagsInput','Text','Textarea','TextInput','ThemeIcon','Timeline','Title','Tooltip',
    ],
    homepage: 'https://mantine.dev',
    docsBase: 'https://raw.githubusercontent.com/mantinedev/mantine/master/apps/mantine.dev/src/pages/core',
    docsExt: 'mdx',
  },

  chakra: {
    display: 'Chakra UI',
    package: '@chakra-ui/react',
    description: 'Accessible, composable components with style props. Excellent for rapid UI building.',
    category: 'ui',
    useCases: ['dashboard', 'saas', 'forms', 'prototyping'],
    requires: [],
    install: {
      commands: ['npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion'],
      setup: ['1. Wrap your app root in ChakraProvider'],
      configFiles: {},
      usage: `import { ChakraProvider, defaultSystem } from '@chakra-ui/react'

export default function App({ children }) {
  return (
    <ChakraProvider value={defaultSystem}>
      {children}
    </ChakraProvider>
  )
}

// Usage
import { Button, Input, Stack, Field } from '@chakra-ui/react'

<Stack gap="4">
  <Field.Root>
    <Field.Label>Email</Field.Label>
    <Input placeholder="you@example.com" />
  </Field.Root>
  <Button colorPalette="blue">Sign in</Button>
</Stack>`,
    },
    components: [
      'Accordion','Alert','Avatar','Badge','Box','Breadcrumb','Button','Card',
      'Checkbox','CloseButton','Code','Container','Divider','Drawer','Editable',
      'Flex','Grid','Heading','Icon','IconButton','Image','Input','InputGroup',
      'Link','Menu','Modal','NumberInput','PinInput','Popover','Progress','Radio',
      'Select','SimpleGrid','Skeleton','Slider','Spinner','Stack','Stat','Switch',
      'Table','Tabs','Tag','Text','Textarea','Toast','Tooltip',
    ],
    homepage: 'https://chakra-ui.com',
    docsBase: null,
  },

  nextui: {
    display: 'NextUI / HeroUI',
    package: '@nextui-org/react',
    description: 'Beautiful, fast React components with first-class Tailwind CSS support.',
    category: 'ui',
    useCases: ['landing', 'saas', 'dashboard', 'mobile'],
    requires: ['tailwind'],
    install: {
      commands: ['npm install @nextui-org/react framer-motion'],
      setup: [
        '1. Add NextUI plugin to tailwind.config.js (see config below)',
        '2. Wrap your app in NextUIProvider',
      ],
      configFiles: {
        'tailwind.config.js': `const { nextui } = require('@nextui-org/react')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: { extend: {} },
  darkMode: 'class',
  plugins: [nextui()],
}`,
      },
      usage: `import { NextUIProvider } from '@nextui-org/react'

export default function App({ children }) {
  return <NextUIProvider>{children}</NextUIProvider>
}

import { Button, Input, Card, CardBody } from '@nextui-org/react'

<Card>
  <CardBody className="gap-4">
    <Input label="Email" placeholder="you@example.com" />
    <Button color="primary" fullWidth>Sign in</Button>
  </CardBody>
</Card>`,
    },
    components: [
      'Accordion','Autocomplete','Avatar','Badge','Button','Calendar','Card',
      'Checkbox','CheckboxGroup','Chip','CircularProgress','Code','DateInput',
      'DatePicker','Divider','Drawer','Dropdown','Image','Input','Kbd','Link',
      'Listbox','Modal','Navbar','Pagination','Popover','Progress','RadioGroup',
      'ScrollShadow','Select','Skeleton','Slider','Snippet','Spinner','Switch',
      'Table','Tabs','Textarea','TimeInput','Tooltip','User',
    ],
    homepage: 'https://nextui.org',
    docsBase: null,
  },

  radix: {
    display: 'Radix UI',
    package: '@radix-ui/themes',
    description: 'Unstyled, accessible primitives. The headless layer beneath shadcn and most modern UI systems.',
    category: 'ui',
    useCases: ['dashboard', 'saas', 'custom-design'],
    requires: [],
    install: {
      commands: ['npm install @radix-ui/themes'],
      setup: [
        "1. Import '@radix-ui/themes/styles.css' in your root file",
        '2. Wrap your app in a Theme component',
      ],
      configFiles: {},
      usage: `import '@radix-ui/themes/styles.css'
import { Theme, Button, TextField, Flex, Card, Text } from '@radix-ui/themes'

export default function App({ children }) {
  return <Theme>{children}</Theme>
}

// Usage
<Card>
  <Flex direction="column" gap="3">
    <Text as="label" size="2" weight="medium">Email</Text>
    <TextField.Root placeholder="you@example.com" />
    <Button>Sign in</Button>
  </Flex>
</Card>`,
    },
    components: [
      'Accordion','Alert Dialog','Aspect Ratio','Avatar','Badge','Box','Button',
      'Callout','Card','Checkbox','Code','Container','Context Menu','Data List',
      'Dialog','Dropdown Menu','Flex','Grid','Heading','Hover Card','Icon Button',
      'Inset','Kbd','Link','Popover','Progress','Radio','Scroll Area','Select',
      'Separator','Skeleton','Slider','Spinner','Switch','Table','Tabs','Text',
      'Text Area','Text Field','Tooltip',
    ],
    homepage: 'https://www.radix-ui.com',
    docsBase: null,
  },

  headlessui: {
    display: 'Headless UI',
    package: '@headlessui/react',
    description: 'Fully accessible, completely unstyled components from Tailwind Labs. Bring your own styles.',
    category: 'ui',
    useCases: ['custom-design', 'dashboard', 'saas'],
    requires: ['tailwind'],
    install: {
      commands: ['npm install @headlessui/react'],
      setup: ['Style everything with Tailwind CSS — no default styles are applied'],
      configFiles: {},
      usage: `import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'

function DropdownMenu() {
  return (
    <Menu as="div" className="relative">
      <MenuButton className="rounded-md bg-blue-600 px-4 py-2 text-white">
        Options
      </MenuButton>
      <Transition
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
      >
        <MenuItems className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black/5">
          <MenuItem>
            {({ focus }) => (
              <a className={\`\${focus ? 'bg-blue-50' : ''} block px-4 py-2 text-sm text-gray-700\`} href="#">
                Edit
              </a>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  )
}`,
    },
    components: ['Combobox','Dialog','Disclosure','Listbox','Menu','Popover','Radio Group','Switch','Tabs','Transition'],
    homepage: 'https://headlessui.com',
    docsBase: null,
  },

  // ── Icons ────────────────────────────────────────────────────────────────────

  lucide: {
    display: 'Lucide React',
    package: 'lucide-react',
    description: '1,500+ consistent open-source icons. The default icon set for shadcn/ui.',
    category: 'icons',
    useCases: ['dashboard', 'saas', 'landing', 'mobile', 'forms'],
    requires: [],
    install: {
      commands: ['npm install lucide-react'],
      setup: [],
      configFiles: {},
      usage: `import { Home, Settings, Bell, Search, ChevronRight, X } from 'lucide-react'

// Basic — defaults to 24x24, stroke-width 2
<Home />

// Custom size and stroke
<Settings size={20} strokeWidth={1.5} />

// With Tailwind classes
<Bell className="h-5 w-5 text-gray-500" />

// As an icon button
<button className="p-2 rounded-md hover:bg-gray-100">
  <Search className="h-4 w-4" />
</button>`,
      note: 'Browse all icons at lucide.dev',
    },
    components: [],
    homepage: 'https://lucide.dev',
    docsBase: null,
    configure: {
      stroke: (value) => `// Global stroke width — 3 options:

// ── Option 1: CSS variable (recommended — works globally)
// Add to your global CSS (index.css / globals.css):
:root {
  --lucide-stroke-width: ${value};
}
svg.lucide {
  stroke-width: var(--lucide-stroke-width);
}

// ── Option 2: Wrapper component (best for design systems)
// Create: src/components/ui/icon.tsx
import { type LucideIcon, type LucideProps } from 'lucide-react'

interface IconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon
}

export function Icon({ icon: LucideIcon, strokeWidth = ${value}, ...props }: IconProps) {
  return <LucideIcon strokeWidth={strokeWidth} {...props} />
}

// Usage:
import { Home, Bell } from 'lucide-react'
import { Icon } from '@/components/ui/icon'

<Icon icon={Home} size={20} />
<Icon icon={Bell} className="text-gray-500" />

// ── Option 3: Per-icon prop (one-off usage)
<Home strokeWidth={${value}} />
<Bell strokeWidth={${value}} size={20} />`,
    },
  },

  'react-icons': {
    display: 'React Icons',
    package: 'react-icons',
    description: '40+ icon packs in one library: Font Awesome, Material, Heroicons, Feather, Phosphor, and more.',
    category: 'icons',
    useCases: ['dashboard', 'saas', 'landing'],
    requires: [],
    install: {
      commands: ['npm install react-icons'],
      setup: ['Import from the specific pack prefix to keep your bundle lean'],
      configFiles: {},
      usage: `// Always import from the specific pack — never from 'react-icons' directly
import { FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa'   // Font Awesome
import { HiHome, HiSearch, HiBell } from 'react-icons/hi'          // Heroicons
import { MdEmail, MdSettings } from 'react-icons/md'               // Material Design
import { BiUser, BiCart, BiHeart } from 'react-icons/bi'           // Boxicons
import { TbDashboard, TbChart } from 'react-icons/tb'              // Tabler
import { RiAiGenerate } from 'react-icons/ri'                       // Remix Icons

// All icons accept size and color
<FaGithub size={24} />
<HiHome className="h-5 w-5 text-gray-600" />
<MdEmail color="#666" size={20} />

// Pack prefixes: fa, fa6, hi, hi2, md, bi, io, io5, ri, si, tb, fi, ai, bs, cg, di, gi, go, gr, im, lu, pi, rx, sl, ti, vsc, wi`,
    },
    components: [],
    homepage: 'https://react-icons.github.io/react-icons/',
    docsBase: null,
  },

  heroicons: {
    display: 'Heroicons',
    package: '@heroicons/react',
    description: '300 hand-crafted SVG icons from the Tailwind team. Outline, solid, and mini variants.',
    category: 'icons',
    useCases: ['landing', 'saas', 'dashboard'],
    requires: [],
    install: {
      commands: ['npm install @heroicons/react'],
      setup: [],
      configFiles: {},
      usage: `// Import from the size/variant you need
import { HomeIcon, BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { StarIcon, HeartIcon, CheckIcon } from '@heroicons/react/24/solid'
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { BoltIcon } from '@heroicons/react/16/solid'

// Variants: 24/outline, 24/solid, 20/solid, 16/solid
<HomeIcon className="h-6 w-6 text-gray-500" />
<StarIcon className="h-5 w-5 text-yellow-400" />
<XMarkIcon className="h-4 w-4" />`,
    },
    components: [],
    homepage: 'https://heroicons.com',
    docsBase: null,
  },

  // ── Animation ───────────────────────────────────────────────────────────────

  framer: {
    display: 'Framer Motion',
    package: 'framer-motion',
    description: 'Production-grade animation for React. Gestures, spring physics, layout transitions, scroll effects.',
    category: 'animation',
    useCases: ['landing', 'saas', 'mobile', 'dashboard'],
    requires: [],
    install: {
      commands: ['npm install framer-motion'],
      setup: [],
      configFiles: {},
      usage: `import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'

// Fade in on mount
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
  Hello
</motion.div>

// Hover + tap interactions
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
>
  Click me
</motion.button>

// Staggered list
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => (
    <motion.li key={i.id} variants={item}>{i.name}</motion.li>
  ))}
</motion.ul>

// Animate presence (mount/unmount)
<AnimatePresence>
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      Modal content
    </motion.div>
  )}
</AnimatePresence>`,
    },
    components: [],
    homepage: 'https://www.framer.com/motion/',
    docsBase: null,
  },

  'auto-animate': {
    display: 'AutoAnimate',
    package: '@formkit/auto-animate',
    description: 'One-line animation for lists and transitions. Add a ref — everything else is automatic.',
    category: 'animation',
    useCases: ['dashboard', 'saas', 'forms'],
    requires: [],
    install: {
      commands: ['npm install @formkit/auto-animate'],
      setup: [],
      configFiles: {},
      usage: `import { useAutoAnimate } from '@formkit/auto-animate/react'

function SortableList({ items }) {
  const [listRef] = useAutoAnimate()

  return (
    <ul ref={listRef}>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
// Items now animate automatically on add, remove, or reorder — no config needed.`,
    },
    components: [],
    homepage: 'https://auto-animate.formkit.com',
    docsBase: null,
  },

  // ── Forms ────────────────────────────────────────────────────────────────────

  'react-hook-form': {
    display: 'React Hook Form',
    package: 'react-hook-form',
    description: 'Performant form validation with minimal re-renders. Works with any UI library.',
    category: 'forms',
    useCases: ['forms', 'saas', 'dashboard', 'ecommerce'],
    requires: [],
    install: {
      commands: ['npm install react-hook-form zod @hookform/resolvers'],
      setup: ['Zod and @hookform/resolvers are optional but strongly recommended for schema validation'],
      configFiles: {},
      usage: `import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    await signIn(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <input {...register('email')} placeholder="Email" className="input" />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
      </div>
      <div>
        <input {...register('password')} type="password" placeholder="Password" className="input" />
        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}`,
    },
    components: [],
    homepage: 'https://react-hook-form.com',
    docsBase: null,
  },

  zod: {
    display: 'Zod',
    package: 'zod',
    description: 'TypeScript-first schema validation. Define a schema once — validate on client and server.',
    category: 'forms',
    useCases: ['forms', 'saas', 'api-validation'],
    requires: [],
    install: {
      commands: ['npm install zod'],
      setup: [],
      configFiles: {},
      usage: `import { z } from 'zod'

// Define a schema
const UserSchema = z.object({
  name:  z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  age:   z.number().min(18, 'Must be 18+').optional(),
  role:  z.enum(['admin', 'user', 'guest']).default('user'),
  tags:  z.array(z.string()).max(5).optional(),
})

// TypeScript type inferred automatically
type User = z.infer<typeof UserSchema>

// Parse (throws on failure)
const user = UserSchema.parse({ name: 'Leo', email: 'leo@example.com', role: 'admin' })

// Safe parse (returns { success, data } or { success, error })
const result = UserSchema.safeParse(rawInput)
if (result.success) {
  console.log(result.data.name)
} else {
  console.log(result.error.flatten().fieldErrors)
}`,
    },
    components: [],
    homepage: 'https://zod.dev',
    docsBase: null,
  },

  // ── State Management ─────────────────────────────────────────────────────────

  zustand: {
    display: 'Zustand',
    package: 'zustand',
    description: 'Minimal state management with no boilerplate and no providers.',
    category: 'state',
    useCases: ['dashboard', 'saas', 'ecommerce', 'mobile'],
    requires: [],
    install: {
      commands: ['npm install zustand'],
      setup: [],
      configFiles: {},
      usage: `import { create } from 'zustand'

// Define a store with state and actions together
interface CartStore {
  items: { id: string; name: string; qty: number }[]
  addItem: (item: { id: string; name: string }) => void
  removeItem: (id: string) => void
  clear: () => void
}

export const useCart = create<CartStore>((set) => ({
  items: [],
  addItem: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.id === item.id)
      if (existing) return { items: s.items.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) }
      return { items: [...s.items, { ...item, qty: 1 }] }
    }),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
}))

// In any component — no provider needed
function CartIcon() {
  const items = useCart((s) => s.items)
  return <span>{items.length}</span>
}`,
    },
    components: [],
    homepage: 'https://zustand-demo.pmnd.rs',
    docsBase: null,
  },

  'tanstack-query': {
    display: 'TanStack Query',
    package: '@tanstack/react-query',
    description: 'Server state management. Handles fetching, caching, background updates, and loading states.',
    category: 'state',
    useCases: ['dashboard', 'saas', 'ecommerce'],
    requires: [],
    install: {
      commands: ['npm install @tanstack/react-query'],
      setup: ['Wrap your app root in QueryClientProvider'],
      configFiles: {},
      usage: `import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()

// Root layout
export default function App({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Fetch data in any component
function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
    staleTime: 60_000,
  })

  if (isLoading) return <Spinner />
  if (error) return <Error message={error.message} />

  return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// Mutate with automatic cache invalidation
const qc = useQueryClient()
const { mutate } = useMutation({
  mutationFn: (user) => fetch('/api/users', { method: 'POST', body: JSON.stringify(user) }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
})`,
    },
    components: [],
    homepage: 'https://tanstack.com/query',
    docsBase: null,
  },

  // ── Data / Tables / Charts ───────────────────────────────────────────────────

  'tanstack-table': {
    display: 'TanStack Table',
    package: '@tanstack/react-table',
    description: 'Headless table engine with sorting, filtering, pagination, and grouping. Bring your own styles.',
    category: 'data',
    useCases: ['dashboard', 'enterprise', 'saas'],
    requires: [],
    install: {
      commands: ['npm install @tanstack/react-table'],
      setup: [],
      configFiles: {},
      usage: `import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender,
  type ColumnDef,
} from '@tanstack/react-table'

type User = { id: string; name: string; email: string; role: string }

const columns: ColumnDef<User>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Role' },
]

function UsersTable({ data }: { data: User[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(hg => (
          <tr key={hg.id}>
            {hg.headers.map(h => (
              <th key={h.id} onClick={h.column.getToggleSortingHandler()} className="cursor-pointer">
                {flexRender(h.column.columnDef.header, h.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}`,
    },
    components: [],
    homepage: 'https://tanstack.com/table',
    docsBase: null,
  },

  recharts: {
    display: 'Recharts',
    package: 'recharts',
    description: 'Composable chart library built on D3. Line, bar, pie, area, radar, and more.',
    category: 'data',
    useCases: ['dashboard', 'analytics', 'saas'],
    requires: [],
    install: {
      commands: ['npm install recharts'],
      setup: [],
      configFiles: {},
      usage: `import {
  LineChart, BarChart, PieChart,
  Line, Bar, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

const data = [
  { month: 'Jan', revenue: 4200, users: 240 },
  { month: 'Feb', revenue: 3800, users: 198 },
  { month: 'Mar', revenue: 6100, users: 310 },
  { month: 'Apr', revenue: 5400, users: 280 },
]

// Line chart
function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="users" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}`,
    },
    components: [],
    homepage: 'https://recharts.org',
    docsBase: null,
  },

  // ── Utilities ────────────────────────────────────────────────────────────────

  clsx: {
    display: 'clsx + tailwind-merge',
    package: 'clsx',
    description: "The standard combo for conditional Tailwind classes. Prevents class conflicts — install both together.",
    category: 'utils',
    useCases: ['dashboard', 'saas', 'landing'],
    requires: ['tailwind'],
    install: {
      commands: ['npm install clsx tailwind-merge'],
      setup: ['Create a cn() utility — this is the standard pattern used by shadcn and most Tailwind projects'],
      configFiles: {
        'src/lib/utils.ts': `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Use this instead of clsx() or className="" concatenation throughout your app
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`,
      },
      usage: `import { cn } from '@/lib/utils'

function Button({ variant = 'default', size = 'md', className, children, disabled }) {
  return (
    <button
      disabled={disabled}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2',
        // Variant
        variant === 'default'  && 'bg-gray-900 text-white hover:bg-gray-700',
        variant === 'outline'  && 'border border-gray-300 hover:bg-gray-50',
        variant === 'ghost'    && 'hover:bg-gray-100',
        variant === 'danger'   && 'bg-red-600 text-white hover:bg-red-700',
        // Size
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        // Disabled
        disabled && 'pointer-events-none opacity-50',
        // Allow caller to override
        className
      )}
    >
      {children}
    </button>
  )
}`,
    },
    components: [],
    homepage: 'https://github.com/lukeed/clsx',
    docsBase: null,
  },

  dayjs: {
    display: 'Day.js',
    package: 'dayjs',
    description: 'Lightweight date library. 2KB, immutable, moment-compatible API.',
    category: 'utils',
    useCases: ['dashboard', 'forms', 'saas'],
    requires: [],
    install: {
      commands: ['npm install dayjs'],
      setup: [],
      configFiles: {},
      usage: `import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend with plugins you need
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)

dayjs().format('MMMM D, YYYY')                     // June 21, 2026
dayjs('2026-01-15').fromNow()                       // 5 months ago
dayjs().subtract(7, 'day').format('YYYY-MM-DD')     // 2026-06-14
dayjs.utc('2026-06-21T10:00:00Z').tz('America/New_York').format('h:mm A z')  // 6:00 AM EDT`,
    },
    components: [],
    homepage: 'https://day.js.org',
    docsBase: null,
  },
}

// ── Use-case recommendation stacks ───────────────────────────────────────────

const RECOMMENDATIONS = {
  mobile: {
    label: 'Mobile Web App',
    description: 'Touch-friendly, responsive UI optimized for small screens',
    stack: [
      { key: 'tailwind',          reason: 'Mobile-first responsive utilities, touch target sizing' },
      { key: 'shadcn',            reason: 'Accessible components with good touch ergonomics' },
      { key: 'lucide',            reason: 'Crisp icons at any size — essential for mobile nav' },
      { key: 'framer',            reason: 'Touch gestures, swipe, smooth page transitions' },
      { key: 'react-hook-form',   reason: 'Minimal re-renders — critical for mobile keyboard performance' },
      { key: 'zustand',           reason: 'Lightweight global state — no provider overhead' },
    ],
  },
  dashboard: {
    label: 'Dashboard / Admin Panel',
    description: 'Data-dense admin UI with tables, charts, filters, and complex interactions',
    stack: [
      { key: 'tailwind',          reason: 'Dense layout utilities, responsive grid, spacing system' },
      { key: 'shadcn',            reason: 'Data table, command palette, sidebar, charts — all built in' },
      { key: 'tanstack-table',    reason: 'Sort, filter, paginate large datasets headlessly' },
      { key: 'recharts',          reason: 'Composable charts that fit any container' },
      { key: 'tanstack-query',    reason: 'Real-time data, background refresh, optimistic updates' },
      { key: 'zustand',           reason: 'Filter state, selections, and UI state without boilerplate' },
    ],
  },
  landing: {
    label: 'Landing Page / Marketing Site',
    description: 'Fast, visually polished public-facing page',
    stack: [
      { key: 'tailwind',          reason: 'Rapid layout, zero unused CSS, responsive by default' },
      { key: 'framer',            reason: 'Scroll-triggered animations, hero transitions, scroll effects' },
      { key: 'lucide',            reason: 'Feature section icons, checkmarks, UI accents' },
      { key: 'shadcn',            reason: 'Waitlist forms, CTAs, and interactive sections' },
    ],
  },
  saas: {
    label: 'SaaS Product',
    description: 'Full product with auth, settings, billing, onboarding, and complex user flows',
    stack: [
      { key: 'tailwind',          reason: 'Design system foundation — CSS variables, theming' },
      { key: 'shadcn',            reason: 'Full component library you own and can customize fully' },
      { key: 'react-hook-form',   reason: 'Auth forms, settings, and multi-step onboarding' },
      { key: 'zod',               reason: 'Schema validation shared between client and server' },
      { key: 'tanstack-query',    reason: 'API state, optimistic UI, cache invalidation' },
      { key: 'zustand',           reason: 'User preferences, feature flags, global UI state' },
      { key: 'framer',            reason: 'Onboarding animations, micro-interactions, page transitions' },
    ],
  },
  forms: {
    label: 'Forms-Heavy App',
    description: 'Multi-step forms, conditional logic, complex validation',
    stack: [
      { key: 'react-hook-form',   reason: 'Industry standard — best performance and DX for forms' },
      { key: 'zod',               reason: 'Schema-driven validation with full TypeScript inference' },
      { key: 'shadcn',            reason: 'Form components with built-in accessible error states' },
      { key: 'tailwind',          reason: 'Focus states, layout utilities, responsive form stacks' },
    ],
  },
  ecommerce: {
    label: 'E-commerce',
    description: 'Product catalog, cart, checkout, and order management',
    stack: [
      { key: 'tailwind',          reason: 'Product grid, image sizing, responsive breakpoints' },
      { key: 'shadcn',            reason: 'Dialogs, drawers, and select — all commerce patterns' },
      { key: 'tanstack-query',    reason: 'Product data, inventory, real-time price updates' },
      { key: 'zustand',           reason: 'Cart state across the full app — persisted to localStorage' },
      { key: 'react-hook-form',   reason: 'Checkout and address validation' },
      { key: 'zod',               reason: 'Checkout form validation shared with server' },
    ],
  },
  animation: {
    label: 'Animation-focused',
    description: 'Rich motion, scroll effects, and interactive visual experiences',
    stack: [
      { key: 'framer',            reason: 'The most capable React animation library — gestures, layout, spring physics' },
      { key: 'auto-animate',      reason: 'Zero-config list and layout animations alongside Framer' },
      { key: 'tailwind',          reason: 'CSS transition and transform utilities for simpler motion' },
    ],
  },
  minimal: {
    label: 'Minimal / Custom Design System',
    description: 'Clean foundation without visual opinions — build your own components',
    stack: [
      { key: 'tailwind',          reason: 'Styling without any component lock-in' },
      { key: 'headlessui',        reason: 'Accessibility behavior with zero default styles' },
      { key: 'lucide',            reason: 'Clean icons that match any aesthetic' },
      { key: 'clsx',              reason: 'Class merging utility — essential for component variants' },
      { key: 'framer',            reason: 'Add motion only where you want it' },
    ],
  },
}

// ── Category display names ────────────────────────────────────────────────────

const CATEGORIES = {
  ui:        'UI Components',
  icons:     'Icons',
  animation: 'Animation',
  forms:     'Forms & Validation',
  state:     'State Management',
  styling:   'Styling',
  data:      'Data, Tables & Charts',
  utils:     'Utilities',
}

module.exports = { CATALOG, RECOMMENDATIONS, CATEGORIES }
