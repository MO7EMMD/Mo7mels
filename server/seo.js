// SEO URLs follow the public canonical domain independently of OAuth settings.
export const SEO_ORIGIN = 'https://mo7mels.com'

const publicPages = [
  ['/', 'mo7mels | Grade 12 Oman & Study Tools', 'Free Grade 12 Oman textbooks, Physics lessons and simulations, Mathematics practice, exams, and study tools from mo7mels.'],
  ['/books', 'Grade 12 Textbooks | mo7mels', 'Open official Oman Grade 12 student and activity book PDFs directly, organized by subject and semester.'],
  ['/physics', 'Physics Lessons & Simulations | mo7mels', 'Explore nine Grade 12 Physics units with lessons, laws, formula sheets, practice, and interactive simulations.'],
  ['/physics/gravitational-fields', 'Gravitational Fields | mo7mels', 'Review gravitational field strength, potential, forces, and circular orbits with Grade 12 Physics practice.'],
  ['/physics/electric-fields', 'Electric Fields & Coulomb’s Law | mo7mels', 'Review electric force, field strength, potential, and Coulomb’s law with examples and practice.'],
  ['/physics/electric-circuits', 'Electric Circuits | mo7mels', 'Study current, voltage, resistance, electrical power, and Kirchhoff’s laws for Grade 12 Physics.'],
  ['/physics/capacitors', 'Capacitors | mo7mels', 'Review capacitance, charge, stored energy, capacitor networks, and discharge with practice and simulations.'],
  ['/physics/magnetism-induction', 'Magnetism & Electromagnetic Induction | mo7mels', 'Study magnetic forces, magnetic flux, Faraday’s law, and electromagnetic induction.'],
  ['/physics/waves', 'Waves & Sound | mo7mels', 'Review wave speed, frequency, wavelength, energy transfer, and sound with practice and simulations.'],
  ['/physics/superposition', 'Wave Superposition | mo7mels', 'Study interference, diffraction, the double-slit experiment, and standing waves for Grade 12 Physics.'],
  ['/physics/quantum-physics', 'Quantum Physics | mo7mels', 'Review photons, the photoelectric effect, wave-particle models, and atomic energy transitions.'],
  ['/physics/nuclear-physics', 'Nuclear Physics | mo7mels', 'Review nuclear equations, binding energy, radioactive decay, and half-life with Grade 12 practice.'],
  ['/mathematics', 'رياضيات الصف الثاني عشر | mo7mels', 'قوانين وتدريبات الرياضيات الأساسية والمتقدمة للصف الثاني عشر بالشرح والرموز العربية، مع كتب الطالب والنشاط وأوراق المراجعة.'],
  ['/mathematics/advanced', 'الرياضيات المتقدمة | mo7mels', 'راجع قوانين الرياضيات المتقدمة وتدريباتها بالرموز العربية: س، ص، د(س)، جا، جتا، لط، مع كتب الطالب والنشاط.'],
  ['/mathematics/basic', 'الرياضيات الأساسية | mo7mels', 'راجع قوانين الرياضيات الأساسية ومسائلها بالشرح والرموز والأرقام العربية، وافتح الكتب وأوراق التدريب في تبويب جديد.'],
  ['/worksheets', 'Grade 12 Worksheets | mo7mels', 'Practice Grade 12 subjects with printable worksheets and answers saved on your own device.'],
  ['/exams', 'Grade 12 Final Exams | mo7mels', 'Find Grade 12 exam papers, revision resources, and answer keys linked from their original sources.'],
  ['/whiteboard', 'Online Study Whiteboard | mo7mels', 'Write, draw, erase, and save your study notes as an image with the mo7mels online whiteboard.'],
  ['/resources', 'Ministry of Education Resources | mo7mels', 'Browse official Oman Ministry of Education platforms, libraries, curriculum links, and digital services.'],
  ['/links', 'Useful Education Links | mo7mels', 'Find official education information, news, services, and contact links for learners in Oman.'],
  ['/portfolio/', 'mo7mels | Digital Creator & Web Projects', 'Explore mo7mels web projects, creator tools, open source work, and contact links.'],
  ['/project', 'مشروع', 'مشروع من mo7mels: تسليم مشاريع المواد ومتابعة الدرجات وملاحظات المعلم في مكان واحد.'],
]

export const PUBLIC_PAGES = Object.freeze(publicPages.map(([pathname, title, description]) => Object.freeze({ pathname, title, description })))
const pagesByPath = new Map(PUBLIC_PAGES.map(page => [page.pathname, page]))

function normalizePath(pathname) {
  const path = new URL(pathname || '/', SEO_ORIGIN).pathname
  if (path === '/portfolio' || path === '/portfolio/') return '/portfolio/'
  return path === '/' ? path : path.replace(/\/+$/, '')
}

export function getPageMetadata(pathname) {
  const path = normalizePath(pathname)
  const page = pagesByPath.get(path)
  if (page) return { ...page, canonical: SEO_ORIGIN + path, index: true }
  const privateLabel = path === '/login' ? 'Sign In' : path === '/signup' ? 'Create Account' : path.startsWith('/dashboard') ? 'Account Dashboard' : 'mo7mels'
  return { pathname: path, title: `${privateLabel} | mo7mels`, description: 'Access your mo7mels account.', canonical: SEO_ORIGIN + path, index: false }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

function replaceMeta(html, attribute, name, content) {
  const tag = `<meta ${attribute}="${name}" content="${escapeHtml(content)}" />`
  const pattern = new RegExp(`<meta\\b[^>]*\\b${attribute}=["']${name}["'][^>]*>`, 'i')
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `${tag}\n</head>`)
}

export function renderSeoHtml(html, pathname) {
  const page = getPageMetadata(pathname)
  let rendered = html.replaceAll('__SITE_URL__', SEO_ORIGIN)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapeHtml(page.canonical)}" />`)
  for (const [attribute, name, content] of [
    ['name', 'description', page.description], ['name', 'robots', page.index ? 'index,follow' : 'noindex,follow'],
    ['property', 'og:site_name', 'mo7mels'], ['property', 'og:title', page.title], ['property', 'og:description', page.description], ['property', 'og:url', page.canonical],
    ['name', 'twitter:title', page.title], ['name', 'twitter:description', page.description],
  ]) rendered = replaceMeta(rendered, attribute, name, content)
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': SEO_ORIGIN + '/#website', name: 'mo7mels', alternateName: 'Mo7mels', url: SEO_ORIGIN + '/' },
      { '@type': 'WebPage', '@id': page.canonical + '#webpage', url: page.canonical, name: page.title, description: page.description, isPartOf: { '@id': SEO_ORIGIN + '/#website' } },
    ],
  }
  rendered = rendered.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')
  return rendered.replace('</head>', `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>\n</head>`)
}

export function buildSitemapXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PUBLIC_PAGES.map(page => `  <url><loc>${escapeHtml(SEO_ORIGIN + page.pathname)}</loc></url>`).join('\n')}\n</urlset>`
}

export function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /project/api/\n\nSitemap: ${SEO_ORIGIN}/sitemap.xml\n`
}
