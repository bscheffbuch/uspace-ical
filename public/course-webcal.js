document.addEventListener('DOMContentLoaded', function() {
  const courseList = document.getElementById('course-list');
  const semesterInfo = document.getElementById('semester-info');
  const loadingElement = document.getElementById('loading');
  const noCoursesElement = document.getElementById('no-courses');
  const subscribeAllBtn = document.getElementById('subscribe-all');
  const backLink = document.getElementById('back-link');
  
  const ICAL_BASE_URL = "https://m2-ufind.univie.ac.at/courses/";
  let currentCourses = [];
  let currentSemester = '';
  
  // Load course data from storage
  chrome.storage.local.get(['webcalCourses', 'webcalSemester'], function(data) {
    currentSemester = data.webcalSemester || '';
    currentCourses = data.webcalCourses || [];
    
    // Update semester info
    semesterInfo.textContent = currentSemester ? `Semester: ${currentSemester}` : 'No semester selected';
    
    // Hide loading indicator
    loadingElement.style.display = 'none';
    
    if (currentCourses.length > 0) {
      // Show course list
      courseList.style.display = 'block';
      
      // Render courses
      renderCourses(currentCourses, currentSemester);
    } else {
      // Show no courses message
      noCoursesElement.style.display = 'block';
    }
  });
  
  // Subscribe all button click handler
  subscribeAllBtn.addEventListener('click', function() {
    if (confirm('This will open subscription links for all your courses. Continue?')) {
      currentCourses.forEach(course => {
        if (course.lvNr) {
          openWebcalLink(course.lvNr, currentSemester);
        }
      });
    }
  });
  
  // Back link handler
  backLink.addEventListener('click', function(e) {
    e.preventDefault();
    window.close();
  });
  
  // Render course list
  function renderCourses(courses, semester) {
    courseList.innerHTML = '';
    
    courses.forEach((course, index) => {
      if (!course.lvNr) return; // Skip courses without an ID
      
      const courseItem = document.createElement('li');
      courseItem.className = 'course-item';
      
      const courseInfo = document.createElement('div');
      courseInfo.className = 'course-info';
      
      const courseTitle = document.createElement('div');
      courseTitle.className = 'course-title';
      courseTitle.textContent = course.title;
      
      const courseDetails = document.createElement('div');
      courseDetails.className = 'course-details';
      
      // Add type and teachers info if available
      let detailsText = course.type ? `${course.type}` : '';
      if (course.teachers && course.teachers.length > 0) {
        detailsText += detailsText ? ' | ' : '';
        detailsText += course.teachers.join(', ');
      }
      
      courseDetails.textContent = detailsText;
      
      const subscribeBtn = document.createElement('a');
      subscribeBtn.className = 'btn';
      subscribeBtn.textContent = 'Add to Calendar';
      subscribeBtn.href = '#';
      subscribeBtn.setAttribute('data-course-id', course.lvNr);
      
      subscribeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openWebcalLink(course.lvNr, semester);
        this.textContent = 'Added!';
        this.classList.add('btn-success');
        setTimeout(() => {
          this.textContent = 'Add to Calendar';
          this.classList.remove('btn-success');
        }, 3000);
      });
      
      // Build the course item
      courseInfo.appendChild(courseTitle);
      courseInfo.appendChild(courseDetails);
      courseItem.appendChild(courseInfo);
      courseItem.appendChild(subscribeBtn);
      
      courseList.appendChild(courseItem);
    });
  }
  
  // Open webcal link for a course
  function openWebcalLink(courseId, semester) {
    // Direct URL to iCal file with webcal protocol
    const webcalUrl = `webcal://m2-ufind.univie.ac.at/courses/${courseId}/${semester}/1/ww.ics`;
    
    // Open the webcal URL in a new tab/window
    window.open(webcalUrl, '_blank');
  }
});
