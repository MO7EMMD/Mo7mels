import { useEffect, useRef, useState } from 'react'
import './App.css'
import './modern.css'
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

  return ['/', '/pricing', '/login', '/signup', '/dashboard', '/dashboard/orders', '/dashboard/analytics', '/dashboard/customers', '/dashboard/settings'].includes(window.location.pathname)
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
    language: 'Language',
    arabic: 'Arabic',
    english: 'English',
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
    footerTitle: 'Usage rules & terms',
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
    language: 'اللغة',
    arabic: 'العربية',
    english: 'الإنجليزية',
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
    footerTitle: 'قواعد الاستخدام والشروط',
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
    <div className="language-switcher">
      <span className="language-label">{content.language}</span>
      <button
        type="button"
        className={language === 'ar' ? 'toggle-chip active' : 'toggle-chip'}
        onClick={() => setLanguage('ar')}
      >
        {content.arabic}
      </button>
      <button
        type="button"
        className={language === 'en' ? 'toggle-chip active' : 'toggle-chip'}
        onClick={() => setLanguage('en')}
      >
        {content.english}
      </button>
    </div>
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
  const [orderSearch, setOrderSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const previewRef = useRef(null)

  const content = translations[language]
  const isSignupPage = currentPath === '/signup'

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getInitialPath())
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (currentPath === '/pricing') {
      window.requestAnimationFrame(() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [currentPath])

  useEffect(() => {
    const syncSession = async () => {
      if (!sessionToken) {
        setCurrentUser(null)
        setIsAuthLoading(false)
        return
      }

      try {
        const response = await apiRequest('/auth/me', {}, sessionToken)
        setCurrentUser(response.user)
      } catch {
        setCurrentUser(null)
        setSessionToken('')
        window.localStorage.removeItem('sessionToken')
      } finally {
        setIsAuthLoading(false)
      }
    }

    syncSession()
  }, [sessionToken])

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
  }

  const clearAuthMessage = () => {
    if (authMessage) {
      setAuthMessage('')
      setAuthMessageType('')
    }
  }

  const handleLogout = async () => {
    setCurrentUser(null)
    setSessionToken('')
    window.localStorage.removeItem('sessionToken')
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
            <button type="button" className="darkmode-toggle" onClick={toggleDarkMode} title="Toggle dark mode">
              {darkMode ? '☀️' : '🌙'}
            </button>
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

  const renderHomePage = () => (
    <div className="App home-app">
      <div className="top-bar">
        <a className="brand-lockup" href="/" onClick={(event) => { event.preventDefault(); navigateTo('/') }} aria-label={content.brand}>
          <span className="brand-mark">mo7mels</span>
          <span className="brand-name"><small>EMBED WORKSPACE</small></span>
        </a>
        <nav className="site-nav" aria-label={content.navHome}>
          <a href="#home">{content.navHome}</a>
          <a href="#features">{content.navFeatures}</a>
          <a href="#plans">{content.navPricing}</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">{content.navContact}</a>
        </nav>
        <div className="top-bar-actions">
          <LanguageSwitcher content={content} language={language} setLanguage={setLanguage} />
          <button type="button" className="darkmode-toggle" onClick={toggleDarkMode} title="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          {currentUser ? (
            <>
              <a className="nav-link-button linkedin-link" href={LINKEDIN_URL} target="_blank" rel="noreferrer">
                {content.linkedin}
              </a>
              <button type="button" className="nav-outline-button" onClick={() => navigateTo('/dashboard')}>
                {content.dashboard}
              </button>
              <button type="button" className="nav-primary-button" onClick={handleLogout}>
                {content.logout}
              </button>
            </>
          ) : (
            <>
              <a className="nav-link-button linkedin-link" href={LINKEDIN_URL} target="_blank" rel="noreferrer">
                {content.linkedin}
              </a>
              <button type="button" className="nav-outline-button" onClick={() => navigateTo('/login')}>
                {content.login}
              </button>
              <button type="button" className="nav-primary-button" onClick={() => navigateTo('/signup')}>
                {content.signUp}
              </button>
            </>
          )}
        </div>
      </div>

      <main className="home-main">
        <section className="home-hero" id="home">
          <div className="home-hero-copy">
            <span className="home-kicker"><i /> {content.homeKicker}</span>
            <h1>{content.pageTitle}<span className="hero-period">.</span></h1>
            <h2 className="home-headline">{content.homeHeadline}</h2>
            <p className="page-subtitle">{content.pageSubtitle}</p>
            <div className="hero-actions">
              <a className="get-started-button" href="#embed-tool">{content.getStarted}<span>↗</span></a>
              <a className="learn-more-link" href="#features">{content.navFeatures} ↓</a>
            </div>
            <div className="platform-list" aria-label="Supported platforms">
              <span>YouTube</span><span>Shorts</span><span>TikTok</span><span>Instagram</span><span>{content.anyLink}</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-ring ring-a" /><div className="art-ring ring-b" />
            <div className="art-orb"><span>mo7mels</span></div>
            <span className="art-particle particle-a" /><span className="art-particle particle-b" /><span className="art-particle particle-c" />
            <div className="art-chip chip-a">&lt;/&gt; <b>HTML</b></div>
            <div className="art-chip chip-b">↗ <b>SHARE</b></div>
          </div>
        </section>

        <section className="feature-section" id="features">
          <div className="section-heading">
            <span className="generator-step">02 <i>/</i> MO7MELS TOOLKIT</span>
            <h2>{content.featureTitle}</h2>
            <p>{content.featureCopy}</p>
          </div>
          <div className="feature-grid">
            {content.featureCards.map(([label, description]) => (
              <article className="feature-card" key={label}>
                <span>{label}</span>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="generator-panel" id="embed-tool" aria-label={content.generate}>
          <div className="generator-heading">
              <div><span className="generator-step">01 <i>/</i> {content.embedGeneratorLabel}</span><h2>{content.generate}</h2></div>
            <span className="generator-status"><i /> {content.ready}</span>
          </div>
          <div className="generator-input-row">
            <label className="sr-only" htmlFor="embed-url">{content.inputPlaceholder}</label>
            <input
              id="embed-url"
              className="embed-url-input"
              type="url"
              placeholder={content.inputPlaceholder}
              value={url}
              onChange={(event) => {
                setUrl(event.target.value)
                if (validationMessage) {
                  setValidationMessage('')
                  setValidationType('')
                }
              }}
              onKeyDown={(event) => { if (event.key === 'Enter') generateEmbed() }}
            />
            <button type="button" className="generate-button" onClick={generateEmbed}>{content.generate}<span>↗</span></button>
          </div>
          <div className="embed-options">
            <span className="embed-options-title">{content.embedOptions}</span>
            <label className="embed-toggle">
              <input type="checkbox" checked={responsiveEmbed} onChange={(event) => setResponsiveEmbed(event.target.checked)} />
              <span>{content.responsiveEmbed}</span>
            </label>
            {!responsiveEmbed && <>
              <label className="embed-dimension">{content.embedWidth}<input type="number" min="240" max="1920" value={embedWidth} onChange={(event) => setEmbedWidth(Math.min(1920, Math.max(240, Number(event.target.value) || 240)))} /></label>
              <label className="embed-dimension">{content.embedHeight}<input type="number" min="160" max="1080" value={embedHeight} onChange={(event) => setEmbedHeight(Math.min(1080, Math.max(160, Number(event.target.value) || 160)))} /></label>
            </>}
          </div>
          <p className="generator-footnote"><span>↳</span> {content.generatorHint} {responsiveEmbed ? content.responsiveHint : ''}</p>
        </section>
      {validationMessage && (
        <p className={`validation-message ${validationType}`}>{validationMessage}</p>
      )}
      {embedCode && (
        <div className="embed-result-block">
          <h2>{content.embedCode}</h2>
          <textarea value={embedCode} readOnly rows={5} cols={50} />
          <div className="embed-actions">
            <button
              type="button"
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(embedCode).catch(() => {})
                setCopied(true)
                setTimeout(() => setCopied(false), 1800)
              }}
            >
              {copied ? (language === 'ar' ? '✓ تم النسخ' : '✓ Copied!') : (language === 'ar' ? 'نسخ الكود' : 'Copy Code')}
            </button>
            {currentUser && (
              <button type="button" className="export-btn" onClick={handleExportHtml}>
                {language === 'ar' ? 'تصدير HTML' : 'Export HTML'}
              </button>
            )}
          </div>
          <div ref={previewRef} dangerouslySetInnerHTML={{ __html: embedCode }} />
        </div>
      )}

      <section className="plan-section" id="plans">
        <div className="reference-section-heading">
          <span>{content.plansKicker}</span>
          <h2>{content.plansTitle}</h2>
          <p>{content.plansIntro}</p>
        </div>
        <div className="plan-grid">
          {content.planNames.map((name, index) => (
            <article className={`plan-card${index === 1 ? ' plan-card-featured' : ''}`} key={name}>
              {index === 1 && <span className="plan-badge">{language === 'ar' ? 'الأكثر استخدامًا' : 'POPULAR'}</span>}
              <h3>{name}</h3>
              <p className="plan-description">{content.planDescriptions[index]}</p>
              <p className="plan-status">{content.planStatus}</p>
              <ul>{content.planFeatures[index].map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <a className="plan-action" href="#embed-tool">{content.getStarted}<span>↗</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className="why-section">
        <div className="reference-section-heading">
          <h2>{content.whyTitle}</h2>
        </div>
        <div className="why-grid">
          {content.whyCards.map(([title, description]) => (
            <article className="why-card" key={title}><h3>{title}</h3><p>{description}</p></article>
          ))}
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="reference-section-heading"><h2>{content.faqTitle}</h2></div>
        <div className="faq-list">
          {content.faqItems.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>{question}<span aria-hidden="true">+</span></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      </main>
      <footer className="site-footer">
        <div className="footer-topline">
          <a className="footer-brand" href="#home">mo7mels<span>_</span></a>
          <nav aria-label={content.navContact}>
            <a href="#home">{content.navHome}</a>
            <a href="#features">{content.navFeatures}</a>
            <a href="#plans">{content.navPricing}</a>
            <a href="#faq">FAQ</a>
            <a href="#rules">{content.navRules}</a>
            <a href="https://t.me/Nozvxa" target="_blank" rel="noreferrer">Telegram ↗</a>
          </nav>
        </div>
        <section className="terms-section" id="rules">
          <h2>{content.footerTitle}</h2>
          <ul>{content.footerRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
          <p>{content.footerNote}</p>
        </section>
        <div className="footer-bottom" id="contact">
          <span>{content.copyright}</span>
          <a className="telegram-contact" href="https://t.me/Nozvxa" target="_blank" rel="noreferrer">
            <span>{content.developerContact}</span><strong>@Nozvxa ↗</strong>
          </a>
          <a href="#home" className="back-to-top">↑ {content.navHome}</a>
        </div>
      </footer>
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
          : currentPath === '/' || currentPath === '/pricing'
            ? renderHomePage()
            : renderAuthPage()}
      </div>
  )
}

export default App
