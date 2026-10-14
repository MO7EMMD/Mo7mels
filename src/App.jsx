import { useEffect, useRef, useState } from 'react'
import './App.css'
import { PayPalScriptProvider, PayPalButtons, FUNDING } from '@paypal/react-paypal-js'
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

// Replace these with your actual PayPal Plan IDs from the PayPal Developer Dashboard
const PAYPAL_CLIENT_ID = 'AQduOnVI3FTIp2aBlgqMnCiLhY8dO3nWxGYudLWlN57vzCbydKTs88S7UpI6M2GXzMYbFj8xJYjgYw-x'
const PAYPAL_PLAN_IDS = {
  basic: 'YOUR_BASIC_PLAN_ID',
  pro: 'YOUR_PRO_PLAN_ID',
  business: 'YOUR_BUSINESS_PLAN_ID',
}

const API_BASE = '/api'
const LINKEDIN_URL = import.meta.env.VITE_LINKEDIN_URL || 'https://www.linkedin.com/company/mo7mels'
const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true'
const MAINTENANCE_TITLE = import.meta.env.VITE_MAINTENANCE_TITLE || 'نعتذر لإزعاجك'
const MAINTENANCE_MESSAGE =
  import.meta.env.VITE_MAINTENANCE_MESSAGE ||
  'الموقع الآن يخضع لعملية تحديث سريعة لتحسين التجربة. نشكرك على صبرك، وسيعود للعمل خلال دقائق.'

/**
 * Extracts a YouTube video ID from watch, youtu.be short-link, Shorts, and embed URL formats.
 * Returns an empty string when no valid ID is found so callers can treat it as a falsy error.
 */
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

/** Extracts the numeric video ID from a TikTok /video/<id> URL. Returns '' on failure. */
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

/**
 * Returns { permalink, shortcode } for public Instagram posts, reels, and TV links.
 * Returns null for stories, profile URLs, or anything that can't be embedded.
 */
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

function getTopEmbedType(typeUsage) {
  return Object.entries(typeUsage).sort((left, right) => right[1] - left[1])[0]?.[0] || ''
}

/**
 * Reads the current browser path on mount and falls back to '/' for any unknown route,
 * preventing the SPA shell from rendering against an unrecognised pathname on hard reload.
 */
function getInitialPath() {
  if (typeof window === 'undefined') {
    return '/'
  }

  return ['/', '/login', '/signup', '/dashboard', '/dashboard/orders', '/dashboard/analytics', '/dashboard/customers', '/dashboard/settings'].includes(window.location.pathname)
    ? window.location.pathname
    : '/'
}

/**
 * Thin fetch wrapper that attaches a Bearer token when provided and parses JSON.
 * Throws an Error with the server's message text on any non-2xx response so callers
 * can catch a single error type regardless of HTTP status code.
 */
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
    pageSubtitle: 'Create embeds for YouTube, Shorts, TikTok, Instagram, and general links.',
    inputPlaceholder: 'Enter YouTube, YouTube Shorts, TikTok, Instagram, or any URL',
    generate: 'Generate Embed',
    embedCode: 'Embed Code',
    subscriptions: 'Subscriptions',
    choosePlan: 'Subscribe',
    currentPlan: 'Current Plan',
    cancelPlan: 'Cancel Subscription',
    planKeys: ['basic', 'pro', 'business'],
    period: '/month',
    plans: ['Basic', 'Pro', 'Business'],
    features: {
      basic: ['1,000 embed links', 'YouTube, TikTok, Instagram', 'Copy & export HTML'],
      pro: ['200,000 embed links', 'All platforms + bulk import', 'Dark mode & analytics', 'Priority support'],
      business: ['200,000 embed links', 'Team access', 'White-label branding', 'API access', 'Dedicated support'],
    },
    loginTitle: 'Welcome Back',
    signupTitle: 'Create New Account',
    loginSubtitle: 'Sign in to manage your embed library and account settings.',
    signupSubtitle: 'Create an account to save your generated embeds and plans.',
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
    dashboardStats: ['Saved embeds', 'Account status', 'Current plan'],
    dashboardStatus: 'Active',
    dashboardPlan: 'Starter',
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
    subscription: {
      loginRequired: 'Please log in to subscribe.',
      success: 'Subscription activated successfully.',
      cancelled: 'Subscription cancelled.',
      error: 'Failed to activate subscription. Please try again.',
      cancelError: 'Failed to cancel subscription. Please try again.',
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
    pageSubtitle: 'أنشئ أكواد تضمين ليوتيوب وشورتس وتيك توك وإنستقرام والروابط العامة.',
    inputPlaceholder: 'أدخل رابط يوتيوب أو شورتس أو تيك توك أو إنستقرام أو أي رابط',
    generate: 'إنشاء الإيمبد',
    embedCode: 'كود الإيمبد',
    subscriptions: 'الاشتراكات',
    choosePlan: 'اشترك الآن',
    currentPlan: 'الخطة الحالية',
    cancelPlan: 'إلغاء الاشتراك',
    planKeys: ['basic', 'pro', 'business'],
    period: '/شهريًا',
    plans: ['الأساسية', 'الاحترافية', 'الأعمال'],
    features: {
      basic: ['١٬٠٠٠ رابط تضمين', 'يوتيوب وتيك توك وإنستقرام', 'نسخ وتصدير HTML'],
      pro: ['٢٠٠٬٠٠٠ رابط تضمين', 'جميع المنصات + استيراد جماعي', 'وضع ليلي وتحليلات متقدمة', 'دعم أولوية'],
      business: ['٢٠٠٬٠٠٠ رابط تضمين', 'وصول للفريق', 'هوية بصرية مخصصة', 'واجهة API', 'دعم مخصص'],
    },
    loginTitle: 'مرحبًا بعودتك',
    signupTitle: 'إنشاء حساب جديد',
    loginSubtitle: 'سجل الدخول لإدارة مكتبة الإيمبد وإعدادات الحساب.',
    signupSubtitle: 'أنشئ حسابًا لحفظ الأكواد المولدة وخطط الاشتراك.',
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
    dashboardStats: ['الأكواد المحفوظة', 'حالة الحساب', 'الخطة الحالية'],
    dashboardStatus: 'نشط',
    dashboardPlan: 'الابتدائية',
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
    subscription: {
      loginRequired: 'يرجى تسجيل الدخول أولاً للاشتراك.',
      success: 'تم تفعيل الاشتراك بنجاح.',
      cancelled: 'تم إلغاء الاشتراك.',
      error: 'فشل تفعيل الاشتراك. يرجى المحاولة مجددًا.',
      cancelError: 'فشل إلغاء الاشتراك. يرجى المحاولة مجددًا.',
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
  const [userSubscription, setUserSubscription] = useState(null)
  const [subscriptionMessage, setSubscriptionMessage] = useState('')
  const [subscriptionMessageType, setSubscriptionMessageType] = useState('')
  const previewRef = useRef(null)

  const content = translations[language]
  const localizedPlans = [
    {
      name: content.plans[0],
      price: '$0.25',
      period: content.period,
      features: content.features.basic,
    },
    {
      name: content.plans[1],
      price: '$0.75',
      period: content.period,
      features: content.features.pro,
    },
    {
      name: content.plans[2],
      price: '$1.00',
      period: content.period,
      features: content.features.business,
    },
  ]
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
      setUserSubscription(null)
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

    const fetchSubscription = async () => {
      try {
        const response = await apiRequest('/subscription', {}, sessionToken)
        setUserSubscription(response.subscription || null)
      } catch {
        setUserSubscription(null)
      }
    }

    fetchSavedEmbeds()
    fetchSubscription()
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
    setUserSubscription(null)
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

  const handleSubscribe = async (planKey, subscriptionId) => {
    if (!currentUser) {
      setSubscriptionMessageType('error')
      setSubscriptionMessage(content.subscription.loginRequired)
      navigateTo('/login')
      return
    }

    try {
      const response = await apiRequest('/subscription', {
        method: 'POST',
        body: JSON.stringify({ planKey, subscriptionId }),
      }, sessionToken)
      setUserSubscription(response.subscription)
      setSubscriptionMessageType('success')
      setSubscriptionMessage(content.subscription.success)
    } catch {
      setSubscriptionMessageType('error')
      setSubscriptionMessage(content.subscription.error)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      await apiRequest('/subscription', { method: 'DELETE' }, sessionToken)
      setUserSubscription(null)
      setSubscriptionMessageType('success')
      setSubscriptionMessage(content.subscription.cancelled)
    } catch {
      setSubscriptionMessageType('error')
      setSubscriptionMessage(content.subscription.cancelError)
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

  // Silently skips when the user is not logged in; only shows an error if the save call itself fails.
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
      nextCode = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`
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
      nextCode = `<blockquote class="tiktok-embed" cite="${normalizedUrl}" data-video-id="${videoId}" style="max-width: 605px; min-width: 325px;"><section></section></blockquote>`
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
      nextCode = `<blockquote class="instagram-media" data-instgrm-permalink="${instagramData.permalink}?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style="background:#FFF; border:0; margin: 1px; max-width:540px; min-width:326px; padding:0; width:100%;"></blockquote>`
    } else {
      nextCode = `<iframe src="${normalizedUrl}" width="600" height="400"></iframe>`
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
    <div className="App">
      <div className="top-bar">
        <div className="brand-mark">{content.brand}</div>
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

      <h1>{content.pageTitle}</h1>
      <p className="page-subtitle">{content.pageSubtitle}</p>
      <input
        type="text"
        placeholder={content.inputPlaceholder}
        value={url}
        onChange={(event) => {
          setUrl(event.target.value)
          if (validationMessage) {
            setValidationMessage('')
            setValidationType('')
          }
        }}
      />
      <button onClick={generateEmbed}>{content.generate}</button>
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

      <div className="subscriptions-section">
        <h2>{content.subscriptions}</h2>
        {subscriptionMessage && (
          <p className={`auth-feedback ${subscriptionMessageType}`}>{subscriptionMessage}</p>
        )}
        <div className="subscriptions-grid">
          {localizedPlans.map((plan, index) => {
            const planKey = content.planKeys[index]
            const isActive = userSubscription?.planKey === planKey && userSubscription?.status === 'active'
            return (
              <div className={`subscription-card${isActive ? ' subscription-card--active' : ''}`} key={plan.name}>
                {isActive && <span className="subscription-badge">{content.currentPlan}</span>}
                <h3>{plan.name}</h3>
                <p className="subscription-price">
                  {plan.price}
                  <span>{plan.period}</span>
                </p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {isActive ? (
                  <button
                    type="button"
                    className="subscription-cancel-button"
                    onClick={handleCancelSubscription}
                  >
                    {content.cancelPlan}
                  </button>
                ) : (
                  <div className="subscription-payment-buttons">
                    <PayPalButtons
                      fundingSource={FUNDING.PAYPAL}
                      style={{ layout: 'vertical', label: 'subscribe', height: 40 }}
                      createSubscription={(_data, actions) =>
                        actions.subscription.create({ plan_id: PAYPAL_PLAN_IDS[planKey] })
                      }
                      onApprove={(data) => handleSubscribe(planKey, data.subscriptionID)}
                      onError={() => {
                        setSubscriptionMessageType('error')
                        setSubscriptionMessage(content.subscription.error)
                      }}
                      onClick={(_data, actions) => {
                        if (!currentUser) {
                          setSubscriptionMessageType('error')
                          setSubscriptionMessage(content.subscription.loginRequired)
                          navigateTo('/login')
                          return actions.reject()
                        }
                        return actions.resolve()
                      }}
                    />
                    <PayPalButtons
                      fundingSource={FUNDING.CARD}
                      style={{ layout: 'vertical', height: 40 }}
                      createSubscription={(_data, actions) =>
                        actions.subscription.create({ plan_id: PAYPAL_PLAN_IDS[planKey] })
                      }
                      onApprove={(data) => handleSubscribe(planKey, data.subscriptionID)}
                      onError={() => {
                        setSubscriptionMessageType('error')
                        setSubscriptionMessage(content.subscription.error)
                      }}
                      onClick={(_data, actions) => {
                        if (!currentUser) {
                          setSubscriptionMessageType('error')
                          setSubscriptionMessage(content.subscription.loginRequired)
                          navigateTo('/login')
                          return actions.reject()
                        }
                        return actions.resolve()
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (MAINTENANCE_MODE) {
    return (
      <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, vault: true, intent: 'subscription', components: 'buttons', 'enable-funding': 'card' }}>
        <div className="page-shell maintenance-active" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <section className="maintenance-notice maintenance-only">
            <div className="maintenance-notice__content">
              <h2>{MAINTENANCE_TITLE}</h2>
              <p>{MAINTENANCE_MESSAGE}</p>
            </div>
          </section>
        </div>
      </PayPalScriptProvider>
    )
  }

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, vault: true, intent: 'subscription', components: 'buttons', 'enable-funding': 'card' }}>
      <div className={`page-shell${darkMode ? ' dark-mode' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {currentPath.startsWith('/dashboard')
          ? renderDashboardPage()
          : currentPath === '/'
            ? renderHomePage()
            : renderAuthPage()}
      </div>
    </PayPalScriptProvider>
  )
}

export default App