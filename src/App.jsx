import { useEffect, useRef, useState } from 'react'
import './App.css'
import './modern.css'
import StudyPages from './StudyPages.jsx'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const API_BASE = '/api'
const LINKEDIN_URL = import.meta.env.VITE_LINKEDIN_URL || 'https://www.linkedin.com/company/mo7mels'
const GOOGLE_AUTH_ENABLED = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'
const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://www.instagram.com/ku.i44/' },
  { label: 'GitHub', href: 'https://github.com/MO7EMMD' },
  { label: 'X', href: 'https://x.com/Mo7_4l6' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@ku.i25' },
  { label: 'Telegram', href: 'https://t.me/Nozvxa' },
]
const MINISTRY_GRADE_12_URL = 'https://home.moe.gov.om/ar/manaheg/16'
const MINISTRY_SUBJECT_CHOICES_URL = 'https://home.moe.gov.om/ar/topics/1/show/13053'
const STUDY_SUBJECTS = [
  { id: 'islamic', ar: 'التربية الإسلامية', en: 'Islamic Education', icon: '☾', ministryId: 309, tasks: ['لخّص فكرة رئيسية من درس هذا الأسبوع.', 'اكتب دليلاً أو مثالاً يدعم الفكرة.'], tasksEn: ['Summarize one key idea from this week’s lesson.', 'Add evidence or an example that supports it.'] },
  { id: 'arabic', ar: 'اللغة العربية', en: 'Arabic Language', icon: 'ع', ministryId: 313, tasks: ['أعرب: قرأ الطالبُ الكتابَ.', 'اكتب فقرة قصيرة عن هدف دراسي تسعى إليه.'], tasksEn: ['Parse this sentence: قرأ الطالبُ الكتابَ.', 'Write a short paragraph about a study goal.'] },
  { id: 'english', ar: 'اللغة الإنجليزية', en: 'English Language', icon: 'A', ministryId: 316, tasks: ['Write a short paragraph about a goal you want to achieve.', 'Review it for verb tense, spelling, and punctuation.'], tasksEn: ['Write a short paragraph about a goal you want to achieve.', 'Review it for verb tense, spelling, and punctuation.'] },
  { id: 'math', ar: 'الرياضيات', en: 'Mathematics', icon: '∑', ministryId: 319, tasks: ['حل المعادلة: x² − 5x + 6 = 0.', 'تحقق من الحل بالتعويض عن كل قيمة.'], tasksEn: ['Solve: x² − 5x + 6 = 0.', 'Check each solution by substitution.'] },
  { id: 'biology', ar: 'الأحياء', en: 'Biology', icon: '⌘', ministryId: 322, tasks: ['ارسم مخططاً مبسطاً لعملية حيوية درستها.', 'اشرح دور كل جزء في المخطط بجملة واحدة.'], tasksEn: ['Draw a simple diagram of a biological process you studied.', 'Explain each part of the diagram in one sentence.'] },
  { id: 'chemistry', ar: 'الكيمياء', en: 'Chemistry', icon: '⚗', ministryId: 326, tasks: ['وازن المعادلة: H₂ + O₂ → H₂O.', 'اذكر عدد ذرات كل عنصر قبل الموازنة وبعدها.'], tasksEn: ['Balance: H₂ + O₂ → H₂O.', 'Count the atoms of each element before and after balancing.'] },
  { id: 'physics', ar: 'الفيزياء', en: 'Physics', icon: '↗', ministryId: 329, tasks: ['يمر تيار في مقاومة 4Ω موصولة بجهد 12V. احسب التيار.', 'اكتب القانون والوحدات المستخدمة.'], tasksEn: ['A 4Ω resistor is connected to 12V. Find the current.', 'Write the formula and units you used.'] },
  { id: 'homeland', ar: 'هذا وطني', en: 'This Is My Country', icon: '⌂', ministryId: 336, tasks: ['اختر موضوعاً من وحدتك الحالية واكتب ثلاث معلومات تعلمتها.', 'أضف سؤالاً واحداً تريد مناقشته في الصف.'], tasksEn: ['Choose a topic from your current unit and write three things you learned.', 'Add one question you would like to discuss in class.'] },
  { id: 'geography', ar: 'الجغرافيا الاقتصادية', en: 'Economic Geography', icon: '⌖', ministryId: 339, tasks: ['اختر نشاطاً اقتصادياً في عُمان وارسم خريطة ذهنية لعوامله.', 'اشرح كيف يؤثر الموقع أو الموارد في هذا النشاط.'], tasksEn: ['Choose an economic activity in Oman and map its contributing factors.', 'Explain how location or resources affect it.'] },
  { id: 'ict', ar: 'تقنية المعلومات', en: 'Information Technology', icon: '</>', ministryId: 343, tasks: ['اكتب خطوات إنشاء نسخة احتياطية آمنة لملف دراسي.', 'اذكر طريقتين لحماية حساباتك الرقمية.'], tasksEn: ['List the steps for safely backing up a school file.', 'Name two ways to protect your online accounts.'] },
  { id: 'art', ar: 'الفنون التشكيلية', en: 'Visual Arts', icon: '◩', ministryId: 346, tasks: ['صمّم رسماً أولياً يعبّر عن مكان تحبه في عُمان.', 'جرّب التوازن بين المساحة واللون والخط.'], tasksEn: ['Sketch a place in Oman that matters to you.', 'Experiment with balance, color, and line.'] },
  { id: 'sports', ar: 'الرياضة المدرسية', en: 'School Sports', icon: '◎', ministryId: 350, tasks: ['صمّم خطة إحماء قصيرة قبل نشاط رياضي.', 'دوّن كيف تساعد الراحة وشرب الماء على سلامة الجسم.'], tasksEn: ['Plan a short warm-up before physical activity.', 'Note how rest and hydration support physical wellbeing.'] },
]
const STUDY_TABS = ['home', 'library', 'physics', 'math', 'worksheets', 'exams', 'board', 'resources', 'links']
const STUDY_PAGE_PATHS = { home: '/', library: '/books', physics: '/physics', math: '/mathematics', worksheets: '/worksheets', exams: '/exams', board: '/whiteboard', resources: '/resources', links: '/links' }
const STUDY_TAB_LABELS = {
  home: { ar: 'الرئيسية', en: 'Home' },
  library: { ar: 'الكتب', en: 'Books' },
  physics: { ar: 'الفيزياء', en: 'Physics' },
  math: { ar: 'الرياضيات', en: 'Maths' },
  worksheets: { ar: 'أوراق العمل', en: 'Worksheets' },
  exams: { ar: 'الامتحانات', en: 'Exams' },
  board: { ar: 'السبورة', en: 'Whiteboard' },
  resources: { ar: 'مصادر الوزارة', en: 'MOE resources' },
  links: { ar: 'روابط مهمة', en: 'Useful links' },
}
const getStudyTabForPath = (pathname) => {
  if (pathname.startsWith('/physics')) return 'physics'
  if (pathname.startsWith('/mathematics')) return 'math'
  return Object.keys(STUDY_PAGE_PATHS).find((page) => STUDY_PAGE_PATHS[page] === pathname) || 'home'
}
const isStudyPath = (pathname) => Object.values(STUDY_PAGE_PATHS).includes(pathname) || pathname.startsWith('/physics/') || pathname.startsWith('/mathematics/')
const MINISTRY_RESOURCE_GROUPS = [
  { id: 'digital-learning', ar: 'التعليم الرقمي', en: 'Digital education', items: [
    { ar: 'منصة نور', en: 'Noor Platform', href: 'https://lms.moe.gov.om/' },
    { ar: 'المنصات التعليمية', en: 'Educational platforms', href: 'https://home.moe.gov.om/ar/pages/208/show/1024' },
    { ar: 'المناهج الدراسية', en: 'School curriculum', href: 'https://home.moe.gov.om/ar/manaheg' },
    { ar: 'زاويتي التعليمية', en: 'Zawity educational portal', href: 'https://home.moe.gov.om/ar/zawity' },
  ] },
  { id: 'systems', ar: 'الأنظمة الرقمية', en: 'Digital systems', items: [
    { ar: 'نظام المراسلات', en: 'Correspondence system', href: 'https://dms.moe.gov.om/' },
    { ar: 'دليل الهاتف', en: 'Telephone directory', href: 'https://services.moe.gov.om/' },
    { ar: 'نظام الاستمارات', en: 'Forms system', href: 'https://istmarah.moe.gov.om/' },
    { ar: 'مركز القبول الموحد', en: 'Higher Education Admission Center', href: 'https://heac.gov.om/' },
  ] },
  { id: 'digital-services', ar: 'الإصدارات والمصادر', en: 'Publications and resources', items: [
    { ar: 'الإصدارات التعليمية', en: 'Educational publications', href: 'https://home.moe.gov.om/ar/library' },
    { ar: 'البحوث والدراسات', en: 'Research and studies', href: 'https://home.moe.gov.om/ar/pages/222' },
    { ar: 'المكتبة الرقمية', en: 'Digital library', href: 'https://lib.moe.gov.om/' },
    { ar: 'الأدلة التعليمية', en: 'Educational guides', href: 'https://home.moe.gov.om/ar/library/1' },
  ] },
  { id: 'higher-education', ar: 'التعليم العالي', en: 'Higher education', items: [
    { ar: 'البعثات الداخلية', en: 'Internal scholarships', href: 'https://home.moe.gov.om/ar/bisat' },
    { ar: 'مؤسسات التعليم العالي الخاصة', en: 'Private higher education institutions', href: 'https://home.moe.gov.om/ar/privatehe' },
    { ar: 'مؤسسات التعليم العالي الحكومية', en: 'Government higher education institutions', href: 'https://home.moe.gov.om/ar/govhe' },
    { ar: 'الجامعات والكليات', en: 'Universities and colleges', href: 'https://home.moe.gov.om/ar/universities' },
  ] },
  { id: 'participation', ar: 'البيانات والمشاركة', en: 'Open data and participation', items: [
    { ar: 'بوابة البيانات المفتوحة', en: 'Open data portal', href: 'https://opendata.gov.om/' },
    { ar: 'المشاركة الإلكترونية', en: 'Digital participation', href: 'https://home.moe.gov.om/ar/participate/' },
    { ar: 'تواصل مع الوزارة', en: 'Contact the Ministry', href: 'https://home.moe.gov.om/ar/contactus' },
  ] },
]
const MINISTRY_PORTAL_LINKS = [
  { ar: 'الرؤية والرسالة', en: 'Vision and mission', href: 'https://home.moe.gov.om/ar/pages/162/show/504' },
  { ar: 'الهيكل التنظيمي', en: 'Organization structure', href: 'https://home.moe.gov.om/ar/hierarchical' },
  { ar: 'اللوائح والقوانين', en: 'Laws and regulations', href: 'https://home.moe.gov.om/ar/library/69' },
  { ar: 'تاريخ التعليم في عُمان', en: 'History of education in Oman', href: 'https://home.moe.gov.om/ar/pages/6/show/12' },
  { ar: 'نظام التعليم', en: 'Education system', href: 'https://home.moe.gov.om/ar/pages/14' },
  { ar: 'عن البوابة التعليمية', en: 'About the education portal', href: 'https://home.moe.gov.om/ar/pages/3/show/320' },
  { ar: 'المحافظات التعليمية', en: 'Educational directorates', href: 'https://home.moe.gov.om/ar/governemants' },
  { ar: 'الإعلانات', en: 'Announcements', href: 'https://home.moe.gov.om/ar/updates/1' },
  { ar: 'المناقصات', en: 'Tenders', href: 'https://home.moe.gov.om/ar/monq' },
  { ar: 'الأخبار', en: 'News', href: 'https://home.moe.gov.om/ar/topics/1' },
  { ar: 'الوظائف الشاغرة', en: 'Job vacancies', href: 'https://home.moe.gov.om/ar/pages/126' },
  { ar: 'النشرات التوعوية', en: 'Awareness bulletins', href: 'https://home.moe.gov.om/ar/updates/3' },
  { ar: 'العروض', en: 'Offers', href: 'https://home.moe.gov.om/ar/mazaya' },
  { ar: 'الفعاليات', en: 'Events', href: 'https://home.moe.gov.om/ar/events' },
  { ar: 'خريطة الموقع', en: 'Sitemap', href: 'https://home.moe.gov.om/ar/sitemap' },
  { ar: 'خصوصية الموقع', en: 'Website privacy', href: 'https://home.moe.gov.om/ar/pages/111/show/309' },
  { ar: 'منصة تجاوب للشكاوى والمقترحات', en: 'Tajaawob feedback and suggestions', href: 'https://tajawob.om/p/home' },
  { ar: 'وزارة العمل', en: 'Ministry of Labour', href: 'https://www.mol.gov.om/' },
  { ar: 'وزارة النقل والاتصالات وتقنية المعلومات', en: 'Ministry of Transport, Communications and IT', href: 'https://www.mtcit.gov.om/ITAPortal_AR/ITA/default.aspx' },
  { ar: 'شرطة عُمان السلطانية', en: 'Royal Oman Police', href: 'https://www.rop.gov.om/arabic/index.aspx' },
]
const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true'
const MAINTENANCE_TITLE = import.meta.env.VITE_MAINTENANCE_TITLE || 'نعتذر لإزعاجك'
const MAINTENANCE_MESSAGE =
  import.meta.env.VITE_MAINTENANCE_MESSAGE ||
  'الموقع الآن يخضع لعملية تحديث سريعة لتحسين التجربة. نشكرك على صبرك، وسيعود للعمل خلال دقائق.'

function extractYouTubeVideoId(rawUrl) {
  try {
    const parsedUrl = new URL(rawUrl)
    const segments = parsedUrl.pathname.split('/').filter(Boolean)

    if (parsedUrl.hostname.includes('youtu.be')) {
      return segments[0] || ''
    }

    if (parsedUrl.searchParams.get('v')) {
      return parsedUrl.searchParams.get('v')
    }

    const shortsIndex = segments.findIndex((segment) => segment === 'shorts')
    if (shortsIndex !== -1 && segments[shortsIndex + 1]) {
      return segments[shortsIndex + 1]
    }

    const embedIndex = segments.findIndex((segment) => segment === 'embed')
    if (embedIndex !== -1 && segments[embedIndex + 1]) {
      return segments[embedIndex + 1]
    }

    return ''
  } catch {
    return ''
  }
}

function extractTikTokVideoId(rawUrl) {
  try {
    const parsedUrl = new URL(rawUrl)
    const segments = parsedUrl.pathname.split('/').filter(Boolean)
    const videoIndex = segments.findIndex((segment) => segment === 'video')

    if (videoIndex !== -1 && segments[videoIndex + 1]) {
      return segments[videoIndex + 1]
    }

    return ''
  } catch {
    return ''
  }
}

function extractInstagramData(rawUrl) {
  try {
    const parsedUrl = new URL(rawUrl)
    const segments = parsedUrl.pathname.split('/').filter(Boolean)
    const contentType = segments[0]
    const shortcode = segments[1]

    if (!['p', 'reel', 'reels', 'tv'].includes(contentType) || !shortcode) {
      return null
    }

    return {
      permalink: `https://www.instagram.com/${contentType}/${shortcode}/`,
      shortcode,
    }
  } catch {
    return null
  }
}

function isValidHttpUrl(rawUrl) {
  try {
    const parsedUrl = new URL(rawUrl)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

function createIframeEmbed(sourceUrl, responsive, width, height) {
  const size = responsive
    ? 'width:100%; aspect-ratio:16/9;'
    : `width:${width}px; height:${height}px;`
  const frameStyle = responsive
    ? 'display:block; width:100%; height:100%; border:0;'
    : 'display:block; width:100%; height:100%; border:0;'
  return `<div style="${size} position:relative; overflow:hidden;"><iframe src="${sourceUrl}" title="Embedded content" loading="lazy" style="${frameStyle}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`
}

function getTopEmbedType(typeUsage) {
  return Object.entries(typeUsage).sort((left, right) => right[1] - left[1])[0]?.[0] || ''
}

function getInitialPath() {
  if (typeof window === 'undefined') {
    return '/'
  }

  return ['/', '/pricing', '/books', '/worksheets', '/whiteboard', '/resources', '/links', '/physics', '/mathematics', '/exams', '/login', '/signup', '/dashboard', '/dashboard/orders', '/dashboard/analytics', '/dashboard/customers', '/dashboard/settings'].includes(window.location.pathname)
    || window.location.pathname.startsWith('/physics/')
    || window.location.pathname.startsWith('/mathematics/')
    ? window.location.pathname
    : '/'
}

async function apiRequest(path, options = {}, token = '') {
  const authorizationHeader = token ? { Authorization: `Bearer ${token}` } : {}

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authorizationHeader,
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

const translations = {
  en: {
    brand: 'Mo7mels',
    home: 'Home',
    dashboard: 'Dashboard',
    logout: 'Logout',
    login: 'Login',
    signUp: 'Create Account',
    googleSignIn: 'Continue with Google',
    googleSignInUnavailable: 'Google sign-in could not be completed. Please try again.',
    language: 'Language',
    arabic: 'Arabic',
    english: 'English',
    nightMode: 'Night',
    lightMode: 'Light',
    linkedin: 'LinkedIn',
    pageTitle: 'Mo7mels',
    homeHeadline: 'Turn links into ready-to-share embeds.',
    pageSubtitle: 'Create embeds for YouTube, Shorts, TikTok, Instagram, and general links.',
    homeKicker: 'Create once. Share everywhere.',
    embedGeneratorLabel: 'EMBED GENERATOR',
    generatorHint: 'Paste a URL from a supported platform or any public page.',
    embedOptions: 'EMBED OPTIONS',
    responsiveEmbed: 'Responsive width',
    fixedSize: 'Fixed dimensions',
    embedWidth: 'Width (px)',
    embedHeight: 'Height (px)',
    responsiveHint: 'Responsive embeds adapt to the available space.',
    navHome: 'Home',
    navFeatures: 'Features',
    navRules: 'Rules',
    navContact: 'Contact',
    navPricing: 'Plans',
    getStarted: 'Get Started',
    plansKicker: 'SIMPLE TOOLKIT',
    plansTitle: 'Plans for every workflow',
    plansIntro: 'Start with the embed tools. Account and team options are being prepared.',
    planNames: ['Starter', 'Creator', 'Studio'],
    planDescriptions: [
      'For a quick, one-time embed.',
      'For creators who reuse and organize embeds.',
      'For teams managing multiple embed projects.',
    ],
    planFeatures: [
      ['Generate embed snippets', 'Responsive or fixed sizing', 'Copy and preview'],
      ['Everything in Starter', 'Save embeds to your account', 'Export saved snippets'],
      ['Everything in Creator', 'Organize and review saved embeds', 'Team tools in development'],
    ],
    planStatus: 'Plan details coming soon',
    whyTitle: 'A simpler way to embed',
    whyCards: [
      ['Quick setup', 'Paste a public link and get a ready-to-use snippet.'],
      ['Works across platforms', 'Generate embeds for YouTube, TikTok, Instagram, and public pages.'],
      ['Fits your layout', 'Use responsive sizing or set your own dimensions.'],
      ['Keep your work close', 'Sign in to save snippets and export your collection.'],
    ],
    faqTitle: 'Frequently asked questions',
    faqItems: [
      ['How do I get started?', 'Paste a supported public URL into the embed tool and choose Generate Embed.'],
      ['Do you host the videos or posts?', 'No. The original platform hosts its content; Mo7mels generates the embed code.'],
      ['Can I change the embed size?', 'Yes. Use responsive width or switch it off to enter fixed width and height values.'],
      ['Are payment plans available?', 'Payment options are not available yet. We will add details when they are ready.'],
    ],
    featureTitle: 'Built for quick publishing',
    featureCopy: 'A focused toolkit to turn public links into clean, shareable embeds.',
    featureCards: [
      ['01 / FAST', 'Generate embed code in a few seconds.'],
      ['02 / FLEXIBLE', 'Choose responsive or custom dimensions.'],
      ['03 / READY', 'Preview, copy, and save your embed snippets.'],
    ],
    workflowTitle: 'From link to live embed in three steps',
    ctaTitle: 'Make your next embed the easy part.',
    ctaCopy: 'Try the generator with a public link. No account is needed to get started.',
    workflowSteps: [
      ['01', 'Paste a link', 'Use a public link from a supported platform or a page that allows embeds.'],
      ['02', 'Choose your layout', 'Pick a responsive embed or set the dimensions that fit your page.'],
      ['03', 'Copy and publish', 'Preview the result, copy the snippet, and add it to your website.'],
    ],
    footerTitle: 'Usage rules & terms',
    privacyTitle: 'Privacy & data',
    privacyCopy: 'If you choose Google sign-in, Mo7mels receives your verified name and email. Account details, login sessions, and embed snippets you save are stored in the site database to provide the service. Google passwords are never shared with or stored by Mo7mels. Contact the developer for data or account requests.',
    footerRules: [
      'Only embed public content that you have permission to share.',
      'Respect each platform’s terms, copyright, and creator attribution.',
      'You are responsible for checking embeds and links before publishing.',
      'Do not use this service to distribute harmful, illegal, or misleading content.',
    ],
    footerNote: 'By using Mo7mels, you agree to use the service lawfully and respectfully.',
    developerContact: 'Contact the developer',
    copyright: '© 2026 Mo7mels. All rights reserved.',
    ready: 'READY',
    anyLink: 'Any link',
    inputPlaceholder: 'Enter YouTube, YouTube Shorts, TikTok, Instagram, or any URL',
    generate: 'Generate Embed',
    embedCode: 'Embed Code',
    loginTitle: 'Welcome Back',
    signupTitle: 'Create New Account',
    loginSubtitle: 'Sign in to manage your embed library and account settings.',
    signupSubtitle: 'Create an account to save your generated embeds.',
    authAsideTitle: 'Professional Access',
    authAsideText: 'A streamlined workspace for links, saved embeds, and account control.',
    authStats: ['Saved embeds', 'Secure access', 'Fast workflow'],
    fullName: 'Full Name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    dashboardTitle: 'Control Center',
    dashboardSubtitle: 'Review your account, recent embed activity, and saved code snippets.',
    dashboardWelcome: 'Welcome',
    dashboardStats: ['Saved embeds', 'Account status', 'Account type'],
    dashboardStatus: 'Active',
    dashboardPlan: 'Standard',
    dashboardAccount: 'Account Details',
    dashboardRecent: 'Recent Saved Embeds',
    dashboardEmpty: 'No embeds saved yet. Generate one from the home page while logged in.',
    dashboardName: 'Name',
    dashboardEmail: 'Email',
    dashboardJoined: 'Joined',
    dashboardInsights: 'Account Insights',
    dashboardUserId: 'User ID',
    dashboardMemberFor: 'Member for',
    dashboardLastEmbed: 'Last saved embed',
    dashboardEmbedsWeek: 'Embeds in last 7 days',
    dashboardEmbedsMonth: 'Embeds in last 30 days',
    dashboardActivityLevel: 'Activity level',
    dashboardActivityLow: 'Low',
    dashboardActivityMedium: 'Medium',
    dashboardActivityHigh: 'High',
    dashboardPlatformMix: 'Platforms used',
    dashboardTopPlatform: 'Top platform',
    dashboardNoActivityYet: 'No activity yet',
    dashboardDaysUnit: 'days',
    dashboardBack: 'Back To Generator',
    dashboardChartTitle: 'Platform Usage Chart',
    dashboardChartEmpty: 'No data yet. Start generating embeds to see chart.',
    dashboardNavOverview: 'Overview',
    dashboardNavOrders: 'Orders',
    dashboardNavAnalytics: 'Analytics',
    dashboardNavCustomers: 'Customers',
    dashboardNavSettings: 'Settings',
    dashboardSearch: 'Search orders, links, customers',
    dashboardPanelOverviewTitle: 'Store Snapshot',
    dashboardPanelOrdersTitle: 'Recent Orders',
    dashboardPanelOrdersEmpty: 'No orders yet. Generate embeds to create order history.',
    dashboardPanelCustomersTitle: 'Customer View',
    dashboardPanelCustomersSubtitle: 'Primary account owner and engagement indicators.',
    dashboardPanelAnalyticsTitle: 'Sales & Platform Analytics',
    dashboardPanelSettingsTitle: 'Account & Security Settings',
    dashboardKpiConversion: 'Conversion rate',
    dashboardKpiRevenue: 'Est. revenue',
    dashboardKpiAov: 'Avg order value',
    dashboardOrderId: 'Order ID',
    dashboardOrderSource: 'Source',
    dashboardOrderType: 'Type',
    dashboardOrderDate: 'Date',
    dashboardOrderStatus: 'Status',
    dashboardOrderStatusDone: 'Completed',
    embedTypes: {
      youtube: 'YouTube',
      tiktok: 'TikTok',
      instagram: 'Instagram',
      general: 'General Link',
    },
    authMessages: {
      requiredName: 'Please enter your full name.',
      shortName: 'Name must be at least 3 characters.',
      invalidEmail: 'Please enter a valid email address.',
      weakPassword: 'Password must be at least 8 characters and include letters and numbers.',
      confirmMismatch: 'Password confirmation does not match.',
      loginSuccess: 'Login successful.',
      signupSuccess: 'Account created successfully.',
      loginRequired: 'Please log in first to open the dashboard.',
      otpSent: 'A verification code has been sent to your email.',
      otpSuccess: 'Email verified successfully.',
      otpInvalid: 'Invalid or expired code. Please try again.',
      otpResent: 'Verification code resent to your email.',
    },
    accountSettingsTitle: 'Account Settings',
    accountUpdated: 'Profile updated successfully.',
    emailUpdated: 'Email updated successfully.',
    save: 'Save',
    change: 'Change',
    changePassword: 'Change Password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    otp: {
      title: 'Verify Your Email',
      subtitle: 'Enter the 6-digit code sent to your email address.',
      label: 'Verification Code',
      submit: 'Verify',
      resend: 'Resend Code',
      back: 'Back',
      debugHint: 'Your OTP code (debug mode)',
    },
    errors: {
      empty: 'Please enter a link first.',
      invalid: 'The link is invalid. Use a full link starting with http or https.',
      youtube: 'This YouTube link does not contain a valid video ID.',
      tiktok: 'This TikTok link does not contain a valid video ID.',
      instagram: 'This Instagram link must be a public post, reel, or TV link.',
      saveEmbed: 'Embed generated, but saving it to your account failed.',
      serverUnavailable: 'The server is unavailable. Start the API server and try again.',
    },
    success: {
      youtube: 'Valid YouTube or YouTube Shorts link. Embed code generated successfully.',
      tiktok: 'Valid TikTok link. Embed code generated successfully.',
      instagram: 'Valid Instagram link. Embed code generated successfully.',
      general: 'Valid general link. Iframe embed generated successfully.',
    },
  },
  ar: {
    brand: 'Mo7mels',
    home: 'الرئيسية',
    dashboard: 'لوحة التحكم',
    logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    googleSignIn: 'المتابعة باستخدام Google',
    googleSignInUnavailable: 'تعذر تسجيل الدخول باستخدام Google. حاول مرة أخرى.',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'الإنجليزية',
    nightMode: 'ليلي',
    lightMode: 'نهاري',
    pageTitle: 'Mo7mels',
    homeHeadline: 'حوّل روابطك إلى تضمينات جاهزة للمشاركة.',
    pageSubtitle: 'أنشئ أكواد تضمين ليوتيوب وشورتس وتيك توك وإنستقرام والروابط العامة.',
    homeKicker: 'أنشئ مرة، وشارك في كل مكان.',
    embedGeneratorLabel: 'مولد التضمين',
    generatorHint: 'ألصق رابطاً من منصة مدعومة أو أي صفحة عامة.',
    embedOptions: 'خيارات التضمين',
    responsiveEmbed: 'عرض متجاوب',
    fixedSize: 'أبعاد ثابتة',
    embedWidth: 'العرض (بكسل)',
    embedHeight: 'الارتفاع (بكسل)',
    responsiveHint: 'تتكيّف التضمينات المتجاوبة مع المساحة المتاحة.',
    navHome: 'الرئيسية',
    navFeatures: 'المميزات',
    navRules: 'القواعد',
    navContact: 'تواصل',
    navPricing: 'الخطط',
    getStarted: 'ابدأ الآن',
    plansKicker: 'أدوات بسيطة',
    plansTitle: 'خيارات تناسب طريقة عملك',
    plansIntro: 'ابدأ بأدوات التضمين. خيارات الحساب والفريق قيد الإعداد.',
    planNames: ['البداية', 'صانع المحتوى', 'الفريق'],
    planDescriptions: [
      'لإنشاء تضمين سريع لمرة واحدة.',
      'لصنّاع المحتوى الذين ينظمون التضمينات ويعيدون استخدامها.',
      'للفرق التي تدير عدة مشاريع تضمين.',
    ],
    planFeatures: [
      ['إنشاء أكواد التضمين', 'أبعاد متجاوبة أو ثابتة', 'نسخ ومعاينة'],
      ['كل مزايا البداية', 'حفظ التضمينات في الحساب', 'تصدير الأكواد المحفوظة'],
      ['كل مزايا صانع المحتوى', 'تنظيم ومراجعة التضمينات المحفوظة', 'أدوات الفريق قيد التطوير'],
    ],
    planStatus: 'تفاصيل الخطط قريبًا',
    whyTitle: 'طريقة أبسط للتضمين',
    whyCards: [
      ['إعداد سريع', 'ألصق رابطًا عامًا واحصل على كود جاهز للاستخدام.'],
      ['منصات متعددة', 'أنشئ تضمينات ليوتيوب وتيك توك وإنستقرام والصفحات العامة.'],
      ['يناسب تصميمك', 'استخدم عرضًا متجاوبًا أو اختر الأبعاد بنفسك.'],
      ['احتفظ بعملك', 'سجل الدخول لحفظ الأكواد وتصدير مجموعتك.'],
    ],
    faqTitle: 'الأسئلة الشائعة',
    faqItems: [
      ['كيف أبدأ؟', 'ألصق رابطًا عامًا مدعومًا في أداة التضمين ثم اختر إنشاء التضمين.'],
      ['هل تستضيفون الفيديوهات أو المنشورات؟', 'لا. تستضيف المنصة الأصلية محتواها، بينما ينشئ Mo7mels كود التضمين.'],
      ['هل يمكنني تغيير حجم التضمين؟', 'نعم. استخدم العرض المتجاوب أو أوقفه لإدخال العرض والارتفاع المطلوبين.'],
      ['هل خيارات الدفع متاحة؟', 'خيارات الدفع غير متاحة حاليًا. سنضيف التفاصيل عندما تصبح جاهزة.'],
    ],
    featureTitle: 'أدوات عملية للنشر السريع',
    featureCopy: 'مجموعة مركزة لتحويل الروابط العامة إلى تضمينات مرتبة وسهلة المشاركة.',
    featureCards: [
      ['٠١ / سريع', 'أنشئ كود التضمين خلال ثوانٍ.'],
      ['٠٢ / مرن', 'اختر أبعادًا متجاوبة أو مخصصة.'],
      ['٠٣ / جاهز', 'عاين أكواد التضمين وانسخها واحفظها.'],
    ],
    workflowTitle: 'من الرابط إلى التضمين في ثلاث خطوات',
    ctaTitle: 'اجعل التضمين أسهل خطوة في مشروعك.',
    ctaCopy: 'جرّب أداة التضمين برابط عام. لا تحتاج إلى حساب للبدء.',
    workflowSteps: [
      ['٠١', 'أضف الرابط', 'استخدم رابطًا عامًا من منصة مدعومة أو صفحة تسمح بالتضمين.'],
      ['٠٢', 'اختر التصميم', 'استخدم تضمينًا متجاوبًا أو حدد الأبعاد المناسبة لصفحتك.'],
      ['٠٣', 'انسخ وانشر', 'عاين النتيجة وانسخ الكود وأضفه إلى موقعك.'],
    ],
    footerTitle: 'قواعد الاستخدام والشروط',
    privacyTitle: 'الخصوصية والبيانات',
    privacyCopy: 'عند اختيار تسجيل الدخول عبر Google، يستقبل Mo7mels اسمك وبريدك الإلكتروني بعد التحقق منهما. تُحفظ بيانات الحساب وجلسات الدخول وأكواد التضمين التي تختار حفظها في قاعدة بيانات الموقع لتقديم الخدمة. لا يشارك Mo7mels كلمات مرور Google ولا يخزنها. تواصل مع المطور لطلبات البيانات أو الحساب.',
    footerRules: [
      'ضمّن المحتوى العام الذي تملك إذنًا بمشاركته فقط.',
      'احترم شروط كل منصة وحقوق النشر ونسب المحتوى إلى صاحبه.',
      'تحقق من التضمينات والروابط قبل نشرها.',
      'لا تستخدم الخدمة لنشر محتوى ضار أو غير قانوني أو مضلل.',
    ],
    footerNote: 'باستخدامك Mo7mels، توافق على استخدام الخدمة بشكل قانوني ومسؤول.',
    developerContact: 'تواصل مع المطور',
    copyright: '© 2026 Mo7mels. جميع الحقوق محفوظة.',
    ready: 'جاهز',
    anyLink: 'أي رابط',
    inputPlaceholder: 'أدخل رابط يوتيوب أو شورتس أو تيك توك أو إنستقرام أو أي رابط',
    generate: 'إنشاء الإيمبد',
    embedCode: 'كود الإيمبد',
    loginTitle: 'مرحبًا بعودتك',
    signupTitle: 'إنشاء حساب جديد',
    loginSubtitle: 'سجل الدخول لإدارة مكتبة الإيمبد وإعدادات الحساب.',
    signupSubtitle: 'أنشئ حسابًا لحفظ أكواد التضمين التي تنشئها.',
    authAsideTitle: 'وصول احترافي',
    authAsideText: 'مساحة عمل منظمة للروابط والأكواد المحفوظة والتحكم في الحساب.',
    authStats: ['أكواد محفوظة', 'دخول آمن', 'عمل أسرع'],
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    dashboardTitle: 'لوحة التحكم',
    dashboardSubtitle: 'راجع حسابك وآخر نشاطات التضمين والأكواد المحفوظة.',
    dashboardWelcome: 'مرحبًا',
    dashboardStats: ['الأكواد المحفوظة', 'حالة الحساب', 'نوع الحساب'],
    dashboardStatus: 'نشط',
    dashboardPlan: 'قياسي',
    linkedin: 'لينكدإن',
    dashboardAccount: 'بيانات الحساب',
    dashboardRecent: 'آخر أكواد التضمين المحفوظة',
    dashboardEmpty: 'لا توجد أكواد محفوظة بعد. أنشئ إيمبد من الصفحة الرئيسية وأنت مسجل الدخول.',
    dashboardName: 'الاسم',
    dashboardEmail: 'البريد الإلكتروني',
    dashboardJoined: 'تاريخ الانضمام',
    dashboardInsights: 'مؤشرات الحساب',
    dashboardUserId: 'معرّف المستخدم',
    dashboardMemberFor: 'مدة العضوية',
    dashboardLastEmbed: 'آخر كود محفوظ',
    dashboardEmbedsWeek: 'أكواد آخر 7 أيام',
    dashboardEmbedsMonth: 'أكواد آخر 30 يومًا',
    dashboardActivityLevel: 'مستوى النشاط',
    dashboardActivityLow: 'منخفض',
    dashboardActivityMedium: 'متوسط',
    dashboardActivityHigh: 'عالٍ',
    dashboardPlatformMix: 'المنصات المستخدمة',
    dashboardTopPlatform: 'المنصة الأكثر استخدامًا',
    dashboardNoActivityYet: 'لا يوجد نشاط حتى الآن',
    dashboardDaysUnit: 'يوم',
    dashboardBack: 'العودة إلى المولد',
    dashboardChartTitle: 'مخطط استخدام المنصات',
    dashboardChartEmpty: 'لا توجد بيانات بعد. ابدأ بإنشاء أكواد تضمين لعرض المخطط.',
    dashboardNavOverview: 'نظرة عامة',
    dashboardNavOrders: 'الطلبات',
    dashboardNavAnalytics: 'التحليلات',
    dashboardNavCustomers: 'العملاء',
    dashboardNavSettings: 'الإعدادات',
    dashboardSearch: 'ابحث في الطلبات والروابط والعملاء',
    dashboardPanelOverviewTitle: 'ملخص المتجر',
    dashboardPanelOrdersTitle: 'أحدث الطلبات',
    dashboardPanelOrdersEmpty: 'لا توجد طلبات بعد. ابدأ بإنشاء أكواد التضمين.',
    dashboardPanelCustomersTitle: 'عرض العملاء',
    dashboardPanelCustomersSubtitle: 'مالك الحساب الأساسي ومؤشرات التفاعل.',
    dashboardPanelAnalyticsTitle: 'تحليلات المبيعات والمنصات',
    dashboardPanelSettingsTitle: 'إعدادات الحساب والأمان',
    dashboardKpiConversion: 'معدل التحويل',
    dashboardKpiRevenue: 'إيراد تقديري',
    dashboardKpiAov: 'متوسط قيمة الطلب',
    dashboardOrderId: 'رقم الطلب',
    dashboardOrderSource: 'المصدر',
    dashboardOrderType: 'النوع',
    dashboardOrderDate: 'التاريخ',
    dashboardOrderStatus: 'الحالة',
    dashboardOrderStatusDone: 'مكتمل',
    embedTypes: {
      youtube: 'يوتيوب',
      tiktok: 'تيك توك',
      instagram: 'إنستقرام',
      general: 'رابط عام',
    },
    authMessages: {
      requiredName: 'يرجى إدخال الاسم الكامل.',
      shortName: 'يجب أن يكون الاسم 3 أحرف على الأقل.',
      invalidEmail: 'يرجى إدخال بريد إلكتروني صالح.',
      weakPassword: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على حروف وأرقام.',
      confirmMismatch: 'تأكيد كلمة المرور غير مطابق.',
      loginSuccess: 'تم تسجيل الدخول بنجاح.',
      signupSuccess: 'تم إنشاء الحساب بنجاح.',
      loginRequired: 'يجب تسجيل الدخول أولًا لفتح لوحة التحكم.',
      otpSent: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.',
      otpSuccess: 'تم التحقق من البريد الإلكتروني بنجاح.',
      otpInvalid: 'الرمز غير صالح أو منتهي الصلاحية. يرجى المحاولة مجددًا.',
      otpResent: 'تم إعادة إرسال رمز التحقق إلى بريدك الإلكتروني.',
    },
    accountSettingsTitle: 'إعدادات الحساب',
    accountUpdated: 'تم تحديث الملف الشخصي بنجاح.',
    emailUpdated: 'تم تحديث البريد الإلكتروني بنجاح.',
    save: 'حفظ',
    change: 'تغيير',
    changePassword: 'تغيير كلمة المرور',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    otp: {
      title: 'تحقق من بريدك الإلكتروني',
      subtitle: 'أدخل رمز التحقق المكون من 6 أرقام الذي أُرسل إلى بريدك.',
      label: 'رمز التحقق',
      submit: 'تحقق',
      resend: 'إعادة الإرسال',
      back: 'رجوع',
      debugHint: 'رمز التحقق (وضع التصحيح)',
    },
    errors: {
      empty: 'يرجى إدخال رابط أولاً.',
      invalid: 'الرابط غير صالح. استخدم رابطًا كاملًا يبدأ بـ http أو https.',
      youtube: 'رابط يوتيوب هذا لا يحتوي على معرف فيديو صالح.',
      tiktok: 'رابط تيك توك هذا لا يحتوي على معرف فيديو صالح.',
      instagram: 'يجب أن يكون رابط إنستقرام منشورًا عامًا أو ريل أو TV.',
      saveEmbed: 'تم إنشاء الإيمبد، لكن تعذر حفظه في حسابك.',
      serverUnavailable: 'الخادم غير متاح. شغّل خادم الـ API ثم حاول مرة أخرى.',
    },
    success: {
      youtube: 'تم التحقق من رابط يوتيوب أو شورتس وإنشاء كود التضمين بنجاح.',
      tiktok: 'تم التحقق من رابط تيك توك وإنشاء كود التضمين بنجاح.',
      instagram: 'تم التحقق من رابط إنستقرام وإنشاء كود التضمين بنجاح.',
      general: 'تم التحقق من الرابط العام وإنشاء iframe بنجاح.',
    },
  },
}

function LanguageSwitcher({ content, language, setLanguage }) {
  return (
    <div className="language-switcher" role="group" aria-label={content.language}>
      <button
        type="button"
        className={language === 'en' ? 'language-option active' : 'language-option'}
        aria-pressed={language === 'en'}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={language === 'ar' ? 'language-option active' : 'language-option'}
        aria-pressed={language === 'ar'}
        onClick={() => setLanguage('ar')}
      >
        عربي
      </button>
    </div>
  )
}

function ThemeSwitcher({ content, darkMode, onToggle }) {
  const nextMode = darkMode ? content.lightMode : content.nightMode
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`${content.language}: ${nextMode}`}
      title={nextMode}
    >
      <span className="theme-toggle-icon" aria-hidden="true">{darkMode ? '☀' : '☾'}</span>
      <span>{nextMode}</span>
    </button>
  )
}

function App() {
  const [language, setLanguage] = useState('ar')
  const [currentPath, setCurrentPath] = useState(getInitialPath)
  const [currentUser, setCurrentUser] = useState(null)
  const [savedEmbeds, setSavedEmbeds] = useState([])
  const [authMessage, setAuthMessage] = useState('')
  const [authMessageType, setAuthMessageType] = useState('')
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [url, setUrl] = useState('')
  const [responsiveEmbed, setResponsiveEmbed] = useState(true)
  const [embedWidth, setEmbedWidth] = useState(560)
  const [embedHeight, setEmbedHeight] = useState(315)
  const [embedCode, setEmbedCode] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [validationType, setValidationType] = useState('')
  const [profileName, setProfileName] = useState(currentUser?.name || '')
  const [newEmailInput, setNewEmailInput] = useState(currentUser?.email || '')
  const [currentPasswordInput, setCurrentPasswordInput] = useState('')
  const [newPasswordInput, setNewPasswordInput] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [sessionToken, setSessionToken] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem('sessionToken') || ''
  })
  const [isAuthLoading, setIsAuthLoading] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(window.localStorage.getItem('sessionToken'))
  })
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('darkMode') === 'true'
  })
  const [studyTab, setStudyTab] = useState(() => getStudyTabForPath(typeof window === 'undefined' ? '/' : window.location.pathname))
  const [studySearch, setStudySearch] = useState('')
  const [selectedStudySubject, setSelectedStudySubject] = useState('math')
  const [worksheetAnswers, setWorksheetAnswers] = useState(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('omanGrade12Worksheets') || '{}') } catch { return {} }
  })
  const [boardColor, setBoardColor] = useState('#203b32')
  const [boardSize, setBoardSize] = useState(4)
  const [boardTool, setBoardTool] = useState('pen')
  const [orderSearch, setOrderSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const previewRef = useRef(null)
  const boardCanvasRef = useRef(null)
  const boardDrawingRef = useRef(false)
  const googleCallbackRef = useRef(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auth') === 'google_connected',
  )

  const content = translations[language]
  const isSignupPage = currentPath === '/signup'

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = getInitialPath()
      setCurrentPath(nextPath)
      setStudyTab(getStudyTabForPath(nextPath))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  useEffect(() => {
    if (currentPath === '/pricing') {
      window.requestAnimationFrame(() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [currentPath])

  useEffect(() => {
    const syncSession = async () => {
      const isGoogleCallback = googleCallbackRef.current
      const hasGoogleSession = window.localStorage.getItem('googleSession') === 'true'
      if (!sessionToken && !isGoogleCallback && !hasGoogleSession) {
        setCurrentUser(null)
        setIsAuthLoading(false)
        return
      }

      try {
        const accessToken = isGoogleCallback ? '' : sessionToken
        const response = await apiRequest('/auth/me', {}, accessToken)
        setCurrentUser(response.user)
        if (isGoogleCallback || hasGoogleSession) {
          window.localStorage.setItem('googleSession', 'true')
        }
        if (isGoogleCallback) {
          window.localStorage.removeItem('sessionToken')
          setSessionToken('')
          googleCallbackRef.current = false
          window.history.replaceState({}, '', window.location.pathname)
        }
      } catch {
        setCurrentUser(null)
        setSessionToken('')
        window.localStorage.removeItem('googleSession')
        window.localStorage.removeItem('sessionToken')
      } finally {
        setIsAuthLoading(false)
      }
    }

    syncSession()
  }, [sessionToken])

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const authResult = search.get('auth')
    if (authResult && authResult !== 'google_connected') {
      setAuthMessageType('error')
      setAuthMessage(content.googleSignInUnavailable)
      search.delete('auth')
      const nextSearch = search.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`)
    }
  }, [content.googleSignInUnavailable])

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '')
      setNewEmailInput(currentUser.email || '')
    }
  }, [currentUser])

  useEffect(() => {
    if (!previewRef.current || !embedCode) {
      return undefined
    }

    if (embedCode.includes('instagram-media')) {
      const existingInstagramScript = document.querySelector(
        'script[src="https://www.instagram.com/embed.js"]',
      )

      if (!existingInstagramScript) {
        const script = document.createElement('script')
        script.async = true
        script.src = 'https://www.instagram.com/embed.js'
        script.onload = () => {
          window.instgrm?.Embeds?.process()
        }
        document.body.appendChild(script)
      } else {
        window.instgrm?.Embeds?.process()
      }
    }

    if (embedCode.includes('tiktok-embed')) {
      const existingTikTokScript = document.querySelector(
        'script[src="https://www.tiktok.com/embed.js"]',
      )

      if (!existingTikTokScript) {
        const script = document.createElement('script')
        script.async = true
        script.src = 'https://www.tiktok.com/embed.js'
        document.body.appendChild(script)
      }
    }

    return undefined
  }, [embedCode])

  useEffect(() => {
    if (!isAuthLoading && currentPath.startsWith('/dashboard') && !currentUser) {
      setAuthMessageType('error')
      setAuthMessage(content.authMessages.loginRequired)
      window.history.replaceState({}, '', '/login')
      setCurrentPath('/login')
    }
  }, [content.authMessages.loginRequired, currentPath, currentUser, isAuthLoading])

  useEffect(() => {
    if (!currentUser) {
      setSavedEmbeds([])
      return
    }

    const fetchSavedEmbeds = async () => {
      try {
        const response = await apiRequest('/embeds', {}, sessionToken)
        setSavedEmbeds(response.embeds || [])
      } catch {
        setSavedEmbeds([])
      }
    }

    fetchSavedEmbeds()
  }, [currentUser])

  const navigateTo = (path) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
    window.scrollTo(0, 0)
  }

  const clearAuthMessage = () => {
    if (authMessage) {
      setAuthMessage('')
      setAuthMessageType('')
    }
  }

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' }, sessionToken)
    } catch {
      // Clear the local session even when the server is temporarily offline.
    }
    setCurrentUser(null)
    setSessionToken('')
    window.localStorage.removeItem('sessionToken')
    window.localStorage.removeItem('googleSession')
    setSavedEmbeds([])
    navigateTo('/')
  }

  const handleAuthSubmit = async () => {
    const trimmedName = authForm.name.trim()
    const trimmedEmail = authForm.email.trim().toLowerCase()
    const trimmedPassword = authForm.password.trim()
    const trimmedConfirmPassword = authForm.confirmPassword.trim()

    if (isSignupPage) {
      if (!trimmedName) {
        setAuthMessageType('error')
        setAuthMessage(content.authMessages.requiredName)
        return
      }

      if (trimmedName.length < 3) {
        setAuthMessageType('error')
        setAuthMessage(content.authMessages.shortName)
        return
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setAuthMessageType('error')
      setAuthMessage(content.authMessages.invalidEmail)
      return
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(trimmedPassword)) {
      setAuthMessageType('error')
      setAuthMessage(content.authMessages.weakPassword)
      return
    }

    if (isSignupPage && trimmedPassword !== trimmedConfirmPassword) {
      setAuthMessageType('error')
      setAuthMessage(content.authMessages.confirmMismatch)
      return
    }

    try {
      if (isSignupPage) {
        const response = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            email: trimmedEmail,
            password: trimmedPassword,
            confirmPassword: trimmedConfirmPassword,
          }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || content.errors.serverUnavailable)
        }

        setAuthForm({ name: '', email: '', password: '', confirmPassword: '' })
        setAuthMessageType('success')
        setAuthMessage(content.authMessages.signupSuccess)
        setCurrentUser(data.user)
        setSessionToken(data.token || '')
        window.localStorage.removeItem('googleSession')
        window.localStorage.setItem('sessionToken', data.token || '')
        navigateTo('/dashboard')
        return
      } else {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmedEmail,
            password: trimmedPassword,
          }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || content.errors.serverUnavailable)
        }

        setCurrentUser(data.user)
        setSessionToken(data.token || '')
        window.localStorage.removeItem('googleSession')
        window.localStorage.setItem('sessionToken', data.token || '')
        setAuthForm({ name: '', email: '', password: '', confirmPassword: '' })
        setAuthMessageType('success')
        setAuthMessage(content.authMessages.loginSuccess)
        navigateTo('/dashboard')
      }
    } catch (error) {
      setAuthMessageType('error')
      setAuthMessage(error.message || content.errors.serverUnavailable)
    }
  }

  const handleDeleteEmbed = async (embedId) => {
    try {
      await apiRequest(`/embeds/${embedId}`, { method: 'DELETE' }, sessionToken)
      setSavedEmbeds((prev) => prev.filter((e) => e.id !== embedId))
    } catch {
      // silent
    }
  }

  const handleExportHtml = () => {
    const rows = savedEmbeds
      .map((e) => `<section data-type="${e.type}" data-url="${e.sourceUrl}">${e.embedCode}</section>`)
      .join('\n')
    const html = `<!DOCTYPE html>\n<html lang="ar">\n<head><meta charset="UTF-8"><title>Mo7mels Embeds</title><style>section{margin:2rem auto;max-width:640px}</style></head>\n<body>\n${rows}\n</body>\n</html>`
    const blob = new Blob([html], { type: 'text/html' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = 'mo7mels-embeds.html'
    anchor.click()
    URL.revokeObjectURL(objectUrl)
  }

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('darkMode', String(next))
  }

  const saveEmbedToAccount = async (type, sourceUrl, code) => {
    if (!currentUser) {
      return
    }

    try {
      const response = await apiRequest('/embeds', {
        method: 'POST',
        body: JSON.stringify({
          type,
          sourceUrl,
          embedCode: code,
        }),
      }, sessionToken)

      setSavedEmbeds(response.embeds || [])
    } catch {
      setValidationType('error')
      setValidationMessage(content.errors.saveEmbed)
    }
  }

  const generateEmbed = async () => {
    const normalizedUrl = url.trim()

    if (!normalizedUrl) {
      setEmbedCode('')
      setValidationType('error')
      setValidationMessage(content.errors.empty)
      return
    }

    if (!isValidHttpUrl(normalizedUrl)) {
      setEmbedCode('')
      setValidationType('error')
      setValidationMessage(content.errors.invalid)
      return
    }

    let nextCode = ''
    let nextType = 'general'
    let nextMessage = content.success.general

    if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
      const videoId = extractYouTubeVideoId(normalizedUrl)

      if (!videoId) {
        setEmbedCode('')
        setValidationType('error')
        setValidationMessage(content.errors.youtube)
        return
      }

      nextType = 'youtube'
      nextMessage = content.success.youtube
      nextCode = createIframeEmbed(`https://www.youtube.com/embed/${videoId}`, responsiveEmbed, embedWidth, embedHeight)
    } else if (normalizedUrl.includes('tiktok.com')) {
      const videoId = extractTikTokVideoId(normalizedUrl)

      if (!videoId) {
        setEmbedCode('')
        setValidationType('error')
        setValidationMessage(content.errors.tiktok)
        return
      }

      nextType = 'tiktok'
      nextMessage = content.success.tiktok
      nextCode = `<blockquote class="tiktok-embed" cite="${normalizedUrl}" data-video-id="${videoId}" style="max-width: 605px; min-width: 325px;"><section></section></blockquote>\n<script async src="https://www.tiktok.com/embed.js"></script>`
    } else if (normalizedUrl.includes('instagram.com')) {
      const instagramData = extractInstagramData(normalizedUrl)

      if (!instagramData) {
        setEmbedCode('')
        setValidationType('error')
        setValidationMessage(content.errors.instagram)
        return
      }

      nextType = 'instagram'
      nextMessage = content.success.instagram
      nextCode = `<blockquote class="instagram-media" data-instgrm-permalink="${instagramData.permalink}?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style="background:#FFF; border:0; margin: 1px; max-width:540px; min-width:326px; padding:0; width:100%;"></blockquote>\n<script async src="https://www.instagram.com/embed.js"></script>`
    } else {
      nextCode = createIframeEmbed(new URL(normalizedUrl).href, responsiveEmbed, embedWidth, embedHeight)
    }

    setEmbedCode(nextCode)
    setValidationType('success')
    setValidationMessage(nextMessage)
    await saveEmbedToAccount(nextType, normalizedUrl, nextCode)
  }

  const renderAuthPage = () => (
    <div className="auth-page-shell">
      <header className="auth-page-topbar">
        <button type="button" className="nav-link-button" onClick={() => navigateTo('/')}>
          {content.home}
        </button>
        <LanguageSwitcher content={content} language={language} setLanguage={setLanguage} />
      </header>

      <section className="auth-layout">
        <aside className="auth-showcase">
          <span className="eyebrow-badge">{content.brand}</span>
          <h1>{isSignupPage ? content.signupTitle : content.loginTitle}</h1>
          <p>{content.authAsideText}</p>
          <div className="showcase-stats">
            {content.authStats.map((item) => (
              <div className="showcase-stat" key={item}>
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2>{isSignupPage ? content.signupTitle : content.loginTitle}</h2>
            <p>{isSignupPage ? content.signupSubtitle : content.loginSubtitle}</p>
          </div>

          <div className="auth-switch-row">
            <button
              type="button"
              className={!isSignupPage ? 'auth-route-button active' : 'auth-route-button'}
              onClick={() => {
                clearAuthMessage()
                navigateTo('/login')
              }}
            >
              {content.login}
            </button>
            <button
              type="button"
              className={isSignupPage ? 'auth-route-button active' : 'auth-route-button'}
              onClick={() => {
                clearAuthMessage()
                navigateTo('/signup')
              }}
            >
              {content.signUp}
            </button>
          </div>

          {GOOGLE_AUTH_ENABLED && (
            <a className="google-signin-button" href="/api/auth/google">
              <span aria-hidden="true">G</span>{content.googleSignIn}
            </a>
          )}

          <div className="auth-fields">
            {isSignupPage && (
              <input
                type="text"
                placeholder={content.fullName}
                value={authForm.name}
                onChange={(event) => {
                  setAuthForm((current) => ({ ...current, name: event.target.value }))
                  clearAuthMessage()
                }}
              />
            )}
            <input
              type="email"
              placeholder={content.email}
              value={authForm.email}
              onChange={(event) => {
                setAuthForm((current) => ({ ...current, email: event.target.value }))
                clearAuthMessage()
              }}
            />
            <input
              type="password"
              placeholder={content.password}
              value={authForm.password}
              onChange={(event) => {
                setAuthForm((current) => ({ ...current, password: event.target.value }))
                clearAuthMessage()
              }}
            />
            {isSignupPage && (
              <input
                type="password"
                placeholder={content.confirmPassword}
                value={authForm.confirmPassword}
                onChange={(event) => {
                  setAuthForm((current) => ({ ...current, confirmPassword: event.target.value }))
                  clearAuthMessage()
                }}
              />
            )}
            {authMessage && <p className={`auth-feedback ${authMessageType}`}>{authMessage}</p>}
            <button type="button" className="auth-submit-button" onClick={handleAuthSubmit}>
              {isSignupPage ? content.signUp : content.login}
            </button>
          </div>
        </div>
      </section>
    </div>
  )

  const renderDashboardPage = () => {
    const joinedAtTimestamp = new Date(currentUser?.createdAt || Date.now()).getTime()
    const memberDays = Math.max(1, Math.floor((Date.now() - joinedAtTimestamp) / 86400000) + 1)
    const weekAgoTimestamp = Date.now() - 7 * 86400000
    const monthAgoTimestamp = Date.now() - 30 * 86400000
    const embedsThisWeek = savedEmbeds.filter(
      (item) => new Date(item.createdAt).getTime() >= weekAgoTimestamp,
    ).length
    const embedsThisMonth = savedEmbeds.filter(
      (item) => new Date(item.createdAt).getTime() >= monthAgoTimestamp,
    ).length
    const typeUsage = savedEmbeds.reduce((accumulator, item) => {
      const key = item.type || 'general'
      return {
        ...accumulator,
        [key]: (accumulator[key] || 0) + 1,
      }
    }, {})

    const topType = getTopEmbedType(typeUsage)
    const topTypeLabel = topType
      ? content.embedTypes[topType] || content.embedTypes.general
      : content.dashboardNoActivityYet
    const latestEmbedLabel = savedEmbeds[0]?.createdAt
      ? new Date(savedEmbeds[0].createdAt).toLocaleString()
      : content.dashboardNoActivityYet
    const shortUserId = currentUser?.id ? String(currentUser.id).slice(0, 8) : '--'
    const conversionRate = savedEmbeds.length ? Math.min(98, 27 + savedEmbeds.length * 2) : 0
    const estimatedRevenue = (savedEmbeds.length * 0.75).toFixed(2)
    const averageOrderValue = savedEmbeds.length
      ? (Number(estimatedRevenue) / savedEmbeds.length).toFixed(2)
      : '0.00'

    const dashboardSection = currentPath === '/dashboard'
      ? 'overview'
      : currentPath.replace('/dashboard/', '')

    const navItems = [
      { key: 'overview', path: '/dashboard', label: content.dashboardNavOverview },
      { key: 'orders', path: '/dashboard/orders', label: content.dashboardNavOrders },
      { key: 'analytics', path: '/dashboard/analytics', label: content.dashboardNavAnalytics },
      { key: 'customers', path: '/dashboard/customers', label: content.dashboardNavCustomers },
      { key: 'settings', path: '/dashboard/settings', label: content.dashboardNavSettings },
    ]

    const renderOrdersTable = () => {
      const filteredEmbeds = orderSearch.trim()
        ? savedEmbeds.filter((item) =>
            item.sourceUrl?.toLowerCase().includes(orderSearch.toLowerCase()) ||
            (item.type || '').toLowerCase().includes(orderSearch.toLowerCase()),
          )
        : savedEmbeds

      return (
        <div className="dash-panel">
          <div className="panel-toolbar">
            <h2>{content.dashboardPanelOrdersTitle}</h2>
            <div className="panel-toolbar-right">
              {savedEmbeds.length > 0 && (
                <button type="button" className="export-btn" onClick={handleExportHtml}>
                  {language === 'ar' ? 'تصدير HTML' : 'Export HTML'}
                </button>
              )}
              <input
                className="orders-search"
                type="text"
                placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
          </div>
          {filteredEmbeds.length === 0 ? (
            <p className="dashboard-empty">
              {savedEmbeds.length === 0 ? content.dashboardPanelOrdersEmpty : (language === 'ar' ? 'لا توجد نتائج مطابقة.' : 'No matching results.')}
            </p>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>{content.dashboardOrderId}</th>
                    <th>{content.dashboardOrderType}</th>
                    <th>{content.dashboardOrderSource}</th>
                    <th>{content.dashboardOrderDate}</th>
                    <th>{content.dashboardOrderStatus}</th>
                    <th>{language === 'ar' ? 'حذف' : 'Delete'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmbeds.map((item) => (
                    <tr key={item.id}>
                      <td>MO7-{String(item.id).padStart(4, '0')}</td>
                      <td>{content.embedTypes[item.type] || content.embedTypes.general}</td>
                      <td>
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="embed-url-link">
                          {item.sourceUrl.length > 40 ? `${item.sourceUrl.slice(0, 40)}…` : item.sourceUrl}
                        </a>
                      </td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className="status-pill done">{content.dashboardOrderStatusDone}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="delete-embed-btn"
                          onClick={() => handleDeleteEmbed(item.id)}
                          title={language === 'ar' ? 'حذف' : 'Delete'}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )
    }

    const renderSettingsPanel = () => (
      <div className="dash-panel">
        <h2>{content.dashboardPanelSettingsTitle}</h2>
        <div className="account-settings">
          <div className="settings-row">
            <label>{content.dashboardName}</label>
            <input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            <button
              type="button"
              className="nav-primary-button small"
              onClick={async () => {
                setSettingsMessage('')
                try {
                  const body = await apiRequest('/auth/me', {
                    method: 'PUT',
                    body: JSON.stringify({ name: profileName }),
                  }, sessionToken)
                  setCurrentUser(body.user)
                  setSettingsMessage(content.accountUpdated || 'Profile updated')
                } catch (error) {
                  setSettingsMessage(error.message || 'Network error')
                }
              }}
            >
              {content.save || 'Save'}
            </button>
          </div>

          <div className="settings-row">
            <label>{content.email}</label>
            <input value={newEmailInput} onChange={(e) => setNewEmailInput(e.target.value)} />
            <button
              type="button"
              className="nav-primary-button small"
              onClick={async () => {
                setSettingsMessage('')
                try {
                  const body = await apiRequest('/auth/change-email', {
                    method: 'POST',
                    body: JSON.stringify({
                      newEmail: newEmailInput,
                      currentPassword: currentPasswordInput,
                    }),
                  }, sessionToken)
                  setCurrentUser(body.user)
                  setSettingsMessage(content.emailUpdated || 'Email updated successfully')
                  setCurrentPasswordInput('')
                } catch (error) {
                  setSettingsMessage(error.message || 'Network error')
                }
              }}
            >
              {content.save || 'Save'}
            </button>
          </div>

          <div className="settings-row password-row">
            <label>{content.changePassword || 'Change Password'}</label>
            <input
              type="password"
              placeholder={content.currentPassword || 'Current password'}
              value={currentPasswordInput}
              onChange={(e) => setCurrentPasswordInput(e.target.value)}
            />
            <input
              type="password"
              placeholder={content.newPassword || 'New password'}
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
            />
            <button
              type="button"
              className="nav-outline-button small"
              onClick={async () => {
                setSettingsMessage('')
                try {
                  const body = await apiRequest('/auth/change-password', {
                    method: 'POST',
                    body: JSON.stringify({
                      currentPassword: currentPasswordInput,
                      newPassword: newPasswordInput,
                    }),
                  }, sessionToken)
                  setCurrentPasswordInput('')
                  setNewPasswordInput('')
                  setSettingsMessage(body?.message || 'Password updated')
                } catch (error) {
                  setSettingsMessage(error.message || 'Network error')
                }
              }}
            >
              {content.change || 'Change'}
            </button>
          </div>
          {settingsMessage && <p className="auth-feedback">{settingsMessage}</p>}
        </div>
      </div>
    )

    const renderOverviewPanel = () => (
      <>
        <div className="dash-kpis">
          <article className="dash-kpi-card">
            <span>{content.dashboardStats[0]}</span>
            <strong>{savedEmbeds.length}</strong>
          </article>
          <article className="dash-kpi-card">
            <span>{content.dashboardKpiConversion}</span>
            <strong>{conversionRate}%</strong>
          </article>
          <article className="dash-kpi-card">
            <span>{content.dashboardKpiRevenue}</span>
            <strong>${estimatedRevenue}</strong>
          </article>
          <article className="dash-kpi-card">
            <span>{content.dashboardKpiAov}</span>
            <strong>${averageOrderValue}</strong>
          </article>
        </div>
        {renderOrdersTable()}
      </>
    )

    const renderAnalyticsPanel = () => (
      <div className="dash-panel">
        <h2>{content.dashboardPanelAnalyticsTitle}</h2>
        {Object.keys(typeUsage).length === 0 ? (
          <p className="dashboard-empty">{content.dashboardChartEmpty}</p>
        ) : (
          <>
            <div className="platform-chart">
              {[
                { key: 'youtube', color: '#f59e0b' },
                { key: 'tiktok', color: '#111827' },
                { key: 'instagram', color: '#ef4444' },
                { key: 'general', color: '#2563eb' },
              ]
                .filter(({ key }) => typeUsage[key])
                .sort((a, b) => (typeUsage[b.key] || 0) - (typeUsage[a.key] || 0))
                .map(({ key, color }) => {
                  const count = typeUsage[key] || 0
                  const pct = Math.round((count / savedEmbeds.length) * 100)
                  return (
                    <div className="chart-row" key={key}>
                      <span className="chart-label">{content.embedTypes[key]}</span>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="chart-value">{count} ({pct}%)</span>
                    </div>
                  )
                })}
            </div>
            <div style={{ marginTop: 20 }}>
              {(() => {
                const labels = Object.keys(typeUsage).map((k) => content.embedTypes[k] || k)
                const dataValues = Object.keys(typeUsage).map((k) => typeUsage[k])
                const colorMap = { youtube: '#f59e0b', tiktok: '#111827', instagram: '#ef4444', general: '#2563eb' }
                const background = Object.keys(typeUsage).map((k) => colorMap[k] || '#475569')
                const chartData = {
                  labels,
                  datasets: [{
                    label: content.dashboardChartDatasetLabel || 'Embeds',
                    data: dataValues,
                    backgroundColor: background,
                  }],
                }
                const chartOptions = {
                  responsive: true,
                  plugins: { legend: { display: false }, title: { display: false } },
                }
                return <Bar data={chartData} options={chartOptions} />
              })()}
            </div>
          </>
        )}
      </div>
    )

    const renderCustomersPanel = () => (
      <div className="dash-panel">
        <h2>{content.dashboardPanelCustomersTitle}</h2>
        <p className="dash-muted">{content.dashboardPanelCustomersSubtitle}</p>
        <div className="customer-card">
          <div>
            <span>{content.dashboardName}</span>
            <strong>{currentUser?.name}</strong>
          </div>
          <div>
            <span>{content.dashboardEmail}</span>
            <strong>{currentUser?.email}</strong>
          </div>
          <div>
            <span>{content.dashboardMemberFor}</span>
            <strong>{memberDays} {content.dashboardDaysUnit}</strong>
          </div>
          <div>
            <span>{content.dashboardTopPlatform}</span>
            <strong>{topTypeLabel}</strong>
          </div>
          <div>
            <span>{content.dashboardLastEmbed}</span>
            <strong>{latestEmbedLabel}</strong>
          </div>
          <div>
            <span>{content.dashboardUserId}</span>
            <strong>{shortUserId}</strong>
          </div>
        </div>
      </div>
    )

    return (
      <div className="dashboard-shell marketplace-shell">
        <header className="dash-header">
          <div className="dash-header-brand">
            <span className="brand-mark">{content.brand}</span>
            <h1>{content.dashboardTitle}</h1>
          </div>
          <input className="dash-search" type="text" placeholder={content.dashboardSearch} />
          <div className="top-bar-actions">
            <LanguageSwitcher content={content} language={language} setLanguage={setLanguage} />
            <ThemeSwitcher content={content} darkMode={darkMode} onToggle={toggleDarkMode} />
            <button type="button" className="nav-link-button" onClick={() => navigateTo('/')}>
              {content.dashboardBack}
            </button>
            <button type="button" className="nav-outline-button" onClick={handleLogout}>
              {content.logout}
            </button>
          </div>
        </header>

        <div className="dash-layout">
          <aside className="dash-sidebar">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={dashboardSection === item.key ? 'dash-nav active' : 'dash-nav'}
                onClick={() => navigateTo(item.path)}
              >
                {item.label}
              </button>
            ))}
          </aside>

          <main className="dash-main">
            <section className="dashboard-hero dash-hero-lite">
              <span className="eyebrow-badge">{content.dashboardWelcome} {currentUser?.name}</span>
              <h2>{content.dashboardPanelOverviewTitle}</h2>
              <p>{content.dashboardSubtitle}</p>
            </section>

            {dashboardSection === 'overview' && renderOverviewPanel()}
            {dashboardSection === 'orders' && renderOrdersTable()}
            {dashboardSection === 'analytics' && renderAnalyticsPanel()}
            {dashboardSection === 'customers' && renderCustomersPanel()}
            {dashboardSection === 'settings' && renderSettingsPanel()}
          </main>
        </div>
      </div>
    )
  }

  const activeStudySubject = STUDY_SUBJECTS.find((subject) => subject.id === selectedStudySubject) || STUDY_SUBJECTS[3]
  const filteredStudySubjects = STUDY_SUBJECTS.filter((subject) =>
    `${subject.ar} ${subject.en}`.toLocaleLowerCase().includes(studySearch.toLocaleLowerCase().trim()),
  )

  const updateWorksheetAnswer = (subjectId, value) => {
    const nextAnswers = { ...worksheetAnswers, [subjectId]: value }
    setWorksheetAnswers(nextAnswers)
    localStorage.setItem('omanGrade12Worksheets', JSON.stringify(nextAnswers))
  }

  const getBoardPoint = (event) => {
    const canvas = boardCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startBoardStroke = (event) => {
    const canvas = boardCanvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    const context = canvas.getContext('2d')
    const point = getBoardPoint(event)
    boardDrawingRef.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
    context.strokeStyle = boardColor
    context.lineWidth = boardTool === 'marker' ? boardSize * 3 : boardTool === 'eraser' ? boardSize * 5 : boardSize
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.globalCompositeOperation = boardTool === 'eraser' ? 'destination-out' : 'source-over'
    context.globalAlpha = boardTool === 'marker' ? 0.38 : 1
  }

  const drawBoardStroke = (event) => {
    if (!boardDrawingRef.current || !boardCanvasRef.current) return
    const point = getBoardPoint(event)
    const context = boardCanvasRef.current.getContext('2d')
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const endBoardStroke = () => { boardDrawingRef.current = false }

  const clearBoard = () => {
    const canvas = boardCanvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }

  const saveBoardImage = () => {
    const canvas = boardCanvasRef.current
    if (!canvas) return
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const exportContext = exportCanvas.getContext('2d')
    exportContext.fillStyle = '#fff'
    exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    exportContext.drawImage(canvas, 0, 0)
    const link = document.createElement('a')
    link.download = 'oman-grade-12-whiteboard.png'
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }

  const renderHomePage = () => (
    <div className="study-hub">
      <header className="study-header">
        <a className="study-brand" href="/" onClick={(event) => { event.preventDefault(); setStudyTab('home'); navigateTo('/') }}><span className="study-brand-mark">م</span><span>{language === 'ar' ? 'مسار ١٢' : 'Grade 12 Oman'}<small>{language === 'ar' ? 'مساحة التعلّم' : 'STUDY SPACE'}</small></span></a>
        <nav className="study-nav" aria-label={language === 'ar' ? 'أقسام الموقع' : 'Study tools'}>
          {STUDY_TABS.map((tab) => <button key={tab} type="button" className={studyTab === tab ? 'active' : ''} aria-current={studyTab === tab ? 'page' : undefined} onClick={() => { setStudyTab(tab); navigateTo(STUDY_PAGE_PATHS[tab]) }}>
            {STUDY_TAB_LABELS[tab][language]}
          </button>)}
        </nav>
        <div className="study-controls">
          <LanguageSwitcher content={content} language={language} setLanguage={setLanguage} />
          <ThemeSwitcher content={content} darkMode={darkMode} onToggle={toggleDarkMode} />
        </div>
      </header>

      <main className="study-main" id="study-home">
        <section className="study-welcome" hidden={studyTab !== 'home'}>
          <div><span className="study-overline">{language === 'ar' ? 'سلطنة عُمان · الصف الثاني عشر' : 'SULTANATE OF OMAN · GRADE 12'}</span>
            <h1>{language === 'ar' ? 'خطوتك القادمة، تبدأ من هنا.' : 'Your next step starts here.'}</h1>
            <p>{language === 'ar' ? 'كتبك، مراجعتك، وأدوات الدراسة في مساحة واحدة هادئة.' : 'Your books, revision, and study tools in one calm space.'}</p>
          </div>
          <div className="study-welcome-note"><span>12</span><small>{language === 'ar' ? 'مواد المنهج' : 'SUBJECTS'}</small></div>
        </section>

        <section className="study-home-grid" hidden={studyTab !== 'home'}>
          {[
            { id: 'library', icon: '▤', ar: 'كتب الصف الثاني عشر', en: 'Grade 12 textbooks', noteAr: 'روابط موثقة لمكتبة الوزارة حسب المادة.', noteEn: 'Verified links to Ministry books by subject.' },
            { id: 'physics', icon: '⚛', ar: 'مختبر الفيزياء', en: 'Physics lab', noteAr: 'تسع وحدات، قوانين، مراجعات ومحاكاة.', noteEn: 'Nine units, formulas, revision, and simulations.' },
            { id: 'math', icon: '∑', ar: 'مسارات الرياضيات', en: 'Mathematics tracks', noteAr: 'الرياضيات الأساسية والمتقدمة، وحدة بوحدة.', noteEn: 'Basic and Advanced Mathematics, unit by unit.' },
            { id: 'worksheets', icon: '✎', ar: 'أوراق العمل', en: 'Worksheets', noteAr: 'تدريبات قابلة للطباعة مع حفظ إجاباتك.', noteEn: 'Printable practice with saved answers.' },
            { id: 'exams', icon: '✓', ar: 'الامتحانات النهائية', en: 'Final exams', noteAr: 'نماذج وأسئلة وزارية وإجاباتها.', noteEn: 'Ministry papers, sample exams, and answer keys.' },
            { id: 'board', icon: '▱', ar: 'السبورة البيضاء', en: 'Whiteboard', noteAr: 'اكتب وارسم واحفظ ملاحظاتك كصورة.', noteEn: 'Draw, write, and save your notes as an image.' },
            { id: 'resources', icon: '⌘', ar: 'مصادر وزارة التعليم', en: 'Ministry resources', noteAr: 'المنصات والمكتبات والخدمات الرسمية.', noteEn: 'Official platforms, libraries, and services.' },
          ].map((card) => <button className="study-home-card" key={card.id} type="button" onClick={() => { setStudyTab(card.id); navigateTo(STUDY_PAGE_PATHS[card.id]) }}>
            <span className="home-card-icon" aria-hidden="true">{card.icon}</span><span className="home-card-copy"><strong>{language === 'ar' ? card.ar : card.en}</strong><small>{language === 'ar' ? card.noteAr : card.noteEn}</small></span><span className="home-card-arrow" aria-hidden="true">↗</span>
          </button>)}
        </section>

        <section className="study-panel" hidden={studyTab !== 'library'}>
          <div className="study-section-heading"><div><span>{language === 'ar' ? 'مكتبة المنهج' : 'CURRICULUM LIBRARY'}</span><h2>{language === 'ar' ? 'اختر مادتك' : 'Choose a subject'}</h2></div>
            <a href={MINISTRY_GRADE_12_URL} target="_blank" rel="noreferrer">{language === 'ar' ? 'مكتبة وزارة التعليم ↗' : 'Ministry textbook library ↗'}</a>
          </div>
          <p className="study-help">{language === 'ar' ? 'روابط مباشرة إلى صفحات كتب الصف الثاني عشر الرسمية. تختلف المواد الاختيارية حسب خطة الطالب.' : 'Direct links to official Grade 12 textbook pages. Elective subjects vary by each student’s study plan.'}</p>
          <label className="study-search"><span aria-hidden="true">⌕</span><input value={studySearch} onChange={(event) => setStudySearch(event.target.value)} placeholder={language === 'ar' ? 'ابحث عن مادة...' : 'Search subjects...'} /></label>
          <div className="study-subject-grid">
            {filteredStudySubjects.map((subject) => <article className="study-subject-card" key={subject.id}>
              <span className="subject-icon" aria-hidden="true">{subject.icon}</span><div><h3>{language === 'ar' ? subject.ar : subject.en}</h3><p>{language === 'ar' ? 'الصف الثاني عشر · فصول وكتب' : 'Grade 12 · terms and books'}</p></div>
              <a href={`https://home.moe.gov.om/ar/manaheg/${subject.ministryId}`} target="_blank" rel="noreferrer" aria-label={`${language === 'ar' ? 'فتح كتب' : 'Open books for'} ${language === 'ar' ? subject.ar : subject.en}`}>↗</a>
            </article>)}
          </div>
          <p className="study-source-note">{language === 'ar' ? 'المصدر: مكتبة المناهج الرسمية لوزارة التعليم في سلطنة عُمان.' : 'Source: the official Ministry of Education curriculum library for Oman.'} <a href={MINISTRY_GRADE_12_URL} target="_blank" rel="noreferrer">{language === 'ar' ? 'عرض المكتبة الرسمية' : 'Open official library'}</a> · <a href={MINISTRY_SUBJECT_CHOICES_URL} target="_blank" rel="noreferrer">{language === 'ar' ? 'ضوابط اختيار المواد' : 'Subject selection guidance'}</a></p>
        </section>

        <section className="study-panel" hidden={studyTab !== 'resources'}>
          <div className="study-section-heading"><div><span>{language === 'ar' ? 'الدليل الرسمي' : 'OFFICIAL DIRECTORY'}</span><h2>{language === 'ar' ? 'مصادر وزارة التعليم' : 'Ministry of Education resources'}</h2></div><a href="https://home.moe.gov.om/" target="_blank" rel="noreferrer">{language === 'ar' ? 'موقع الوزارة ↗' : 'Ministry website ↗'}</a></div>
          <p className="study-help">{language === 'ar' ? 'جمّعنا روابط أقسام الخدمات والموارد الظاهرة في موقع الوزارة الرسمي، مع فتح كل خدمة من مصدرها.' : 'A directory of the Ministry’s official service and resource sections. Each link opens its original source.'}</p>
          <div className="ministry-groups">
            {MINISTRY_RESOURCE_GROUPS.map((group) => <section className="ministry-group" key={group.id}>
              <h3>{language === 'ar' ? group.ar : group.en}</h3>
              <div className="ministry-link-grid">{group.items.map((item) => <a key={item.href} href={item.href} target="_blank" rel="noreferrer"><span>{language === 'ar' ? item.ar : item.en}</span><b aria-hidden="true">↗</b></a>)}</div>
            </section>)}
          </div>
        </section>

        <section className="study-panel" hidden={studyTab !== 'links'}>
          <div className="study-section-heading"><div><span>{language === 'ar' ? 'تذييل موقع الوزارة' : 'MINISTRY WEBSITE FOOTER'}</span><h2>{language === 'ar' ? 'روابط تهمك' : 'Useful links'}</h2></div><a href="https://home.moe.gov.om/" target="_blank" rel="noreferrer">{language === 'ar' ? 'فتح موقع الوزارة ↗' : 'Open Ministry website ↗'}</a></div>
          <p className="study-help">{language === 'ar' ? 'روابط الموقع العامة، الصفحات التعريفية، والأقسام الإخبارية والخدمية.' : 'The Ministry’s general information, news, service, and footer links.'}</p>
          <div className="ministry-link-grid useful-link-grid">{MINISTRY_PORTAL_LINKS.map((item) => <a key={item.href + item.en} href={item.href} target="_blank" rel="noreferrer"><span>{language === 'ar' ? item.ar : item.en}</span><b aria-hidden="true">↗</b></a>)}</div>
          <div className="ministry-contact-strip"><div><strong>{language === 'ar' ? 'مركز الاتصال' : 'Contact centre'}</strong><span>{language === 'ar' ? 'وزارة التعليم · سلطنة عُمان' : 'Ministry of Education · Sultanate of Oman'}</span></div><a href="tel:+96824255552">+968 2425 5552</a><a href="https://wa.me/96824255552" target="_blank" rel="noreferrer">WhatsApp ↗</a><a href="https://tajawob.om/p/home" target="_blank" rel="noreferrer">{language === 'ar' ? 'مقترحات وشكاوى عبر تجاوب' : 'Feedback via Tajaawob'} ↗</a></div>
        </section>

        <section className="study-panel" hidden={studyTab !== 'worksheets'}>
          <div className="study-section-heading"><div><span>{language === 'ar' ? 'تدريب ومراجعة' : 'PRACTICE & REVISION'}</span><h2>{language === 'ar' ? 'ورقة عمل سريعة' : 'Quick worksheet'}</h2></div>
            <span className="study-local-badge">{language === 'ar' ? 'حفظ تلقائي على جهازك' : 'Auto-saved on this device'}</span>
          </div>
          <div className="worksheet-subject-list" aria-label={language === 'ar' ? 'اختر المادة' : 'Choose a subject'}>
            {STUDY_SUBJECTS.map((subject) => <button type="button" key={subject.id} className={selectedStudySubject === subject.id ? 'active' : ''} onClick={() => setSelectedStudySubject(subject.id)}>{language === 'ar' ? subject.ar : subject.en}</button>)}
          </div>
          <article className="worksheet-sheet" id="worksheet-print-area">
            <div className="worksheet-title"><div><span>{language === 'ar' ? 'ورقة تدريبية · الصف الثاني عشر' : 'PRACTICE SHEET · GRADE 12'}</span><h3>{language === 'ar' ? activeStudySubject.ar : activeStudySubject.en}</h3></div><span className="worksheet-date">{new Date().toLocaleDateString(language === 'ar' ? 'ar-OM' : 'en-OM')}</span></div>
            <p className="study-help">{language === 'ar' ? 'أسئلة بداية للمراجعة. راجع كتابك وخطة مادتك للتأكد من مطابقة موضوعات المنهج.' : 'Starter questions for revision. Check your textbook and course plan to match your current syllabus.'}</p>
            <ol className="worksheet-tasks">{(language === 'ar' ? activeStudySubject.tasks : activeStudySubject.tasksEn).map((task) => <li key={task}>{task}</li>)}</ol>
            <label className="worksheet-answer"><span>{language === 'ar' ? 'ملاحظاتك وإجاباتك' : 'Your notes and answers'}</span><textarea value={worksheetAnswers[selectedStudySubject] || ''} onChange={(event) => updateWorksheetAnswer(selectedStudySubject, event.target.value)} placeholder={language === 'ar' ? 'اكتب إجابتك هنا...' : 'Write your answer here...'} /></label>
            <button type="button" className="study-print-button" onClick={() => window.print()}>{language === 'ar' ? 'طباعة ورقة العمل' : 'Print worksheet'} <span>↗</span></button>
          </article>
        </section>

        <section className="study-panel" hidden={studyTab !== 'board'}>
          <div className="study-section-heading"><div><span>{language === 'ar' ? 'مساحة كتابة' : 'WORKSPACE'}</span><h2>{language === 'ar' ? 'السبورة البيضاء' : 'Whiteboard'}</h2></div>
            <div className="board-actions"><button type="button" onClick={clearBoard}>{language === 'ar' ? 'مسح السبورة' : 'Clear board'}</button><button type="button" className="primary" onClick={saveBoardImage}>{language === 'ar' ? 'حفظ صورة' : 'Save image'} ↓</button></div>
          </div>
          <div className="board-toolbar">
            <div className="board-tool-group"><button type="button" className={boardTool === 'pen' ? 'active' : ''} onClick={() => setBoardTool('pen')}>✎ <span>{language === 'ar' ? 'قلم' : 'Pen'}</span></button><button type="button" className={boardTool === 'marker' ? 'active' : ''} onClick={() => setBoardTool('marker')}>▰ <span>{language === 'ar' ? 'قلم عريض' : 'Marker'}</span></button><button type="button" className={boardTool === 'eraser' ? 'active' : ''} onClick={() => setBoardTool('eraser')}>⌫ <span>{language === 'ar' ? 'ممحاة' : 'Eraser'}</span></button></div>
            <div className="board-colors" aria-label={language === 'ar' ? 'لون القلم' : 'Pen color'}>{['#203b32', '#2563eb', '#d34d42', '#9a6a12', '#7c4d9e'].map((color) => <button key={color} type="button" className={boardColor === color ? 'active' : ''} style={{ '--swatch': color }} onClick={() => setBoardColor(color)} aria-label={color} />)}</div>
            <label className="board-size"><span>{language === 'ar' ? 'حجم القلم' : 'Size'}</span><input type="range" min="2" max="12" value={boardSize} onChange={(event) => setBoardSize(Number(event.target.value))} /></label>
          </div>
          <canvas ref={boardCanvasRef} className="study-canvas" width="1400" height="720" onPointerDown={startBoardStroke} onPointerMove={drawBoardStroke} onPointerUp={endBoardStroke} onPointerCancel={endBoardStroke} aria-label={language === 'ar' ? 'ارسم على السبورة باستخدام المؤشر أو اللمس' : 'Draw on the whiteboard with mouse or touch'} />
          <p className="study-help board-hint">{language === 'ar' ? 'استخدم القلم أو القلم العريض أو الممحاة. تعمل السبورة باللمس والماوس.' : 'Use the pen, marker, or eraser. The board supports touch and mouse.'}</p>
        </section>

        <StudyPages page={studyTab} path={currentPath} language={language} navigateTo={(path) => { setStudyTab(getStudyTabForPath(path)); navigateTo(path) }} />
      </main>
      <footer className="study-footer"><span>© {new Date().getFullYear()} {language === 'ar' ? 'مساحة الصف الثاني عشر' : 'Grade 12 Study Space'}</span><nav aria-label={language === 'ar' ? 'روابط الموقع' : 'Site pages'}>{STUDY_TABS.map((tab) => <button key={tab} type="button" onClick={() => { setStudyTab(tab); navigateTo(STUDY_PAGE_PATHS[tab]) }}>{STUDY_TAB_LABELS[tab][language]}</button>)}</nav><a href="https://t.me/Nozvxa" target="_blank" rel="noreferrer">@Nozvxa ↗</a></footer>
    </div>
  )

  if (MAINTENANCE_MODE) {
    return (
        <div className="page-shell maintenance-active" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <section className="maintenance-notice maintenance-only">
            <div className="maintenance-notice__content">
              <h2>{MAINTENANCE_TITLE}</h2>
              <p>{MAINTENANCE_MESSAGE}</p>
            </div>
          </section>
        </div>
    )
  }

  return (
      <div className={`page-shell${darkMode ? ' dark-mode' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {currentPath.startsWith('/dashboard')
          ? renderDashboardPage()
          : currentPath === '/' || currentPath === '/pricing' || isStudyPath(currentPath)
            ? renderHomePage()
            : renderAuthPage()}
      </div>
  )
}

export default App
