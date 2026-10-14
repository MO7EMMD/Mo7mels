import { Pool } from 'pg'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'db.json')

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
const usePostgres = Boolean(connectionString)
const pool = usePostgres ? new Pool({ connectionString }) : null

function normalizeUser(row) {
  if (!row) return null
  return {
    ...row,
    passwordHash: row.password_hash || row.passwordHash,
    otpCode: row.otp_code || row.otpCode,
    otpExpiresAt: row.otp_expires_at || row.otpExpiresAt,
    createdAt: row.created_at || row.createdAt,
  }
}

function normalizeSession(row) {
  if (!row) return null
  return {
    ...row,
    userEmail: row.user_email || row.userEmail,
    expiresAt: row.expires_at || row.expiresAt,
  }
}

function normalizeEmbed(row) {
  if (!row) return null
  return {
    ...row,
    userEmail: row.user_email || row.userEmail,
    sourceUrl: row.source_url || row.sourceUrl,
    embedCode: row.embed_code || row.embedCode,
    title: row.title || '',
    createdAt: row.created_at || row.createdAt,
  }
}

function normalizeSubscription(row) {
  if (!row) return null
  return {
    ...row,
    userEmail: row.user_email || row.userEmail,
    planKey: row.plan_key || row.planKey,
    subscriptionId: row.subscription_id || row.subscriptionId,
    activatedAt: row.activated_at || row.activatedAt,
  }
}

async function initPostgres() {
  if (!usePostgres) {
    return
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      verified BOOLEAN DEFAULT FALSE,
      otp_code TEXT,
      otp_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_email TEXT REFERENCES users(email) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS embeds (
      id SERIAL PRIMARY KEY,
      user_email TEXT REFERENCES users(email) ON DELETE CASCADE,
      type TEXT,
      source_url TEXT,
      embed_code TEXT,
      title TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE embeds ADD COLUMN IF NOT EXISTS title TEXT;

    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_email TEXT REFERENCES users(email) ON DELETE CASCADE,
      plan_key TEXT,
      subscription_id TEXT,
      status TEXT,
      activated_at TIMESTAMPTZ
    );
  `)
}

async function ensureJsonDb() {
  await fs.mkdir(dataDir, { recursive: true })

  try {
    await fs.access(dbPath)
  } catch {
    await fs.writeFile(
      dbPath,
      JSON.stringify({ users: [], sessions: [], embeds: [], subscriptions: [] }, null, 2),
      'utf8',
    )
  }
}

async function readJsonDb() {
  await ensureJsonDb()
  const raw = await fs.readFile(dbPath, 'utf8')

  try {
    const data = JSON.parse(raw)
    return {
      users: Array.isArray(data.users) ? data.users : [],
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      embeds: Array.isArray(data.embeds) ? data.embeds : [],
      subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : [],
    }
  } catch {
    return { users: [], sessions: [], embeds: [], subscriptions: [] }
  }
}

async function writeJsonDb(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8')
}

function nextId(collection) {
  return collection.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

initPostgres().catch((error) => {
  console.error('Failed to initialize database:', error)
})

export async function getUserByEmail(email) {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
    return normalizeUser(res.rows[0] || null)
  }

  const data = await readJsonDb()
  const user = data.users.find((item) => String(item.email || '').toLowerCase() === String(email || '').toLowerCase())
  return normalizeUser(user || null)
}

export async function createUser({ name, email, password_hash, otp_code, otp_expires_at, verified = false }) {
  if (usePostgres) {
    const res = await pool.query(
      `INSERT INTO users (name, email, password_hash, otp_code, otp_expires_at, verified)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email, password_hash, otp_code || null, otp_expires_at || null, verified],
    )
    return normalizeUser(res.rows[0])
  }

  const data = await readJsonDb()
  const user = {
    id: nextId(data.users),
    name,
    email,
    passwordHash: password_hash,
    otpCode: otp_code || null,
    otpExpiresAt: otp_expires_at || null,
    verified,
    createdAt: new Date().toISOString(),
  }
  data.users.push(user)
  await writeJsonDb(data)
  return normalizeUser(user)
}

export async function updateUserByEmail(email, updates = {}) {
  if (usePostgres) {
    const fields = []
    const values = []
    let idx = 1

    for (const [k, v] of Object.entries(updates)) {
      fields.push(`${k} = $${idx++}`)
      values.push(v)
    }

    if (fields.length === 0) return getUserByEmail(email)

    values.push(email)
    const res = await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE email = $${idx} RETURNING *`, values)
    return normalizeUser(res.rows[0] || null)
  }

  const data = await readJsonDb()
  const index = data.users.findIndex((item) => String(item.email || '').toLowerCase() === String(email || '').toLowerCase())
  if (index === -1) return null

  const user = data.users[index]
  const mapped = {
    name: updates.name,
    email: updates.email,
    passwordHash: updates.password_hash ?? updates.passwordHash,
    otpCode: updates.otp_code ?? updates.otpCode,
    otpExpiresAt: updates.otp_expires_at ?? updates.otpExpiresAt,
    verified: updates.verified,
  }

  for (const [key, value] of Object.entries(mapped)) {
    if (value !== undefined) {
      user[key] = value
    }
  }

  data.users[index] = user
  await writeJsonDb(data)
  return normalizeUser(user)
}

export async function updateEmailsForUser(oldEmail, newEmail) {
  if (usePostgres) {
    await pool.query('UPDATE sessions SET user_email = $1 WHERE user_email = $2', [newEmail, oldEmail])
    await pool.query('UPDATE embeds SET user_email = $1 WHERE user_email = $2', [newEmail, oldEmail])
    await pool.query('UPDATE subscriptions SET user_email = $1 WHERE user_email = $2', [newEmail, oldEmail])
    return
  }

  const data = await readJsonDb()
  data.sessions = data.sessions.map((item) => (item.userEmail === oldEmail ? { ...item, userEmail: newEmail } : item))
  data.embeds = data.embeds.map((item) => (item.userEmail === oldEmail ? { ...item, userEmail: newEmail } : item))
  data.subscriptions = data.subscriptions.map((item) => (item.userEmail === oldEmail ? { ...item, userEmail: newEmail } : item))
  await writeJsonDb(data)
}

export async function deleteUserByEmail(email) {
  if (usePostgres) {
    await pool.query('DELETE FROM users WHERE email = $1', [email])
    return true
  }

  const data = await readJsonDb()
  data.users = data.users.filter((item) => String(item.email || '').toLowerCase() !== String(email || '').toLowerCase())
  await writeJsonDb(data)
  return true
}

export async function createSession(token, userEmail, expiresAt) {
  if (usePostgres) {
    await pool.query(
      'INSERT INTO sessions (token, user_email, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET user_email = EXCLUDED.user_email, expires_at = EXCLUDED.expires_at',
      [token, userEmail, expiresAt],
    )
    return { token, userEmail, expiresAt }
  }

  const data = await readJsonDb()
  const index = data.sessions.findIndex((item) => item.token === token)
  const session = { token, userEmail, expiresAt }
  if (index === -1) {
    data.sessions.push(session)
  } else {
    data.sessions[index] = session
  }
  await writeJsonDb(data)
  return session
}

export async function getSession(token) {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM sessions WHERE token = $1 LIMIT 1', [token])
    return normalizeSession(res.rows[0] || null)
  }

  const data = await readJsonDb()
  const session = data.sessions.find((item) => item.token === token)
  return normalizeSession(session || null)
}

export async function addEmbed({ userEmail, type, sourceUrl, embedCode, title = '' }) {
  if (usePostgres) {
    const res = await pool.query(
      `INSERT INTO embeds (user_email, type, source_url, embed_code, title) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userEmail, type, sourceUrl, embedCode, title || null],
    )
    return normalizeEmbed(res.rows[0])
  }

  const data = await readJsonDb()
  const embed = {
    id: nextId(data.embeds),
    userEmail,
    type,
    sourceUrl,
    embedCode,
    title: title || '',
    createdAt: new Date().toISOString(),
  }
  data.embeds.push(embed)
  await writeJsonDb(data)
  return normalizeEmbed(embed)
}

export async function getEmbedsByUser(userEmail, limit = 200000) {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM embeds WHERE user_email = $1 ORDER BY created_at DESC LIMIT $2', [userEmail, limit])
    return (res.rows || []).map(normalizeEmbed)
  }

  const data = await readJsonDb()
  return data.embeds
    .filter((item) => item.userEmail === userEmail)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map(normalizeEmbed)
}

export async function deleteEmbedById(embedId, userEmail) {
  if (usePostgres) {
    await pool.query('DELETE FROM embeds WHERE id = $1 AND user_email = $2', [embedId, userEmail])
    return
  }

  const data = await readJsonDb()
  data.embeds = data.embeds.filter(
    (item) => !(String(item.id) === String(embedId) && item.userEmail === userEmail),
  )
  await writeJsonDb(data)
}

export async function getSubscriptionByUser(userEmail) {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM subscriptions WHERE user_email = $1 LIMIT 1', [userEmail])
    return normalizeSubscription(res.rows[0] || null)
  }

  const data = await readJsonDb()
  const subscription = data.subscriptions.find((item) => item.userEmail === userEmail)
  return normalizeSubscription(subscription || null)
}

export async function upsertSubscription({ userEmail, planKey, subscriptionId, status, activatedAt }) {
  if (usePostgres) {
    await pool.query('DELETE FROM subscriptions WHERE user_email = $1', [userEmail])
    const res = await pool.query(
      `INSERT INTO subscriptions (user_email, plan_key, subscription_id, status, activated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userEmail, planKey, subscriptionId, status, activatedAt],
    )
    return normalizeSubscription(res.rows[0])
  }

  const data = await readJsonDb()
  data.subscriptions = data.subscriptions.filter((item) => item.userEmail !== userEmail)
  const subscription = {
    id: nextId(data.subscriptions),
    userEmail,
    planKey,
    subscriptionId,
    status,
    activatedAt,
  }
  data.subscriptions.push(subscription)
  await writeJsonDb(data)
  return normalizeSubscription(subscription)
}

export async function deleteSubscriptionByUser(userEmail) {
  if (usePostgres) {
    await pool.query('DELETE FROM subscriptions WHERE user_email = $1', [userEmail])
    return true
  }

  const data = await readJsonDb()
  data.subscriptions = data.subscriptions.filter((item) => item.userEmail !== userEmail)
  await writeJsonDb(data)
  return true
}
