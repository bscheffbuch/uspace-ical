// Extract calendar ID from URL parameters
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const calendarId = urlParams.get('id');
  const messageElement = document.getElementById('message');
  
  if (calendarId) {
    // Get the calendar data from storage
    chrome.storage.local.get([`calendar_${calendarId}`], (data) => {
      const calendarKey = `calendar_${calendarId}`;
      const calendarData = data[calendarKey];
      
      if (calendarData) {
        // Set the appropriate content type
        document.querySelector('meta[http-equiv="Content-Type"]').setAttribute(
          'content', 'text/calendar; charset=utf-8'
        );
        
        // Output the calendar data
        document.open('text/calendar');
        document.write(calendarData);
        document.close();
        
        // Clean up storage after serving the calendar
        chrome.storage.local.remove([calendarKey]);
      } else {
        messageElement.textContent = "Calendar not found or expired. Please try subscribing again.";
      }
    });
  } else {
    messageElement.textContent = "No calendar ID specified.";
  }
});
