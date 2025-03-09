document.addEventListener('DOMContentLoaded', function() {
  const tryAgainBtn = document.getElementById('try-again-btn');
  const downloadBtn = document.getElementById('download-btn');
  
  // Load stored data
  chrome.storage.local.get(['webcalDataUri', 'downloadUrl', 'calendarFilename'], function(data) {
    if (data.webcalDataUri) {
      tryAgainBtn.href = data.webcalDataUri;
      
      // Try to automatically open the webcal URI after a short delay
      setTimeout(() => {
        window.location.href = data.webcalDataUri;
      }, 500);
    } else {
      tryAgainBtn.style.display = 'none';
    }
    
    if (data.downloadUrl && data.calendarFilename) {
      downloadBtn.href = data.downloadUrl;
      downloadBtn.download = data.calendarFilename;
    } else {
      downloadBtn.style.display = 'none';
    }
  });
});
