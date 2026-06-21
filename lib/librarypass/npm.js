const { CATALOG } = require('./catalog')

// Resolve a friendly name to an npm package name
function resolvePackage(library) {
  const key = (library || '').toLowerCase().trim()
  const entry = CATALOG[key]
  if (entry) return entry.package
  // Try matching by package name directly
  const byPkg = Object.values(CATALOG).find(e => e.package === library)
  if (byPkg) return byPkg.package
  return library
}

// Resolve friendly name to catalog key
function resolveKey(library) {
  const lower = (library || '').toLowerCase().trim()
  if (CATALOG[lower]) return lower
  // Match by display name (case-insensitive)
  const match = Object.entries(CATALOG).find(([, e]) =>
    e.display.toLowerCase() === lower || e.package === lower
  )
  return match ? match[0] : lower
}

async function fetchNpm(pkg) {
  const encoded = encodeURIComponent(pkg).replace('%40', '@')
  const res = await fetch(`https://registry.npmjs.org/${encoded}`)
  if (!res.ok) throw new Error(`npm returned ${res.status} for "${pkg}"`)
  return res.json()
}

async function getLatestVersion(library) {
  const pkg = resolvePackage(library)
  const data = await fetchNpm(pkg)
  const version = data['dist-tags']?.latest || 'unknown'
  return {
    library: pkg,
    version,
    install: `npm install ${pkg}@${version}`,
    installLatest: `npm install ${pkg}@latest`,
  }
}

async function getPackageInfo(library) {
  const pkg = resolvePackage(library)
  const data = await fetchNpm(pkg)
  const version = data['dist-tags']?.latest || 'unknown'
  const versionData = data.versions?.[version] || {}

  let weeklyDownloads = null
  try {
    const encoded = encodeURIComponent(pkg).replace('%40', '@')
    const dlRes = await fetch(`https://api.npmjs.org/downloads/point/last-week/${encoded}`)
    if (dlRes.ok) {
      const dl = await dlRes.json()
      weeklyDownloads = dl.downloads ?? null
    }
  } catch (_) {}

  return {
    name: pkg,
    version,
    description: data.description || '',
    homepage: versionData.homepage || data.homepage || '',
    license: versionData.license || data.license || '',
    peerDependencies: versionData.peerDependencies || {},
    weeklyDownloads,
    npmUrl: `https://www.npmjs.com/package/${pkg}`,
  }
}

async function getChangelog(library, limit = 10) {
  const pkg = resolvePackage(library)
  const data = await fetchNpm(pkg)
  const time = data.time || {}
  const versions = Object.entries(time)
    .filter(([v]) => v !== 'created' && v !== 'modified')
    .sort((a, b) => new Date(b[1]) - new Date(a[1]))
    .slice(0, limit)
    .map(([version, date]) => ({ version, date: new Date(date).toISOString().slice(0, 10) }))
  return { library: pkg, versions }
}

async function searchLibraries(query, limit = 8) {
  const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`)
  if (!res.ok) throw new Error(`npm search returned ${res.status}`)
  const data = await res.json()
  return (data.objects || []).map(o => ({
    name: o.package.name,
    version: o.package.version,
    description: o.package.description || '',
    score: Math.round((o.score?.final || 0) * 100) / 100,
  }))
}

module.exports = { resolvePackage, resolveKey, getLatestVersion, getPackageInfo, getChangelog, searchLibraries }
