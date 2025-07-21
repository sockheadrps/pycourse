let tutorialData = null;
let completedSteps = 0;
let totalSteps = 0;
let isEditingDescription = false;
let currentStepElement = null;
let isAuthenticated = false;
let authToken = null;

// Server-side authentication functions
async function checkAuth() {
  const storedToken = localStorage.getItem('admin_auth_token');
  if (!storedToken) {
    isAuthenticated = false;
    return false;
  }

  try {
    const response = await fetch('/api/auth/check', {
      headers: {
        Authorization: `Bearer ${storedToken}`,
      },
    });

    if (response.ok) {
      authToken = storedToken;
      isAuthenticated = true;
      return true;
    } else {
      // Token is invalid, clear it
      localStorage.removeItem('admin_auth_token');
      authToken = null;
      isAuthenticated = false;
      return false;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    localStorage.removeItem('admin_auth_token');
    authToken = null;
    isAuthenticated = false;
    return false;
  }
}

async function login(password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: password }),
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.token;
      localStorage.setItem('admin_auth_token', authToken);
      isAuthenticated = true;
      updateEditButtonsVisibility();
      showSaveNotification('Authentication successful!', 'success');
      return true;
    } else {
      showSaveNotification('Invalid password!', 'error');
      return false;
    }
  } catch (error) {
    console.error('Login error:', error);
    showSaveNotification('Login failed!', 'error');
    return false;
  }
}

async function logout() {
  try {
    if (authToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  }

  authToken = null;
  localStorage.removeItem('admin_auth_token');
  isAuthenticated = false;
  updateEditButtonsVisibility();
  showSaveNotification('Logged out successfully!', 'success');
}

function updateEditButtonsVisibility() {
  const editButtons = document.querySelectorAll('.step-edit-btn, .code-edit-btn, .video-edit-btn');

  // Batch DOM updates to reduce reflows
  if (isAuthenticated) {
    editButtons.forEach((btn) => {
      btn.style.display = 'flex';
      btn.style.opacity = '0.8';
    });
  } else {
    editButtons.forEach((btn) => {
      btn.style.display = 'none';
    });
  }
}

// Load tutorial data

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Step description editing functionality
function toggleStepDescriptionEdit(stepId) {
  const stepItem = document.querySelector(`[data-step-id="${stepId}"]`);
  const descriptionContainer = stepItem.querySelector('.step-description-container');
  const descriptionText = descriptionContainer.querySelector('.step-description');
  const fileElement = stepItem.querySelector('.step-file');
  const editControls = stepItem.querySelector('.step-edit-controls');
  const editBtn = editControls.querySelector('.step-edit-btn');
  const lockIcon = editBtn.querySelector('.lock-icon');

  if (!editBtn.classList.contains('editing')) {
    // Switch to edit mode
    const textarea = document.createElement('textarea');
    textarea.value = descriptionText.textContent;
    textarea.placeholder = 'Enter step description...';
    textarea.className = 'step-description-textarea';

    // Create file input if file element exists
    let fileInput = null;
    if (fileElement) {
      fileInput = document.createElement('input');
      fileInput.type = 'text';
      fileInput.value = fileElement.textContent.replace('📁 ', '');
      fileInput.placeholder = 'Enter file name (e.g., server.py)';
      fileInput.className = 'step-file-input';
    }

    descriptionText.style.display = 'none';
    if (fileElement) fileElement.style.display = 'none';
    stepItem.insertBefore(textarea, stepItem.querySelector('.code-preview'));
    if (fileInput) stepItem.insertBefore(fileInput, stepItem.querySelector('.code-preview'));

    // Create save and cancel buttons
    const saveBtn = document.createElement('button');
    saveBtn.className = 'step-edit-btn editing';
    saveBtn.title = 'Save Changes';
    saveBtn.innerHTML = '<span class="lock-icon">💾</span>';
    saveBtn.onclick = () => saveStepDescription(stepId, textarea, fileInput, fileElement);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'step-edit-btn cancel';
    cancelBtn.title = 'Cancel Changes';
    cancelBtn.innerHTML = '<span class="lock-icon">✕</span>';
    cancelBtn.onclick = () =>
      cancelStepDescription(
        stepId,
        textarea,
        descriptionText,
        editControls,
        fileInput,
        fileElement
      );

    editControls.innerHTML = '';
    editControls.appendChild(saveBtn);
    editControls.appendChild(cancelBtn);

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
}

function saveStepDescription(stepId, textarea, fileInput, fileElement) {
  const newDescription = textarea.value.trim();
  if (newDescription) {
    // Parse the unique step ID to get phase and step index
    const [phaseNumber, stepIndex] = stepId.split('-').map(Number);

    // Find the step in tutorial data and update it
    for (const phase of tutorialData.phases) {
      if (phase.phase === phaseNumber) {
        // Use stepIndex - 1 because array is 0-based but stepIndex is 1-based
        const step = phase.steps[stepIndex - 1];
        if (step) {
          step.description = newDescription;
          if (fileInput && fileInput.value.trim()) {
            step.file = fileInput.value.trim();
          }
          break;
        }
      }
    }

    // Update the display
    const stepItem = document.querySelector(`[data-step-id="${stepId}"]`);
    const descriptionContainer = stepItem.querySelector('.step-description-container');
    const descriptionText = descriptionContainer.querySelector('.step-description');
    const editControls = stepItem.querySelector('.step-edit-controls');

    descriptionText.textContent = newDescription;
    textarea.remove();
    descriptionText.style.display = 'block';

    // Update file element if it exists
    if (fileElement && fileInput) {
      const newFileName = fileInput.value.trim();
      if (newFileName) {
        fileElement.textContent = `📁 ${newFileName}`;
      }
      fileElement.style.display = 'block';
      fileInput.remove();
    }

    // Restore original edit button
    editControls.innerHTML = `
            <button class="step-edit-btn" data-step-id="${stepId}" title="Edit Description">
              <span class="lock-icon">🔒</span>
            </button>
          `;

    // Update button visibility based on authentication state
    updateEditButtonsVisibility();

    // Save to file
    saveTutorialData();
  }
}

function cancelStepDescription(
  stepId,
  textarea,
  descriptionText,
  editControls,
  fileInput,
  fileElement
) {
  textarea.remove();
  descriptionText.style.display = 'block';

  // Restore file element if it exists
  if (fileElement) {
    fileElement.style.display = 'block';
  }
  if (fileInput) {
    fileInput.remove();
  }

  // Restore original edit button
  editControls.innerHTML = `
          <button class="step-edit-btn" data-step-id="${stepId}" title="Edit Description">
            <span class="lock-icon">🔒</span>
          </button>
        `;

  // Update button visibility based on authentication state
  updateEditButtonsVisibility();
}

// Code snippet editing functionality
function toggleCodeEdit(stepId) {
  const stepItem = document.querySelector(`[data-step-id="${stepId}"]`);
  const codePreview = stepItem.querySelector('.code-preview');

  // Check if code preview exists
  if (!codePreview) {
    console.warn('No code preview found for step:', stepId);
    return;
  }

  const codeElement = codePreview.querySelector('pre code');
  const editControls = codePreview.querySelector('.code-edit-controls');
  const editBtn = codePreview.querySelector('.code-edit-btn');
  const copyBtn = codePreview.querySelector('.code-copy-btn');

  if (!editBtn.classList.contains('editing')) {
    // Switch to edit mode
    const textarea = document.createElement('textarea');
    textarea.value = codeElement.textContent;
    textarea.placeholder = 'Enter code snippet...';

    // Add tab handling to insert tab character instead of losing focus
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;

        // Insert tab character at cursor position
        this.value = this.value.substring(0, start) + '\t' + this.value.substring(end);

        // Move cursor after the inserted tab
        this.selectionStart = this.selectionEnd = start + 1;
      }
    });

    codeElement.parentElement.style.display = 'none';
    codePreview.insertBefore(textarea, editControls);

    // Create save and cancel buttons
    const saveBtn = document.createElement('button');
    saveBtn.className = 'code-edit-btn editing';
    saveBtn.title = 'Save Code Changes';
    saveBtn.innerHTML = '<span class="lock-icon">💾</span>';
    saveBtn.onclick = () => saveCodeSnippet(stepId, textarea, codeElement, editControls);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'code-edit-btn cancel';
    cancelBtn.title = 'Cancel Code Changes';
    cancelBtn.innerHTML = '<span class="lock-icon">✕</span>';
    cancelBtn.onclick = () => cancelCodeSnippet(stepId, textarea, codeElement, editControls);

    // Hide original buttons and add save/cancel
    editBtn.style.display = 'none';
    copyBtn.style.display = 'none';
    editControls.appendChild(saveBtn);
    editControls.appendChild(cancelBtn);

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
}

function saveCodeSnippet(stepId, textarea, codeElement, editBtn) {
  const newCode = textarea.value;
  if (newCode) {
    // Parse the unique step ID to get phase and step index
    const [phaseNumber, stepIndex] = stepId.split('-').map(Number);

    // Find the step in tutorial data and update it
    for (const phase of tutorialData.phases) {
      if (phase.phase === phaseNumber) {
        // Use stepIndex - 1 because array is 0-based but stepIndex is 1-based
        const step = phase.steps[stepIndex - 1];
        if (step) {
          step.code_snippet = newCode;
          break;
        }
      }
    }

    // Update the display
    codeElement.textContent = newCode;
    textarea.remove();
    codeElement.parentElement.style.display = 'block';

    // Re-highlight the code with proper language detection
    if (window.Prism) {
      // Get the language class from the pre element
      const preElement = codeElement.parentElement;
      const languageClass = Array.from(preElement.classList).find((cls) =>
        cls.startsWith('language-')
      );
      if (languageClass) {
        const language = languageClass.replace('language-', '');
        codeElement.className = `language-${language}`;
        Prism.highlightElement(codeElement);
      } else {
        // Fallback to highlighting without specific language
        Prism.highlightElement(codeElement);
      }
    }

    // Remove save and cancel buttons
    const saveBtn = codeElement.parentElement.parentElement.querySelector('.code-edit-btn.editing');
    const cancelBtn =
      codeElement.parentElement.parentElement.querySelector('.code-edit-btn.cancel');
    if (saveBtn) saveBtn.remove();
    if (cancelBtn) cancelBtn.remove();

    // Show original edit button
    editBtn.style.display = 'flex';

    // Update button visibility based on authentication state
    updateEditButtonsVisibility();

    // Save to file
    saveTutorialData();
  }
}

function cancelCodeSnippet(stepId, textarea, codeElement, editBtn) {
  textarea.remove();
  codeElement.parentElement.style.display = 'block';

  // Remove save and cancel buttons
  const saveBtn = codeElement.parentElement.parentElement.querySelector('.code-edit-btn.editing');
  const cancelBtn = codeElement.parentElement.parentElement.querySelector('.code-edit-btn.cancel');
  if (saveBtn) saveBtn.remove();
  if (cancelBtn) cancelBtn.remove();

  // Show original edit button
  editBtn.style.display = 'flex';

  // Update button visibility based on authentication state
  updateEditButtonsVisibility();
}

// Video editing functionality
function toggleVideoEdit() {
  const videoContainer = document.querySelector('.youtube-video-container');
  const videoWrapper = videoContainer.querySelector('.youtube-video-wrapper');
  const editControls = videoContainer.querySelector('.video-edit-controls');
  const editBtn = editControls.querySelector('.video-edit-btn');

  if (!editBtn.classList.contains('editing')) {
    // Switch to edit mode
    const iframe = videoWrapper.querySelector('iframe');
    const currentSrc = iframe.src;
    const videoId = currentSrc.split('/embed/')[1]?.split('?')[0] || '';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
    input.placeholder = 'Enter YouTube video URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)';
    input.className = 'video-url-input';
    input.style.cssText = `
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #4a5568;
      border-radius: 10px;
      font-size: 16px;
      background: #2d3748;
      color: #e2e8f0;
      margin-bottom: 10px;
    `;

    videoWrapper.style.display = 'none';
    videoContainer.insertBefore(input, videoWrapper);

    // Create save and cancel buttons
    const saveBtn = document.createElement('button');
    saveBtn.className = 'video-edit-btn editing';
    saveBtn.title = 'Save Changes';
    saveBtn.innerHTML = '<span class="lock-icon">💾</span>';
    saveBtn.onclick = () => saveVideoUrl(input, videoWrapper, editControls);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'video-edit-btn cancel';
    cancelBtn.title = 'Cancel Changes';
    cancelBtn.innerHTML = '<span class="lock-icon">✕</span>';
    cancelBtn.onclick = () => cancelVideoEdit(input, videoWrapper, editControls);

    editControls.innerHTML = '';
    editControls.appendChild(saveBtn);
    editControls.appendChild(cancelBtn);

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

async function saveVideoUrl(input, videoWrapper, editControls) {
  const videoUrl = input.value.trim();

  if (videoUrl) {
    // Extract video ID from URL
    let videoId = '';
    if (videoUrl.includes('youtube.com/watch?v=')) {
      videoId = videoUrl.split('v=')[1]?.split('&')[0] || '';
    } else if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
    } else {
      // Assume it's already a video ID
      videoId = videoUrl;
    }

    if (videoId) {
      // Update the iframe
      const iframe = videoWrapper.querySelector('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0`;

      // Update tutorial data
      if (tutorialData) {
        tutorialData.youtube_video = videoUrl;
      }

      showSaveNotification('Video URL saved successfully!', 'success');

      // Save changes to server
      await saveTutorialData();
    } else {
      showSaveNotification('Invalid YouTube URL!', 'error');
      return;
    }
  }

  // Restore edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'video-edit-btn';
  editBtn.setAttribute('data-tutorial-video', 'true');
  editBtn.title = 'Edit Video URL';
  editBtn.innerHTML = '<span class="lock-icon">🔒</span>';
  editBtn.onclick = toggleVideoEdit;

  editControls.innerHTML = '';
  editControls.appendChild(editBtn);

  // Show video and remove input
  videoWrapper.style.display = 'block';
  input.remove();
}

function cancelVideoEdit(input, videoWrapper, editControls) {
  // Restore edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'video-edit-btn';
  editBtn.setAttribute('data-tutorial-video', 'true');
  editBtn.title = 'Edit Video URL';
  editBtn.innerHTML = '<span class="lock-icon">🔒</span>';
  editBtn.onclick = toggleVideoEdit;

  editControls.innerHTML = '';
  editControls.appendChild(editBtn);

  // Show video and remove input
  videoWrapper.style.display = 'block';
  input.remove();
}

// Copy code snippet to clipboard
async function copyCodeToClipboard(stepId) {
  const stepItem = document.querySelector(`[data-step-id="${stepId}"]`);
  const codePreview = stepItem.querySelector('.code-preview');

  // Check if code preview exists
  if (!codePreview) {
    console.warn('No code preview found for step:', stepId);
    return;
  }

  const codeElement = codePreview.querySelector('pre code');
  const codeText = codeElement.textContent;

  try {
    await navigator.clipboard.writeText(codeText);

    // Show success feedback
    const copyBtn = stepItem.querySelector('.code-copy-btn');
    const originalIcon = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span class="copy-icon">✅</span>';
    copyBtn.title = 'Copied!';

    setTimeout(() => {
      copyBtn.innerHTML = originalIcon;
      copyBtn.title = 'Copy to Clipboard';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy code to clipboard:', err);

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = codeText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    // Show success feedback
    const copyBtn = stepItem.querySelector('.code-copy-btn');
    const originalIcon = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span class="copy-icon">✅</span>';
    copyBtn.title = 'Copied!';

    setTimeout(() => {
      copyBtn.innerHTML = originalIcon;
      copyBtn.title = 'Copy to Clipboard';
    }, 2000);
  }
}

function toggleCodeVisibility(stepId) {
  const stepItem = document.querySelector(`[data-step-id="${stepId}"]`);
  const codeContent = stepItem.querySelector('.code-content');
  const toggleBtn = stepItem.querySelector('.code-toggle-btn');

  if (codeContent && toggleBtn) {
    const isCollapsed = codeContent.classList.contains('collapsed');

    if (isCollapsed) {
      // Expand
      codeContent.classList.remove('collapsed');
      codeContent.classList.add('expanded');
      toggleBtn.innerHTML = '▲';
      toggleBtn.title = 'Hide code';
      toggleBtn.classList.add('expanded');
    } else {
      // Collapse
      codeContent.classList.remove('expanded');
      codeContent.classList.add('collapsed');
      toggleBtn.innerHTML = '▼';
      toggleBtn.title = 'Show code';
      toggleBtn.classList.remove('expanded');
    }
  }
}

async function saveTutorialData() {
  if (!isAuthenticated || !authToken) {
    showSaveNotification('Authentication required to save changes', 'error');
    return;
  }

  // Extract guide slug from current URL
  const urlPath = window.location.pathname;
  const guideSlugMatch = urlPath.match(/\/guides\/([^\/]+)\/tutorial/);
  const guideSlug = guideSlugMatch ? guideSlugMatch[1] : 'fastapi-chat-app';

  try {
    const response = await fetch('/save-tutorial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        guide_slug: guideSlug,
        tutorial_data: tutorialData,
      }),
    });

    if (response.ok) {
      const responseData = await response.json();
      showSaveNotification();
    } else if (response.status === 401) {
      // Authentication failed, clear token and show login
      authToken = null;
      isAuthenticated = false;
      localStorage.removeItem('admin_auth_token');
      updateEditButtonsVisibility();
      showSaveNotification('Session expired. Please login again.', 'error');
    } else {
      const errorData = await response.text();
      console.error('Failed to save tutorial data:', response.status, errorData);
      showSaveNotification('Error saving description', 'error');
    }
  } catch (error) {
    console.error('Error saving tutorial data:', error);
    showSaveNotification('Error saving description', 'error');
  }
}

function showSaveNotification(message = 'Description saved successfully!', type = 'success') {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('saveNotification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'saveNotification';
    notification.className = 'save-notification';
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.className = `save-notification ${type}`;
  notification.style.display = 'block';
  notification.classList.add('show');

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.style.display = 'none';
    }, 300);
  }, 3000);
}

// Remove all WebSocket and VS Code connection JS, event listeners, and button logic

// TOC tracking functionality
function initializeTOCTracking() {
  // Set up intersection observer to track which step is currently visible
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Update TOC when a step becomes visible
          updateTOCIndicator(entry.target);
        }
      });
    },
    {
      threshold: 0.1, // Trigger when 10% of the step is visible
      rootMargin: '-10% 0px -10% 0px', // Ensure we're tracking the middle 80% of the viewport
    }
  );

  // Observe all step items
  const stepItems = document.querySelectorAll('.step-item');
  stepItems.forEach((step, index) => {
    observer.observe(step);
  });

  // Initialize with first step
  const firstStep = document.querySelector('.step-item');
  if (firstStep) {
    updateTOCIndicator(firstStep);
  }
}

function updateTOCIndicator(stepElement) {
  if (!stepElement || currentStepElement === stepElement) return;

  currentStepElement = stepElement;
  const stepId = stepElement.dataset.stepId;

  if (!stepId) return;

  const [phaseNumber, stepNumber] = stepId.split('-').map(Number);

  // Find the step data using phase number and step index
  let stepData = null;
  for (const phase of tutorialData.phases) {
    if (phase.phase === phaseNumber) {
      // stepNumber is 1-based, but array is 0-based
      const stepIndex = stepNumber - 1;
      if (stepIndex >= 0 && stepIndex < phase.steps.length) {
        stepData = phase.steps[stepIndex];
        break;
      }
    }
  }

  if (stepData) {
    document.getElementById('tocStepNumber').textContent = `${phaseNumber}.${stepNumber}`;
    document.getElementById('tocStepTitle').textContent =
      stepData.title || stepData.description || '(No title)';
    document.getElementById('tocStepFile').textContent = stepData.file || '–';
  }
}

function toggleToc() {
  const tocIndicator = document.getElementById('tocIndicator');

  if (tocIndicator.classList.contains('compact')) {
    // Switch to detailed view
    tocIndicator.classList.remove('compact');
  } else {
    // Switch to compact view
    tocIndicator.classList.add('compact');
  }
}

// Tab switching functionality
function switchTab(tabName) {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const tocIndicator = document.getElementById('tocIndicator');

  // Remove active class from all buttons and contents
  tabButtons.forEach((btn) => btn.classList.remove('active'));
  tabContents.forEach((content) => content.classList.remove('active'));

  // Add active class to clicked button and corresponding content
  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
  const activeContent = document.getElementById(tabName + '-tab');

  if (activeButton) activeButton.classList.add('active');
  if (activeContent) activeContent.classList.add('active');

  //Hide TOC indicator when on flow tab, show when on tutorial tab
  if (tabName === 'flow') {
    tocIndicator.style.display = 'none';
  } else {
    tocIndicator.style.display = 'block';
  }

  // Re-highlight code blocks when switching tabs
  if (window.Prism) {
    Prism.highlightAll();
  }
}

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Set tutorial tab as active by default
  switchTab('tutorial');
}

// Initialize Prism highlighting
function initializePrism() {
  if (window.Prism) {
    Prism.highlightAll();
  }
}

// Initialize Prism with delay to ensure DOM is ready
function initializePrismWithDelay() {
  setTimeout(() => {
    initializePrism();
  }, 10);
}

function countTotalSteps(data) {
  if (!data || !data.phases) {
    console.warn('Invalid data structure for countTotalSteps');
    return 0;
  }
  return data.phases.reduce((total, phase) => total + phase.steps.length, 0);
}

// Initialize
document.addEventListener('DOMContentLoaded', async function () {
  // Check authentication first
  await checkAuth();
  updateEditButtonsVisibility();

  // Use the tutorial data that's already available globally from Jinja template
  if (window.tutorialData) {
    tutorialData = window.tutorialData;
    totalSteps = window.totalSteps || countTotalSteps(tutorialData);

    // Now that data is ready and HTML is rendered:
    initializeTOCTracking();
    initializeTabs(); // Initialize tabs after data is loaded
    initializePrismWithDelay(); // Initialize Prism after data is loaded

    // Add click listeners to code preview areas for expansion
    const codePreviews = document.querySelectorAll('.code-preview');
    codePreviews.forEach((preview) => {
      preview.addEventListener('click', function (e) {
        // Don't expand if clicking on buttons
        if (
          e.target.closest('.code-edit-btn') ||
          e.target.closest('.code-copy-btn') ||
          e.target.closest('.code-toggle-btn')
        ) {
          return;
        }

        const codeContent = this.querySelector('.code-content');
        const stepId = codeContent?.dataset.stepId;

        if (stepId && codeContent.classList.contains('collapsed')) {
          toggleCodeVisibility(stepId);
        }
      });
    });
  } else {
    console.warn('Tutorial data not available');
  }

  // Add event listener for tab switching
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('tab-button')) {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    }
  });

  // Add event listener for step description and code edit buttons
  document.addEventListener('click', function (e) {
    if (e.target.closest('.step-edit-btn')) {
      const stepId = e.target.closest('.step-edit-btn').dataset.stepId;
      if (stepId) {
        toggleStepDescriptionEdit(stepId);
      }
    } else if (e.target.closest('.code-edit-btn')) {
      const stepId = e.target.closest('.code-edit-btn').dataset.stepId;
      if (stepId) {
        toggleCodeEdit(stepId);
      }
    } else if (e.target.closest('.code-copy-btn')) {
      const stepId = e.target.closest('.code-copy-btn').dataset.stepId;
      if (stepId) {
        copyCodeToClipboard(stepId);
      }
    } else if (e.target.closest('.code-toggle-btn')) {
      const toggleBtn = e.target.closest('.code-toggle-btn');
      const stepId = toggleBtn?.dataset.stepId;
      if (stepId) {
        toggleCodeVisibility(stepId);
      }
    } else if (
      e.target.closest('.video-edit-btn') &&
      !e.target.closest('.video-edit-btn.editing') &&
      !e.target.closest('.video-edit-btn.cancel')
    ) {
      toggleVideoEdit();
    }
  });
});

// Debounced scroll handler to improve performance
let scrollTimeout;
window.addEventListener(
  'scroll',
  () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const steps = document.querySelectorAll('.step-item');
      let currentStep = null;

      steps.forEach((step) => {
        const rect = step.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom > 150) {
          currentStep = step;
        }
      });

      if (currentStep) {
        const stepId = currentStep.getAttribute('data-step-id');
        const [phaseNumber, stepNumber] = stepId.split('-').map(Number);

        const stepTitle = currentStep.querySelector('.step-title')?.innerText ?? '(No title)';
        const stepFile = currentStep.querySelector('.step-file')?.innerText ?? '–';

        // Batch DOM updates
        const tocStepNumber = document.getElementById('tocStepNumber');
        const tocStepTitle = document.getElementById('tocStepTitle');
        const tocStepFile = document.getElementById('tocStepFile');
        
        if (tocStepNumber.textContent !== `${phaseNumber}.${stepNumber}`) {
          tocStepNumber.textContent = `${phaseNumber}.${stepNumber}`;
        }
        if (tocStepTitle.textContent !== stepTitle) {
          tocStepTitle.textContent = stepTitle;
        }
        if (tocStepFile.textContent !== stepFile) {
          tocStepFile.textContent = stepFile;
        }
      }

      const scrollTop = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const scrollPercent = Math.min(100, (scrollTop / docHeight) * 100);
      document.getElementById('tocProgressBar').style.width = `${scrollPercent}%`;
    }, 16); // ~60fps
  },
  { passive: true }
);
