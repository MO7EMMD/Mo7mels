import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
const pool = new Pool({ connectionString })

function normalizeUser(row) {
  if (!row) return null
  return {
    ...row,
    passwordHash: row.password_hash,
    otpCode: row.otp_code,
    otpExpiresAt: row.otp_expires_at,
    createdAt: row.created_at,
  }
}

function normalizeSession(row) {
  if (!row) return null
  return {
    ...row,
    userEmail: row.user_email,
    expiresAt: row.expires_at,
  }
}

function normalizeEmbed(row) {
  if (!row) return null
  return {
    ...row,
    userEmail: row.user_email,
    sourceUrl: row.source_url,
    embedCode: row.embed_code,
    createdAt: row.created_at,
  }
}

function normalizeSubscription(row) {
  if (!row) return null
  return {
    ...row,
    userEmail: row.user_email,
    planKey: row.plan_key,
    subscriptionId: row.subscription_id,
    activatedAt: row.activated_at,
  }
}

async function init() {
  // create tables if they don't exist
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
      created_at TIMESTAMPTZ DEFAULT now()
    );

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

// initialize on import
init().catch((err) => {
  console.error('Failed to initialize database:', err)
})

export async function getUserByEmail(email) {
  const res = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
  return normalizeUser(res.rows[0] || null)
}

export async function createUser({ name, email, password_hash, otp_code, otp_expires_at, verified = false }) {
  const res = await pool.query(
    `INSERT INTO users (name, email, password_hash, otp_code, otp_expires_at, verified)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, email, password_hash, otp_code || null, otp_expires_at || null, verified],
  )
  return normalizeUser(res.rows[0])
}

export async function updateUserByEmail(email, updates = {}) {
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

export async function updateEmailsForUser(oldEmail, newEmail) {
  await pool.query('UPDATE sessions SET user_email = $1 WHERE user_email = $2', [newEmail, oldEmail])
  await pool.query('UPDATE embeds SET user_email = $1 WHERE user_email = $2', [newEmail, oldEmail])
  await pool.query('UPDATE subscriptions SET user_email = $1 WHERE user_email = $2', [newEmail, oldEmail])
}

export async function deleteUserByEmail(email) {
  await pool.query('DELETE FROM users WHERE email = $1', [email])
  return true
}

export async function createSession(token, userEmail, expiresAt) {
  await pool.query('INSERT INTO sessions (token, user_email, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET user_email = EXCLUDED.user_email, expires_at = EXCLUDED.expires_at', [token, userEmail, expiresAt])
  return { token, userEmail, expiresAt }
}

export async function getSession(token) {
  const res = await pool.query('SELECT * FROM sessions WHERE token = $1 LIMIT 1', [token])
  return normalizeSession(res.rows[0] || null)
}

export async function addEmbed({ userEmail, type, sourceUrl, embedCode }) {
  const res = await pool.query(
    `INSERT INTO embeds (user_email, type, source_url, embed_code) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userEmail, type, sourceUrl, embedCode],
  )
  return normalizeEmbed(res.rows[0])
}

export async function getEmbedsByUser(userEmail, limit = 200) {
  const res = await pool.query('SELECT * FROM embeds WHERE user_email = $1 ORDER BY created_at DESC LIMIT $2', [userEmail, limit])
  return (res.rows || []).map(normalizeEmbed)
}

export async function getSubscriptionByUser(userEmail) {
  const res = await pool.query('SELECT * FROM subscriptions WHERE user_email = $1 LIMIT 1', [userEmail])
  return normalizeSubscription(res.rows[0] || null)
}

export async function upsertSubscription({ userEmail, planKey, subscriptionId, status, activatedAt }) {
  // simple upsert by deleting existing then inserting
  await pool.query('DELETE FROM subscriptions WHERE user_email = $1', [userEmail])
  const res = await pool.query(
    `INSERT INTO subscriptions (user_email, plan_key, subscription_id, status, activated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userEmail, planKey, subscriptionId, status, activatedAt],
  )
  return normalizeSubscription(res.rows[0])
}

export async function deleteSubscriptionByUser(userEmail) {
  await pool.query('DELETE FROM subscriptions WHERE user_email = $1', [userEmail])
  return true
}
