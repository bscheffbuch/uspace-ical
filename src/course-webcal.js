// Apply saved theme on load
document.addEventListener('DOMContentLoaded', () => {
  // Check if we have a saved theme preference
  chrome.storage.local.get('uspace_theme', (result) => {
    if (result.uspace_theme) {
      applyTheme(result.uspace_theme);
    }
  });
  
  // Other initialization code...
});

// Apply theme to the page
function applyTheme(theme) {
  // Remove existing theme classes
  document.body.classList.remove('theme-light', 'theme-dark');
  
  // Apply selected theme
  if (theme === 'system') {
    // Use system preference via media queries
  } else {
    // Apply specific theme
    document.body.classList.add(`theme-${theme}`);
  }
}
