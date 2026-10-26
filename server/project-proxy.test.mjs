import assert from 'node:assert/strict'
import http from 'node:http'
import { gzipSync } from 'node:zlib'
import { createProjectProxy } from './project-proxy.js'

const COOKIE = 'mo7mels_projects_session'
const token = 'a'.repeat(64)
let received = []
let upstreamOrigin
const payload = Buffer.from('compressed project asset\n'.repeat(300))
const compressed = gzipSync(payload)
const upstream = http.createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const record = { method: req.method, path: req.url, headers: req.headers, body: Buffer.concat(chunks) }
  received.push(record)
  if (req.url === '/project/asset') {
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'gzip', 'Content-Length': compressed.length, 'Connection': 'keep-alive', 'Keep-Alive': 'timeout=10' })
    return res.end(compressed)
  }
  if (req.url === '/project/cookies') {
    res.setHeader('Set-Cookie', [`${COOKIE}=${token}; Domain=upstream.test; Path=/; HttpOnly; Max-Age=43200`, 'mo7mels_session=original-site-secret; Path=/', '__cf_bm=platform-cookie; Path=/'])
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  if (req.url === '/project/logout-cookie') res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0`)
  if (req.url === '/project/redirect') { res.writeHead(307, { Location: upstreamOrigin + '/project/dashboard?x=1' }); return res.end() }
  if (req.url === '/project/relative') { res.writeHead(302, { Location: '/project/login' }); return res.end() }
  if (req.url === '/project/external') { res.writeHead(302, { Location: 'https://example.org/docs' }); return res.end() }
  if (req.url === '/project/unavailable') return req.socket.destroy()
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ method: record.method, path: record.path, headers: record.headers, bytes: record.body.length, body: record.body.toString('base64') }))
})
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
upstreamOrigin = `http://127.0.0.1:${upstream.address().port}`
const proxy = createProjectProxy({ upstreamOrigin, request: http.request, timeoutMs: 2000 })
const front = http.createServer((req, res) => {
  req.originalUrl = req.url
  proxy(req, res, () => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('original-site:' + req.url) })
})
await new Promise(resolve => front.listen(0, '127.0.0.1', resolve))

function call(path, { method = 'GET', headers = {}, body, chunks } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: front.address().port, method, path, headers: { Host: 'www.mo7mels.com', ...headers } }, async res => {
      const parts = []
      for await (const part of res) parts.push(part)
      const bytes = Buffer.concat(parts)
      let json
      try { json = JSON.parse(bytes.toString()) } catch {}
      resolve({ status: res.statusCode, headers: res.headers, bytes, text: bytes.toString(), json })
    })
    req.on('error', reject)
    if (chunks) { for (const chunk of chunks) req.write(chunk); req.end() } else req.end(body)
  })
}

try {
  for (const route of ['/', '/physics', '/portfolio/', '/api/auth/me', '/project-other']) {
    const res = await call(route)
    assert.equal(res.status, 200)
    assert.equal(res.text, 'original-site:' + route)
  }
  assert.equal(received.length, 0, 'unrelated site routes never contact the portal')
  let res = await call('/project?class=12')
  assert.equal(res.status, 200)
  assert.equal(res.json.path, '/project?class=12')

  const boundaryHeaders = {
    Origin: 'https://www.mo7mels.com', 'Content-Type': 'application/json', Cookie: `mo7mels_session=root-secret; ${COOKIE}=${token}; another=private`,
    Authorization: 'Bearer root-secret', Forwarded: 'for=spoofed', 'X-Forwarded-For': 'spoofed', 'X-Forwarded-Host': 'evil.test', 'CF-Connecting-IP': 'spoofed', 'OAI-Authenticated-User-ID': 'spoofed',
    Connection: 'keep-alive, x-hidden', 'X-Hidden': 'private-hop', RSC: '1', 'Next-Url': '/project/dashboard',
  }
  res = await call('/project/api/profile', { method: 'PATCH', headers: boundaryHeaders, body: '{"name":"test"}' })
  assert.equal(res.status, 200)
  assert.equal(res.json.headers.origin, upstreamOrigin)
  assert.equal(res.json.headers.host, new URL(upstreamOrigin).host)
  assert.equal(res.json.headers.cookie, `${COOKIE}=${token}`)
  assert.equal(res.json.headers.rsc, '1')
  assert.equal(res.json.headers['next-url'], '/project/dashboard')
  assert.equal(Buffer.from(res.json.body, 'base64').toString(), '{"name":"test"}')
  for (const name of ['authorization', 'forwarded', 'x-forwarded-for', 'x-forwarded-host', 'cf-connecting-ip', 'oai-authenticated-user-id', 'x-hidden']) assert.equal(res.json.headers[name], undefined, name + ' is stripped')

  const beforeBlocked = received.length
  for (const headers of [{ Origin: 'https://evil.test' }, {}, { Origin: 'https://mo7mels.com' }]) {
    res = await call('/project/api/login', { method: 'POST', headers, body: '{}' })
    assert.equal(res.status, 403, 'write requires exact incoming-host origin')
  }
  assert.equal(received.length, beforeBlocked)
  res = await call('/project/api/me', { headers: { Host: 'evil.test' } })
  assert.equal(res.status, 421)
  res = await call('/project/%2e%2e/physics')
  assert.equal(res.status, 400)
  res = await call('/project/api/me', { method: 'PUT', headers: { Origin: 'https://www.mo7mels.com' } })
  assert.equal(res.status, 405)
  assert.equal(received.length, beforeBlocked)

  res = await call('/project/api/login', { method: 'POST', headers: { Host: 'mo7mels.com', Origin: 'https://mo7mels.com', Cookie: `${COOKIE}=invalid` }, body: '{}' })
  assert.equal(res.status, 200, 'apex host and matching origin are accepted')
  assert.equal(res.json.headers.cookie, undefined, 'malformed portal token is not sent upstream')

  res = await call('/project/cookies')
  assert.deepEqual(res.headers['set-cookie'], [`${COOKIE}=${token}; Path=/project; HttpOnly; SameSite=Strict; Secure; Max-Age=43200`])
  assert.equal(res.headers['access-control-allow-origin'], undefined)
  assert.equal(res.headers['access-control-allow-credentials'], undefined)
  res = await call('/project/logout-cookie')
  assert.deepEqual(res.headers['set-cookie'], [`${COOKIE}=; Path=/project; HttpOnly; SameSite=Strict; Secure; Max-Age=0`])

  res = await call('/project/asset')
  assert.equal(res.headers['content-encoding'], 'gzip')
  assert.equal(Number(res.headers['content-length']), compressed.length)
  assert.deepEqual(res.bytes, compressed, 'compressed asset bytes are forwarded without decompression')
  assert.notEqual(res.headers['keep-alive'], 'timeout=10', 'upstream hop-by-hop setting is not copied; the local HTTP server may add its own')
  res = await call('/project/asset', { method: 'HEAD' })
  assert.equal(res.status, 200)
  assert.equal(res.bytes.length, 0)

  const uploadChunks = [Buffer.alloc(400000, 0), Buffer.from('\r\n--multipart-boundary\r\n'), Buffer.alloc(700000, 255)]
  res = await call('/project/api/projects', { method: 'POST', headers: { Origin: 'https://www.mo7mels.com', 'Content-Type': 'multipart/form-data; boundary=boundary' }, chunks: uploadChunks })
  assert.equal(res.status, 200)
  assert.deepEqual(Buffer.from(res.json.body, 'base64'), Buffer.concat(uploadChunks), 'streamed binary multipart is unchanged')

  res = await call('/project/redirect')
  assert.equal(res.status, 307)
  assert.equal(res.headers.location, 'https://www.mo7mels.com/project/dashboard?x=1')
  res = await call('/project/relative')
  assert.equal(res.headers.location, '/project/login')
  res = await call('/project/external')
  assert.equal(res.headers.location, 'https://example.org/docs')
  res = await call('/project/unavailable')
  assert.equal(res.status, 502)
  assert.equal(res.headers['cache-control'], 'no-store')
  console.log('PASS: original-route isolation, method/host/origin boundaries, cookie/header isolation, streaming uploads/downloads, compressed assets, redirects, and upstream failure handling.')
} finally {
  front.closeAllConnections()
  upstream.closeAllConnections()
  await Promise.all([new Promise(resolve => front.close(resolve)), new Promise(resolve => upstream.close(resolve))])
}
