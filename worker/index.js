import { httpServerHandler } from 'cloudflare:node'
import { createRootApp } from '../server/worker-app.js'
import { createSupabaseDatabase } from '../server/db-supabase.js'
import { buildRobotsTxt, buildSitemapXml, renderSeoHtml } from '../server/seo.js'
import bundledDailyPapers from '../src/daily-papers.json' with { type: 'json' }
import { normalizeDailyPapers } from '../src/paper-catalog.js'

const PORTAL_ORIGIN = 'https://mo7mels-projects.robustcabin8192.chatgpt.site'
const PORTAL_COOKIE = 'mo7mels_projects_session'
const PORTAL_OAUTH_COOKIE = 'mo7mels_projects_oauth'
const PORTAL_COOKIES = new Set([PORTAL_COOKIE, PORTAL_OAUTH_COOKIE])
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'])
const HOP_HEADERS = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'])
const DAILY_CATALOG_URL = 'https://raw.githubusercontent.com/MO7EMMD/Mo7mels/main/src/daily-papers.json'
const MAX_CATALOG_BYTES = 8 * 1024 * 1024

async function readCatalog(response) {
  if (!response.ok || !response.body || Number(response.headers.get('content-length') || 0) > MAX_CATALOG_BYTES) throw new Error('Catalog unavailable')
  const reader = response.body.getReader(), chunks = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_CATALOG_BYTES) throw new Error('Catalog too large')
      chunks.push(value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return normalizeDailyPapers(JSON.parse(new TextDecoder().decode(bytes)))
}

function connectionHeaders(headers) {
  return new Set([...HOP_HEADERS, ...String(headers.get('connection') || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean)])
}

function portalCookie(rawCookie) {
  const cookies = new Map(), seen = new Set()
  for (const part of String(rawCookie || '').split(';')) {
    const pair = part.trim(), separator = pair.indexOf('='), name = pair.slice(0, separator)
    if (separator < 0 || !PORTAL_COOKIES.has(name)) continue
    // Duplicate names are ambiguous across cookie paths; fail closed for that
    // name instead of choosing an attacker-controlled first or last value.
    if (seen.has(name)) { cookies.delete(name); continue }
    seen.add(name)
    if (/^[a-f0-9]{64}$/.test(pair.slice(separator + 1))) cookies.set(name, pair)
  }
  return [...cookies.values()].join('; ')
}

function responseCookies(values) {
  const cookies = new Map()
  for (const value of values) {
    const parts = value.split(';').map(part => part.trim())
    const pair = parts.shift()
    const match = /^(mo7mels_projects_session|mo7mels_projects_oauth)=([a-f0-9]{64})?$/.exec(pair || '')
    if (!match) continue
    const oauth = match[1] === PORTAL_OAUTH_COOKIE
    let lifetime
    if (oauth) {
      const maxAge = parts.find(part => /^max-age=-?\d+$/i.test(part))
      const age = !match[2] ? 0 : maxAge ? Math.max(0, Math.min(600, Number(maxAge.slice(8)))) : 600
      lifetime = ['Max-Age=' + age]
    } else lifetime = parts.filter(part => /^(?:max-age=-?\d+|expires=.+)$/i.test(part))
    // Only the short-lived flow binding must survive the top-level Google
    // redirect. The authenticated portal session retains its Strict policy.
    cookies.set(match[1], [pair, 'Path=/project', 'HttpOnly', oauth ? 'SameSite=Lax' : 'SameSite=Strict', 'Secure', ...lifetime].join('; '))
  }
  return [...cookies.values()]
}

const failure = (status, error) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })

async function proxyPortal(request, fetchImpl) {
  const incoming = new URL(request.url)
  if (!METHODS.has(request.method)) return new Response(null, { status: 405, headers: { Allow: [...METHODS].join(', ') } })
  const isWrite = !['GET', 'HEAD'].includes(request.method)
  if (isWrite && request.headers.get('origin') !== incoming.origin) return failure(403, 'تعذر التحقق من مصدر الطلب.')
  const target = new URL(incoming.pathname + incoming.search, PORTAL_ORIGIN)
  if (target.origin !== PORTAL_ORIGIN || !/^\/project(?:\/|$)/.test(target.pathname)) return failure(400, 'مسار الطلب غير صحيح.')
  const blocked = connectionHeaders(request.headers)
  const headers = new Headers()
  for (const [name, value] of request.headers) {
    if (blocked.has(name) || ['host', 'cookie', 'authorization', 'origin', 'referer', 'expect', 'forwarded', 'x-real-ip', 'x-client-ip', 'true-client-ip'].includes(name)) continue
    if (/^(?:cf-|oai-|openai-|x-openai-|x-forwarded-|customer-http-)/i.test(name)) continue
    headers.set(name, value)
  }
  const cookie = portalCookie(request.headers.get('cookie'))
  if (cookie) headers.set('cookie', cookie)
  if (isWrite) headers.set('origin', PORTAL_ORIGIN)
  try {
    const upstream = await fetchImpl(target, {
      method: request.method, headers, body: isWrite ? request.body : undefined,
      redirect: 'manual', signal: AbortSignal.timeout(120000), ...(isWrite ? { duplex: 'half' } : {}),
    })
    const blockedResponse = connectionHeaders(upstream.headers)
    const outgoing = new Headers()
    for (const [name, value] of upstream.headers) {
      if (blockedResponse.has(name) || ['set-cookie', 'access-control-allow-origin', 'access-control-allow-credentials'].includes(name)) continue
      if (name === 'location') {
        const redirect = new URL(value, PORTAL_ORIGIN)
        outgoing.set(name, /^https?:\/\//i.test(value) && redirect.origin === PORTAL_ORIGIN ? incoming.origin + redirect.pathname + redirect.search + redirect.hash : value)
      } else outgoing.set(name, value)
    }
    const cookies = upstream.headers.getSetCookie ? upstream.headers.getSetCookie() : [upstream.headers.get('set-cookie')].filter(Boolean)
    for (const value of responseCookies(cookies)) outgoing.append('set-cookie', value)
    return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: outgoing })
  } catch {
    // A write may already have committed. Do not automatically replay uploads.
    return failure(502, 'تعذر الاتصال ببوابة المشاريع الآن. راجع مشاريعي قبل إعادة التسليم.')
  }
}

// The injection points are used by local boundary tests; requests never select
// the upstream or database destination.
export function createGateway({ fetch: fetchImpl = globalThis.fetch, apiHandler: injectedApiHandler } = {}) {
  let apiHandler = injectedApiHandler
  let lastDailyCatalog
  async function dailyCatalog(request, env, ctx) {
    const keyUrl = new URL('/daily-papers.json', request.url), cacheKey = new Request(keyUrl)
    const cache = typeof caches === 'undefined' ? undefined : caches.default
    try {
      const cached = await cache?.match(cacheKey)
      if (cached) return request.method === 'HEAD' ? new Response(null, { status: cached.status, headers: cached.headers }) : cached
    } catch { /* A missing cache never prevents the library from loading. */ }
    let papers, ttl = 300
    try {
      papers = await readCatalog(await fetchImpl(DAILY_CATALOG_URL, { headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(8000), cf: { cacheTtl: 300, cacheEverything: true } }))
      lastDailyCatalog = papers
    } catch {
      ttl = 60
      papers = lastDailyCatalog
      if (!papers && env.ASSETS?.fetch) {
        try { papers = await readCatalog(await env.ASSETS.fetch(new Request(keyUrl))) } catch { /* Use the bundled catalog if the standalone asset is absent. */ }
      }
      papers ||= normalizeDailyPapers(bundledDailyPapers)
    }
    const response = Response.json(papers, { headers: { 'Cache-Control': `public, max-age=60, s-maxage=${ttl}`, 'X-Content-Type-Options': 'nosniff' } })
    if (cache) {
      const save = cache.put(cacheKey, response.clone()).catch(() => {})
      if (ctx?.waitUntil) ctx.waitUntil(save)
      else await save
    }
    return request.method === 'HEAD' ? new Response(null, { headers: response.headers }) : response
  }
  function getApiHandler(env) {
    if (!apiHandler) {
      const db = createSupabaseDatabase({ ...env, fetch: fetchImpl })
      const app = createRootApp({ db, config: env, fetch: fetchImpl })
      app.listen(3000)
      apiHandler = httpServerHandler({ port: 3000 })
    }
    return apiHandler
  }

  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url)
      if (url.hostname === 'www.mo7mels.com' && ['GET', 'HEAD'].includes(request.method)) {
        url.hostname = 'mo7mels.com'
        return Response.redirect(url.toString(), 308)
      }
      if (/^\/project(?:\/|$)/.test(url.pathname)) return proxyPortal(request, fetchImpl)
      if (/^\/api(?:\/|$)/.test(url.pathname)) {
        try { return await getApiHandler(env).fetch(request, env, ctx) }
        catch { return failure(503, 'خدمة الحسابات غير متاحة الآن. حاول مجددًا بعد قليل.') }
      }
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
      if (url.pathname === '/daily-papers.json') return dailyCatalog(request, env, ctx)
      if (url.pathname === '/p' || url.pathname === '/portfolio') return Response.redirect(new URL('/portfolio/', url).toString(), 301)
      if (url.pathname === '/robots.txt') return new Response(request.method === 'HEAD' ? null : buildRobotsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      if (url.pathname === '/sitemap.xml') return new Response(request.method === 'HEAD' ? null : buildSitemapXml(), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
      if (!env.ASSETS?.fetch) return failure(503, 'ملفات الموقع غير متاحة الآن.')
      const asset = await env.ASSETS.fetch(new Request(url, { method: request.method, headers: request.headers }))
      // Built assets, images, PDF links and verification files retain their exact
      // bytes. Client-side study routes share the Vite shell and route metadata.
      if (asset.status >= 300 && asset.status < 400) return asset
      if (asset.ok && !String(asset.headers.get('content-type')).includes('text/html')) return asset
      if (!asset.ok && /\/[^/]+\.[^/]+$/.test(url.pathname)) return asset
      // Directory URLs avoid the Assets service's automatic index.html redirect.
      const shell = asset.ok ? asset : await env.ASSETS.fetch(new Request(new URL('/', url), { method: 'GET' }))
      if (!shell.ok) return shell
      if (request.method === 'HEAD') return new Response(null, { status: shell.status, headers: shell.headers })
      const html = renderSeoHtml(await shell.text(), url.pathname)
      const headers = new Headers(shell.headers)
      headers.set('Content-Type', 'text/html; charset=utf-8')
      headers.set('Cache-Control', 'no-cache')
      headers.delete('content-length')
      headers.delete('content-encoding')
      headers.delete('etag')
      return new Response(html, { status: 200, headers })
    },
  }
}

export default createGateway()
