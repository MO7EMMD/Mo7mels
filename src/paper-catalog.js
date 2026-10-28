const subjects = new Set(['physics','math','arabic','english','chemistry','biology','islamic','geography','ict','art','homeland','sports','environmental','history','social'])
const hosts = new Set(['drive.google.com','docs.google.com','fileae.com','www.fileae.com','home.moe.gov.om','almanahj.com','www.almanahj.com','kwedufiles.com','www.kwedufiles.com','afidni.com','www.afidni.com'])
export const MAX_PAPERS = 5000

function safeUrl(value) {
  if (typeof value !== 'string' || value.length > 3000) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hosts.has(url.hostname)) return null
    if (['docs.google.com','drive.google.com'].includes(url.hostname) && url.searchParams.has('url') && !safeUrl(url.searchParams.get('url'))) return null
    url.hash = ''
    return url.href
  } catch { return null }
}

export function canonicalPaper(paper) {
  try {
    let url = new URL(paper.pdfUrl || paper.viewerUrl)
    if (['docs.google.com','drive.google.com'].includes(url.hostname) && url.searchParams.has('url')) url = new URL(url.searchParams.get('url'))
    const driveId = url.pathname.match(/\/file\/d\/([-\w]+)/)?.[1]
    url.hash = ''
    return driveId ? 'drive:' + driveId : url.href
  } catch { return null }
}

export function normalizeDailyPapers(value) {
  if (!Array.isArray(value)) throw new TypeError('Paper catalog must be an array')
  const result = [], ids = new Set(), urls = new Set()
  for (const input of value.slice(0, MAX_PAPERS)) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) continue
    if (typeof input.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(input.id) || !subjects.has(input.subjectId) || ![1,2].includes(input.semester)) continue
    if (typeof input.titleAr !== 'string' || !input.titleAr.trim() || input.titleAr.length > 800) continue
    if (input.titleEn !== undefined && (typeof input.titleEn !== 'string' || input.titleEn.length > 800)) continue
    const viewerUrl = safeUrl(input.viewerUrl), pdfUrl = input.pdfUrl ? safeUrl(input.pdfUrl) : null
    if (!viewerUrl || (input.pdfUrl && !pdfUrl)) continue
    if (input.subjectId === 'math' && /منهج\s*(?:باللغة\s*)?(?:إنجليزي|انجليزي|إنجليز|انجليز)|باللغة\s*(?:الإنجليزية|الانجليزية)|english[- ]medium|english[- ]curriculum/i.test(input.titleAr + ' ' + (input.titleEn || ''))) continue
    const paper = { id: input.id, subjectId: input.subjectId, semester: input.semester, titleAr: input.titleAr.trim(), titleEn: input.titleEn?.trim() || input.titleAr.trim(), viewerUrl }
    if (pdfUrl) paper.pdfUrl = pdfUrl
    if (['basic','advanced'].includes(input.track)) paper.track = input.track
    if (typeof input.topic === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(input.topic)) paper.topic = input.topic
    const sourceUrl = safeUrl(input.sourceUrl)
    if (sourceUrl) paper.sourceUrl = sourceUrl
    if (typeof input.addedAt === 'string' && input.addedAt.length < 40 && Number.isFinite(Date.parse(input.addedAt))) paper.addedAt = new Date(input.addedAt).toISOString()
    const key = canonicalPaper(paper)
    if (!key || ids.has(paper.id) || urls.has(key)) continue
    ids.add(paper.id); urls.add(key); result.push(paper)
  }
  if (value.length && !result.length) throw new TypeError('Paper catalog has no valid entries')
  return result
}

export function mergePaperCatalogs(...catalogs) {
  const result = [], ids = new Set(), urls = new Set()
  for (const catalog of catalogs) for (const paper of catalog) {
    const key = canonicalPaper(paper)
    if (!key || ids.has(paper.id) || urls.has(key) || result.length >= MAX_PAPERS) continue
    ids.add(paper.id); urls.add(key); result.push(paper)
  }
  return result.sort((a,b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
}
