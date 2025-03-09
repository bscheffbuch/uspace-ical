// Use Webpack's native JSON handling
import enTranslations from './en.json';
import deTranslations from './de.json';

// Available languages
export const LANGUAGES = {
  en: 'English',
  de: 'Deutsch'
};

// Default language
export const DEFAULT_LANGUAGE = 'en';

// All translations
const translations = {
  en: enTranslations,
  de: deTranslations
};

/**
 * Detect system language from browser settings
 * @returns {string} - Detected language code if supported, otherwise default language
 */
export function detectSystemLanguage() {
  // Get browser language (e.g., 'en-US' -> 'en')
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  console.log("Detected browser language:", browserLang);
  
  // Check if the browser language is available in our translations
  if (Object.keys(LANGUAGES).includes(browserLang)) {
    return browserLang;
  }
  
  return DEFAULT_LANGUAGE;
}

/**
 * Get translation for a key path
 * @param {string} path - Dot notation path (e.g., "login.title")
 * @param {object} params - Optional parameters to replace in the string
 * @param {string} language - Language code (e.g., "en")
 * @returns {string} - Translated string
 */
export function t(path, params = {}, language = null) {
  // Get the current language from storage or use default
  let currentLanguage = language;
  
  if (!currentLanguage) {
    // Try to get from localStorage for immediate use before chrome.storage loads
    const storedLang = localStorage.getItem('uspace_language');
    currentLanguage = storedLang || DEFAULT_LANGUAGE;
  }
  
  // Split the path by dots to navigate the translation object
  const keys = path.split('.');
  
  // Get the translation object for the current language or fallback to English
  const langData = translations[currentLanguage] || translations[DEFAULT_LANGUAGE];
  
  // Navigate through the translation object
  let result = keys.reduce((obj, key) => obj?.[key], langData);
  
  // Fallback to English if translation doesn't exist
  if (result === undefined && currentLanguage !== DEFAULT_LANGUAGE) {
    result = keys.reduce((obj, key) => obj?.[key], translations[DEFAULT_LANGUAGE]);
  }
  
  // If still undefined, return the key
  if (result === undefined) {
    return path;
  }
  
  // Replace parameters if any - using regex for global replacement
  if (typeof result === 'string' && Object.keys(params).length > 0) {
    Object.keys(params).forEach(key => {
      // Use regex with 'g' flag to replace all occurrences
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, params[key] || '');
    });
  }
  
  return result;
}

/**
 * Initialize the localization system
 * @returns {Promise} - Promise that resolves with language info object
 */
export function initLocalization() {
  return new Promise((resolve) => {
    // First detect system language
    const systemLanguage = detectSystemLanguage();
    console.log("System language detected:", systemLanguage);
    
    chrome.storage.local.get(['uspace_language', 'system_language_detected', 'system_language'], (result) => {
      // If language preference hasn't been set yet, use system language
      let language = result.uspace_language;
      let isSystemDefault = false;
      
      if (!language || !result.system_language_detected) {
        language = systemLanguage;
        isSystemDefault = true;
        
        // Store the detected system language and set it as default
        chrome.storage.local.set({ 
          uspace_language: language,
          system_language: systemLanguage,
          system_language_detected: true
        });
        console.log("Setting initial language to system language:", language);
      } else {
        // Check if stored system_language matches the current one
        if (result.system_language !== systemLanguage) {
          chrome.storage.local.set({ system_language: systemLanguage });
        }
      }
      
      localStorage.setItem('uspace_language', language);
      localStorage.setItem('system_language', systemLanguage);
      document.documentElement.setAttribute('lang', language);
      
      console.log("Resolving with:", { language, systemLanguage, isSystemDefault });
      resolve({
        language,
        systemLanguage,
        isSystemDefault
      });
    });
  });
}

/**
 * Set the UI language and save it to storage
 * @param {string} language - Language code (e.g., "en")
 * @returns {Promise} - Promise that resolves when the language is set
 */
export function setLanguage(language) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ uspace_language: language }, () => {
      localStorage.setItem('uspace_language', language);
      document.documentElement.setAttribute('lang', language);
      resolve(language);
    });
  });
}

/**
 * Get the current language
 * @returns {Promise<string>} - Promise that resolves with the current language code
 */
export function getCurrentLanguage() {
  return new Promise((resolve) => {
    chrome.storage.local.get('uspace_language', (result) => {
      const language = result.uspace_language || DEFAULT_LANGUAGE;
      resolve(language);
    });
  });
}
