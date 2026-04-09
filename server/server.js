import cors from 'cors'
import express from 'express'
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

app.use(cors())
app.use(express.json())

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex')
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

app.get('/api/embeds', async (request, response) => {
  const normalizedEmail = normalizeEmail(request.query.email)
  const database = await readDatabase()
  const embeds = database.embeds
    .filter((embed) => embed.userEmail === normalizedEmail)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))

  return response.json({ embeds })
})

app.post('/api/embeds', async (request, response) => {
  const { email, type, sourceUrl, embedCode } = request.body || {}
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !type || !sourceUrl || !embedCode) {
    return response.status(400).json({ message: 'Missing embed payload.' })
  }

  const database = await readDatabase()
  const existingUser = database.users.find((user) => user.email === normalizedEmail)

  if (!existingUser) {
    return response.status(404).json({ message: 'Account not found.' })
  }

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

app.use(express.static(publicPath))
app.use(express.static(distPath))

app.get('*', async (_request, response, next) => {
  try {
    await fs.access(path.join(distPath, 'index.html'))
    response.sendFile(path.join(distPath, 'index.html'))
  } catch {
    next()
  }
})

ensureDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Mo7mels server running on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error('Failed to start API server', error)
    process.exit(1)
  })