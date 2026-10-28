import { useEffect, useState } from 'react'
import { mergeWorksheets, worksheetFiles } from './worksheets.js'
import { normalizeDailyPapers } from './paper-catalog.js'

let snapshot = worksheetFiles, checkedAt = 0, pending
async function refresh() {
  if (Date.now() - checkedAt < 5 * 60 * 1000) return snapshot
  if (pending) return pending
  pending = (async () => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('/daily-papers.json', { credentials: 'omit', cache: 'no-cache', signal: controller.signal })
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Catalog unavailable')
      snapshot = mergeWorksheets(normalizeDailyPapers(await response.json()))
    } catch { /* Keep the bundled or last successful library available offline. */ }
    finally { clearTimeout(timer); checkedAt = Date.now(); pending = null }
    return snapshot
  })()
  return pending
}

export function useWorksheetFiles() {
  const [files, setFiles] = useState(snapshot)
  useEffect(() => {
    let active = true
    const update = () => refresh().then(next => { if (active) setFiles(next) })
    const onVisible = () => { if (document.visibilityState === 'visible') update() }
    update()
    document.addEventListener('visibilitychange', onVisible)
    return () => { active = false; document.removeEventListener('visibilitychange', onVisible) }
  }, [])
  return files
}
