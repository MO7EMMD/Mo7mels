import cors from 'cors'
import express from 'express'
import nodemailer from 'nodemailer'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as db from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'db.json')
const publicPath = path.join(__dirname, '..', 'public')
const distPath = path.join(__dirname, '..', 'dist')
const app = express()
const port = process.env.PORT || 3001
const isVercel = Boolean(process.env.VERCEL)
const configuredSiteUrl = normalizeSiteUrl(process.env.SITE_URL)
const primarySiteUrl = 'https://www.mo7mels.com'
const effectiveSiteUrl = configuredSiteUrl || primarySiteUrl
const canonicalRedirectEnabled = process.env.ENABLE_CANONICAL_REDIRECT === 'true'
const isProduction = process.env.NODE_ENV === 'production'
const SITE_NAME = process.env.SITE_NAME || 'Mo7mels'
const SITE_LOGO_URL = process.env.SITE_LOGO_URL || `${effectiveSiteUrl}/site-logo.svg`
const SITE_IMAGE_URL = process.env.SITE_IMAGE_URL || SITE_LOGO_URL
const EMAIL_FROM = process.env.EMAIL_FROM || `no-reply@${new URL(effectiveSiteUrl).hostname}`
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${effectiveSiteUrl}/api/auth/google/callback`
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const OTP_DEBUG = process.env.OTP_DEBUG === 'true'
const smtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)
const resendConfigured = Boolean(RESEND_API_KEY)
const mailTransporter = smtpConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null

app.set('trust proxy', true)

app.use(cors())
app.use(express.json())

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next)
  }
}

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

function getRequestOrigin(request) {
  if (!request) {
    return ''
  }

  const host = request.get('host')

  if (!host) {
    return ''
  }

  return `${request.protocol}://${host}`
}

function getSiteUrl(request) {
  return effectiveSiteUrl || getRequestOrigin(request)
}

function buildSitemapXml(siteUrl) {
  const pages = [
    ['/', 'weekly', '1.0'],
    ['/books', 'weekly', '0.9'],
    ['/physics', 'weekly', '0.9'],
    ['/physics/gravitational-fields', 'monthly', '0.8'],
    ['/physics/electric-fields', 'monthly', '0.8'],
    ['/physics/electric-circuits', 'monthly', '0.8'],
    ['/physics/capacitors', 'monthly', '0.8'],
    ['/physics/magnetism-induction', 'monthly', '0.8'],
    ['/physics/waves', 'monthly', '0.8'],
    ['/physics/superposition', 'monthly', '0.8'],
    ['/physics/quantum-physics', 'monthly', '0.8'],
    ['/physics/nuclear-physics', 'monthly', '0.8'],
    ['/mathematics', 'weekly', '0.9'],
    ['/mathematics/advanced', 'monthly', '0.8'],
    ['/mathematics/basic', 'monthly', '0.8'],
    ['/worksheets', 'weekly', '0.8'],
    ['/exams', 'weekly', '0.8'],
    ['/whiteboard', 'monthly', '0.7'],
    ['/resources', 'weekly', '0.8'],
    ['/links', 'monthly', '0.6'],
    ['/portfolio/', 'weekly', '0.7'],
  ]
  const entries = pages.map(([pathname, changefreq, priority]) => `  <url>\n    <loc>${siteUrl}${pathname}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`
}

function buildRobotsTxt(siteUrl) {
  return `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /login
Disallow: /signup

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

function getCookie(request, name) {
  const cookies = String(request.get('cookie') || '').split(';')
  const matchingCookie = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))
  return matchingCookie ? decodeURIComponent(matchingCookie.slice(name.length + 1)) : ''
}

function getSessionToken(request) {
  return getBearerToken(request) || getCookie(request, 'mo7mels_session')
}

function setCookie(response, name, value, maxAge, request) {
  const secure = request.secure || isProduction ? '; Secure' : ''
  response.append('Set-Cookie', `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`)
}

function clearCookie(response, name, request) {
  setCookie(response, name, '', 0, request)
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function createSessionToken() {
  return createHash('sha256').update(`${Date.now()}-${randomBytes(16).toString('hex')}`).digest('hex')
}

function buildOtpHtml(email, code) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; padding: 24px; background: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(15,23,42,.12);">
        <div style="padding: 24px; text-align: center; background: #2563eb; color: #ffffff;">
          <img src="${SITE_LOGO_URL}" alt="${SITE_NAME} logo" style="width: 96px; height: auto; margin-bottom: 16px;" />
          <h1 style="margin: 0; font-size: 28px; line-height: 1.1;">${SITE_NAME}</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,.9);">رمز التحقق عبر البريد الإلكتروني</p>
        </div>
        <div style="padding: 28px; color: #111827; text-align: center;">
          <p style="font-size: 16px; line-height: 1.6;">مرحبًا،</p>
          <p style="font-size: 16px; line-height: 1.6;">استخدم الرمز التالي لتأكيد بريدك الإلكتروني وإكمال تسجيلك في ${SITE_NAME}:</p>
          <div style="margin: 24px auto; display: inline-flex; padding: 20px 28px; border-radius: 20px; background: #f1f5f9; color: #1d4ed8; font-size: 32px; letter-spacing: 0.18em; font-weight: 700;">${code}</div>
          <p style="margin: 24px 0 0; font-size: 15px; line-height: 1.7; color: #475569;">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.</p>
        </div>
        <div style="padding: 20px; background: #f8fafc; color: #475569; font-size: 14px; text-align: center;">
          <p style="margin: 0;">${SITE_NAME} · ${effectiveSiteUrl}</p>
        </div>
      </div>
    </div>
  `
}

function buildOtpText(code) {
  return `رمز التحقق الخاص بك في ${SITE_NAME}: ${code}\n\nإذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.`
}

async function sendOtpByResend(email, code) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject: `${SITE_NAME} - رمز التحقق`,
      html: buildOtpHtml(email, code),
      text: buildOtpText(code),
    }),
  })

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '')
    throw new Error(`Resend API failed (${response.status}) ${responseBody}`)
  }
}

async function sendOtpEmail(email, code) {
  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: `${SITE_NAME} - رمز التحقق`,
        html: buildOtpHtml(email, code),
        text: buildOtpText(code),
      })
      return
    } catch (error) {
      console.error('SMTP delivery failed:', error?.message || error)
      if (!resendConfigured) {
        throw new Error('Failed to send OTP email via SMTP. تأكد من إعداد SMTP بشكل صحيح.')
      }
    }
  }

  if (resendConfigured) {
    await sendOtpByResend(email, code)
    return
  }

  if (OTP_DEBUG) {
    console.warn('OTP_DEBUG is enabled. Email delivery skipped and OTP code sent back in API response for', email)
    return
  }

  throw new Error('No email provider configured. Configure SMTP or RESEND_API_KEY.')
}

function isOtpExpired(user) {
  const expiresAt = user?.otpExpiresAt || user?.otp_expires_at
  return !expiresAt || new Date(expiresAt) < new Date()
}

async function requireAuthenticatedUser(request, response, next) {
  try {
    const accessToken = getSessionToken(request)

    if (!accessToken) {
      return response.status(401).json({ message: 'Missing authorization token.' })
    }

    const session = await db.getSession(accessToken)

    if (!session || new Date(session.expires_at || session.expiresAt) < new Date()) {
      return response.status(401).json({ message: 'Invalid or expired authorization token.' })
    }

    const user = await db.getUserByEmail(session.user_email || session.userEmail)

    if (!user) {
      return response.status(401).json({ message: 'Invalid or expired authorization token.' })
    }

    request.authUser = user
    return next()
  } catch (error) {
    return next(error)
  }
}

async function ensureDatabase() {
  await fs.mkdir(dataDir, { recursive: true })

  try {
    await fs.access(dbPath)
  } catch {
    await fs.writeFile(
      dbPath,
      JSON.stringify(
        { users: [], embeds: [], subscriptions: [], sessions: [] },
        null,
        2,
      ),
      'utf8',
    )
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
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    }
  } catch {
    return { users: [], embeds: [], subscriptions: [], sessions: [] }
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

app.get('/p', (_request, response) => {
  response.redirect(301, '/portfolio/')
})

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, storage: db.getStorageMode() })
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

  // Avoid redirect loops when the registrar forwards the apex domain to its www alias.
  if (host.endsWith('.onrender.com')) {
    return next()
  }

  if (requestOrigin === configuredSiteUrl) {
    return next()
  }

  const requestHost = host.split(':')[0].toLowerCase()
  const configuredHost = new URL(configuredSiteUrl).hostname.toLowerCase()
  const requestRootDomain = requestHost.replace(/^www\./, '')
  const configuredRootDomain = configuredHost.replace(/^www\./, '')

  if (requestRootDomain === configuredRootDomain) {
    return next()
  }

  return response.redirect(301, new URL(request.originalUrl, configuredSiteUrl).toString())
})

app.get('/api/auth/google', (request, response) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return response.status(503).type('text/plain').send('Google sign-in has not been configured yet.')
  }

  const state = randomBytes(24).toString('hex')
  setCookie(response, 'mo7mels_oauth_state', state, 600, request)
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authorizationUrl.search = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString()
  return response.redirect(302, authorizationUrl.toString())
})

app.get('/api/auth/google/callback', asyncRoute(async (request, response) => {
  const savedState = getCookie(request, 'mo7mels_oauth_state')
  clearCookie(response, 'mo7mels_oauth_state', request)

  if (request.query.error) {
    return response.redirect(303, `${effectiveSiteUrl}/login?auth=google_cancelled`)
  }

  const returnedState = String(request.query.state || '')
  const savedStateBytes = Buffer.from(savedState)
  const returnedStateBytes = Buffer.from(returnedState)
  if (!savedState || savedStateBytes.length !== returnedStateBytes.length || !timingSafeEqual(savedStateBytes, returnedStateBytes)) {
    return response.status(400).type('text/plain').send('Google sign-in could not be verified. Please try again.')
  }

  if (!request.query.code || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return response.redirect(303, `${effectiveSiteUrl}/login?auth=google_unavailable`)
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: String(request.query.code),
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  const tokenData = await tokenResponse.json().catch(() => ({}))
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error('Google token exchange failed:', tokenData.error || tokenResponse.status)
    return response.redirect(303, `${effectiveSiteUrl}/login?auth=google_failed`)
  }

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profile = await profileResponse.json().catch(() => ({}))
  const normalizedEmail = normalizeEmail(profile.email)
  if (!profileResponse.ok || profile.email_verified !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return response.redirect(303, `${effectiveSiteUrl}/login?auth=google_email_unverified`)
  }

  let user = await db.getUserByEmail(normalizedEmail)
  if (!user) {
    user = await db.createUser({
      name: String(profile.name || normalizedEmail.split('@')[0]).trim().slice(0, 120),
      email: normalizedEmail,
      password_hash: null,
      verified: true,
    })
  }

  const sessionToken = createSessionToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await db.createSession(sessionToken, normalizedEmail, expiresAt)
  setCookie(response, 'mo7mels_session', sessionToken, 7 * 24 * 60 * 60, request)
  return response.redirect(303, `${effectiveSiteUrl}/?auth=google_connected`)
}))

app.post('/api/auth/logout', asyncRoute(async (request, response) => {
  const token = getSessionToken(request)
  if (token) await db.deleteSession(token)
  clearCookie(response, 'mo7mels_session', request)
  return response.json({ ok: true })
}))

app.post('/api/auth/signup', asyncRoute(async (request, response) => {
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

  let existingUser = await db.getUserByEmail(normalizedEmail)

  if (existingUser) {
    return response.status(409).json({ message: 'This email is already registered.' })
  }

  const user = await db.createUser({
    name: trimmedName,
    email: normalizedEmail,
    password_hash: hashPassword(normalizedPassword),
    verified: true,
  })

  const tokenValue = createSessionToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await db.createSession(tokenValue, normalizedEmail, expiresAt)

  return response.status(201).json({
    message: 'Account created successfully.',
    user: toPublicUser(user),
    token: tokenValue,
  })
}))

app.post('/api/auth/login', asyncRoute(async (request, response) => {
  const { email, password } = request.body || {}
  const normalizedEmail = normalizeEmail(email)
  const normalizedPassword = String(password || '').trim()

  const existingUser = await db.getUserByEmail(normalizedEmail)

  if (!existingUser) {
    return response.status(404).json({ message: 'No account was found with this email.' })
  }

  if ((existingUser.password_hash || existingUser.passwordHash) !== hashPassword(normalizedPassword)) {
    return response.status(401).json({ message: 'Incorrect password.' })
  }

  const tokenValue = createSessionToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await db.createSession(tokenValue, normalizedEmail, expiresAt)

  return response.json({ user: toPublicUser(existingUser), token: tokenValue })
}))

app.get('/api/auth/me', asyncRoute(async (request, response) => {
  const accessToken = getSessionToken(request)

  if (!accessToken) {
    return response.status(401).json({ message: 'Missing authorization token.' })
  }

  const session = await db.getSession(accessToken)

  if (!session || new Date(session.expires_at || session.expiresAt) < new Date()) {
    return response.status(401).json({ message: 'Invalid or expired authorization token.' })
  }

  const user = await db.getUserByEmail(session.user_email || session.userEmail)

  if (!user) {
    return response.status(401).json({ message: 'Invalid or expired authorization token.' })
  }

  return response.json({ user: toPublicUser(user) })
}))

app.put('/api/auth/me', requireAuthenticatedUser, asyncRoute(async (request, response) => {
  const { name } = request.body || {}
  if (!name || String(name).trim().length < 1) {
    return response.status(400).json({ message: 'Name is required.' })
  }

  const email = normalizeEmail(request.authUser.email)
  const updated = await db.updateUserByEmail(email, { name: String(name).trim() })
  return response.json({ user: toPublicUser(updated) })
}))

app.post('/api/auth/change-password', requireAuthenticatedUser, asyncRoute(async (request, response) => {
  const { currentPassword, newPassword } = request.body || {}
  if (!currentPassword || !newPassword) {
    return response.status(400).json({ message: 'Current and new passwords are required.' })
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(newPassword))) {
    return response.status(400).json({ message: 'New password must be at least 8 characters and include letters and numbers.' })
  }

  const email = normalizeEmail(request.authUser.email)
  const user = await db.getUserByEmail(email)
  if (!user) return response.status(404).json({ message: 'User not found.' })

  if ((user.password_hash || user.passwordHash) !== hashPassword(String(currentPassword))) {
    return response.status(401).json({ message: 'Current password is incorrect.' })
  }

  await db.updateUserByEmail(email, { password_hash: hashPassword(String(newPassword)) })
  return response.json({ message: 'Password updated.' })
}))

app.post('/api/auth/change-email', requireAuthenticatedUser, asyncRoute(async (request, response) => {
  const { newEmail, currentPassword } = request.body || {}
  if (!newEmail || !currentPassword) {
    return response.status(400).json({ message: 'New email and current password are required.' })
  }

  const normalizedEmail = normalizeEmail(newEmail)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return response.status(400).json({ message: 'A valid email address is required.' })
  }

  const oldEmail = normalizeEmail(request.authUser.email)
  if (normalizedEmail === oldEmail) {
    return response.status(400).json({ message: 'This email is already your current email.' })
  }

  const existingUser = await db.getUserByEmail(normalizedEmail)
  if (existingUser) {
    return response.status(409).json({ message: 'This email is already in use.' })
  }

  const user = await db.getUserByEmail(oldEmail)
  if (!user) {
    return response.status(404).json({ message: 'User not found.' })
  }

  if ((user.password_hash || user.passwordHash) !== hashPassword(String(currentPassword))) {
    return response.status(401).json({ message: 'Current password is incorrect.' })
  }

  const newUser = await db.createUser({
    name: user.name,
    email: normalizedEmail,
    password_hash: user.password_hash || user.passwordHash,
    otp_code: null,
    otp_expires_at: null,
    verified: true,
  })

  await db.updateEmailsForUser(oldEmail, normalizedEmail)
  await db.deleteUserByEmail(oldEmail)

  const updatedUser = await db.getUserByEmail(normalizedEmail)
  return response.json({ user: toPublicUser(updatedUser) })
}))

app.get('/api/embeds', requireAuthenticatedUser, asyncRoute(async (request, response) => {
  const normalizedEmail = normalizeEmail(request.authUser.email)
  const embeds = await db.getEmbedsByUser(normalizedEmail)
  return response.json({ embeds })
}))

app.post('/api/embeds', requireAuthenticatedUser, asyncRoute(async (request, response) => {
  const { type, sourceUrl, embedCode } = request.body || {}
  const normalizedEmail = normalizeEmail(request.authUser.email)

  if (!type || !sourceUrl || !embedCode) {
    return response.status(400).json({ message: 'Missing embed payload.' })
  }

  const embed = await db.addEmbed({ userEmail: normalizedEmail, type, sourceUrl, embedCode })
  const embeds = await db.getEmbedsByUser(normalizedEmail)
  return response.status(201).json({ embed, embeds })
}))

app.delete('/api/embeds/:id', requireAuthenticatedUser, asyncRoute(async (request, response) => {
  const embedId = request.params.id
  const normalizedEmail = normalizeEmail(request.authUser.email)
  await db.deleteEmbedById(embedId, normalizedEmail)
  return response.json({ ok: true })
}))

app.get('/api/subscription', requireAuthenticatedUser, asyncRoute(async (request, response) => {
  const normalizedEmail = normalizeEmail(request.authUser.email)
  const subscription = await db.getSubscriptionByUser(normalizedEmail)
  return response.json({ subscription })
}))

app.post('/api/subscription', requireAuthenticatedUser, asyncRoute(async (request, response) => {
  const { planKey, subscriptionId } = request.body || {}
  const normalizedEmail = normalizeEmail(request.authUser.email)

  const validPlans = ['basic', 'pro', 'business']
  if (!planKey || !validPlans.includes(planKey)) {
    return response.status(400).json({ message: 'Invalid plan.' })
  }

  if (!subscriptionId) {
    return response.status(400).json({ message: 'Missing PayPal subscription ID.' })
  }

  const subscription = await db.upsertSubscription({ userEmail: normalizedEmail, planKey, subscriptionId, status: 'active', activatedAt: new Date().toISOString() })
  return response.status(201).json({ subscription })
}))

app.delete('/api/subscription', requireAuthenticatedUser, asyncRoute(async (request, response) => {
  const normalizedEmail = normalizeEmail(request.authUser.email)
  await db.deleteSubscriptionByUser(normalizedEmail)
  return response.json({ ok: true })
}))

app.get('/robots.txt', (request, response) => {
  const siteUrl = getSiteUrl(request)

  if (!siteUrl) {
    return response.status(503).type('text/plain').send('SITE_URL is required for robots.txt in production.')
  }

  response.type('text/plain').send(buildRobotsTxt(siteUrl))
})

app.get('/sitemap.xml', (request, response) => {
  const siteUrl = getSiteUrl(request)

  if (!siteUrl) {
    return response.status(503).type('text/plain').send('SITE_URL is required for sitemap.xml in production.')
  }

  response.type('application/xml').send(buildSitemapXml(siteUrl))
})

app.use((error, request, response, next) => {
  if (response.headersSent) {
    return next(error)
  }

  console.error('Unhandled API error:', error?.message || error)
  return response.status(500).json({
    message: 'Server error. Please verify DATABASE_URL and email provider settings.',
  })
})

app.use(express.static(publicPath))
app.use(express.static(distPath, { index: false }))

app.get('*', async (_request, response, next) => {
  try {
    const indexPath = path.join(distPath, 'index.html')
    await fs.access(indexPath)

    const siteUrl = getSiteUrl(_request)

    if (!siteUrl) {
      return response.status(503).type('text/plain').send('SITE_URL is required for production HTML metadata.')
    }

    const html = await fs.readFile(indexPath, 'utf8')

    response.type('html').send(html.replaceAll('__SITE_URL__', siteUrl))
  } catch {
    next()
  }
})

if (!isVercel) {
  ensureDatabase()
    .then(() => {
      if (isProduction && !configuredSiteUrl) {
        console.warn(`SITE_URL is not set; using default domain ${primarySiteUrl}.`)
      }

      if (isProduction && !smtpConfigured) {
        if (!resendConfigured) {
          console.warn('No email provider configured; OTP email delivery will be disabled.')
        }
      }

      app.listen(port, () => {
        console.log(`Mo7mels server running on http://localhost:${port}`)
      })
    })
    .catch((error) => {
      console.error('Failed to start API server', error)
      process.exit(1)
    })
}

export default app
