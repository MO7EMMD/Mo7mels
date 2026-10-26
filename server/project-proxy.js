import { request as httpsRequest } from 'node:https'

const SITE_ORIGIN = 'https://mo7mels-projects.robustcabin8192.chatgpt.site'
const COOKIE = 'mo7mels_projects_session'
const PUBLIC_HOSTS = new Set(['mo7mels.com', 'www.mo7mels.com', 'mo7mels.com:443', 'www.mo7mels.com:443'])
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'])
const HOP_HEADERS = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'])

function connectionHeaders(headers) {
  return new Set([...HOP_HEADERS, ...String(headers.connection || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean)])
}

function portalCookie(rawCookie) {
  const matching = String(rawCookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`))
  return matching && new RegExp(`^${COOKIE}=[a-f0-9]{64}$`).test(matching) ? matching : ''
}

function responseCookies(values) {
  return (Array.isArray(values) ? values : values ? [values] : [])
    .filter(value => value.startsWith(`${COOKIE}=`))
    .map(value => {
      const parts = value.split(';').map(part => part.trim())
      const pair = parts.shift()
      if (!new RegExp(`^${COOKIE}=(?:[a-f0-9]{64})?$`).test(pair)) return null
      const lifetime = parts.filter(part => /^(?:max-age=-?\d+|expires=.+)$/i.test(part))
      return [pair, 'Path=/project', 'HttpOnly', 'SameSite=Strict', 'Secure', ...lifetime].join('; ')
    }).filter(Boolean)
}

function sendError(response, status, message) {
  if (response.headersSent) {
    response.destroy()
    return
  }
  for (const name of ['content-length', 'content-encoding', 'content-range', 'location', 'set-cookie']) response.removeHeader(name)
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify({ error: message }))
}

// The factory arguments allow a local fake origin in tests. Incoming requests and
// environment variables never choose the production upstream.
export function createProjectProxy({ upstreamOrigin = SITE_ORIGIN, request = httpsRequest, timeoutMs = 120000 } = {}) {
  const upstream = new URL(upstreamOrigin)

  return function projectProxy(requestIn, responseOut, next) {
    const originalUrl = requestIn.originalUrl || requestIn.url || '/'
    if (!/^\/project(?:\/|\?|$)/.test(originalUrl)) return next()

    const host = String(requestIn.headers.host || '').toLowerCase()
    if (!PUBLIC_HOSTS.has(host)) return sendError(responseOut, 421, 'اسم المضيف غير مدعوم.')
    const publicOrigin = new URL(`https://${host}`).origin
    const method = requestIn.method || 'GET'
    if (!METHODS.has(method)) {
      responseOut.setHeader('Allow', [...METHODS].join(', '))
      return sendError(responseOut, 405, 'طريقة الطلب غير مدعومة.')
    }
    const isWrite = method !== 'GET' && method !== 'HEAD'
    if (isWrite && requestIn.headers.origin !== publicOrigin) {
      return sendError(responseOut, 403, 'تعذر التحقق من مصدر الطلب.')
    }

    let destination
    try {
      destination = new URL(originalUrl, upstream.origin)
      if (destination.origin !== upstream.origin || !/^\/project(?:\/|$)/.test(destination.pathname)) throw new Error('Out of scope')
    } catch {
      return sendError(responseOut, 400, 'مسار الطلب غير صحيح.')
    }

    const blocked = connectionHeaders(requestIn.headers)
    const headers = {}
    for (const [name, value] of Object.entries(requestIn.headers)) {
      if (value === undefined || blocked.has(name) || ['host', 'cookie', 'authorization', 'origin', 'referer', 'expect', 'forwarded', 'x-real-ip', 'x-client-ip', 'true-client-ip'].includes(name)) continue
      if (/^(?:cf-|oai-|openai-|x-openai-|x-forwarded-|customer-http-)/i.test(name)) continue
      headers[name] = value
    }
    headers.host = upstream.host
    const cookie = portalCookie(requestIn.headers.cookie)
    if (cookie) headers.cookie = cookie
    if (isWrite) headers.origin = upstream.origin

    const requestOut = request({
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || undefined,
      path: destination.pathname + destination.search,
      method,
      headers,
    }, responseIn => {
      const blockedResponse = connectionHeaders(responseIn.headers)
      for (const [name, value] of Object.entries(responseIn.headers)) {
        if (value === undefined || blockedResponse.has(name) || ['set-cookie', 'access-control-allow-origin', 'access-control-allow-credentials'].includes(name)) continue
        if (name === 'location') {
          try {
            const redirect = new URL(String(value), upstream.origin)
            responseOut.setHeader(name, /^https?:\/\//i.test(String(value)) && redirect.origin === upstream.origin
              ? publicOrigin + redirect.pathname + redirect.search + redirect.hash
              : value)
          } catch {
            responseOut.setHeader(name, value)
          }
        } else {
          responseOut.setHeader(name, value)
        }
      }
      const cookies = responseCookies(responseIn.headers['set-cookie'])
      if (cookies.length) responseOut.setHeader('Set-Cookie', cookies)
      responseOut.statusCode = responseIn.statusCode || 502
      responseIn.on('error', () => sendError(responseOut, 502, 'تعذر تحميل بوابة المشاريع الآن.'))
      responseIn.pipe(responseOut)
      responseOut.once('close', () => { if (!responseOut.writableFinished) responseIn.destroy() })
    })

    requestOut.setTimeout(timeoutMs, () => requestOut.destroy(new Error('Portal upstream timeout')))
    requestOut.on('error', () => sendError(responseOut, 502, 'تعذر تحميل بوابة المشاريع الآن.'))
    requestIn.once('aborted', () => requestOut.destroy())
    responseOut.once('close', () => { if (!responseOut.writableFinished) requestOut.destroy() })
    requestIn.pipe(requestOut)
  }
}

export const projectProxy = createProjectProxy()
