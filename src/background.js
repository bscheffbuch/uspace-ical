'use strict';

// Import JSZip library from npm package
import JSZip from 'jszip';
import { DEFAULT_LANGUAGE } from './i18n';

// Base URLs
const BASE_URL = "https://uspace.univie.ac.at/web/studium/anmeldeuebersicht";
const API_URL = "https://uspace.univie.ac.at/web/studium/anmeldeuebersicht?p_p_id=asstudierendeanmeldeuebersichtportlet_WAR_asstudierendeanmeldeuebersichtportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=_generic_request_&p_p_cacheability=cacheLevelPage";
const PROFILE_PIC_URL = "https://uspace.univie.ac.at/web/studium/home?p_p_id=dashboardprofileportlet_WAR_dashboardprofileportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=_generic_request_&p_p_cacheability=cacheLevelPage";
const ICAL_BASE_URL = "https://m2-ufind.univie.ac.at/courses/";

// State variables
let isAuthenticated = false;
let userInfo = {
  fullname: null,
  username: null,
  profilePicture: null
};
let availableSemesters = [];
let authTabId = null;

// Standard headers for API requests
const standardHeaders = {
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
  'Content-Type': 'application/json',
  'Origin': 'https://uspace.univie.ac.at',
  'Referer': 'https://uspace.univie.ac.at/web/studium/anmeldeuebersicht',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"'
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'checkAuthStatus':
      checkAuthStatus().then(sendResponse);
      return true; // Keep sendResponse valid asynchronously
    
    case 'authenticate':
      authenticate().then(sendResponse);
      return true;
    
    case 'logout':
      logout().then(sendResponse);
      return true;
    
    case 'scrapeCourses':
      // Use mergeCalendars parameter from message which now comes from the format radio buttons
      // And useWebcal parameter to determine if we should use webcal protocol
      scrapeCourses(message.semester, message.mergeCalendars, message.useWebcal).then(sendResponse);
      return true;
  }
});

// Check if the user is authenticated
async function checkAuthStatus() {
  console.log('Checking authentication status');
  
  // First check local storage for auth state
  const storedAuthData = await chrome.storage.local.get(['isAuthenticated', 'userInfo', 'availableSemesters']);
  
  if (storedAuthData.isAuthenticated) {
    console.log('Found stored authentication data');
    isAuthenticated = true;
    userInfo = storedAuthData.userInfo || {};
    availableSemesters = storedAuthData.availableSemesters || [];
    
    // Verify authentication by making a test request
    try {
      const isValid = await testAuthValidity();
      if (isValid) {
        console.log('Stored authentication is valid');
        return {
          authenticated: true,
          userInfo: userInfo,
          semesters: availableSemesters
        };
      } else {
        console.log('Stored authentication is invalid, resetting');
        await logout();
        return { authenticated: false };
      }
    } catch (error) {
      console.error('Error testing authentication validity:', error);
      return { authenticated: false };
    }
  } else {
    console.log('No stored authentication data found');
    return { authenticated: false };
  }
}

// Test if stored authentication is still valid
async function testAuthValidity() {
  try {
    // Make a request to get semesters as a test
    const semesters = await getAvailableSemesters();
    return semesters && semesters.length > 0;
  } catch (error) {
    console.error('Authentication test failed:', error);
    return false;
  }
}

// Start the authentication process
async function authenticate() {
  console.log('Starting authentication process');
  
  // Create a new tab for authentication
  try {
    const tab = await chrome.tabs.create({ url: BASE_URL, active: true });
    authTabId = tab.id;
    
    // Return a promise that resolves when authentication completes
    return new Promise((resolve) => {
      // Listen for tab updates
      const tabUpdateListener = async (tabId, changeInfo) => {
        if (tabId === authTabId && changeInfo.status === 'complete') {
          // Check if the user is logged in by executing a content script
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: authTabId },
              function: checkLoginStatus
            });
            
            const isLoggedIn = results[0].result;
            
            if (isLoggedIn) {
              console.log('User is logged in');
              
              // Extract cookies from the authenticated tab
              const cookies = await chrome.cookies.getAll({ domain: 'uspace.univie.ac.at' });
              
              // Store the cookies in extension storage
              await chrome.storage.local.set({ cookies });
              
              // Extract user information
              const userInfoResult = await chrome.scripting.executeScript({
                target: { tabId: authTabId },
                function: extractUserInfo
              });
              
              userInfo = userInfoResult[0].result;
              isAuthenticated = true;
              
              // Get semesters
              try {
                availableSemesters = await getAvailableSemesters();
              } catch (error) {
                console.error('Error getting semesters:', error);
                availableSemesters = [];
              }
              
              // Get profile picture
              try {
                userInfo.profilePicture = await fetchProfilePicture();
              } catch (error) {
                console.error('Error fetching profile picture:', error);
              }
              
              // Save auth state
              await chrome.storage.local.set({ 
                isAuthenticated: true,
                userInfo: userInfo,
                availableSemesters: availableSemesters
              });
              
              // Close the auth tab
              await chrome.tabs.remove(authTabId);
              authTabId = null;
              
              // Remove the listener
              chrome.tabs.onUpdated.removeListener(tabUpdateListener);
              
              // Resolve with success
              resolve({
                success: true,
                message: 'Authentication successful',
                userInfo: userInfo,
                semesters: availableSemesters
              });
            }
          } catch (error) {
            console.error('Error checking login status:', error);
          }
        }
      };
      
      // Add listener for tab updates
      chrome.tabs.onUpdated.addListener(tabUpdateListener);
      
      // Add listener for tab closing (user canceled)
      chrome.tabs.onRemoved.addListener(function tabRemoveListener(tabId) {
        if (tabId === authTabId) {
          authTabId = null;
          chrome.tabs.onUpdated.removeListener(tabUpdateListener);
          chrome.tabs.onRemoved.removeListener(tabRemoveListener);
          resolve({ success: false, message: 'Authentication canceled' });
        }
      });
    });
  } catch (error) {
    console.error('Error creating auth tab:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
}

// Function to extract user info from the login page
function extractUserInfo() {
  const userFullname = document.querySelector('.user-fullname')?.textContent?.trim() || null;
  const usernameElem = document.querySelector('.username')?.textContent?.trim() || null;
  
  return {
    fullname: userFullname,
    username: usernameElem,
    profilePicture: null // Will be fetched separately
  };
}

// Function to check if user is logged in
function checkLoginStatus() {
  // Check for elements that indicate successful login
  const usernameElem = document.querySelector('.username');
  const userFullname = document.querySelector('.user-fullname');
  
  return !!(usernameElem || userFullname);
}

// Get available semesters
async function getAvailableSemesters() {
  console.log('Fetching available semesters');
  
  const data = {
    "request": {
      "method": "GET",
      "targetService": "as-studierende-anmeldeuebersicht",
      "path": "/v2/anmeldung/semesters",
      "queryParams": "",
    }
  };
  
  try {
    const response = await makeApiRequest(API_URL, data);
    if (Array.isArray(response)) {
      console.log(`Retrieved ${response.length} semesters`);
      return response.sort();
    } else {
      console.error('Unexpected response format for semesters:', response);
      return [];
    }
  } catch (error) {
    console.error('Error fetching semesters:', error);
    return [];
  }
}

// Fetch profile picture
async function fetchProfilePicture() {
  console.log('Fetching profile picture');
  
  const data = {
    "request": {
      "method": "GET",
      "targetService": "dashboard-profilbereich",
      "path": "/v1/profile/ucard-picture",
      "queryParams": ""
    }
  };
  
  try {
    const response = await makeApiRequest(PROFILE_PIC_URL, data);
    return response?.image || response?.photoData || null;
  } catch (error) {
    console.error('Error fetching profile picture:', error);
    return null;
  }
}

// Scrape course data for a semester
async function scrapeCourses(semester, mergeCalendars = false, useWebcal = false) {
  console.log(`Scraping courses for ${semester}, mergeCalendars: ${mergeCalendars}, useWebcal: ${useWebcal}`);
  
  try {
    // Get courses for the selected semester
    const data = {
      "request": {
        "method": "POST",
        "targetService": "as-studierende-anmeldeuebersicht",
        "path": "/v2/anmeldung/semesters/anmeldungen",
        "queryParams": "",
        "body": `["${semester}"]`
      }
    };
    
    const response = await makeApiRequest(API_URL, data);
    
    if (!Array.isArray(response) || response.length === 0) {
      return { 
        success: false, 
        message: `No courses found for ${semester}`
      };
    }
    
    console.log(`Found ${response.length} course entries`);
    
    // Process courses
    const courses = processCourseData(response);
    console.log(`Processed ${courses.length} courses`);
    
    // Special handling for webcal: show course list page
    if (useWebcal) {
      return showCourseWebcalPage(courses, semester);
    }

    // When using webcal, we always merge calendars for better user experience
    if (useWebcal) {
      mergeCalendars = true;
    }

    // Create arrays to hold events and downloaded calendar content
    const events = [];
    const individualCalendars = [];
    let courseCount = 0;

    // Loop through courses
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      
      // Report progress
      const percentage = Math.round(((i + 1) / courses.length) * 100);
      chrome.runtime.sendMessage({action: 'updateProgress', percentage: percentage});
      
      // Get iCal data
      const icalData = await downloadIcal(course.id, semester);
      
      if (icalData && icalData.success) {
        courseCount++;
        
        if (mergeCalendars) {
          // Add events from this course to our list for merging
          const courseEvents = extractEventsFromIcal(icalData.content, course.title);
          events.push(...courseEvents);
        } else {
          // Store individual calendar for separate downloads
          individualCalendars.push({
            title: course.title,
            content: icalData.content
          });
        }
      }
    }

    // Handle download or webcal based on user selection
    if (mergeCalendars) {
      // Create a merged calendar with all events
      const mergedCalendar = createMergedCalendar(events, semester);
      
      if (useWebcal) {
        // Handle webcal opening
        return handleWebcalProtocol(mergedCalendar, `All_Courses_${semester.replace(/\s+/g, '_')}.ics`);
      } else {
        // Regular download
        const filename = `All_Courses_${semester.replace(/\s+/g, '_')}.ics`;
        await downloadSingleFile(mergedCalendar, filename);
      }
    } else {
      // Download as zip (only for regular downloads, not webcal)
      const files = individualCalendars.map(cal => ({
        name: `${cal.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`,
        content: cal.content
      }));
      
      await downloadAsZip(files, `Calendar_${semester.replace(/\s+/g, '_')}.zip`);
    }

    return { 
      success: true, 
      courseCount: courseCount 
    };
  } catch (error) {
    console.error(`Error scraping courses: ${error.message}`);
    return { success: false, message: error.message };
  }
}

// Show course webcal page
async function showCourseWebcalPage(courses, semester) {
  try {
    // Store courses data in local storage
    await chrome.storage.local.set({
      'webcalCourses': courses,
      'webcalSemester': semester
    });
    
    // Open the course list page
    const courseListUrl = chrome.runtime.getURL('course-webcal.html');
    await chrome.tabs.create({ url: courseListUrl });
    
    return { 
      success: true, 
      courseCount: courses.length 
    };
  } catch (error) {
    console.error(`Error showing course webcal page: ${error.message}`);
    return { success: false, message: error.message };
  }
}

// Process course data from API response
function processCourseData(data) {
  const courses = [];
  
  for (const item of data) {
    // Process course data
    if (item.lehrveranstaltung) {
      const lv = item.lehrveranstaltung;
      
      const courseInfo = {
        title: lv.titel || 'Unknown Course',
        lvNr: lv.lvNr || '',
        type: lv.typ || '',
        teachers: [],
        dates: [],
        status: item.status || ''
      };
      
      // Extract teachers
      if (Array.isArray(lv.lehrende)) {
        for (const teacher of lv.lehrende) {
          const name = `${teacher.vorname || ''} ${teacher.nachname || ''}`.trim();
          const role = teacher.rolle || '';
          let teacherInfo = name;
          if (role) {
            teacherInfo += ` (${role})`;
          }
          courseInfo.teachers.push(teacherInfo);
        }
      }
      
      // Extract dates
      if (Array.isArray(lv.termine)) {
        for (const termin of lv.termine) {
          const beginn = termin.beginn || '';
          const ende = termin.ende || '';
          const raum = termin.raumName || '';
          
          if (beginn && ende) {
            let dateInfo = `${beginn} - ${ende}`;
            if (raum) {
              dateInfo += `, ${raum}`;
            }
            courseInfo.dates.push(dateInfo);
          }
        }
      }
      
      courses.push(courseInfo);
    }
    // Process exam data
    else if (item.pruefung) {
      const pruefung = item.pruefung;
      
      const courseInfo = {
        title: pruefung.lehrinhaltTitel || 'Unknown Exam',
        lvNr: pruefung.extId || '',
        type: 'Prüfung',
        teachers: [],
        dates: [],
        status: item.status || ''
      };
      
      // Extract examiners
      if (Array.isArray(pruefung.pruefer)) {
        for (const pruefer of pruefung.pruefer) {
          const name = `${pruefer.vorname || ''} ${pruefer.nachname || ''}`.trim();
          courseInfo.teachers.push(name);
        }
      }
      
      // Extract exam dates
      if (Array.isArray(pruefung.termine)) {
        for (const termin of pruefung.termine) {
          const beginn = termin.beginn || '';
          const ende = termin.ende || '';
          const raum = termin.raumName || '';
          
          if (beginn && ende) {
            let dateInfo = `${beginn} - ${ende}`;
            if (raum) {
              dateInfo += `, ${raum}`;
            }
            courseInfo.dates.push(dateInfo);
          }
        }
      }
      
      courses.push(courseInfo);
    }
  }
  
  return courses;
}

// Download iCal file for a course
async function downloadIcal(lvNr, semester) {
  if (!lvNr) {
    console.warn('No course number provided for iCal download');
    return null;
  }
  
  try {
    console.log(`Downloading iCal for course ${lvNr}, semester ${semester}`);
    
    // Direct URL to iCal file
    const icalUrl = `${ICAL_BASE_URL}${lvNr}/${semester}/1/ww.ics`;
    
    // Using fetch to download the iCal file
    const response = await fetch(icalUrl);
    
    if (!response.ok) {
      console.warn(`Failed to download iCal, status: ${response.status}`);
      return null;
    }
    
    // Get the iCal content as text
    const icalContent = await response.text();
    
    return icalContent;
  } catch (error) {
    console.error(`Error downloading iCal: ${error.message}`);
    return null;
  }
}

// Extract events from iCal content
function extractEventsFromIcal(icalContent, courseTitle) {
  const events = [];
  
  // Split by VEVENT sections
  const regex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
  const matches = icalContent.match(regex) || [];
  
  for (const eventString of matches) {
    // Add course title to summary/description to identify the source
    let enhancedEvent = eventString;
    
    // Extract the current summary
    const summaryMatch = eventString.match(/SUMMARY:([^\r\n]+)/);
    if (summaryMatch) {
      const currentSummary = summaryMatch[1];
      // Replace with course title prefixed summary
      enhancedEvent = enhancedEvent.replace(
        /SUMMARY:([^\r\n]+)/,
        `SUMMARY:${courseTitle}: ${currentSummary}`
      );
    } else {
      // Add summary if none exists
      enhancedEvent = enhancedEvent.replace(
        /BEGIN:VEVENT/,
        `BEGIN:VEVENT\r\nSUMMARY:${courseTitle}`
      );
    }
    
    // Add to events collection
    events.push(enhancedEvent);
  }
  
  return events;
}

// Create a merged calendar from individual events
function createMergedCalendar(events, semester) {
  // Standard iCal header
  let mergedCalendar = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//u:space Calendar Merger//u:space iCal Downloader//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:All Courses - ${semester}
X-WR-TIMEZONE:Europe/Vienna
`;

  // Add all events
  events.forEach(event => {
    mergedCalendar += `${event}\r\n`;
  });
  
  // Close calendar
  mergedCalendar += 'END:VCALENDAR';
  
  return mergedCalendar;
}

// Download a single file (not zipped)
async function downloadSingleFile(content, filename) {
  try {
    console.log(`Downloading single file: ${filename}`);
    
    // Use TextEncoder to properly handle UTF-8
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    
    // Convert to base64
    const base64Content = btoa(
      Array.from(bytes)
        .map(byte => String.fromCharCode(byte))
        .join('')
    );
    
    const dataUrl = `data:text/calendar;charset=utf-8;base64,${base64Content}`;
    
    // Download using data URL
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: true
    });
    
    console.log('Single file download initiated with ID:', downloadId);
    return true;
  } catch (error) {
    console.error(`Error downloading single file: ${error.message}`);
    throw error;
  }
}

// Handle webcal protocol
async function handleWebcalProtocol(calendarContent, filename) {
  try {
    // Use TextEncoder for proper UTF-8 handling
    const encoder = new TextEncoder();
    const bytes = encoder.encode(calendarContent);
    
    // Convert to base64
    const base64Content = btoa(
      Array.from(bytes)
        .map(byte => String.fromCharCode(byte))
        .join('')
    );
    
    // Try direct webcal data URI approach first
    // This works in most modern calendar applications
    const webcalDataUri = `webcal:data:text/calendar;charset=utf-8;base64,${base64Content}`;
    
    // Create a download link as fallback
    const downloadUrl = `data:text/calendar;charset=utf-8;base64,${base64Content}`;
    
    // Store info for fallback page
    await chrome.storage.local.set({
      'webcalDataUri': webcalDataUri,
      'downloadUrl': downloadUrl,
      'calendarFilename': filename
    });
    
    // Open the webcal URI directly
    try {
      // Try to open with webcal protocol directly
      await chrome.tabs.create({ url: webcalDataUri });
      return { success: true, courseCount: 1 };
    } catch (innerError) {
      console.log('Direct webcal protocol failed, showing instructions page');
      
      // If direct method fails, show a page with instructions and options
      const helpPageUrl = chrome.runtime.getURL('webcal-help.html');
      await chrome.tabs.create({ url: helpPageUrl });
      return { success: true, courseCount: 1 };
    }
  } catch (error) {
    console.error(`Error handling webcal protocol: ${error.message}`);
    return { success: false, message: error.message };
  }
}

// Make API request with stored cookies
async function makeApiRequest(url, data) {
  try {
    // Get stored cookies
    const { cookies } = await chrome.storage.local.get(['cookies']);
    
    // Create cookie header
    let cookieHeader = '';
    if (cookies && cookies.length > 0) {
      cookieHeader = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
    }
    
    // Make the request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...standardHeaders,
        'Cookie': cookieHeader
      },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    throw error;
  }
}

// Create and download a zip file with multiple files
async function downloadZipFile(entries, filename) {
  try {
    console.log(`Creating zip file with ${entries.length} entries`);
    
    // Create a new zip file
    const zip = new JSZip();
    
    // Add each entry to the zip
    entries.forEach(entry => {
      zip.file(entry.filename, entry.content);
    });
    
    // Generate the zip file as an array buffer instead of blob
    // This works in service workers which don't have URL.createObjectURL
    console.log('Generating zip file as array buffer...');
    const content = await zip.generateAsync({ type: 'arraybuffer' });
    console.log('Zip arraybuffer generated, size:', content.byteLength);
    
    // Create a DataURL from the array buffer - this works in service workers
    const base64Content = arrayBufferToBase64(content);
    const dataUrl = `data:application/zip;base64,${base64Content}`;
    
    // Download using data URL (works in service workers)
    console.log('Initiating download via chrome.downloads API with data URL');
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: true
    });
    console.log('Download initiated with ID:', downloadId);
    
    return true;
  } catch (error) {
    console.error(`Error creating zip file: ${error.message}`);
    
    // Fallback: download individual files using direct URLs
    console.log('Falling back to individual file downloads');
    try {
      for (const entry of entries) {
        // Convert text to base64 data URL
        const base64Content = btoa(unescape(encodeURIComponent(entry.content)));
        const dataUrl = `data:text/calendar;base64,${base64Content}`;
        
        await chrome.downloads.download({
          url: dataUrl,
          filename: entry.filename,
          saveAs: false
        });
        
        // Slight delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return true;
    } catch (fallbackError) {
      console.error(`Fallback download failed: ${fallbackError.message}`);
      throw error;
    }
  }
}

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer) {
  const binary = [];
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary.push(String.fromCharCode(bytes[i]));
  }
  return btoa(binary.join(''));
}

// Logout function - clear stored data
async function logout() {
  console.log('Logging out');
  
  try {
    // Clear stored data
    await chrome.storage.local.clear();
    
    // Reset variables
    isAuthenticated = false;
    userInfo = {
      fullname: null,
      username: null,
      profilePicture: null
    };
    availableSemesters = [];
    
    console.log('Logout successful');
    return { success: true };
  } catch (error) {
    console.error(`Error during logout: ${error.message}`);
    return { success: false, message: error.message };
  }
}

// Initialize language and theme settings if not yet set
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.get(['uspace_language', 'uspace_theme'], (result) => {
      // Set language if not already set
      if (!result.uspace_language) {
        // Try to use browser language or default to English
        const browserLang = navigator.language.split('-')[0];
        const language = (browserLang === 'de') ? 'de' : DEFAULT_LANGUAGE;
        
        chrome.storage.local.set({ uspace_language: language });
      }
      
      // Set theme if not already set
      if (!result.uspace_theme) {
        chrome.storage.local.set({ uspace_theme: 'system' });
      }
    });
  }
});
