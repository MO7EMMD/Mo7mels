import cors from 'cors'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'db.json')
const publicPath = path.join(__dirname, '..', 'public')
const distPath = path.join(__dirname, '..', 'dist')
const app = express()
const port = process.env.PORT || 3001
const configuredSiteUrl = normalizeSiteUrl(process.env.SITE_URL)
const canonicalRedirectEnabled = process.env.ENABLE_CANONICAL_REDIRECT === 'true'
const isProduction = process.env.NODE_ENV === 'production'
const defaultSupabaseUrl = 'https://sygxmbqvtcxjwjabnbpa.supabase.co'
const defaultSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Z3htYnF2dGN4andqYWJuYnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2OTk2MjQsImV4cCI6MjA5MTI3NTYyNH0.WQv7YYe1XDc3Z9Yf8ayl0-oEji2fQNuhGiLj-m-qTew'
const supabaseUrl = process.env.SUPABASE_URL || defaultSupabaseUrl
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || defaultSupabaseAnonKey
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)
const supabaseAuthClient = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

app.set('trust proxy', true)

app.use(cors())
app.use(express.json())

function normalizeSiteUrl(rawUrl) {
  if (!rawUrl) {
    return ''
  }

  try {
    const parsedUrl = new URL(rawUrl)
    return parsedUrl.origin
  } catch {
    return ''
  }
}

function getSiteUrl() {
  return configuredSiteUrl
}

function buildSitemapXml(siteUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/signup</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/dashboard</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`
}

function buildRobotsTxt(siteUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex')
}

function getBearerToken(request) {
  const authorizationHeader = String(request.get('authorization') || '')

  if (!authorizationHeader.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return authorizationHeader.slice(7).trim()
}

async function requireSupabaseUser(request, response, next) {
  if (!supabaseAuthClient) {
    return response.status(503).json({
      message: 'Supabase auth is not configured on the server.',
    })
  }

  const accessToken = getBearerToken(request)

  if (!accessToken) {
    return response.status(401).json({ message: 'Missing authorization token.' })
  }

  const {
    data: { user },
    error,
  } = await supabaseAuthClient.auth.getUser(accessToken)

  if (error || !user?.email) {
    return response.status(401).json({ message: 'Invalid or expired authorization token.' })
  }

  request.authUser = user
  return next()
}

async function ensureDatabase() {
  await fs.mkdir(dataDir, { recursive: true })

  try {
    await fs.access(dbPath)
  } catch {
    await fs.writeFile(dbPath, JSON.stringify({ users: [], embeds: [] }, null, 2), 'utf8')
  }
}

async function readDatabase() {
  await ensureDatabase()
  const raw = await fs.readFile(dbPath, 'utf8')

  try {
    const parsed = JSON.parse(raw)
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      embeds: Array.isArray(parsed.embeds) ? parsed.embeds : [],
    }
  } catch {
    return { users: [], embeds: [] }
  }
}

async function writeDatabase(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8')
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  }
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.use((request, response, next) => {
  if (!canonicalRedirectEnabled || request.method !== 'GET' || !configuredSiteUrl) {
    return next()
  }

  const host = request.get('host')

  if (!host) {
    return next()
  }

  const requestOrigin = `${request.protocol}://${host}`

  if (requestOrigin === configuredSiteUrl) {
    return next()
  }

  return response.redirect(301, new URL(request.originalUrl, configuredSiteUrl).toString())
})

app.post('/api/auth/signup', async (request, response) => {
  const { name, email, password, confirmPassword } = request.body || {}
  const trimmedName = String(name || '').trim()
  const normalizedEmail = normalizeEmail(email)
  const normalizedPassword = String(password || '').trim()
  const normalizedConfirmPassword = String(confirmPassword || '').trim()

  if (!trimmedName) {
    return response.status(400).json({ message: 'Full name is required.' })
  }

  if (trimmedName.length < 3) {
    return response.status(400).json({ message: 'Name must be at least 3 characters.' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return response.status(400).json({ message: 'A valid email is required.' })
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(normalizedPassword)) {
    return response.status(400).json({ message: 'Password must be at least 8 characters and include letters and numbers.' })
  }

  if (normalizedPassword !== normalizedConfirmPassword) {
    return response.status(400).json({ message: 'Password confirmation does not match.' })
  }

  const database = await readDatabase()
  const existingUser = database.users.find((user) => user.email === normalizedEmail)

  if (existingUser) {
    return response.status(409).json({ message: 'This email is already registered.' })
  }

  const user = {
    id: Date.now(),
    name: trimmedName,
    email: normalizedEmail,
    passwordHash: hashPassword(normalizedPassword),
    createdAt: new Date().toISOString(),
  }

  database.users.push(user)
  await writeDatabase(database)

  return response.status(201).json({ user: toPublicUser(user) })
})

app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body || {}
  const normalizedEmail = normalizeEmail(email)
  const normalizedPassword = String(password || '').trim()

  const database = await readDatabase()
  const existingUser = database.users.find((user) => user.email === normalizedEmail)

  if (!existingUser) {
    return response.status(404).json({ message: 'No account was found with this email.' })
  }

  if (existingUser.passwordHash !== hashPassword(normalizedPassword)) {
    return response.status(401).json({ message: 'Incorrect password.' })
  }

  return response.json({ user: toPublicUser(existingUser) })
})

app.get('/api/embeds', requireSupabaseUser, async (request, response) => {
  const normalizedEmail = normalizeEmail(request.authUser.email)
  const database = await readDatabase()
  const embeds = database.embeds
    .filter((embed) => embed.userEmail === normalizedEmail)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))

  return response.json({ embeds })
})

app.post('/api/embeds', requireSupabaseUser, async (request, response) => {
  const { type, sourceUrl, embedCode } = request.body || {}
  const normalizedEmail = normalizeEmail(request.authUser.email)

  if (!type || !sourceUrl || !embedCode) {
    return response.status(400).json({ message: 'Missing embed payload.' })
  }

  const database = await readDatabase()

  const embed = {
    id: Date.now(),
    userEmail: normalizedEmail,
    type,
    sourceUrl,
    embedCode,
    createdAt: new Date().toISOString(),
  }

  database.embeds.unshift(embed)
  database.embeds = database.embeds.slice(0, 200)
  await writeDatabase(database)

  const embeds = database.embeds
    .filter((item) => item.userEmail === normalizedEmail)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))

  return response.status(201).json({ embed, embeds })
})

app.get('/robots.txt', (request, response) => {
  const siteUrl = getSiteUrl()

  if (!siteUrl) {
    return response.status(503).type('text/plain').send('SITE_URL is required for robots.txt in production.')
  }

  response.type('text/plain').send(buildRobotsTxt(siteUrl))
})

app.get('/sitemap.xml', (request, response) => {
  const siteUrl = getSiteUrl()

  if (!siteUrl) {
    return response.status(503).type('text/plain').send('SITE_URL is required for sitemap.xml in production.')
  }

  response.type('application/xml').send(buildSitemapXml(siteUrl))
})

app.use(express.static(publicPath))
app.use(express.static(distPath))

app.get('*', async (_request, response, next) => {
  try {
    const indexPath = path.join(distPath, 'index.html')
    await fs.access(indexPath)

    const siteUrl = getSiteUrl()

    if (!siteUrl) {
      return response.status(503).type('text/plain').send('SITE_URL is required for production HTML metadata.')
    }

    const html = await fs.readFile(indexPath, 'utf8')

    response.type('html').send(html.replaceAll('__SITE_URL__', siteUrl))
  } catch {
    next()
  }
})

ensureDatabase()
  .then(() => {
    if (isProduction && !configuredSiteUrl) {
      throw new Error('SITE_URL must be set in production.')
    }

    if (isProduction && !process.env.SUPABASE_URL) {
      console.warn('SUPABASE_URL is not set; falling back to project default value.')
    }

    if (isProduction && !process.env.SUPABASE_ANON_KEY) {
      console.warn('SUPABASE_ANON_KEY is not set; falling back to project default value.')
    }

    app.listen(port, () => {
      console.log(`Mo7mels server running on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error('Failed to start API server', error)
    process.exit(1)
  })