import { useState } from 'react'
import textbooks from './textbooks.json'

function BookLibrary({ subjects, language, hidden }) {
  const [search, setSearch] = useState('')
  const ar = language === 'ar'
  const query = search.toLocaleLowerCase().trim()
  const groups = [
    { kind: 'student', ar: 'كتاب الطالب', en: 'Student book' },
    { kind: 'activity', ar: 'كتاب النشاط', en: 'Activity book' },
  ]
  const visibleSubjects = subjects.filter((subject) => !query ||
    `${subject.ar} ${subject.en}`.toLocaleLowerCase().includes(query) ||
    textbooks.some((book) => book.subjectId === subject.id && `${book.titleAr} ${book.titleEn}`.toLocaleLowerCase().includes(query)),
  )
  const termLabel = (term) => term === '1' ? (ar ? 'الفصل الأول' : 'Semester 1') : term === '2' ? (ar ? 'الفصل الثاني' : 'Semester 2') : (ar ? 'الفصلان الدراسيان' : 'Both semesters')

  const bookLink = (book, subject) => <a key={book.id} className="textbook-link" href={book.url} target="_blank" rel="noopener noreferrer" aria-label={`${ar ? 'فتح' : 'Open'} ${ar ? book.titleAr : book.titleEn} · ${ar ? subject.ar : subject.en} · ${termLabel(book.term)} · PDF`}>
    <span className="textbook-link-copy"><strong>{ar ? book.titleAr : book.titleEn}</strong><small>{termLabel(book.term)}</small></span>
    <span className="textbook-pdf" aria-hidden="true">PDF <span>↗</span></span>
  </a>

  return <section className="study-panel textbook-library" hidden={hidden}>
    <div className="study-section-heading"><div><span>{ar ? 'مكتبة المنهج' : 'CURRICULUM LIBRARY'}</span><h2>{ar ? 'كتب الطالب والنشاط' : 'Student and activity books'}</h2></div></div>
    <p className="study-help">{ar ? 'اختر كتاب الطالب أو النشاط لفتح ملف PDF مباشرة. راجع الفصل الدراسي واسم الكتاب قبل الفتح.' : 'Choose a student or activity book to open its PDF directly. Check the semester and book title before opening.'}</p>
    <label className="study-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label={ar ? 'البحث عن مادة أو كتاب' : 'Search subjects or books'} placeholder={ar ? 'ابحث عن مادة أو كتاب...' : 'Search subjects or books...'} /></label>
    <div className="textbook-subject-grid">
      {visibleSubjects.map((subject) => {
        const books = textbooks.filter((book) => book.subjectId === subject.id)
        const otherBooks = books.filter((book) => book.kind === 'other')
        return <article className="textbook-subject" key={subject.id}>
          <header className="textbook-subject-heading"><span className="subject-icon" aria-hidden="true">{subject.icon}</span><div><h3>{ar ? subject.ar : subject.en}</h3><p>{ar ? 'الصف الثاني عشر' : 'Grade 12'}</p></div></header>
          {groups.map((group) => {
            const matchingBooks = books.filter((book) => book.kind === group.kind)
            return <section className="textbook-kind" key={group.kind} aria-label={`${ar ? group.ar : group.en} · ${ar ? subject.ar : subject.en}`}>
              <h4>{ar ? group.ar : group.en}</h4>
              {matchingBooks.length ? <div className="textbook-links">{matchingBooks.map((book) => bookLink(book, subject))}</div> : <p className="textbook-unavailable">{ar ? `لا يتوفر ملف منفصل ل${group.ar} في الفهرس الحالي.` : `No separate ${group.en.toLowerCase()} PDF is available in the current catalog.`}</p>}
            </section>
          })}
          {otherBooks.length > 0 && <section className="textbook-kind"><h4>{ar ? 'كتب إضافية' : 'Additional books'}</h4><div className="textbook-links">{otherBooks.map((book) => bookLink(book, subject))}</div></section>}
        </article>
      })}
    </div>
    {visibleSubjects.length === 0 && <p className="textbook-empty" role="status">{ar ? 'لا توجد كتب مطابقة. جرّب اسم مادة أو كتاب آخر.' : 'No matching books. Try a different subject or book title.'}</p>}
    <p className="study-source-note">mo7mels · {ar ? 'مكتبة الصف الثاني عشر' : 'Grade 12 library'}</p>
  </section>
}

export default BookLibrary
