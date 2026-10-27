export default function ArabicMathText({ children, as: Element = 'span', className = '' }) {
  const parts = String(children).split(/(\^\{[^{}]+\}|_\{[^{}]+\})/g)
  return <Element className={`arabic-math-text ${className}`.trim()} dir="rtl" lang="ar">{parts.map((part, index) => part.startsWith('^{') ? <sup key={index} dir="rtl">{part.slice(2, -1)}</sup> : part.startsWith('_{') ? <sub key={index} dir="rtl">{part.slice(2, -1)}</sub> : part)}</Element>
}
