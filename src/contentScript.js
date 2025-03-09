'use strict';

// Content script for uSpace iCal Downloader
// This script can be used for potential future features like:
// - Direct calendar button integration into the uSpace UI
// - Automatic login detection
// - Enhanced UI features

console.log('uSpace iCal Downloader content script loaded');

// Listen for messages from background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Add any functionality needed for content script interactions here
  sendResponse({});
  return true;
});
