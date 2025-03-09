'use strict';

import './popup.css';
import { t, initLocalization, setLanguage, getCurrentLanguage, LANGUAGES, detectSystemLanguage, DEFAULT_LANGUAGE } from './i18n';

// UI elements
const loginSection = document.getElementById('login-section');
const userInfoSection = document.getElementById('user-info');
const semesterSection = document.getElementById('semester-section');
const progressSection = document.getElementById('progress-section');
const semesterSelect = document.getElementById('semester-select');

// Profile and menu elements
const userControls = document.getElementById('user-controls');
const profileMenuTrigger = document.getElementById('profile-menu-trigger');
const settingsDropdown = document.getElementById('settings-dropdown');
const profilePicMini = document.getElementById('profile-pic-mini');
const usernameDisplay = document.getElementById('username-display');

// Format and delivery options
const formatSingle = document.getElementById('format-single');
const formatSeparate = document.getElementById('format-separate');
const deliveryDownload = document.getElementById('delivery-download');
const deliveryWebcal = document.getElementById('delivery-webcal');
const formatOptions = document.getElementById('format-options');

// Buttons
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const downloadBtn = document.getElementById('download-btn');

// Status elements
const loginStatus = document.getElementById('login-status');
const downloadStatus = document.getElementById('download-status');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

// User info elements
const userFullname = document.getElementById('user-fullname');
const username = document.getElementById('username');

// Language selector
const languageSelect = document.getElementById('language-dropdown-select');

// Theme elements
const themeSelect = document.getElementById('theme-select');

// App title element
const appTitle = document.getElementById('app-title');

// Add greeting element
const greetingSection = document.getElementById('greeting-section');
const userGreeting = document.getElementById('user-greeting');

// Text elements that need localization
const localizableElements = {
  'app-title': 'extension.title',
  'calendar-options-title': 'calendar.options',
  'semester-select-label': 'calendar.selectSemester',
  'loading-semesters': 'calendar.loadingPlaceholder',
  'delivery-method-title': 'delivery.title',
  'delivery-download-label': 'delivery.download',
  'delivery-webcal-label': 'delivery.webcal',
  'format-title': 'format.title',
  'format-single-label': 'format.single',
  'format-separate-label': 'format.separate',
  'language-dropdown-title': 'language.title',
  'theme-title': 'theme.title',
  'theme-system': 'theme.system',
  'theme-light': 'theme.light',
  'theme-dark': 'theme.dark',
  'lang-dropdown-en': 'language.en',
  'lang-dropdown-de': 'language.de',
  'login-btn': 'login.button',
  'logout-text': 'buttons.logout',
  'settings-title': 'settings.title'
};

// Helper function to safely set text content (avoiding "Cannot set property of null" errors)
function safeSetTextContent(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  } else {
    console.warn(`Element with ID ${elementId} not found`);
  }
}

// Initialize the UI
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize localization
    const { language, systemLanguage, isSystemDefault } = await initLocalization();
    console.log("Init result:", { language, systemLanguage, isSystemDefault });
    
    // Ensure we have a valid language value
    if (language) {
      languageSelect.value = language;
    } else {
      // Fallback to system language if no language is set
      languageSelect.value = systemLanguage || DEFAULT_LANGUAGE;
      console.log("Fallback to:", languageSelect.value);
    }
    
    // Update language dropdown to show system language
    updateLanguageDropdown(systemLanguage);
    
    // Initialize theme
    initTheme();
    
    // Apply translations to UI elements
    updateUILanguage();
    
    // Check authentication status
    checkAuthStatus();
    
    // Event listeners
    loginBtn.addEventListener('click', startAuthentication);
    logoutBtn.addEventListener('click', logout);
    downloadBtn.addEventListener('click', downloadCalendars);
    semesterSelect.addEventListener('change', () => {
      downloadBtn.disabled = !semesterSelect.value;
    });
    
    // Language selector listener
    languageSelect.addEventListener('change', () => {
      setLanguage(languageSelect.value).then(() => {
        updateUILanguage();
      });
    });
    
    // Theme selector listener
    themeSelect.addEventListener('change', () => {
      setTheme(themeSelect.value);
    });
    
    // Profile menu toggle with enhanced animation
    profileMenuTrigger.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      
      if (settingsDropdown.classList.contains('active')) {
        // Close menu with animation
        settingsDropdown.style.opacity = '0';
        settingsDropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          settingsDropdown.classList.remove('active');
        }, 200);
      } else {
        // Open menu
        settingsDropdown.classList.add('active');
        setTimeout(() => {
          settingsDropdown.style.opacity = '1';
          settingsDropdown.style.transform = 'translateY(0)';
        }, 10);
      }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      if (settingsDropdown.classList.contains('active') && 
          !settingsDropdown.contains(event.target) && 
          !profileMenuTrigger.contains(event.target)) {
        
        // Close with animation
        settingsDropdown.style.opacity = '0';
        settingsDropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          settingsDropdown.classList.remove('active');
        }, 200);
      }
    });
    
    // Load user preferences from storage
    chrome.storage.local.get(['formatSingle', 'useWebcal'], (result) => {
      // Set format preference
      if (result.formatSingle !== undefined) {
        formatSingle.checked = result.formatSingle;
        formatSeparate.checked = !result.formatSingle;
      }
      
      // Set delivery method preference
      if (result.useWebcal !== undefined) {
        deliveryDownload.checked = !result.useWebcal;
        deliveryWebcal.checked = result.useWebcal;
      }
      
      // Update UI based on selected options
      updateButtonText();
      toggleFormatOptions();
    });
    
    // Save format preference when changed
    formatSingle.addEventListener('change', () => {
      if (formatSingle.checked) {
        chrome.storage.local.set({ formatSingle: true });
        updateButtonText();
      }
    });
    
    formatSeparate.addEventListener('change', () => {
      if (formatSeparate.checked) {
        chrome.storage.local.set({ formatSingle: false });
        updateButtonText();
      }
    });
    
    // Save delivery method preference when changed
    deliveryDownload.addEventListener('change', () => {
      if (deliveryDownload.checked) {
        chrome.storage.local.set({ useWebcal: false });
        updateButtonText();
        toggleFormatOptions();
      }
    });
    
    deliveryWebcal.addEventListener('change', () => {
      if (deliveryWebcal.checked) {
        chrome.storage.local.set({ useWebcal: true });
        updateButtonText();
        toggleFormatOptions();
      }
    });
  } catch (error) {
    console.error("Error initializing app:", error);
  }
});

// Initialize theme based on saved preference or system setting
function initTheme() {
  chrome.storage.local.get('uspace_theme', (result) => {
    const savedTheme = result.uspace_theme || 'system';
    themeSelect.value = savedTheme;
    setTheme(savedTheme);
  });
}

// Set theme and save preference
function setTheme(theme) {
  // Remove existing theme classes
  document.body.classList.remove('theme-light', 'theme-dark');
  
  // Apply selected theme
  if (theme === 'system') {
    // When set to system, don't add any class to use media queries
    // The media queries will handle the theme based on system preference
  } else {
    // Apply specific theme class
    document.body.classList.add(`theme-${theme}`);
  }
  
  // Save preference
  chrome.storage.local.set({ uspace_theme: theme });
}

// Update UI language
function updateUILanguage() {
  // Update static elements with more careful null checking
  for (const [elementId, translationKey] of Object.entries(localizableElements)) {
    if (elementId !== 'loading-semesters') { // Skip this problematic element
      safeSetTextContent(elementId, t(translationKey));
    }
  }
  
  // Update dynamic elements
  updateButtonText();
  
  // Update settings header translation separately with null check
  const settingsHeader = document.querySelector('#settings-title');
  if (settingsHeader) {
    settingsHeader.textContent = t('settings.title');
  }
  
  // Update placeholder for semester select - only if it exists
  if (semesterSelect) {
    const defaultOption = semesterSelect.querySelector('option[value=""]');
    if (defaultOption) {
      defaultOption.textContent = t('calendar.semesterPlaceholder');
    }
  }
  
  // Update the language dropdown when language changes
  updateLanguageDropdown(detectSystemLanguage());
}

// Toggle format options based on delivery method
function toggleFormatOptions() {
  if (deliveryWebcal.checked) {
    formatOptions.classList.add('hidden');
    // When switching to webcal, always use single calendar format
    formatSingle.checked = true;
    chrome.storage.local.set({ formatSingle: true });
  } else {
    formatOptions.classList.remove('hidden');
  }
}

// Update the button text based on the selected options
function updateButtonText() {
  const actionText = deliveryWebcal.checked ? t('buttons.open') : t('buttons.download');
  downloadBtn.textContent = actionText;
}

// Check if user is authenticated
function checkAuthStatus() {
  setStatusMessage(loginStatus, t('login.checking'), 'info');
  
  chrome.runtime.sendMessage({action: 'checkAuthStatus'}, response => {
    if (response.authenticated) {
      // Update UI for authenticated state
      loginSection.classList.add('hidden');
      userInfoSection.classList.add('hidden'); // Hide the old user info section
      semesterSection.classList.remove('hidden');
      userControls.classList.remove('hidden'); // Show the user controls in header
      
      const fullName = response.userInfo.fullname || t('user.unknownUser');
      
      // Display greeting with user's name
      if (userGreeting) {
        userGreeting.textContent = t('greeting.hello', { name: fullName });
        greetingSection.classList.remove('hidden');
      }
      
      // Update user info
      if (userFullname) {
        userFullname.textContent = fullName;
      }
      
      if (username) {
        username.textContent = response.userInfo.username || '';
      }
      
      // Also update mini profile display
      if (usernameDisplay) {
        usernameDisplay.textContent = response.userInfo.username || '';
      }
      
      // Update just the mini profile picture that's in the header
      if (profilePicMini) {
        if (response.userInfo.profilePicture) {
          profilePicMini.src = `data:image/png;base64,${response.userInfo.profilePicture}`;
        } else {
          profilePicMini.src = 'icons/default-avatar.png';
        }
      }
      
      // Populate semesters
      populateSemesterSelect(response.semesters);
    } else {
      // Update UI for unauthenticated state
      loginSection.classList.remove('hidden');
      userInfoSection.classList.add('hidden');
      semesterSection.classList.add('hidden');
      userControls.classList.add('hidden'); // Hide user controls in header
      greetingSection.classList.add('hidden'); // Hide greeting
      settingsDropdown.classList.remove('active'); // Hide dropdown if visible
      clearStatusMessage(loginStatus);
    }
  });
}

// Start the login process
function startAuthentication() {
  setStatusMessage(loginStatus, t('login.checking'), 'info');
  
  chrome.runtime.sendMessage({action: 'authenticate'}, response => {
    if (response.success) {
      setStatusMessage(loginStatus, t('login.success'), 'success');
      checkAuthStatus();
    } else {
      setStatusMessage(loginStatus, t('status.error', {0: response.message}), 'error');
    }
  });
}

// Logout function
function logout() {
  chrome.runtime.sendMessage({action: 'logout'}, response => {
    if (response.success) {
      checkAuthStatus();
    }
  });
}

// Populate semester dropdown
function populateSemesterSelect(semesters) {
  // Clear existing options
  semesterSelect.innerHTML = '';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = t('calendar.semesterPlaceholder');
  semesterSelect.appendChild(defaultOption);
  
  // Get most recent semester
  const mostRecentSemester = findMostRecentSemester(semesters);
  
  // Add semesters to dropdown
  semesters.forEach(semester => {
    const option = document.createElement('option');
    option.value = semester;
    option.textContent = semester;
    semesterSelect.appendChild(option);
    
    // Auto-select most recent semester
    if (semester === mostRecentSemester) {
      option.selected = true;
      downloadBtn.disabled = false;
    }
  });
}

// Identify most recent semester from a list of semesters
function findMostRecentSemester(semesters) {
  // Find semesters with the latest year
  const currentYear = new Date().getFullYear();
  let latestYear = 0;
  
  semesters.forEach(semester => {
    const yearMatch = semester.match(/\d{4}/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0], 10);
      if (year > latestYear && year <= currentYear + 1) {
        latestYear = year;
      }
    }
  });
  
  // Filter semesters with the latest year
  const latestSemesters = semesters.filter(s => s.includes(latestYear));
  
  // Prefer winter semester for the current year
  const winterSemester = latestSemesters.find(s => s.toLowerCase().includes('winter'));
  if (winterSemester) return winterSemester;
  
  // Or summer semester
  const summerSemester = latestSemesters.find(s => s.toLowerCase().includes('summer'));
  if (summerSemester) return summerSemester;
  
  // If no specific naming convention found, just return the first one
  return latestSemesters[0];
}

// Global variable to keep track of progress toast timeout
let progressToastTimeout = null;

// Show progress toast
function showProgressToast() {
  // Clear any existing timeout
  if (progressToastTimeout) {
    clearTimeout(progressToastTimeout);
    progressToastTimeout = null;
  }
  
  // Reset progress bar
  updateProgress(0);
  
  // Show progress toast
  progressSection.classList.remove('hidden');
  
  // Make the toast visible with animation
  setTimeout(() => {
    progressSection.classList.add('visible');
  }, 10);
}

// Hide progress toast with optional delay
function hideProgressToast(delay = 0) {
  // If there's a delay, set a timeout
  if (delay > 0) {
    progressToastTimeout = setTimeout(() => {
      progressSection.classList.remove('visible');
      
      // Hide completely after animation
      setTimeout(() => {
        progressSection.classList.add('hidden');
        progressToastTimeout = null;
      }, 300);
    }, delay);
  } else {
    // Hide immediately
    progressSection.classList.remove('visible');
    
    // Hide completely after animation
    setTimeout(() => {
      progressSection.classList.add('hidden');
    }, 300);
  }
}

// Update progress bar and transform into success message when complete
function updateProgress(percentage, successMessage = null) {
  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `${Math.round(percentage)}%`;
  
  // If progress is complete, transform into success message
  if (percentage >= 100 && successMessage) {
    // After a short delay to show 100% completion
    setTimeout(() => {
      // Transform progress toast into success message
      const progressHeader = progressSection.querySelector('h3');
      if (progressHeader) {
        progressHeader.textContent = 'Success';
      }
      progressText.textContent = successMessage;
      progressSection.classList.add('success-toast');
      
      // Hide after a longer delay
      hideProgressToast(4000);
    }, 500);
  }
}

// Download or open calendars
function downloadCalendars() {
  // Get selected semester
  const selectedSemester = semesterSelect.value;
  if (!selectedSemester) return;
  
  // Show progress toast instead of setting status message
  showProgressToast();
  
  // Get format preference
  const mergeCalendars = formatSingle.checked;
  
  // Get delivery method
  const useWebcal = deliveryWebcal.checked;
  
  // Call background script to get calendars
  chrome.runtime.sendMessage(
    {
      action: 'scrapeCourses',
      semester: selectedSemester,
      mergeCalendars: mergeCalendars,
      useWebcal: useWebcal
    },
    response => {
      if (response.success) {
        const successMessage = useWebcal
          ? t('status.openingWebcal')
          : t('status.success');
        
        // Update progress to 100% and transform into success message
        updateProgress(100, successMessage);
      } else {
        // Only for errors, show a separate error message
        setStatusMessage(
          downloadStatus,
          t('status.error', {0: response.message}),
          'error',
          8000
        );
        
        // Hide progress toast immediately
        hideProgressToast();
      }
    }
  );
  
  // Listen for progress updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateProgress') {
      updateProgress(message.percentage);
    }
  });
}

// Create a container for toast messages if it doesn't exist
function ensureToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

// Global variable to keep track of active toast timeouts
const toastTimeouts = {};

// Helper function to set status messages with auto-dismiss
function setStatusMessage(element, message, type, autoHideDelay = 5000) {
  // Clear any existing timeout for this element
  if (toastTimeouts[element.id]) {
    clearTimeout(toastTimeouts[element.id]);
    delete toastTimeouts[element.id];
  }
  
  // Set the message and styling
  element.textContent = message;
  element.className = `status-message ${type}`;
  
  // Make the message visible with animation
  setTimeout(() => {
    element.classList.add('visible');
  }, 10);
  
  // Auto-hide after specified delay
  if (autoHideDelay > 0) {
    toastTimeouts[element.id] = setTimeout(() => {
      element.classList.add('hiding');
      element.classList.remove('visible');
      
      // Remove after animation completes
      setTimeout(() => {
        element.className = 'status-message hidden';
        delete toastTimeouts[element.id];
      }, 300);
    }, autoHideDelay);
  }
}

// Helper function to clear status messages
function clearStatusMessage(element) {
  // Clear any existing timeout
  if (toastTimeouts[element.id]) {
    clearTimeout(toastTimeouts[element.id]);
    delete toastTimeouts[element.id];
  }
  
  element.className = 'status-message hidden';
  element.textContent = '';
}

// Update the language dropdown to indicate which language is the system language
function updateLanguageDropdown(systemLanguage) {
  console.log("Updating language dropdown with system language:", systemLanguage);
  
  // Make sure we have a valid system language
  if (!systemLanguage) {
    systemLanguage = detectSystemLanguage();
    console.log("System language was undefined, detected:", systemLanguage);
  }
  
  // Get all options in the language dropdown
  const options = languageSelect.querySelectorAll('option');
  
  // First, reset all option labels to their plain names
  options.forEach(option => {
    const langCode = option.value;
    option.textContent = t(`language.${langCode}`);
  });
  
  // Then find the option that matches the system language and append "(System)" to it
  const systemOption = Array.from(options).find(option => option.value === systemLanguage);
  if (systemOption) {
    systemOption.textContent = `${systemOption.textContent} (${t('language.system')})`;
    console.log("Updated system language option:", systemOption.textContent);
  } else {
    console.warn("Could not find option for system language:", systemLanguage);
  }
}
