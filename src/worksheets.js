import dailyPapers from './daily-papers.json' with { type: 'json' }

const curatedWorksheets = [
  {
    "id": "physics-final-2026",
    "subjectId": "physics",
    "semester": 1,
    "titleAr": "اختبار الفيزياء النهائي 2025–2026",
    "titleEn": "Physics final exam 2025–2026",
    "viewerUrl": "https://drive.google.com/file/d/1HhbnlAUUIVpt0l2R2dBdwiL2ipiBP2OV/preview"
  },
  {
    "id": "physics-final-answers-2026",
    "subjectId": "physics",
    "semester": 1,
    "titleAr": "إجابة اختبار الفيزياء النهائي 2025–2026",
    "titleEn": "Physics final exam answer key 2025–2026",
    "viewerUrl": "https://drive.google.com/file/d/1VZAuJjpQmJIwk_woabO18d9rIdJTikLS/preview"
  },
  {
    "id": "nuclear-practice",
    "subjectId": "physics",
    "semester": 2,
    "titleAr": "تدريبات الفيزياء النووية",
    "titleEn": "Nuclear physics practice",
    "viewerUrl": "https://drive.google.com/file/d/1cm9WikLYBXeDQH7QUD8JF_zy9f9rZh6A/preview",
    "topic": "nuclear-physics"
  },
  {
    "id": "nuclear-answers",
    "subjectId": "physics",
    "semester": 2,
    "titleAr": "حل تدريبات الفيزياء النووية",
    "titleEn": "Nuclear physics answer key",
    "viewerUrl": "https://drive.google.com/file/d/18fOzgMaGogzljxLq0c_DAQLb7ZGJuMA_/preview",
    "topic": "nuclear-physics"
  },
  {
    "id": "quantum-practice",
    "subjectId": "physics",
    "semester": 2,
    "titleAr": "تدريبات فيزياء الكم",
    "titleEn": "Quantum physics practice",
    "viewerUrl": "https://drive.google.com/file/d/1ysHBMcTR3GXwd8rL8dI1_jg3VnLN0C6R/preview",
    "topic": "quantum-physics"
  },
  {
    "id": "quantum-answers",
    "subjectId": "physics",
    "semester": 2,
    "titleAr": "حل تدريبات فيزياء الكم",
    "titleEn": "Quantum physics answer key",
    "viewerUrl": "https://drive.google.com/file/d/1jVQw45t80pk9CtEt59XF8JnSjJzBCUnL/preview",
    "topic": "quantum-physics"
  },
  {
    "id": "wave-superposition-review",
    "subjectId": "physics",
    "semester": 2,
    "titleAr": "مراجعة تراكب الموجات",
    "titleEn": "Wave superposition review",
    "viewerUrl": "https://drive.google.com/file/d/1TzFSS5HOxTWPXO5u5N5CeDLYGOaqLyBB/preview",
    "topic": "superposition"
  },
  {
    "id": "advanced-math-notebook",
    "subjectId": "math",
    "semester": 1,
    "titleAr": "دفتر تدريب الرياضيات المتقدمة",
    "titleEn": "Advanced Mathematics practice notebook",
    "viewerUrl": "https://drive.google.com/file/d/17DoYVcOOiifnotCnZMTnviNOqwq9VnoI/preview",
    "track": "advanced"
  },
  {
    "id": "advanced-math-final-review",
    "subjectId": "math",
    "semester": 1,
    "titleAr": "مراجعة الرياضيات المتقدمة",
    "titleEn": "Advanced Mathematics final review",
    "viewerUrl": "https://drive.google.com/file/d/1NHmxRc3Y6hlX3s7G0DwxOGUyBkF8pP_T/preview",
    "track": "advanced"
  },
  {
    "id": "basic-math-activities",
    "subjectId": "math",
    "semester": 1,
    "titleAr": "أنشطة الرياضيات الأساسية",
    "titleEn": "Basic Mathematics activity notebook",
    "viewerUrl": "https://drive.google.com/file/d/1rOUKVpYeV3Cz9BUNy_64B3hVMCCrowoB/preview",
    "track": "basic"
  }
]

export const worksheetPath = (paper) => `/worksheets/${paper.id}`

const canonicalPaper = (paper) => {
  const value = paper.pdfUrl || paper.viewerUrl
  const url = new URL(value)
  return url.searchParams.get('url') || value.replace(/\/(?:preview|view)(?:\?.*)?$/, '')
}
const seenPapers = new Set()
export const worksheetFiles = [...curatedWorksheets, ...dailyPapers].filter((paper) => {
  const key = canonicalPaper(paper)
  if(seenPapers.has(key)) return false
  seenPapers.add(key)
  return true
}).sort((a,b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
