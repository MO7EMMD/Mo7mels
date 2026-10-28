// Server-only database adapter. Keep privileged Supabase keys out of VITE_* values.
const TABLES = new Set(['users', 'sessions', 'embeds', 'subscriptions'])
const USER_FIELDS = new Map([
  ['name', 'name'], ['email', 'email'], ['verified', 'verified'],
  ['password_hash', 'password_hash'], ['passwordHash', 'password_hash'],
  ['otp_code', 'otp_code'], ['otpCode', 'otp_code'],
  ['otp_expires_at', 'otp_expires_at'], ['otpExpiresAt', 'otp_expires_at'],
  ['created_at', 'created_at'], ['createdAt', 'created_at'],
])

function normalizeUser(row) {
  return row ? { ...row, passwordHash: row.password_hash || row.passwordHash, otpCode: row.otp_code || row.otpCode, otpExpiresAt: row.otp_expires_at || row.otpExpiresAt, createdAt: row.created_at || row.createdAt } : null
}
function normalizeSession(row) {
  return row ? { ...row, userEmail: row.user_email || row.userEmail, expiresAt: row.expires_at || row.expiresAt } : null
}
function normalizeEmbed(row) {
  return row ? { ...row, userEmail: row.user_email || row.userEmail, sourceUrl: row.source_url || row.sourceUrl, embedCode: row.embed_code || row.embedCode, createdAt: row.created_at || row.createdAt } : null
}
function normalizeSubscription(row) {
  return row ? { ...row, userEmail: row.user_email || row.userEmail, planKey: row.plan_key || row.planKey, subscriptionId: row.subscription_id || row.subscriptionId, activatedAt: row.activated_at || row.activatedAt } : null
}

// URLSearchParams encodes this value; the filter operator and column are fixed.
function eq(value) {
  return `eq.${String(value)}`
}

export function createSupabaseDatabase(config = {}) {
  const rawUrl = config.SUPABASE_URL || ''
  const key = config.SUPABASE_SECRET_KEY || config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_SERVICE_KEY || ''
  let origin
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) throw new Error()
    origin = url.origin
  } catch {
    throw new Error('A valid HTTPS SUPABASE_URL is required for the server database.')
  }
  if (!key) throw new Error('A server-only SUPABASE_SECRET_KEY is required for the database.')
  const fetcher = config.fetch || globalThis.fetch
  const timeoutMs = config.timeoutMs || 30000

  async function request(table, { method = 'GET', query = {}, data, prefer = '', count = false } = {}) {
    if (!TABLES.has(table)) throw new Error('Unsupported database table.')
    const url = new URL(`/rest/v1/${table}`, origin)
    for (const [name, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(name, String(value))
    const headers = new Headers({ apikey: key, Accept: 'application/json' })
    // New secret keys belong in apikey; only the legacy JWT is a Bearer token.
    if (key.startsWith('eyJ')) headers.set('Authorization', `Bearer ${key}`)
    if (data !== undefined) headers.set('Content-Type', 'application/json')
    const preference = [prefer, count ? 'count=exact' : ''].filter(Boolean).join(',')
    if (preference) headers.set('Prefer', preference)
    const response = await fetcher(url.toString(), { method, headers, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(timeoutMs) })
    const text = await response.text()
    let parsed
    try { parsed = text ? JSON.parse(text) : null } catch { /* Validate the response below. */ }
    if (!response.ok) {
      const code = /^[A-Z0-9_]{1,20}$/.test(String(parsed?.code || '')) ? `, ${parsed.code}` : ''
      // Never echo remote messages, request bodies, tokens, or keys into errors/logs.
      const error = new Error(`Supabase database request failed (HTTP ${response.status}${code}).`)
      error.status = response.status
      if (code) error.code = parsed.code
      throw error
    }
    if (text && !Array.isArray(parsed)) throw new Error('Supabase returned an unexpected database response.')
    const range = response.headers.get('content-range')?.match(/\/(\d+)$/)
    return { rows: parsed || [], total: range ? Number(range[1]) : null }
  }

  const database = {
    getStorageMode() { return 'supabase-postgres' },

    async getUserByEmail(email) {
      const { rows } = await request('users', { query: { select: '*', email: eq(email), limit: 1 } })
      return normalizeUser(rows[0])
    },

    async createUser({ name, email, password_hash, otp_code, otp_expires_at, verified = false }) {
      const { rows } = await request('users', { method: 'POST', data: { name, email, password_hash: password_hash ?? null, otp_code: otp_code || null, otp_expires_at: otp_expires_at || null, verified }, prefer: 'return=representation' })
      if (!rows[0]) throw new Error('Supabase did not return the created user.')
      return normalizeUser(rows[0])
    },

    async updateUserByEmail(email, updates = {}) {
      const data = {}
      for (const [name, value] of Object.entries(updates)) {
        if (!USER_FIELDS.has(name)) throw new Error('Unsupported user update field.')
        if (value !== undefined) data[USER_FIELDS.get(name)] = value
      }
      if (!Object.keys(data).length) return database.getUserByEmail(email)
      const { rows } = await request('users', { method: 'PATCH', query: { email: eq(email) }, data, prefer: 'return=representation' })
      return normalizeUser(rows[0])
    },

    async updateEmailsForUser(oldEmail, newEmail) {
      // The caller creates the replacement user before moving these foreign keys.
      for (const table of ['sessions', 'embeds', 'subscriptions']) await request(table, { method: 'PATCH', query: { user_email: eq(oldEmail) }, data: { user_email: newEmail } })
    },

    async deleteUserByEmail(email) {
      await request('users', { method: 'DELETE', query: { email: eq(email) } })
      return true
    },

    async createSession(token, userEmail, expiresAt) {
      await request('sessions', { method: 'POST', query: { on_conflict: 'token' }, data: { token, user_email: userEmail, expires_at: expiresAt }, prefer: 'resolution=merge-duplicates' })
      return { token, userEmail, expiresAt }
    },

    async getSession(token) {
      const { rows } = await request('sessions', { query: { select: '*', token: eq(token), limit: 1 } })
      return normalizeSession(rows[0])
    },

    async deleteSession(token) {
      if (!token) return false
      const { rows } = await request('sessions', { method: 'DELETE', query: { token: eq(token), select: 'token' }, prefer: 'return=representation' })
      return rows.length > 0
    },

    async addEmbed({ userEmail, type, sourceUrl, embedCode }) {
      const { rows } = await request('embeds', { method: 'POST', data: { user_email: userEmail, type, source_url: sourceUrl, embed_code: embedCode }, prefer: 'return=representation' })
      if (!rows[0]) throw new Error('Supabase did not return the created embed.')
      return normalizeEmbed(rows[0])
    },

    async getEmbedsByUser(userEmail, limit = 200000) {
      const requested = Number(limit)
      if (!Number.isSafeInteger(requested) || requested < 0) throw new Error('Invalid saved-embed limit.')
      const rows = []
      while (rows.length < requested) {
        const pageSize = Math.min(500, requested - rows.length)
        const page = await request('embeds', { query: { select: '*', user_email: eq(userEmail), order: 'created_at.desc,id.desc', offset: rows.length, limit: pageSize }, count: true })
        rows.push(...page.rows)
        if (!page.rows.length || (page.total !== null ? rows.length >= page.total : page.rows.length < pageSize)) break
      }
      return rows.map(normalizeEmbed)
    },

    async deleteEmbedById(embedId, userEmail) {
      await request('embeds', { method: 'DELETE', query: { id: eq(embedId), user_email: eq(userEmail) } })
    },

    async getSubscriptionByUser(userEmail) {
      const { rows } = await request('subscriptions', { query: { select: '*', user_email: eq(userEmail), limit: 1 } })
      return normalizeSubscription(rows[0])
    },

    async upsertSubscription({ userEmail, planKey, subscriptionId, status, activatedAt }) {
      // A unique user_email index makes replacement atomic and keeps its numeric id.
      const { rows } = await request('subscriptions', { method: 'POST', query: { on_conflict: 'user_email' }, data: { user_email: userEmail, plan_key: planKey, subscription_id: subscriptionId, status, activated_at: activatedAt }, prefer: 'resolution=merge-duplicates,return=representation' })
      if (!rows[0]) throw new Error('Supabase did not return the saved subscription.')
      return normalizeSubscription(rows[0])
    },

    async deleteSubscriptionByUser(userEmail) {
      await request('subscriptions', { method: 'DELETE', query: { user_email: eq(userEmail) } })
      return true
    },
  }
  return database
}

let configuredDatabase
export function configureSupabase(config) {
  configuredDatabase = createSupabaseDatabase(config)
  return configuredDatabase
}
function currentDatabase() {
  if (!configuredDatabase) configuredDatabase = createSupabaseDatabase(globalThis.process?.env || {})
  return configuredDatabase
}

export function getStorageMode() { return 'supabase-postgres' }
export async function getUserByEmail(email) { return currentDatabase().getUserByEmail(email) }
export async function createUser(user) { return currentDatabase().createUser(user) }
export async function updateUserByEmail(email, updates = {}) { return currentDatabase().updateUserByEmail(email, updates) }
export async function updateEmailsForUser(oldEmail, newEmail) { return currentDatabase().updateEmailsForUser(oldEmail, newEmail) }
export async function deleteUserByEmail(email) { return currentDatabase().deleteUserByEmail(email) }
export async function createSession(token, userEmail, expiresAt) { return currentDatabase().createSession(token, userEmail, expiresAt) }
export async function getSession(token) { return currentDatabase().getSession(token) }
export async function deleteSession(token) { return currentDatabase().deleteSession(token) }
export async function addEmbed(embed) { return currentDatabase().addEmbed(embed) }
export async function getEmbedsByUser(userEmail, limit = 200000) { return currentDatabase().getEmbedsByUser(userEmail, limit) }
export async function deleteEmbedById(embedId, userEmail) { return currentDatabase().deleteEmbedById(embedId, userEmail) }
export async function getSubscriptionByUser(userEmail) { return currentDatabase().getSubscriptionByUser(userEmail) }
export async function upsertSubscription(subscription) { return currentDatabase().upsertSubscription(subscription) }
export async function deleteSubscriptionByUser(userEmail) { return currentDatabase().deleteSubscriptionByUser(userEmail) }
