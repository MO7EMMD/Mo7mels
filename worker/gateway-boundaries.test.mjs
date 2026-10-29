import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const seoUrl = pathToFileURL(path.join(root, 'server/seo.js')).href
const source = (await fs.readFile(path.join(root, 'worker/index.js'), 'utf8')).replace(/^import .+\r?\n/gm, '')
const catalogUrl = pathToFileURL(path.join(root, 'src/paper-catalog.js')).href
const bundled = await fs.readFile(path.join(root, 'src/daily-papers.json'), 'utf8')
const code = `const bundledDailyPapers=${bundled};const {normalizeDailyPapers}=await import(${JSON.stringify(catalogUrl)});const httpServerHandler=()=>{throw Error('inject API in boundary test')};const createRootApp=()=>{};const createSupabaseDatabase=()=>{};const {buildRobotsTxt,buildSitemapXml,renderSeoHtml}=await import(${JSON.stringify(seoUrl)});\n${source}`
const { createGateway } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const html = '<!doctype html><html><head><title>original</title><link rel="canonical" href="https://mo7mels.com/" /></head><body><div id="root"></div></body></html>'
const ASSETS = { async fetch(req) {
  const pathname = new URL(req.url).pathname
  if (pathname === '/') return new Response(html, { headers: { 'Content-Type': 'text/html' } })
  if (pathname === '/index.html') return Response.redirect('https://mo7mels.com/',307)
  if (pathname === '/portfolio/') return new Response(html.replace('original','portfolio'), { headers: { 'Content-Type': 'text/html' } })
  if (pathname === '/asset.bin') return new Response(Uint8Array.of(0, 1, 255), { headers: { 'Content-Type': 'application/octet-stream' } })
  return new Response('not found', { status: 404 })
} }
let upstreamRequests = 0, seen
const gateway = createGateway({
  apiHandler: { fetch: async request => Response.json({ api: new URL(request.url).pathname }) },
  fetch: async (url, options) => {
    upstreamRequests++
    const bytes = options.body ? new Uint8Array(await new Response(options.body).arrayBuffer()) : new Uint8Array()
    seen = { url: String(url), options, bytes }
    const headers = new Headers({ 'Content-Type': 'application/octet-stream', 'Location': 'https://mo7mels-projects.robustcabin8192.chatgpt.site/project/projects', 'Access-Control-Allow-Origin': '*' })
    headers.append('Set-Cookie', 'mo7mels_projects_session='+'b'.repeat(64)+'; Domain=upstream.test; Path=/; Max-Age=43200')
    headers.append('Set-Cookie', 'mo7mels_session=root-secret; Path=/')
    return new Response(Uint8Array.of(0, 255, 21), { headers })
  },
})
const env = { ASSETS }
const request = (path, options={}) => new Request('https://mo7mels.com'+path, options)
let response = await gateway.fetch(request('/books'),env)
assert.equal(response.status,200)
assert((await response.text()).includes('Grade 12 Textbooks | mo7mels'))
response = await gateway.fetch(request('/portfolio/'),env)
assert((await response.text()).includes('Digital Creator'))
response = await gateway.fetch(request('/asset.bin'),env)
assert.deepEqual(new Uint8Array(await response.arrayBuffer()),Uint8Array.of(0,1,255))
response = await gateway.fetch(request('/missing.pdf'),env)
assert.equal(response.status,404)
response = await gateway.fetch(request('/api/health'),env)
assert.deepEqual(await response.json(),{api:'/api/health'})
response = await gateway.fetch(request('/p'),env)
assert.equal(response.status,301)
assert.equal(response.headers.get('Location'),'https://mo7mels.com/portfolio/')
response = await gateway.fetch(new Request('https://www.mo7mels.com/books?q=1'),env)
assert.equal(response.status,308)
assert.equal(response.headers.get('Location'),'https://mo7mels.com/books?q=1')
response = await gateway.fetch(request('/sitemap.xml'),env)
assert((await response.text()).includes('https://mo7mels.com/project'))
response = await gateway.fetch(request('/project/api/projects',{method:'POST',headers:{Origin:'https://other.test'},body:'blocked'}),env)
assert.equal(response.status,403)
assert.equal(upstreamRequests,0)
const bytes = new Uint8Array(3*1024*1024).fill(72)
response = await gateway.fetch(request('/project/api/projects',{method:'POST',headers:{Origin:'https://mo7mels.com','Content-Type':'multipart/form-data; boundary=x',Cookie:'mo7mels_session=root-secret; mo7mels_projects_session='+'a'.repeat(64),Authorization:'Bearer root-secret','X-Forwarded-For':'spoofed','CF-Connecting-IP':'spoofed'},body:new Blob([bytes]).stream(),duplex:'half'}),env)
assert.equal(response.status,200)
assert.equal(seen.url,'https://mo7mels-projects.robustcabin8192.chatgpt.site/project/api/projects')
assert.equal(seen.options.headers.get('cookie'),'mo7mels_projects_session='+'a'.repeat(64))
assert.equal(seen.options.headers.get('origin'),'https://mo7mels-projects.robustcabin8192.chatgpt.site')
for (const h of ['authorization','x-forwarded-for','cf-connecting-ip']) assert.equal(seen.options.headers.get(h),null)
assert.deepEqual(seen.bytes,bytes)
assert.equal(response.headers.get('access-control-allow-origin'),null)
assert.equal(response.headers.get('location'),'https://mo7mels.com/project/projects')
assert.equal(response.headers.getSetCookie().length,1)
assert.match(response.headers.getSetCookie()[0],/Path=\/project; HttpOnly; SameSite=Strict; Secure/)
assert(!response.headers.getSetCookie()[0].includes('Domain='))
assert.deepEqual(new Uint8Array(await response.arrayBuffer()),Uint8Array.of(0,255,21))
console.log('PASS gateway: dynamic SEO/static/portfolio, redirects, sitemap, API dispatch, origin/header/cookie isolation, 3MiB streamed upload and binary response.')

// OAuth adds one narrowly scoped flow cookie. Unrelated root-site cookies and
// malformed or ambiguous cookie pairs must never cross the portal boundary.
const sessionPair = 'mo7mels_projects_session=' + 'a'.repeat(64)
const flowPair = 'mo7mels_projects_oauth=' + 'c'.repeat(64)
let cookieSeen, issuedCookies = []
const cookieGateway = createGateway({ fetch: async (url, options) => {
  cookieSeen = { url: String(url), headers: options.headers }
  const headers = new Headers()
  for (const value of issuedCookies) headers.append('Set-Cookie', value)
  if (new URL(url).pathname.endsWith('/start')) {
    headers.set('Location', 'https://accounts.google.com/o/oauth2/v2/auth?prompt=select_account')
    return new Response(null, { status: 302, headers })
  }
  return new Response(null, { headers })
} })
issuedCookies = [flowPair + '; Domain=upstream.test; Path=/; SameSite=None; Max-Age=99999; Expires=Wed, 01 Jan 2099 00:00:00 GMT', 'mo7mels_session=root-secret; Path=/']
response = await cookieGateway.fetch(request('/project/api/auth/google/start'), env)
assert.equal(response.status, 302)
assert.equal(response.headers.get('Location'), 'https://accounts.google.com/o/oauth2/v2/auth?prompt=select_account')
assert.deepEqual(response.headers.getSetCookie(), [flowPair + '; Path=/project; HttpOnly; SameSite=Lax; Secure; Max-Age=600'])
assert.equal(cookieSeen.url, 'https://mo7mels-projects.robustcabin8192.chatgpt.site/project/api/auth/google/start')

issuedCookies = [
  'mo7mels_projects_session=' + 'b'.repeat(64) + '; Domain=upstream.test; Path=/; SameSite=None; Max-Age=43200',
  'mo7mels_projects_oauth=; Domain=upstream.test; Path=/; Max-Age=99999',
  'mo7mels_session=root-secret; Path=/',
  'mo7mels_projects_oauth_evil=' + 'd'.repeat(64) + '; Path=/',
]
response = await cookieGateway.fetch(request('/project/api/auth/google/callback?code=example', { headers: { Cookie: 'mo7mels_session=root-secret; ' + flowPair + '; ' + sessionPair + '; unrelated=x' } }), env)
assert.equal(cookieSeen.headers.get('cookie'), flowPair + '; ' + sessionPair)
assert.equal(cookieSeen.headers.get('authorization'), null)
assert.equal(cookieSeen.headers.get('origin'), null)
assert.deepEqual(response.headers.getSetCookie(), [
  'mo7mels_projects_session=' + 'b'.repeat(64) + '; Path=/project; HttpOnly; SameSite=Strict; Secure; Max-Age=43200',
  'mo7mels_projects_oauth=; Path=/project; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
])

for (const malformed of [
  'mo7mels_projects_oauth=',
  'mo7mels_projects_oauth=' + 'A'.repeat(64),
  'mo7mels_projects_oauth=' + 'a'.repeat(63),
  'mo7mels_projects_oauth=' + 'a'.repeat(65),
  'mo7mels_projects_oauth="' + 'a'.repeat(64) + '"',
  'mo7mels_projects_oauth=' + 'a'.repeat(64) + '=extra',
  'MO7MELS_PROJECTS_OAUTH=' + 'a'.repeat(64),
  'mo7mels_projects_session=invalid',
]) {
  await cookieGateway.fetch(request('/project/api/auth/google/callback', { headers: { Cookie: 'mo7mels_session=root-secret; ' + malformed } }), env)
  assert.equal(cookieSeen.headers.get('cookie'), null, 'reject malformed or unrecognized cookie name/value')
}
await cookieGateway.fetch(request('/project/api/auth/google/callback', { headers: { Cookie: sessionPair + '; ' + flowPair + '; mo7mels_projects_oauth=' + 'd'.repeat(64) } }), env)
assert.equal(cookieSeen.headers.get('cookie'), sessionPair, 'duplicate flow names are rejected while the independent session survives')
await cookieGateway.fetch(request('/project/api/auth/google/callback', { headers: { Cookie: 'mo7mels_projects_session=invalid; ' + sessionPair + '; ' + flowPair } }), env)
assert.equal(cookieSeen.headers.get('cookie'), flowPair, 'a later valid duplicate cannot override an invalid first cookie')

issuedCookies = [flowPair, flowPair + '; Max-Age=90', 'mo7mels_projects_oauth=bad; Max-Age=600', 'mo7mels_projects_session=bad', 'foreign=cookie']
response = await cookieGateway.fetch(request('/project/api/auth/google/callback'), env)
assert.deepEqual(response.headers.getSetCookie(), [flowPair + '; Path=/project; HttpOnly; SameSite=Lax; Secure; Max-Age=90'], 'at most one valid outgoing cookie per allowlisted name')
issuedCookies = [flowPair + '; Max-Age=-1']
response = await cookieGateway.fetch(request('/project/api/auth/google/callback'), env)
assert.match(response.headers.getSetCookie()[0], /Max-Age=0$/)
issuedCookies = [flowPair + '; Expires=Wed, 01 Jan 2099 00:00:00 GMT']
response = await cookieGateway.fetch(request('/project/api/auth/google/callback'), env)
assert.match(response.headers.getSetCookie()[0], /Max-Age=600$/)
assert(!response.headers.getSetCookie()[0].includes('Expires='))
console.log('PASS Google OAuth proxy: transient Lax flow and Strict session cookies, callback forwarding, multiple Set-Cookie, 600-second cap, clearing, malformed/duplicate/foreign cookie isolation.')

const { normalizeDailyPapers, mergePaperCatalogs } = await import(catalogUrl)
const { mergeWorksheets, worksheetFiles } = await import(pathToFileURL(path.join(root, 'src/worksheets.js')).href)
const newPaper = {id:'daily-new-after-build',subjectId:'math',semester:1,track:'basic',titleAr:'اختبار جديد بعد بناء الموقع',titleEn:'New paper after build',viewerUrl:'https://drive.google.com/file/d/NEW-DAILY-FILE/preview',addedAt:'2026-10-29T08:00:00Z'}
const validated = normalizeDailyPapers([newPaper, {...newPaper,id:'duplicate-resource'}, {...newPaper,id:'unsafe-url',viewerUrl:'javascript:alert(1)'}, {...newPaper,id:'bad-subject',subjectId:'bad'}])
assert.equal(validated.length,1)
assert.equal(validated[0].track,'basic')
const combined = mergeWorksheets(validated)
assert(combined.some(paper=>paper.id===newPaper.id))
assert(worksheetFiles.every(paper=>combined.some(current=>current.id===paper.id)))
assert.equal(new Set(combined.map(paper=>paper.id)).size,combined.length)
assert.throws(()=>normalizeDailyPapers({papers:[]}),/array/)
assert.throws(()=>normalizeDailyPapers([{...newPaper,viewerUrl:'http://drive.google.com/file/d/bad/preview'}]),/valid/)
const large = Array.from({length:5001},(_,i)=>({...newPaper,id:'daily-'+i,viewerUrl:'https://drive.google.com/file/d/FILE-'+i+'/preview'}))
assert.equal(normalizeDailyPapers(large).length,5000)
assert.equal(mergePaperCatalogs(large).length,5000)
let dailyCalls=0, failDaily=false
const catalogGateway = createGateway({fetch: async(url,options)=>{
 assert.equal(String(url),'https://raw.githubusercontent.com/MO7EMMD/Mo7mels/main/src/daily-papers.json')
 assert.equal(options.redirect,'error')
 assert(options.signal instanceof AbortSignal)
 dailyCalls++
 if(failDaily)throw Error('Offline')
 return Response.json([newPaper])
}})
response=await catalogGateway.fetch(request('/daily-papers.json?ignored=1'),env)
assert.equal(response.status,200)
assert.equal((await response.json())[0].id,newPaper.id)
assert.match(response.headers.get('Cache-Control'),/s-maxage=300/)
failDaily=true
response=await catalogGateway.fetch(request('/daily-papers.json'),env)
assert.equal((await response.json())[0].id,newPaper.id,'last good catalog survives network loss')
assert.match(response.headers.get('Cache-Control'),/s-maxage=60/)
const assetFallback = createGateway({fetch:async()=>{throw Error('Offline')}})
response=await assetFallback.fetch(request('/daily-papers.json'),{ASSETS:{fetch:async()=>Response.json([newPaper])}})
assert.equal((await response.json())[0].id,newPaper.id,'local ASSETS fallback is used')
const bundledFallback = createGateway({fetch:async()=>new Response('[]',{headers:{'Content-Length':String(9*1024*1024)}})})
response=await bundledFallback.fetch(request('/daily-papers.json'),env)
assert.equal((await response.json()).length,JSON.parse(bundled).length,'oversized upstream falls back to bundled catalog')
let cacheFetches=0
const originalCaches=globalThis.caches, cacheValues=new Map()
globalThis.caches={default:{match:async key=>cacheValues.get(key.url)?.clone(),put:async(key,value)=>{cacheValues.set(key.url,value.clone())}}}
try{
 const cachedGateway=createGateway({fetch:async()=>{cacheFetches++;return Response.json([newPaper])}})
 response=await cachedGateway.fetch(request('/daily-papers.json'),env)
 await response.json()
 response=await cachedGateway.fetch(request('/daily-papers.json?other=1'),env)
 assert.equal((await response.json())[0].id,newPaper.id)
 assert.equal(cacheFetches,1,'edge cache avoids another GitHub request')
 response=await cachedGateway.fetch(request('/daily-papers.json',{method:'HEAD'}),env)
 assert.equal((await response.text()).length,0)
}finally{if(originalCaches===undefined)delete globalThis.caches;else globalThis.caches=originalCaches}
console.log('PASS daily catalog: new post-build paper, curated/bundled preservation, schema/URL/Arabic math validation, dedup/5000 bound, edgecache, HEAD, size guard and offline fallbacks.')


// Exercise the retained account API under Node HTTP with an in-memory fake DB.
// Production runtime still requires Cloudflare HTTP adapter validation.
// The boundary suites above can also run where loopback networking is blocked.
if (!process.argv.includes('--gateway-only')) {
const moduleRequire = createRequire(path.join(root,'../grade12-books/package.json'))
const appSource = (await fs.readFile(path.join(root,'server/worker-app.js'),'utf8')).replace(/^import .+\r?\n/gm,'')
const appCode = `import cors from ${JSON.stringify(pathToFileURL(moduleRequire.resolve('cors')).href)};import express from ${JSON.stringify(pathToFileURL(moduleRequire.resolve('express')).href)};import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';const {buildRobotsTxt,buildSitemapXml}=await import(${JSON.stringify(seoUrl)});\n${appSource}`
const {createRootApp}=await import('data:text/javascript;base64,'+Buffer.from(appCode).toString('base64'))
const users=new Map(),sessions=new Map()
const db={getStorageMode:()=> 'supabase-postgres',getUserByEmail:async email=>users.get(email)||null,createUser:async u=>{const v={...u,id:1,createdAt:new Date().toISOString()};users.set(u.email,v);return v},createSession:async(token,userEmail,expiresAt)=>sessions.set(token,{userEmail,expiresAt}),getSession:async token=>sessions.get(token)||null,deleteSession:async token=>sessions.delete(token)}
const server=createRootApp({db}).listen(0,'127.0.0.1')
await new Promise(resolve=>server.once('listening',resolve))
const origin='http://127.0.0.1:'+server.address().port
try{
 const signup=await fetch(origin+'/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test Student',email:'example@example.test',password:'Example123',confirmPassword:'Example123'})})
 assert.equal(signup.status,201)
 const signed=await signup.json()
 assert(!JSON.stringify(signed).includes('password_hash'))
 const login=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'example@example.test',password:'Example123'})})
 assert.equal(login.status,200)
 const logged=await login.json()
 assert.match(logged.token,/^[a-f0-9]{64}$/)
 const me=await fetch(origin+'/api/auth/me',{headers:{Authorization:'Bearer '+logged.token}})
 assert.equal(me.status,200)
 assert.equal((await me.json()).user.email,'example@example.test')
 const logout=await fetch(origin+'/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+logged.token}})
 assert.equal(logout.status,200)
 const gone=await fetch(origin+'/api/auth/me',{headers:{Authorization:'Bearer '+logged.token}})
 assert.equal(gone.status,401)
 const google=await fetch(origin+'/api/auth/google',{redirect:'manual'})
 assert.equal(google.status,503)
 console.log('PASS retained account API: signup, login, private identity, logout/session revocation, no password material, unconfigured Google status.')
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}
