import test from 'node:test'
import { worksheetFiles } from '../src/worksheets.js'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PUBLIC_PAGES, getPageMetadata, renderSeoHtml, buildSitemapXml, buildRobotsTxt } from './seo.js'

test('public pages have unique route-specific canonical URLs and titles', () => {
  assert.equal(PUBLIC_PAGES.length, 22)
  const canonicals = PUBLIC_PAGES.map(page => getPageMetadata(page.pathname).canonical)
  assert.equal(new Set(canonicals).size, PUBLIC_PAGES.length)
  assert.equal(new Set(PUBLIC_PAGES.map(page => page.title)).size, PUBLIC_PAGES.length)
  assert.equal(getPageMetadata('/physics?ignored=1').canonical, 'https://mo7mels.com/physics')
  assert.equal(getPageMetadata('/mathematics/basic/').canonical, 'https://mo7mels.com/mathematics/basic')
  assert.equal(getPageMetadata('/project').title, 'مشروع')
})

test('HTML metadata and schema identify the requested public page', () => {
  const input = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  for (const page of PUBLIC_PAGES) {
    const html = renderSeoHtml(input, page.pathname)
    const metadata = getPageMetadata(page.pathname)
    assert(html.includes(`href="${metadata.canonical}"`))
    assert(!html.includes('__SITE_URL__'))
    assert(!html.includes('https://www.mo7mels.com'))
    const script = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]
    const graph = JSON.parse(script)['@graph']
    assert.equal(graph[0].name, 'mo7mels')
    assert.equal(graph[1].url, metadata.canonical)
  }
})

test('sitemap includes project and published study pages, excluding account data routes', () => {
  const sitemap = buildSitemapXml()
  assert(sitemap.includes('<loc>https://mo7mels.com/project</loc>'))
  assert(sitemap.includes('<loc>https://mo7mels.com/portfolio/</loc>'))
  assert(!/https:\/\/www\.mo7mels|dashboard|login|signup|teacher|students|settings|\/api\/|\/files\//.test(sitemap))
  assert.equal((sitemap.match(/<loc>/g) || []).length, PUBLIC_PAGES.length)
  assert.equal(readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8'), sitemap)
})

test('account HTML is noindex without blocking public landing or crawl assets', () => {
  const input = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert(renderSeoHtml(input, '/dashboard/settings').includes('content="noindex,follow"'))
  assert(renderSeoHtml(input, '/login').includes('content="noindex,follow"'))
  const robots = buildRobotsTxt()
  assert(robots.includes('Sitemap: https://mo7mels.com/sitemap.xml'))
  assert(robots.includes('Disallow: /project/api/'))
  assert(!robots.includes('Disallow: /project\n'))
  assert(!robots.includes('_next'))
  assert.equal(readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8'), robots)
})
