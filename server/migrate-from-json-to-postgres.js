import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import * as db from './db.js'

const dataPath = path.join(new URL(import.meta.url).pathname.replace(/\/g, '/').replace(/^\//, ''), '..', 'data', 'db.json')

function hashPassword(password) {
  return createHash('sha256').update(String(password || '')).digest('hex')
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

async function run() {
  console.log('Reading legacy JSON database...')
  const raw = await fs.readFile(dataPath, 'utf8')
  const parsed = JSON.parse(raw)
  const users = Array.isArray(parsed.users) ? parsed.users : []
  const embeds = Array.isArray(parsed.embeds) ? parsed.embeds : []
  const subscriptions = Array.isArray(parsed.subscriptions) ? parsed.subscriptions : []

  let createdUsers = 0
  for (const u of users) {
    const username = u.username || u.name || `user${Date.now()}`
    const email = normalizeEmail(u.email || `${username}@migration.local`)
    const existing = await db.getUserByEmail(email)
    if (existing) continue

    const passwordHash = u.password ? hashPassword(u.password) : null
    await db.createUser({ name: username, email, password_hash: passwordHash, otp_code: null, otp_expires_at: null })
    await db.updateUserByEmail(email, { verified: true })
    createdUsers++
  }

  let createdEmbeds = 0
  for (const e of embeds) {
    // try to map owner by username or userId
    let ownerEmail = ''
    if (e.userEmail) ownerEmail = normalizeEmail(e.userEmail)
    else if (e.username) ownerEmail = normalizeEmail(e.username)
    else if (typeof e.userId !== 'undefined') {
      const owner = users.find((x) => x.id === e.userId || String(x.id) === String(e.userId))
      ownerEmail = owner ? normalizeEmail(owner.email || `${owner.username}@migration.local`) : ''
    }
    if (!ownerEmail) continue
    const user = await db.getUserByEmail(ownerEmail)
    if (!user) continue

    await db.addEmbed({ userEmail: ownerEmail, type: e.type || e.platform || 'general', sourceUrl: e.sourceUrl || e.url || e.link || '', embedCode: e.embedCode || e.html || '' })
    createdEmbeds++
  }

  let createdSubs = 0
  for (const s of subscriptions) {
    const userEmail = normalizeEmail(s.userEmail || s.email || (s.username ? `${s.username}@migration.local` : ''))
    if (!userEmail) continue
    const user = await db.getUserByEmail(userEmail)
    if (!user) continue
    await db.upsertSubscription({ userEmail, planKey: s.planKey || s.plan || 'basic', subscriptionId: s.subscriptionId || s.id || null, status: s.status || 'active', activatedAt: s.activatedAt || new Date().toISOString() })
    createdSubs++
  }

  console.log(`Migration complete: users=${createdUsers}, embeds=${createdEmbeds}, subscriptions=${createdSubs}`)
  process.exit(0)
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(2)
})
