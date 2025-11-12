import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import English translations
import commonEn from './locales/en/common.json';
import dashboardEn from './locales/en/dashboard.json';
import settingsEn from './locales/en/settings.json';
import timelineEn from './locales/en/timeline.json';
import waterEn from './locales/en/water.json';
import proteinEn from './locales/en/protein.json';
import logEn from './locales/en/log.json';
import coachEn from './locales/en/coach.json';
import mealPlanEn from './locales/en/mealPlan.json';
import loginEn from './locales/en/login.json';

// Import Simplified Chinese translations
import commonZhCN from './locales/zh-CN/common.json';
import dashboardZhCN from './locales/zh-CN/dashboard.json';
import settingsZhCN from './locales/zh-CN/settings.json';
import timelineZhCN from './locales/zh-CN/timeline.json';
import waterZhCN from './locales/zh-CN/water.json';
import proteinZhCN from './locales/zh-CN/protein.json';
import logZhCN from './locales/zh-CN/log.json';
import coachZhCN from './locales/zh-CN/coach.json';
import mealPlanZhCN from './locales/zh-CN/mealPlan.json';
import loginZhCN from './locales/zh-CN/login.json';

// Import Traditional Chinese translations
import commonZhTW from './locales/zh-TW/common.json';
import dashboardZhTW from './locales/zh-TW/dashboard.json';
import settingsZhTW from './locales/zh-TW/settings.json';
import timelineZhTW from './locales/zh-TW/timeline.json';
import waterZhTW from './locales/zh-TW/water.json';
import proteinZhTW from './locales/zh-TW/protein.json';
import logZhTW from './locales/zh-TW/log.json';
import loginZhTW from './locales/zh-TW/login.json';

// Import other languages (currently using English as placeholder)
import commonEs from './locales/es/common.json';
import dashboardEs from './locales/es/dashboard.json';
import settingsEs from './locales/es/settings.json';
import timelineEs from './locales/es/timeline.json';
import waterEs from './locales/es/water.json';
import proteinEs from './locales/es/protein.json';
import logEs from './locales/es/log.json';
import loginEs from './locales/es/login.json';

import commonPt from './locales/pt/common.json';
import dashboardPt from './locales/pt/dashboard.json';
import settingsPt from './locales/pt/settings.json';
import timelinePt from './locales/pt/timeline.json';
import waterPt from './locales/pt/water.json';
import proteinPt from './locales/pt/protein.json';
import logPt from './locales/pt/log.json';
import loginPt from './locales/pt/login.json';

import commonHi from './locales/hi/common.json';
import dashboardHi from './locales/hi/dashboard.json';
import settingsHi from './locales/hi/settings.json';
import timelineHi from './locales/hi/timeline.json';
import waterHi from './locales/hi/water.json';
import proteinHi from './locales/hi/protein.json';
import logHi from './locales/hi/log.json';
import loginHi from './locales/hi/login.json';

import commonAr from './locales/ar/common.json';
import dashboardAr from './locales/ar/dashboard.json';
import settingsAr from './locales/ar/settings.json';
import timelineAr from './locales/ar/timeline.json';
import waterAr from './locales/ar/water.json';
import proteinAr from './locales/ar/protein.json';
import logAr from './locales/ar/log.json';
import loginAr from './locales/ar/login.json';

import commonFr from './locales/fr/common.json';
import dashboardFr from './locales/fr/dashboard.json';
import settingsFr from './locales/fr/settings.json';
import timelineFr from './locales/fr/timeline.json';
import waterFr from './locales/fr/water.json';
import proteinFr from './locales/fr/protein.json';
import logFr from './locales/fr/log.json';
import loginFr from './locales/fr/login.json';

import commonDe from './locales/de/common.json';
import dashboardDe from './locales/de/dashboard.json';
import settingsDe from './locales/de/settings.json';
import timelineDe from './locales/de/timeline.json';
import waterDe from './locales/de/water.json';
import proteinDe from './locales/de/protein.json';
import logDe from './locales/de/log.json';
import loginDe from './locales/de/login.json';

import commonJa from './locales/ja/common.json';
import dashboardJa from './locales/ja/dashboard.json';
import settingsJa from './locales/ja/settings.json';
import timelineJa from './locales/ja/timeline.json';
import waterJa from './locales/ja/water.json';
import proteinJa from './locales/ja/protein.json';
import logJa from './locales/ja/log.json';
import loginJa from './locales/ja/login.json';

import commonKo from './locales/ko/common.json';
import dashboardKo from './locales/ko/dashboard.json';
import settingsKo from './locales/ko/settings.json';
import timelineKo from './locales/ko/timeline.json';
import waterKo from './locales/ko/water.json';
import proteinKo from './locales/ko/protein.json';
import logKo from './locales/ko/log.json';
import loginKo from './locales/ko/login.json';

import commonRu from './locales/ru/common.json';
import dashboardRu from './locales/ru/dashboard.json';
import settingsRu from './locales/ru/settings.json';
import timelineRu from './locales/ru/timeline.json';
import waterRu from './locales/ru/water.json';
import proteinRu from './locales/ru/protein.json';
import logRu from './locales/ru/log.json';
import loginRu from './locales/ru/login.json';

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'system', name: 'Follow System' },
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
] as const;

// RTL languages
const RTL_LANGUAGES = ['ar'];

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        dashboard: dashboardEn,
        settings: settingsEn,
        timeline: timelineEn,
        water: waterEn,
        protein: proteinEn,
        log: logEn,
        coach: coachEn,
        mealPlan: mealPlanEn,
        login: loginEn,
      },
      'zh-CN': {
        common: commonZhCN,
        dashboard: dashboardZhCN,
        settings: settingsZhCN,
        timeline: timelineZhCN,
        water: waterZhCN,
        protein: proteinZhCN,
        log: logZhCN,
        coach: coachZhCN,
        mealPlan: mealPlanZhCN,
        login: loginZhCN,
      },
      'zh-TW': {
        common: commonZhTW,
        dashboard: dashboardZhTW,
        settings: settingsZhTW,
        timeline: timelineZhTW,
        water: waterZhTW,
        protein: proteinZhTW,
        log: logZhTW,
        login: loginZhTW,
      },
      es: {
        common: commonEs,
        dashboard: dashboardEs,
        settings: settingsEs,
        timeline: timelineEs,
        water: waterEs,
        protein: proteinEs,
        log: logEs,
        login: loginEs,
      },
      pt: {
        common: commonPt,
        dashboard: dashboardPt,
        settings: settingsPt,
        timeline: timelinePt,
        water: waterPt,
        protein: proteinPt,
        log: logPt,
        login: loginPt,
      },
      hi: {
        common: commonHi,
        dashboard: dashboardHi,
        settings: settingsHi,
        timeline: timelineHi,
        water: waterHi,
        protein: proteinHi,
        log: logHi,
        login: loginHi,
      },
      ar: {
        common: commonAr,
        dashboard: dashboardAr,
        settings: settingsAr,
        timeline: timelineAr,
        water: waterAr,
        protein: proteinAr,
        log: logAr,
        login: loginAr,
      },
      fr: {
        common: commonFr,
        dashboard: dashboardFr,
        settings: settingsFr,
        timeline: timelineFr,
        water: waterFr,
        protein: proteinFr,
        log: logFr,
        login: loginFr,
      },
      de: {
        common: commonDe,
        dashboard: dashboardDe,
        settings: settingsDe,
        timeline: timelineDe,
        water: waterDe,
        protein: proteinDe,
        log: logDe,
        login: loginDe,
      },
      ja: {
        common: commonJa,
        dashboard: dashboardJa,
        settings: settingsJa,
        timeline: timelineJa,
        water: waterJa,
        protein: proteinJa,
        log: logJa,
        login: loginJa,
      },
      ko: {
        common: commonKo,
        dashboard: dashboardKo,
        settings: settingsKo,
        timeline: timelineKo,
        water: waterKo,
        protein: proteinKo,
        log: logKo,
        login: loginKo,
      },
      ru: {
        common: commonRu,
        dashboard: dashboardRu,
        settings: settingsRu,
        timeline: timelineRu,
        water: waterRu,
        protein: proteinRu,
        log: logRu,
        login: loginRu,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'settings', 'timeline', 'water', 'protein', 'log', 'coach', 'mealPlan', 'login'],
    
    detection: {
      // Detection order:
      // 1. URL parameter (for testing): ?lng=en
      // 2. User's saved preference (localStorage)
      // 3. Browser/phone language (first-time users)
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'fitfuel-language',
    },
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    react: {
      useSuspense: false,
    },
  });

// Set HTML dir attribute for RTL languages
i18n.on('languageChanged', (lng) => {
  const htmlElement = document.documentElement;
  
  // Set direction
  if (RTL_LANGUAGES.includes(lng)) {
    htmlElement.setAttribute('dir', 'rtl');
  } else {
    htmlElement.setAttribute('dir', 'ltr');
  }
  
  // Set lang attribute
  htmlElement.setAttribute('lang', lng);
});

// Debug: Log detected language for troubleshooting
i18n.on('initialized', (options) => {
  const detectedLang = i18n.language;
  const browserLang = navigator.language || navigator.languages?.[0];
  const storedLang = localStorage.getItem('fitfuel-language');
  
  console.log('[i18n] Language Detection:', {
    detected: detectedLang,
    browser: browserLang,
    stored: storedLang,
    isFirstVisit: !storedLang
  });
  
  // If first visit and browser language is not matched, log warning
  if (!storedLang && detectedLang !== browserLang?.split('-')[0]) {
    console.warn('[i18n] Browser language not detected correctly!', {
      expected: browserLang,
      got: detectedLang
    });
  }
});

export default i18n;
