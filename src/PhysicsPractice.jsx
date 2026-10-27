import { useEffect, useId, useState } from 'react'
import './physics-practice.css'

// Original mo7mels practice. Numeric constants are supplied in each question.
export const PHYSICS_PRACTICE_UNITS = [
  {
    id: 'gravitational-fields', ar: 'مجالات الجاذبية', en: 'Gravitational fields', formula: 'g = GM / r^2',
    ideaAr: 'شدة المجال هي القوة لكل وحدة كتلة. في مسائل الكتل الكروية، قِس المسافة من مركز الكتلة، لا من سطحها.',
    ideaEn: 'Field strength is force per unit mass. For a spherical mass, measure distance from its centre rather than its surface.',
    trapAr: 'انعدام الوزن الظاهري في المدار لا يعني اختفاء الجاذبية؛ القمر الصناعي في سقوط حر مستمر.',
    trapEn: 'Apparent weightlessness in orbit does not mean gravity has vanished: the satellite is continuously in free fall.',
    questions: [
      { id: 'distance', ar: 'عند مضاعفة البعد عن مركز كتلة كروية ثابتة، ماذا تصبح شدة مجال الجاذبية مقارنة بقيمتها الأصلية؟', en: 'The distance from the centre of a fixed spherical mass is doubled. What happens to gravitational field strength?', options: [{ ar: 'نصف القيمة', en: 'One half' }, { ar: 'ربع القيمة', en: 'One quarter' }, { ar: 'ضعف القيمة', en: 'Twice the value' }, { ar: 'أربعة أمثال القيمة', en: 'Four times the value' }], correct: 1, explanationAr: 'لأن g تتناسب عكسيًا مع r²، تصبح القيمة 1 / 2² = 1/4 من الأصل.', explanationEn: 'Since g is proportional to 1/r², doubling r gives 1/2² = 1/4 of the original field strength.' },
      { id: 'force', ar: 'جسم كتلته 2.0 kg في مجال شدته 9.8 N/kg. ما مقدار قوة الجاذبية المؤثرة فيه؟', en: 'A 2.0 kg object is in a gravitational field of 9.8 N/kg. What is the magnitude of the gravitational force?', options: ['4.9 N', '9.8 N', '19.6 N', '98 N'], correct: 2, explanationAr: 'القوة F = mg = 2.0 × 9.8 = 19.6 N. وحدة N/kg مضروبة في kg تعطي N.', explanationEn: 'F = mg = 2.0 × 9.8 = 19.6 N. Multiplying N/kg by kg gives N.' },
    ],
  },
  {
    id: 'electric-fields', ar: 'المجالات الكهربائية', en: 'Electric fields', formula: 'F = qE',
    ideaAr: 'المجال كمية متجهة، والجهد كمية قياسية. اتجاه المجال هو اتجاه القوة على شحنة اختبار موجبة صغيرة.',
    ideaEn: 'Electric field is a vector; potential is a scalar. Field direction is the force direction for a small positive test charge.',
    trapAr: 'قد يساوي الجهد صفرًا عند نقطة بينما تكون شدة المجال عندها غير صفرية.',
    trapEn: 'Zero electric potential at a point does not necessarily mean zero electric field there.',
    questions: [
      { id: 'force', ar: 'شحنة مقدارها 2.0 μC في مجال منتظم شدته 3000 N/C. ما مقدار القوة الكهربائية؟', en: 'A 2.0 μC charge is placed in a uniform field of 3000 N/C. What is the force magnitude?', options: ['0.0015 N', '0.0060 N', '1.5 N', '6.0 N'], correct: 1, explanationAr: 'حوّل μC إلى C أولًا: F = qE = (2.0 × 10⁻⁶) × 3000 = 0.0060 N.', explanationEn: 'First convert μC to C: F = qE = (2.0 × 10⁻⁶) × 3000 = 0.0060 N.' },
      { id: 'potential', ar: 'عند منتصف المسافة بين شحنتين نقطيتين متساويتين في المقدار ومتعاكستين في الإشارة، أي عبارة صحيحة؟ يُتخذ الجهد صفرًا عند اللانهاية.', en: 'At the midpoint between equal and opposite point charges, which statement is correct? Potential is zero at infinity.', options: [{ ar: 'الجهد والمجال يساويان صفرًا', en: 'Potential and field are both zero' }, { ar: 'الجهد صفر والمجال غير صفري', en: 'Potential is zero; field is nonzero' }, { ar: 'المجال صفر والجهد غير صفري', en: 'Field is zero; potential is nonzero' }, { ar: 'الجهد والمجال غير صفريين', en: 'Potential and field are both nonzero' }], correct: 1, explanationAr: 'يتلاشى مجموع الجهدين لأنهما قياسيان متعاكسان. أما المجالان فيتجهان من الشحنة الموجبة نحو السالبة، فيتجمعان.', explanationEn: 'The equal and opposite scalar potentials cancel. Both field vectors point from the positive charge toward the negative charge, so they add.' },
    ],
  },
  {
    id: 'electric-circuits', ar: 'الدوائر الكهربائية', en: 'Electric circuits', formula: 'V = IR; P = VI',
    ideaAr: 'ابدأ بتحديد نقاط التوصيل. في التوالي يمر التيار نفسه، وفي التوازي يتساوى فرق الجهد بين الفروع.',
    ideaEn: 'Identify the connection points first. Series components share the same current; parallel branches share the same potential difference.',
    trapAr: 'التيار لا يُستهلك في المقاومة؛ تنتقل الطاقة الكهربائية إلى صور أخرى بينما تُحفظ الشحنة.',
    trapEn: 'A resistor does not consume current: electrical energy is transferred while charge is conserved.',
    questions: [
      { id: 'parallel', ar: 'مقاومتان 6 Ω و3 Ω موصولتان على التوازي بمصدر مثالي 12 V. ما التيار الكلي من المصدر؟', en: 'A 6 Ω resistor and a 3 Ω resistor are in parallel across an ideal 12 V source. What total current leaves the source?', options: ['1.33 A', '2.0 A', '4.0 A', '6.0 A'], correct: 3, explanationAr: '1/R = 1/6 + 1/3 = 1/2؛ إذن R = 2 Ω، والتيار I = 12/2 = 6 A. أو اجمع تياري الفرعين: 2 + 4 A.', explanationEn: '1/R = 1/6 + 1/3 = 1/2, so R = 2 Ω and I = 12/2 = 6 A. Equivalently, add the branch currents: 2 + 4 A.' },
      { id: 'power', ar: 'يمر تيار 2.0 A في مقاومة 5.0 Ω. ما القدرة المتحولة إلى حرارة؟', en: 'A current of 2.0 A flows through a 5.0 Ω resistor. What power is dissipated as heat?', options: ['2.5 W', '5.0 W', '10 W', '20 W'], correct: 3, explanationAr: 'P = I²R = 2.0² × 5.0 = 20 W. لا تنسَ تربيع التيار.', explanationEn: 'P = I²R = 2.0² × 5.0 = 20 W. The current must be squared.' },
    ],
  },
  {
    id: 'capacitors', ar: 'المكثفات', en: 'Capacitors', formula: 'Q = CV; U = 0.5CV^2',
    ideaAr: 'يخزن المكثف الطاقة في مجاله الكهربائي. تتساوى الشحنة على مكثفات التوالي ويتساوى فرق الجهد على مكثفات التوازي.',
    ideaEn: 'A capacitor stores energy in its electric field. Series capacitors carry equal charge; parallel capacitors have equal potential difference.',
    trapAr: 'السعة المكافئة لمكثفات التوالي أصغر من أصغر سعة منفردة، بخلاف جمع المقاومات على التوالي.',
    trapEn: 'The equivalent capacitance of series capacitors is smaller than the smallest individual capacitance.',
    questions: [
      { id: 'energy', ar: 'مكثف سعته 200 μF مشحون إلى فرق جهد 10 V. ما الطاقة المخزنة؟', en: 'A 200 μF capacitor is charged to 10 V. How much energy does it store?', options: ['1.0 J', '0.10 J', '0.010 J', '0.0010 J'], correct: 2, explanationAr: 'U = ½CV² = 0.5 × 200 × 10⁻⁶ × 10² = 0.010 J. استخدم الفاراد، لا الميكروفاراد، في التعويض.', explanationEn: 'U = ½CV² = 0.5 × 200 × 10⁻⁶ × 10² = 0.010 J. Convert microfarads to farads first.' },
      { id: 'series', ar: 'مكثفان سعتهما 2.0 μF و3.0 μF موصولان على التوالي. ما السعة المكافئة؟', en: 'Two capacitors of 2.0 μF and 3.0 μF are connected in series. What is their equivalent capacitance?', options: ['5.0 μF', '2.5 μF', '1.2 μF', '0.83 μF'], correct: 2, explanationAr: '1/C = 1/2 + 1/3 = 5/6 بوحدة μF⁻¹؛ إذن C = 6/5 = 1.2 μF، وهي أصغر من 2 μF.', explanationEn: '1/C = 1/2 + 1/3 = 5/6 in μF⁻¹, so C = 6/5 = 1.2 μF, smaller than either capacitor.' },
    ],
  },
  {
    id: 'magnetism-induction', ar: 'المغناطيسية والحث', en: 'Magnetism and induction', formula: '|emf| = N|delta Phi / delta t|',
    ideaAr: 'ينشأ الحث عند تغيّر التدفق خلال الملف. يقاوم اتجاه التيار المحتث التغيّر المسبب له وفق قانون لنز.',
    ideaEn: 'Changing flux through a coil induces an emf. Lenz’s law gives a direction that opposes the change causing it.',
    trapAr: 'وجود مجال مغناطيسي ثابت وحده لا يكفي لتوليد قوة دافعة محتثة في ملف ثابت المساحة والاتجاه.',
    trapEn: 'A steady magnetic field alone does not induce emf in a stationary coil with fixed area and orientation.',
    questions: [
      { id: 'wire', ar: 'سلك طوله 0.25 m يحمل تيارًا 3.0 A عموديًا على مجال مغناطيسي 0.40 T. ما مقدار القوة؟', en: 'A 0.25 m wire carries 3.0 A perpendicular to a 0.40 T magnetic field. What is the force magnitude?', options: ['0.030 N', '0.30 N', '1.2 N', '3.0 N'], correct: 1, explanationAr: 'F = BIL sin θ. عند التعامد sin 90° = 1، فتكون F = 0.40 × 3.0 × 0.25 = 0.30 N.', explanationEn: 'F = BIL sin θ. Since the wire is perpendicular, sin 90° = 1 and F = 0.40 × 3.0 × 0.25 = 0.30 N.' },
      { id: 'emf', ar: 'ملف من 100 لفة ينخفض التدفق خلال كل لفة من 0.020 Wb إلى صفر خلال 0.50 s. ما مقدار القوة الدافعة المحتثة المتوسطة؟', en: 'A 100-turn coil has flux per turn falling from 0.020 Wb to zero in 0.50 s. What is the magnitude of its average induced emf?', options: ['0.040 V', '2.0 V', '4.0 V', '40 V'], correct: 2, explanationAr: '|ε| = N|ΔΦ|/Δt = 100 × 0.020 / 0.50 = 4.0 V. المطلوب المقدار، فلا تلزم إشارة اتجاه.', explanationEn: '|ε| = N|ΔΦ|/Δt = 100 × 0.020 / 0.50 = 4.0 V. The question asks for magnitude, so no direction sign is needed.' },
    ],
  },
  {
    id: 'waves', ar: 'الموجات والصوت', en: 'Waves and sound', formula: 'v = f lambda; I is proportional to A^2',
    ideaAr: 'تنقل الموجة الطاقة، بينما تهتز جسيمات الوسط حول مواضع اتزانها. اربط السرعة بالتردد والطول الموجي.',
    ideaEn: 'Waves transfer energy while particles of the medium oscillate about equilibrium. Relate speed to frequency and wavelength.',
    trapAr: 'عند انتقال موجة إلى وسط آخر يظل ترددها ثابتًا عند الحد الفاصل، وقد تتغير سرعتها وطولها الموجي.',
    trapEn: 'Across a stationary boundary, a wave keeps its frequency; its speed and wavelength may change.',
    questions: [
      { id: 'speed', ar: 'موجة صوت ترددها 440 Hz وطولها الموجي 0.75 m. ما سرعتها؟', en: 'A sound wave has frequency 440 Hz and wavelength 0.75 m. What is its speed?', options: ['0.0017 m/s', '330 m/s', '587 m/s', '440 m/s'], correct: 1, explanationAr: 'v = fλ = 440 × 0.75 = 330 m/s. وحدة Hz تساوي s⁻¹.', explanationEn: 'v = fλ = 440 × 0.75 = 330 m/s. Hz is equivalent to s⁻¹.' },
      { id: 'intensity', ar: 'تضاعفت سعة موجة دون تغيير الوسط أو التردد. ما شدة الموجة الجديدة مقارنة بالأصلية؟', en: 'A wave’s amplitude doubles without changing its medium or frequency. How does its intensity compare with the original?', options: [{ ar: 'نصف الشدة', en: 'Half the intensity' }, { ar: 'ضعف الشدة', en: 'Twice the intensity' }, { ar: 'أربعة أمثال الشدة', en: 'Four times the intensity' }, { ar: 'ثمانية أمثال الشدة', en: 'Eight times the intensity' }], correct: 2, explanationAr: 'في الظروف نفسها I تتناسب مع A²؛ لذلك (2A)²/A² = 4.', explanationEn: 'Under the same conditions I is proportional to A², so (2A)²/A² = 4.' },
    ],
  },
  {
    id: 'superposition', ar: 'تراكب الموجات', en: 'Superposition', formula: 'y = y1 + y2; adjacent node spacing = lambda / 2',
    ideaAr: 'اجمع الإزاحات عند النقطة نفسها واللحظة نفسها. نوع التداخل يعتمد على فرق الطور، لا على شكل موجة منفردة.',
    ideaEn: 'Add displacements at the same position and instant. Interference depends on the phase difference between the waves.',
    trapAr: 'تبعد عقدتان متتاليتان في موجة مستقرة نصف طول موجي؛ وتبعد العقدة عن أقرب بطن ربع طول موجي.',
    trapEn: 'Adjacent nodes of a standing wave are half a wavelength apart; a node and its nearest antinode are a quarter wavelength apart.',
    questions: [
      { id: 'interference', ar: 'مصدران مترابطان ومتفقان في الطور ينتجان موجتين لهما λ = 0.60 m. عند نقطة فرق المسار إليها 0.90 m، ما نوع التداخل؟', en: 'Two coherent, initially in-phase sources produce waves with λ = 0.60 m. At a point with path difference 0.90 m, what interference occurs?', options: [{ ar: 'تداخل بنّاء', en: 'Constructive interference' }, { ar: 'تداخل هدّام', en: 'Destructive interference' }, { ar: 'يفقد المصدران الترابط', en: 'The sources become incoherent' }, { ar: 'لا تتراكب الموجتان', en: 'The waves do not superpose' }], correct: 1, explanationAr: 'فرق المسار يساوي 0.90/0.60 = 1.5λ، وهو مضاعف فردي لنصف طول موجي؛ لذلك يكون التداخل هدّامًا.', explanationEn: 'The path difference is 0.90/0.60 = 1.5λ, an odd multiple of half a wavelength, so the interference is destructive.' },
      { id: 'nodes', ar: 'المسافة بين عقدتين متتاليتين على وتر ذي موجة مستقرة تساوي 0.20 m. ما الطول الموجي؟', en: 'Adjacent nodes on a string with a standing wave are 0.20 m apart. What is the wavelength?', options: ['0.10 m', '0.20 m', '0.40 m', '0.80 m'], correct: 2, explanationAr: 'المسافة بين عقدتين متتاليتين = λ/2؛ إذن λ = 2 × 0.20 = 0.40 m.', explanationEn: 'Adjacent-node spacing is λ/2, so λ = 2 × 0.20 = 0.40 m.' },
    ],
  },
  {
    id: 'quantum-physics', ar: 'فيزياء الكم', en: 'Quantum physics', formula: 'E = hf; Kmax = hf - work function',
    ideaAr: 'يتفاعل الضوء مع المادة على هيئة فوتونات. يحدد تردد الضوء طاقة الفوتون، بينما ترتبط الشدة بعدد الفوتونات الساقطة.',
    ideaEn: 'Light interacts with matter through photons. Frequency sets each photon’s energy; intensity is related to the incoming photon rate.',
    trapAr: 'زيادة شدة الضوء عند تردد ثابت لا ترفع أقصى طاقة حركة للإلكترونات المنبعثة في نموذج الفوتون الواحد.',
    trapEn: 'At fixed frequency, increasing intensity does not increase the maximum emitted-electron kinetic energy in the single-photon model.',
    questions: [
      { id: 'energy', ar: 'ضوء تردده 8.0 × 10¹⁴ Hz يسقط على فلز دالة شغله 2.0 eV. استخدم h = 4.14 × 10⁻¹⁵ eV·s. ما أقصى طاقة حركة تقريبًا؟', en: 'Light of frequency 8.0 × 10¹⁴ Hz hits a metal with work function 2.0 eV. Use h = 4.14 × 10⁻¹⁵ eV·s. What is the approximate maximum kinetic energy?', options: ['0.31 eV', '1.31 eV', '3.31 eV', '5.31 eV'], correct: 1, explanationAr: 'طاقة الفوتون hf = 3.312 eV. إذن Kmax = 3.312 − 2.0 = 1.312 eV، أي نحو 1.31 eV.', explanationEn: 'The photon energy is hf = 3.312 eV. Thus Kmax = 3.312 − 2.0 = 1.312 eV, approximately 1.31 eV.' },
      { id: 'threshold', ar: 'في نموذج التأثير الكهروضوئي ذي الفوتون الواحد، تردد الضوء أقل من تردد العتبة. ماذا يحدث عند زيادة الشدة فقط مع ثبات التردد؟', en: 'In the single-photon photoelectric model, the light frequency is below threshold. What happens if only intensity is increased?', options: [{ ar: 'تنبعث إلكترونات بطاقة أكبر', en: 'Electrons are emitted with higher energy' }, { ar: 'ينخفض تردد العتبة تلقائيًا', en: 'The threshold frequency automatically decreases' }, { ar: 'لا يحدث انبعاث كهروضوئي', en: 'No photoelectric emission occurs' }, { ar: 'تزداد طاقة كل فوتون', en: 'Each photon gains energy' }], correct: 2, explanationAr: 'تظل طاقة كل فوتون hf أقل من دالة الشغل. زيادة عدد هذه الفوتونات لا تكفي لحدوث الانبعاث ضمن هذا النموذج.', explanationEn: 'Each photon still has energy hf below the work function. Increasing the number of such photons cannot cause emission in this model.' },
    ],
  },
  {
    id: 'nuclear-physics', ar: 'الفيزياء النووية', en: 'Nuclear physics', formula: 'N = N0 x 2^(-t / half-life)',
    ideaAr: 'يُحفظ العدد الكتلي والعدد الذري في المعادلات النووية. نصف العمر يصف تناقص عدد كبير من النوى إحصائيًا.',
    ideaEn: 'Nucleon and proton numbers are conserved in nuclear equations. Half-life describes the statistical decay of a large population of nuclei.',
    trapAr: 'لا يمكن تحديد لحظة انحلال نواة بعينها من نصف العمر؛ الانحلال الفردي عشوائي.',
    trapEn: 'Half-life does not predict the decay time of one particular nucleus: individual decay is random.',
    questions: [
      { id: 'half-life', ar: 'عينة تبدأ بـ8000 نواة مشعة ونصف عمرها 6 ساعات. ما متوسط عدد النوى المشعة الأصلية المتوقع بقاؤه بعد 18 ساعة؟', en: 'A sample begins with 8000 radioactive nuclei and has a half-life of 6 hours. How many original radioactive nuclei are expected to remain after 18 hours?', options: ['0', '1000', '2000', '4000'], correct: 1, explanationAr: 'مرّت ثلاثة أنصاف أعمار: 18/6 = 3. لذلك N = 8000 × (1/2)³ = 1000 نواة في المتوسط.', explanationEn: 'Three half-lives have elapsed: 18/6 = 3. Thus N = 8000 × (1/2)³ = 1000 nuclei on average.' },
      { id: 'alpha', ar: 'تبعث نواة عددها الكتلي A = 210 وعددها الذري Z = 84 جسيم ألفا واحدًا. ما العددان للنواة الناتجة؟', en: 'A nucleus with mass number A = 210 and atomic number Z = 84 emits one alpha particle. What are the daughter nucleus numbers?', options: ['A = 206, Z = 82', 'A = 206, Z = 86', 'A = 208, Z = 82', 'A = 210, Z = 83'], correct: 0, explanationAr: 'جسيم ألفا نواة هيليوم لها A = 4 وZ = 2. اطرح القيمتين: A = 210 − 4 = 206 وZ = 84 − 2 = 82.', explanationEn: 'An alpha particle is a helium nucleus with A = 4 and Z = 2. Subtract these: A = 210 − 4 = 206 and Z = 84 − 2 = 82.' },
    ],
  },
]

const textFor = (text, ar) => typeof text === 'string' ? text : (ar ? text.ar : text.en)

function PhysicsPractice({ language = 'ar', unitId }) {
  const ar = language === 'ar'
  const instanceId = useId()
  const initialUnit = PHYSICS_PRACTICE_UNITS.find((unit) => unit.id === unitId) || PHYSICS_PRACTICE_UNITS[0]
  const [selectedId, setSelectedId] = useState(initialUnit.id)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})
  const unit = PHYSICS_PRACTICE_UNITS.find((item) => item.id === selectedId) || initialUnit

  useEffect(() => {
    const nextUnit = PHYSICS_PRACTICE_UNITS.find((item) => item.id === unitId)
    if (nextUnit) setSelectedId(nextUnit.id)
  }, [unitId])
  useEffect(() => { setAnswers({}); setRevealed({}) }, [selectedId])

  const chooseAnswer = (questionId, choice) => {
    setAnswers((current) => ({ ...current, [questionId]: choice }))
    setRevealed((current) => ({ ...current, [questionId]: false }))
  }

  return <section className="study-panel physics-practice" aria-labelledby={`${instanceId}-heading`}>
    <div className="study-section-heading"><div><span>mo7mels · {ar ? 'افهم ثم طبّق' : 'UNDERSTAND & APPLY'}</span><h2 id={`${instanceId}-heading`}>{ar ? 'تدرّب على فيزياء 12' : 'Grade 12 Physics practice'}</h2></div><span className="physics-practice-count">{ar ? 'سؤالان لكل وحدة' : 'Two questions per unit'}</span></div>
    {!unitId && <label className="physics-practice-select"><span>{ar ? 'اختر الوحدة' : 'Choose a unit'}</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{PHYSICS_PRACTICE_UNITS.map((entry, index) => <option key={entry.id} value={entry.id}>{index + 1}. {ar ? entry.ar : entry.en}</option>)}</select></label>}
    <div className="physics-practice-summary"><div><h3>{ar ? unit.ar : unit.en}</h3><p>{ar ? unit.ideaAr : unit.ideaEn}</p><code dir="ltr">{unit.formula}</code></div><aside><strong>{ar ? 'انتبه للفكرة' : 'Watch the misconception'}</strong><p>{ar ? unit.trapAr : unit.trapEn}</p></aside></div>
    <div className="physics-practice-questions">{unit.questions.map((question, questionIndex) => {
      const hasAnswer = answers[question.id] !== undefined
      const isRevealed = Boolean(revealed[question.id])
      const isCorrect = answers[question.id] === question.correct
      return <article className="physics-practice-question" key={`${unit.id}-${question.id}`}>
        <fieldset><legend><span>{ar ? `السؤال ${questionIndex + 1}` : `QUESTION ${questionIndex + 1}`}</span>{ar ? question.ar : question.en}</legend>
          <div className="physics-practice-options">{question.options.map((option, index) => <label key={index} className={`${answers[question.id] === index ? 'selected' : ''}${isRevealed && question.correct === index ? ' correct' : ''}`}><input type="radio" name={`${instanceId}-${unit.id}-${question.id}`} checked={answers[question.id] === index} onChange={() => chooseAnswer(question.id, index)} /><span dir="auto">{textFor(option, ar)}</span></label>)}</div>
        </fieldset>
        <button className="physics-practice-check" type="button" disabled={!hasAnswer} onClick={() => setRevealed((current) => ({ ...current, [question.id]: true }))}>{ar ? 'تحقق من الإجابة' : 'Check answer'} <span aria-hidden="true">↗</span></button>
        {isRevealed && <div className={`physics-practice-feedback ${isCorrect ? 'is-correct' : 'needs-review'}`} role="status" aria-live="polite"><strong>{isCorrect ? (ar ? 'إجابة صحيحة' : 'Correct answer') : (ar ? 'راجع خطواتك' : 'Review your working')}</strong>{!isCorrect && <p>{ar ? 'الإجابة الصحيحة: ' : 'Correct answer: '}<span dir="auto">{textFor(question.options[question.correct], ar)}</span></p>}<p>{ar ? question.explanationAr : question.explanationEn}</p></div>}
      </article>
    })}</div>
    <p className="physics-practice-note">{ar ? 'تدريب أصلي من mo7mels لتثبيت المفاهيم. اكتب خطوات الحل والوحدات قبل التحقق من الإجابة.' : 'Original mo7mels practice to strengthen understanding. Write your working and units before checking the answer.'}</p>
  </section>
}

export default PhysicsPractice
