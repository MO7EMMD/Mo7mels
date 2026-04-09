import { useEffect, useRef, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

const API_BASE = '/api'

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

function getInitialPath() {
  if (typeof window === 'undefined') {
    return '/'
  }

  return ['/', '/login', '/signup', '/dashboard'].includes(window.location.pathname)
    ? window.location.pathname
    : '/'
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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
    pageTitle: 'Mo7mels',
    pageSubtitle: 'Create embeds for YouTube, Shorts, TikTok, Instagram, and general links.',
    inputPlaceholder: 'Enter YouTube, YouTube Shorts, TikTok, Instagram, or any URL',
    generate: 'Generate Embed',
    embedCode: 'Embed Code',
    subscriptions: 'Subscriptions',
    choosePlan: 'Choose Plan',
    period: '/month',
    plans: ['Basic', 'Pro', 'Business'],
    features: {
      basic: ['10 embed links', 'YouTube support', 'Basic validation'],
      pro: ['Unlimited embeds', 'YouTube, TikTok, Instagram', 'Priority support'],
      business: ['Team access', 'Advanced management', 'Custom branding'],
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
    dashboardBack: 'Back To Generator',
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
    choosePlan: 'اختر الخطة',
    period: '/شهريًا',
    plans: ['الأساسية', 'الاحترافية', 'الأعمال'],
    features: {
      basic: ['10 روابط تضمين', 'دعم يوتيوب', 'تحقق أساسي'],
      pro: ['تضمين غير محدود', 'يوتيوب وتيك توك وإنستقرام', 'دعم أولوية'],
      business: ['وصول للفريق', 'إدارة متقدمة', 'هوية مخصصة'],
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
    dashboardAccount: 'بيانات الحساب',
    dashboardRecent: 'آخر أكواد التضمين المحفوظة',
    dashboardEmpty: 'لا توجد أكواد محفوظة بعد. أنشئ إيمبد من الصفحة الرئيسية وأنت مسجل الدخول.',
    dashboardName: 'الاسم',
    dashboardEmail: 'البريد الإلكتروني',
    dashboardJoined: 'تاريخ الانضمام',
    dashboardBack: 'العودة إلى المولد',
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
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          createdAt: session.user.created_at,
        })
      } else {
        setCurrentUser(null)
      }
    }

    syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          createdAt: session.user.created_at,
        })
      } else {
        setCurrentUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
    if (currentPath === '/dashboard' && !currentUser) {
      setAuthMessageType('error')
      setAuthMessage(content.authMessages.loginRequired)
      window.history.replaceState({}, '', '/login')
      setCurrentPath('/login')
    }
  }, [content.authMessages.loginRequired, currentPath, currentUser])

  useEffect(() => {
    if (!currentUser) {
      setSavedEmbeds([])
      return
    }

    const fetchSavedEmbeds = async () => {
      try {
        const response = await apiRequest(`/embeds?email=${encodeURIComponent(currentUser.email)}`)
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
    await supabase.auth.signOut()
    setCurrentUser(null)
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
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            data: {
              full_name: trimmedName,
            },
          },
        })

        if (error) {
          throw error
        }

        if (data.user) {
          setCurrentUser({
            id: data.user.id,
            name: data.user.user_metadata?.full_name || data.user.email,
            email: data.user.email,
            createdAt: data.user.created_at,
          })
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        })

        if (error) {
          throw error
        }

        if (data.user) {
          setCurrentUser({
            id: data.user.id,
            name: data.user.user_metadata?.full_name || data.user.email,
            email: data.user.email,
            createdAt: data.user.created_at,
          })
        }
      }

      setAuthForm({ name: '', email: '', password: '', confirmPassword: '' })
      setAuthMessageType('success')
      setAuthMessage(isSignupPage ? content.authMessages.signupSuccess : content.authMessages.loginSuccess)
      navigateTo('/dashboard')
    } catch (error) {
      setAuthMessageType('error')
      setAuthMessage(error.message || content.errors.serverUnavailable)
    }
  }

  const saveEmbedToAccount = async (type, sourceUrl, code) => {
    if (!currentUser) {
      return
    }

    try {
      const response = await apiRequest('/embeds', {
        method: 'POST',
        body: JSON.stringify({
          email: currentUser.email,
          type,
          sourceUrl,
          embedCode: code,
        }),
      })

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

  const renderDashboardPage = () => (
    <div className="dashboard-shell">
      <header className="auth-page-topbar">
        <button type="button" className="nav-link-button" onClick={() => navigateTo('/')}>
          {content.dashboardBack}
        </button>
        <div className="top-bar-actions">
          <LanguageSwitcher content={content} language={language} setLanguage={setLanguage} />
          <button type="button" className="nav-outline-button" onClick={handleLogout}>
            {content.logout}
          </button>
        </div>
      </header>

      <section className="dashboard-hero">
        <span className="eyebrow-badge">{content.brand}</span>
        <h1>{content.dashboardTitle}</h1>
        <p>{content.dashboardSubtitle}</p>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h2>
            {content.dashboardWelcome} {currentUser?.name}
          </h2>
          <div className="dashboard-stats">
            <div className="dashboard-stat-card">
              <span>{content.dashboardStats[0]}</span>
              <strong>{savedEmbeds.length}</strong>
            </div>
            <div className="dashboard-stat-card">
              <span>{content.dashboardStats[1]}</span>
              <strong>{content.dashboardStatus}</strong>
            </div>
            <div className="dashboard-stat-card">
              <span>{content.dashboardStats[2]}</span>
              <strong>{content.dashboardPlan}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-card">
          <h2>{content.dashboardAccount}</h2>
          <div className="account-meta">
            <div>
              <span>{content.dashboardName}</span>
              <strong>{currentUser?.name}</strong>
            </div>
            <div>
              <span>{content.dashboardEmail}</span>
              <strong>{currentUser?.email}</strong>
            </div>
            <div>
              <span>{content.dashboardJoined}</span>
              <strong>{new Date(currentUser?.createdAt || Date.now()).toLocaleDateString()}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-card dashboard-activity">
        <h2>{content.dashboardRecent}</h2>
        {savedEmbeds.length === 0 ? (
          <p className="dashboard-empty">{content.dashboardEmpty}</p>
        ) : (
          <div className="activity-list">
            {savedEmbeds.map((item) => (
              <div className="activity-item" key={item.id}>
                <div>
                  <strong>{content.embedTypes[item.type]}</strong>
                  <p>{item.sourceUrl}</p>
                </div>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )

  const renderHomePage = () => (
    <div className="App">
      <div className="top-bar">
        <div className="brand-mark">{content.brand}</div>
        <div className="top-bar-actions">
          <LanguageSwitcher content={content} language={language} setLanguage={setLanguage} />
          {currentUser ? (
            <>
              <button type="button" className="nav-outline-button" onClick={() => navigateTo('/dashboard')}>
                {content.dashboard}
              </button>
              <button type="button" className="nav-primary-button" onClick={handleLogout}>
                {content.logout}
              </button>
            </>
          ) : (
            <>
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
          <div ref={previewRef} dangerouslySetInnerHTML={{ __html: embedCode }} />
        </div>
      )}

      <div className="subscriptions-section">
        <h2>{content.subscriptions}</h2>
        <div className="subscriptions-grid">
          {localizedPlans.map((plan) => (
            <div className="subscription-card" key={plan.name}>
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
              <button type="button">{content.choosePlan}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-shell" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {currentPath === '/dashboard'
        ? renderDashboardPage()
        : currentPath === '/'
          ? renderHomePage()
          : renderAuthPage()}
    </div>
  )
}

export default App