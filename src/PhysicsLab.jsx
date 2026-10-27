import { useEffect, useId, useMemo, useRef, useState } from 'react'
import './physics-lab.css'

const EARTH_GM = 3.986004418e14
const EARTH_RADIUS = 6371000
const WAVE_SPEED = 2

function number(value, language, digits = 2) {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-OM' : 'en-GB', { maximumFractionDigits: digits }).format(value)
}

function RangeControl({ label, value, onChange, min, max, step = 1, unit, language, digits = 2 }) {
  const id = useId()
  const formatted = number(value, language, digits)
  return <div className="pl-control">
    <label htmlFor={id}><span>{label}</span><output htmlFor={id} dir="ltr">{formatted} {unit}</output></label>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-valuetext={`${formatted} ${unit}`} />
  </div>
}

function Readings({ items, language }) {
  return <dl className="pl-readings">{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd><bdi dir="ltr">{number(item.value, language, item.digits ?? 2)} <span>{item.unit}</span></bdi></dd></div>)}</dl>
}

function Formulae({ children }) {
  return <div className="pl-formulae" dir="ltr">{children}</div>
}

function CircuitDiagram({ mode, voltage, resistance1, resistance2, language, markerId }) {
  const ar = language === 'ar'
  const series = mode === 'series'
  const equivalent = series ? resistance1 + resistance2 : resistance1 * resistance2 / (resistance1 + resistance2)
  const current = voltage / equivalent
  const firstVoltage = series ? current * resistance1 : voltage
  const secondVoltage = series ? current * resistance2 : voltage
  return <svg className="pl-diagram pl-circuit" viewBox="0 0 560 330" role="img" aria-label={ar ? `دائرة تيار مستمر بمقاومتين موصولتين على ${series ? 'التوالي' : 'التوازي'}` : `DC circuit with two resistors in ${series ? 'series' : 'parallel'}`}>
    <defs><marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" className="pl-current-fill" /></marker></defs>
    <g className="pl-wire" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M60 165 V75 H170 M60 184 V270 H495 V75 H410" />
      <path d="M38 165 H82 M48 184 H72" />
      {series ? <><path d="M250 75 H330" /><rect x="170" y="60" width="80" height="30" rx="2" /><rect x="330" y="60" width="80" height="30" rx="2" /></> : <>
        <path d="M170 75 V215 H225 M305 215 H410 V75 M170 75 H225 M305 75 H410" /><rect x="225" y="60" width="80" height="30" rx="2" /><rect x="225" y="200" width="80" height="30" rx="2" />
      </>}
    </g>
    {!series && <g className="pl-node"><circle cx="170" cy="75" r="5" /><circle cx="410" cy="75" r="5" /></g>}
    <g className="pl-diagram-label" textAnchor="middle" direction="ltr">
      <text x="104" y="160">+</text><text x="104" y="198">−</text><text x="89" y="230">{number(voltage, language, 0)} V</text>
      <text x={series ? 210 : 265} y="42">R1 = {number(resistance1, language, 0)} Ω</text>
      <text x={series ? 370 : 265} y={series ? 42 : 182}>R2 = {number(resistance2, language, 0)} Ω</text>
      <text x={series ? 210 : 265} y="117">{number(firstVoltage, language)} V</text>
      <text x={series ? 370 : 265} y={series ? 117 : 252}>{number(secondVoltage, language)} V</text>
    </g>
    <path className="pl-current-line" d="M420 270 H340" fill="none" strokeWidth="2.5" markerEnd={`url(#${markerId})`} />
    <text className="pl-diagram-label pl-current-text" x="380" y="302" textAnchor="middle" direction="ltr">I = {number(current, language)} A</text>
  </svg>
}

function CircuitLab({ language, id }) {
  const ar = language === 'ar'
  const [mode, setMode] = useState('series')
  const [voltage, setVoltage] = useState(12)
  const [resistance1, setResistance1] = useState(10)
  const [resistance2, setResistance2] = useState(20)
  const equivalent = mode === 'series' ? resistance1 + resistance2 : resistance1 * resistance2 / (resistance1 + resistance2)
  const current = voltage / equivalent
  return <>
    <p className="pl-explanation">{ar ? 'غيّر توصيل المقاومتين ولاحظ التيار. على التوالي يمر التيار نفسه في المقاومتين، وعلى التوازي يتساوى الجهد على الفرعين.' : 'Change the resistor connection and observe the current. Series resistors carry the same current; parallel branches share the same voltage.'}</p>
    <div className="pl-workbench">
      <figure className="pl-visual"><CircuitDiagram mode={mode} voltage={voltage} resistance1={resistance1} resistance2={resistance2} language={language} markerId={`${id}-current`} /><figcaption>{ar ? 'مخطط دائرة مثالية؛ السهم يبين اتجاه التيار الاصطلاحي. نهمل المقاومة الداخلية للبطارية والأسلاك.' : 'Ideal circuit schematic; the arrow shows conventional current. Internal battery and wire resistance are neglected.'}</figcaption></figure>
      <div className="pl-controls">
        <fieldset className="pl-connection"><legend>{ar ? 'طريقة التوصيل' : 'Connection'}</legend><div>{[['series', ar ? 'توالي' : 'Series'], ['parallel', ar ? 'توازٍ' : 'Parallel']].map(([value, label]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}</div></fieldset>
        <RangeControl label={ar ? 'جهد البطارية' : 'Battery voltage'} value={voltage} onChange={setVoltage} min={1} max={24} unit="V" language={language} />
        <RangeControl label={ar ? 'المقاومة الأولى R1' : 'Resistance R1'} value={resistance1} onChange={setResistance1} min={1} max={100} unit="Ω" language={language} />
        <RangeControl label={ar ? 'المقاومة الثانية R2' : 'Resistance R2'} value={resistance2} onChange={setResistance2} min={1} max={100} unit="Ω" language={language} />
      </div>
    </div>
    <Readings language={language} items={[
      { label: ar ? 'المقاومة المكافئة' : 'Equivalent resistance', value: equivalent, unit: 'Ω' },
      { label: ar ? 'التيار الكلي' : 'Total current', value: current, unit: 'A', digits: 3 },
      { label: ar ? 'القدرة الكلية' : 'Total power', value: voltage * current, unit: 'W' },
      ...(mode === 'parallel' ? [{ label: ar ? 'تيار الفرع الأول' : 'Branch 1 current', value: voltage / resistance1, unit: 'A', digits: 3 }, { label: ar ? 'تيار الفرع الثاني' : 'Branch 2 current', value: voltage / resistance2, unit: 'A', digits: 3 }] : []),
    ]} />
    <Formulae><code>{mode === 'series' ? 'R = R1 + R2' : '1/R = 1/R1 + 1/R2'}</code><code>I = V/R</code><code>P = V*I</code></Formulae>
    <p className="pl-question">{ar ? 'جرّب: اجعل المقاومتين متساويتين، ثم بدّل التوصيل. لماذا يزداد التيار الكلي عند التوازي؟' : 'Try equal resistances, then switch the connection. Why does the total current increase in parallel?'}</p>
  </>
}

function WaveLab({ language }) {
  const ar = language === 'ar'
  const [amplitude1, setAmplitude1] = useState(0.4)
  const [amplitude2, setAmplitude2] = useState(0.4)
  const [frequency, setFrequency] = useState(1)
  const [phase, setPhase] = useState(90)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const timeRef = useRef(0)
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const onVisibility = () => setDocumentVisible(!document.hidden)
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = (event) => setReducedMotion(event.matches)
    document.addEventListener('visibilitychange', onVisibility)
    query.addEventListener('change', onMotion)
    return () => { document.removeEventListener('visibilitychange', onVisibility); query.removeEventListener('change', onMotion) }
  }, [])
  useEffect(() => {
    if (!playing || !documentVisible || reducedMotion) return undefined
    let frame, previous, renderedAt = 0
    const tick = (now) => {
      if (previous !== undefined) timeRef.current += Math.min((now - previous) / 1000, 0.1)
      previous = now
      if (now - renderedAt >= 1000 / 30) { setTime(timeRef.current); renderedAt = now }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, documentVisible, reducedMotion])
  const wavelength = WAVE_SPEED / frequency
  const radians = phase * Math.PI / 180
  const resultant = Math.sqrt(Math.max(0, amplitude1 ** 2 + amplitude2 ** 2 + 2 * amplitude1 * amplitude2 * Math.cos(radians)))
  const paths = useMemo(() => {
    const points = [[], [], []]
    for (let i = 0; i <= 240; i++) {
      const x = i / 240 * 4
      const argument = 2 * Math.PI * (x / wavelength - frequency * time)
      const y1 = amplitude1 * Math.sin(argument)
      const y2 = amplitude2 * Math.sin(argument + radians)
      ;[y1, y2, y1 + y2].forEach((y, index) => points[index].push(`${i ? 'L' : 'M'}${(65 + x / 4 * 455).toFixed(2)},${(152 - y * 88).toFixed(2)}`))
    }
    return points.map((points) => points.join(' '))
  }, [amplitude1, amplitude2, frequency, radians, time, wavelength])
  return <>
    <p className="pl-explanation">{ar ? 'موجتان مستعرضتان تتحركان في الاتجاه نفسه، ولهما التردد نفسه. الإزاحة المحصلة عند كل نقطة تساوي مجموع الإزاحتين، وليست مجموع السعتين دائمًا.' : 'Two transverse waves travel in the same direction at the same frequency. The resultant displacement at each point is the sum of their displacements, not always the sum of their amplitudes.'}</p>
    <div className="pl-workbench">
      <figure className="pl-visual">
        <svg className="pl-diagram pl-wave" viewBox="0 0 560 330" role="img" aria-label={ar ? 'رسم معاير للموجتين ومحصلة التراكب؛ المحوران بالمتر' : 'Calibrated plot of two waves and their superposition; both axes are in metres'}>
          <g className="pl-grid-line" fill="none" strokeWidth="1">{[1, 2, 3, 4].map((x) => <path key={x} d={`M${65 + x / 4 * 455} 38 V266`} />)}{[-1, 0, 1].map((y) => <path key={y} d={`M65 ${152 - y * 88} H520`} />)}</g>
          <path className="pl-axis" d="M65 38 V266 M65 152 H530" fill="none" strokeWidth="1.5" />
          <g className="pl-diagram-label" direction="ltr">{[0, 1, 2, 3, 4].map((x) => <text key={x} x={65 + x / 4 * 455} y="288" textAnchor="middle">{number(x, language, 0)}</text>)}{[-1, 0, 1].map((y) => <text key={y} x="51" y={157 - y * 88} textAnchor="end">{number(y, language, 0)}</text>)}<text x="23" y="31">y (m)</text><text x="486" y="315">x (m)</text><text x="500" y="25" textAnchor="end">t = {number(time, language, 1)} s</text></g>
          <path className="pl-wave-one" d={paths[0]} fill="none" strokeWidth="1.8" strokeDasharray="5 4" /><path className="pl-wave-two" d={paths[1]} fill="none" strokeWidth="1.8" strokeDasharray="2 4" /><path className="pl-wave-sum" d={paths[2]} fill="none" strokeWidth="3" />
        </svg>
        <div className="pl-wave-legend"><span className="pl-legend-one">{ar ? 'الموجة الأولى' : 'Wave 1'}</span><span className="pl-legend-two">{ar ? 'الموجة الثانية' : 'Wave 2'}</span><span className="pl-legend-sum">{ar ? 'المحصلة' : 'Resultant'}</span></div>
        <figcaption>{ar ? 'سرعة انتشار ثابتة في الوسط: 2 m/s. غيّر فرق الطور إلى 0° ثم 180° لمقارنة التداخل البنّاء والهدّام.' : 'Fixed propagation speed: 2 m/s. Try phase differences of 0° and 180° to compare constructive and destructive interference.'}</figcaption>
      </figure>
      <div className="pl-controls">
        <RangeControl label={ar ? 'سعة الموجة الأولى' : 'Wave 1 amplitude'} value={amplitude1} onChange={setAmplitude1} min={0} max={0.6} step={0.05} unit="m" language={language} />
        <RangeControl label={ar ? 'سعة الموجة الثانية' : 'Wave 2 amplitude'} value={amplitude2} onChange={setAmplitude2} min={0} max={0.6} step={0.05} unit="m" language={language} />
        <RangeControl label={ar ? 'التردد المشترك' : 'Shared frequency'} value={frequency} onChange={setFrequency} min={0.5} max={3} step={0.1} unit="Hz" language={language} />
        <RangeControl label={ar ? 'فرق الطور' : 'Phase difference'} value={phase} onChange={setPhase} min={0} max={360} step={15} unit="°" language={language} digits={0} />
        <div className="pl-playback"><button type="button" disabled={reducedMotion} aria-pressed={playing && !reducedMotion} onClick={() => setPlaying((value) => !value)}>{ar ? (playing && !reducedMotion ? 'إيقاف مؤقت' : 'تشغيل الموجة') : (playing && !reducedMotion ? 'Pause wave' : 'Play wave')}</button><button type="button" onClick={() => { setPlaying(false); timeRef.current = 0; setTime(0) }}>{ar ? 'إعادة الزمن' : 'Reset time'}</button></div>
        {reducedMotion && <p className="pl-motion-note">{ar ? 'الحركة متوقفة وفق إعداد تقليل الحركة في جهازك. يمكنك تجربة التراكب بتغيير المنزلقات.' : 'Animation follows your device’s reduced-motion setting. Use the sliders to explore superposition.'}</p>}
      </div>
    </div>
    <Readings language={language} items={[{ label: ar ? 'الطول الموجي' : 'Wavelength', value: wavelength, unit: 'm' }, { label: ar ? 'الزمن الدوري' : 'Period', value: 1 / frequency, unit: 's' }, { label: ar ? 'سعة المحصلة' : 'Resultant amplitude', value: resultant, unit: 'm' }]} />
    <Formulae><code>y = y1 + y2</code><code>lambda = v/f</code><code>T = 1/f</code></Formulae>
    <p className="pl-question">{ar ? 'جرّب: اجعل السعتين متساويتين وفرق الطور 180°. تنعدم المحصلة في هذا النموذج مع استمرار كل موجة على حدة.' : 'Try equal amplitudes and a 180° phase difference. The resultant vanishes in this model while each component wave continues.'}</p>
  </>
}

function OrbitLab({ language, id }) {
  const ar = language === 'ar'
  const [altitude, setAltitude] = useState(400)
  const radius = EARTH_RADIUS + altitude * 1000
  const speed = Math.sqrt(EARTH_GM / radius)
  const period = 2 * Math.PI * Math.sqrt(radius ** 3 / EARTH_GM)
  const gravity = EARTH_GM / radius ** 2
  const center = { x: 245, y: 176 }
  const earthPixels = 85
  const orbitPixels = earthPixels * radius / EARTH_RADIUS
  const angle = -Math.PI * 35 / 180
  const satellite = { x: center.x + orbitPixels * Math.cos(angle), y: center.y + orbitPixels * Math.sin(angle) }
  const surface = { x: center.x + earthPixels * Math.cos(angle), y: center.y + earthPixels * Math.sin(angle) }
  return <>
    <p className="pl-explanation">{ar ? 'الجاذبية هي القوة المركزية التي تُبقي القمر الصناعي في مداره الدائري. بزيادة الارتفاع تقل السرعة المدارية ويزداد الزمن الدوري.' : 'Gravity provides the centripetal force that keeps a satellite in circular orbit. Increasing altitude lowers orbital speed and increases the orbital period.'}</p>
    <div className="pl-workbench">
      <figure className="pl-visual">
        <svg className="pl-diagram pl-orbit" viewBox="0 0 560 350" role="img" aria-label={ar ? 'قمر صناعي في مدار دائري حول الأرض، مع متجه سرعة مماسي وقوة جاذبية نحو المركز' : 'Satellite in circular Earth orbit, with tangential velocity and an inward gravitational force'}>
          <defs><radialGradient id={`${id}-earth`} cx="30%" cy="24%" r="83%"><stop offset="0" stopColor="#68a6ba" /><stop offset="0.58" stopColor="#28617c" /><stop offset="1" stopColor="#102c43" /></radialGradient><clipPath id={`${id}-earth-clip`}><circle cx={center.x} cy={center.y} r={earthPixels} /></clipPath><marker id={`${id}-velocity`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#5ebcca" /></marker><marker id={`${id}-gravity`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#efba6b" /></marker></defs>
          <circle className="pl-orbit-track" cx={center.x} cy={center.y} r={orbitPixels} fill="none" strokeWidth="1.6" strokeDasharray="5 4" />
          <circle cx={center.x} cy={center.y} r={earthPixels} fill={`url(#${id}-earth)`} />
          <g clipPath={`url(#${id}-earth-clip)`} fill="#80a699" opacity=".7"><path d="M185 123 L202 113 L223 124 L219 144 L235 157 L223 180 L211 175 L201 152 L181 149 Z M256 116 L281 120 L300 143 L294 161 L278 158 L268 176 L249 169 L246 150 L232 137 Z M250 186 L273 181 L286 203 L270 224 L264 244 L247 229 L241 209 Z" /></g>
          <line x1={center.x} y1={center.y} x2={satellite.x} y2={satellite.y} stroke="#c1d5dc" strokeWidth="1.2" strokeDasharray="4 4" />
          <line x1={surface.x} y1={surface.y} x2={satellite.x} y2={satellite.y} stroke="#efba6b" strokeWidth="4" />
          <g transform={`translate(${satellite.x} ${satellite.y}) rotate(55)`}><rect x="-15" y="-5" width="9" height="10" rx="1" fill="#5983a7" stroke="#cce3ed" /><rect x="6" y="-5" width="9" height="10" rx="1" fill="#5983a7" stroke="#cce3ed" /><path d="M-6 0 H6" stroke="#d8e5e8" strokeWidth="2" /><rect x="-5" y="-6" width="10" height="12" rx="2" fill="#e2ded0" /></g>
          <line x1={satellite.x} y1={satellite.y} x2={satellite.x + Math.sin(angle) * 72} y2={satellite.y - Math.cos(angle) * 72} stroke="#5ebcca" strokeWidth="2.4" markerEnd={`url(#${id}-velocity)`} />
          <line x1={satellite.x} y1={satellite.y} x2={satellite.x - Math.cos(angle) * 45} y2={satellite.y - Math.sin(angle) * 45} stroke="#efba6b" strokeWidth="2.4" markerEnd={`url(#${id}-gravity)`} />
          <g fontFamily="inherit" fontSize="13" fill="#e7f0f2" textAnchor="middle"><text x={center.x} y={center.y + 34}>{ar ? 'الأرض' : 'Earth'}</text><text x={center.x} y={center.y + 52} fontSize="11" direction="ltr">R_E = 6371 km</text><text x={satellite.x + Math.sin(angle) * 72 - 8} y={satellite.y - Math.cos(angle) * 72 - 10} fill="#8bd3dc" direction="ltr">v</text><text x={satellite.x - 19} y={satellite.y + 37} fill="#f2cc96" direction="ltr">F_g</text><text x="280" y="324" direction="ltr">h = {number(altitude, language, 0)} km</text></g>
        </svg>
        <figcaption>{ar ? 'السرعة مماسية للمدار، والجاذبية نحو مركز الأرض. نسبة نصف قطر المدار إلى الأرض محسوبة؛ حجم القمر الصناعي والأسهم توضيحي.' : 'Velocity is tangential; gravity points toward Earth’s centre. The orbital-to-Earth radius ratio is calculated; the satellite and arrows are illustrative.'}</figcaption>
      </figure>
      <div className="pl-controls">
        <RangeControl label={ar ? 'الارتفاع فوق سطح الأرض' : 'Altitude above Earth'} value={altitude} onChange={setAltitude} min={100} max={2000} step={50} unit="km" language={language} digits={0} />
        <div className="pl-model-note"><strong>{ar ? 'نموذج مدار دائري مثالي' : 'Ideal circular-orbit model'}</strong><p>{ar ? 'أرض كروية دون مقاومة الهواء. المدارات شديدة الانخفاض تتأثر بمقاومة الهواء في الواقع ولا تبقى ثابتة كما يفترض هذا النموذج.' : 'A spherical Earth with no air resistance. Very low orbits experience drag in reality and do not remain constant as this model assumes.'}</p></div>
        <p className="pl-constant" dir="ltr">GM = 3.986004418 × 10¹⁴ m³/s²</p>
      </div>
    </div>
    <Readings language={language} items={[{ label: ar ? 'نصف قطر المدار من المركز' : 'Radius from Earth’s centre', value: radius / 1000, unit: 'km', digits: 0 }, { label: ar ? 'السرعة المدارية' : 'Orbital speed', value: speed / 1000, unit: 'km/s' }, { label: ar ? 'الزمن الدوري' : 'Orbital period', value: period / 60, unit: 'min', digits: 1 }, { label: ar ? 'شدة مجال الجاذبية' : 'Gravitational field strength', value: gravity, unit: 'N/kg' }]} />
    <Formulae><code>r = R_E + h</code><code>v = sqrt(GM/r)</code><code>T = 2*pi*sqrt(r^3/GM)</code><code>g = GM/r^2</code></Formulae>
    <p className="pl-question">{ar ? 'فكّر: هل انعدام الوزن الظاهري في المحطة الفضائية يعني انعدام الجاذبية؟ قارن قيمة المجال عند ارتفاع 400 km بقيمته قرب السطح.' : 'Think: does apparent weightlessness on a space station mean zero gravity? Compare the field strength at 400 km with the value near the surface.'}</p>
  </>
}

export default function PhysicsLab({ language = 'ar', initialTab = 'circuits' }) {
  const ar = language === 'ar'
  const id = useId().replace(/:/g, '')
  const [tab, setTab] = useState(['circuits','waves','orbits'].includes(initialTab) ? initialTab : 'circuits')
  const tabRefs = useRef([])
  const tabs = [{ id: 'circuits', label: ar ? 'الدوائر الكهربائية' : 'Electric circuits' }, { id: 'waves', label: ar ? 'تراكب الموجات' : 'Wave superposition' }, { id: 'orbits', label: ar ? 'الجاذبية والمدارات' : 'Gravity and orbits' }]
  const selectWithKeyboard = (event, index) => {
    let next
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else if (event.key === 'ArrowRight') next = (index + (ar ? -1 : 1) + tabs.length) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index + (ar ? 1 : -1) + tabs.length) % tabs.length
    if (next !== undefined) { event.preventDefault(); setTab(tabs[next].id); tabRefs.current[next]?.focus() }
  }
  return <section className="physics-lab" aria-labelledby={`${id}-heading`}>
    <div className="pl-heading"><span>{ar ? 'جرّب · لاحظ · فسّر' : 'EXPLORE · OBSERVE · EXPLAIN'}</span><h3 id={`${id}-heading`}>{ar ? 'مختبر الفيزياء التفاعلي' : 'Interactive physics lab'}</h3><p>{ar ? 'نماذج محسوبة بوحدات واضحة، تساعدك على ربط القانون بما تراه.' : 'Calculated models with clear units, connecting each equation to what you see.'}</p></div>
    <div className="pl-tabs" role="tablist" aria-label={ar ? 'تجارب الفيزياء' : 'Physics experiments'}>{tabs.map((item, index) => <button key={item.id} type="button" role="tab" ref={(element) => { tabRefs.current[index] = element }} id={`${id}-tab-${item.id}`} aria-controls={`${id}-panel-${item.id}`} aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={(event) => selectWithKeyboard(event, index)}>{item.label}</button>)}</div>
    <div className="pl-panel" role="tabpanel" id={`${id}-panel-${tab}`} aria-labelledby={`${id}-tab-${tab}`} tabIndex={0}>
      {tab === 'circuits' && <CircuitLab language={language} id={id} />}
      {tab === 'waves' && <WaveLab language={language} />}
      {tab === 'orbits' && <OrbitLab language={language} id={id} />}
    </div>
  </section>
}
