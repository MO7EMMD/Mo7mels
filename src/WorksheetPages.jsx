import { useEffect, useState } from 'react'
import { worksheetFiles } from './worksheets.js'
import './worksheet-pages.css'

const paperSubjects = {physics:['الفيزياء','Physics'],math:['الرياضيات','Mathematics'],arabic:['اللغة العربية','Arabic'],english:['اللغة الإنجليزية','English'],chemistry:['الكيمياء','Chemistry'],biology:['الأحياء','Biology'],islamic:['التربية الإسلامية','Islamic Education'],geography:['الجغرافيا','Geography'],ict:['تقنية المعلومات','Information Technology'],art:['الفنون التشكيلية','Visual Arts'],homeland:['هذا وطني','This Is My Country'],sports:['الرياضة المدرسية','School Sports'],environmental:['العلوم البيئية','Environmental Science'],history:['التاريخ','History'],social:['الدراسات الاجتماعية','Social Studies']}

export function WorksheetCards({ files = worksheetFiles, language }) {
  const ar = language === 'ar'
  const [limit, setLimit] = useState(12)
  const identity=files.map((paper)=>paper.id).join(',')
  useEffect(()=>setLimit(12),[identity])
  return <><div className="paper-card-grid">{files.slice(0,limit).map((paper) => <a className="paper-card" key={paper.id} href={paper.viewerUrl} target="_blank" rel="noopener noreferrer" aria-label={`${ar ? 'فتح' : 'Open'} ${ar ? paper.titleAr : paper.titleEn} · ${ar ? 'تبويب جديد' : 'new tab'}`}>
    <span className="paper-card-icon" aria-hidden="true">▤</span>
    <span className="paper-card-copy"><small>mo7mels · PDF</small><strong>{ar ? paper.titleAr : paper.titleEn}</strong><span>{paperSubjects[paper.subjectId]?.[ar?0:1] || (ar?'الصف الثاني عشر':'Grade 12')} · {ar ? `الفصل ${paper.semester === 1 ? 'الأول' : 'الثاني'}` : `Semester ${paper.semester}`}</span></span>
    <span className="paper-card-arrow" aria-hidden="true">↗</span>
  </a>)}</div>{limit<files.length&&<button type="button" className="paper-show-more" onClick={()=>setLimit((value)=>value+12)}>{ar?`عرض ${Math.min(12,files.length-limit)} أوراق إضافية`:`Show ${Math.min(12,files.length-limit)} more papers`}</button>}</>
}

export function WorksheetLibrary({ language, catalog = worksheetFiles }) {
  const ar=language==='ar'
  const [query,setQuery]=useState(''),[subject,setSubject]=useState(''),[semester,setSemester]=useState('')
  const search=query.trim().toLocaleLowerCase()
  const subjects=[...new Set(catalog.map((paper)=>paper.subjectId))]
  const files=catalog.filter((paper)=>(!subject||paper.subjectId===subject)&&(!semester||String(paper.semester)===semester)&&(!search||`${paper.titleAr} ${paper.titleEn} ${paperSubjects[paper.subjectId]?.join(' ')||''}`.toLocaleLowerCase().includes(search)))
  return <><div className="paper-filters"><input aria-label={ar?'البحث في أوراق العمل':'Search worksheets'} placeholder={ar?'ابحث عن ورقة أو اختبار...':'Search a worksheet or test...'} value={query} onChange={(event)=>setQuery(event.target.value)}/><select aria-label={ar?'تصفية الأوراق بالمادة':'Filter papers by subject'} value={subject} onChange={(event)=>setSubject(event.target.value)}><option value="">{ar?'كل المواد':'All subjects'}</option>{subjects.map((id)=><option key={id} value={id}>{paperSubjects[id]?.[ar?0:1]||id}</option>)}</select><select aria-label={ar?'تصفية الأوراق بالفصل':'Filter papers by semester'} value={semester} onChange={(event)=>setSemester(event.target.value)}><option value="">{ar?'الفصلان':'Both semesters'}</option><option value="1">{ar?'الفصل الأول':'Semester 1'}</option><option value="2">{ar?'الفصل الثاني':'Semester 2'}</option></select></div><p className="paper-results" role="status">{ar?`${files.length} ورقة متاحة`:`${files.length} papers available`}</p>{files.length?<WorksheetCards files={files} language={language}/>:<p className="study-help">{ar?'لا توجد أوراق مطابقة لهذا البحث.':'No papers match this search.'}</p>}</>
}

