let tutorialData = null;
let completedSteps = 0;
let totalSteps = 0;
let isEditingDescription = false;
let currentStepElement = null;

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

    // Re-highlight the code
    if (window.Prism) {
      Prism.highlightElement(codeElement);
    }

    // Remove save and cancel buttons
    const saveBtn = codeElement.parentElement.parentElement.querySelector('.code-edit-btn.editing');
    const cancelBtn =
      codeElement.parentElement.parentElement.querySelector('.code-edit-btn.cancel');
    if (saveBtn) saveBtn.remove();
    if (cancelBtn) cancelBtn.remove();

    // Show original edit button
    editBtn.style.display = 'flex';

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

async function saveTutorialData() {
  try {
    const response = await fetch('/save-tutorial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guide_slug: 'fastapi-chat-app',
        tutorial_data: tutorialData,
      }),
    });

    if (response.ok) {
      showSaveNotification();
    } else {
      console.error('Failed to save tutorial data');
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

  // Hide TOC indicator when on flow tab, show when on tutorial tab
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

// Initialize tab functionality
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
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
  }, 200);
}

function countTotalSteps(data) {
  if (!data || !data.phases) {
    console.warn('Invalid data structure for countTotalSteps');
    return 0;
  }
  return data.phases.reduce((total, phase) => total + phase.steps.length, 0);
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
  // Use the tutorial data that's already available globally from Jinja template
  if (window.tutorialData) {
    tutorialData = window.tutorialData;
    totalSteps = window.totalSteps || countTotalSteps(tutorialData);

    // Now that data is ready and HTML is rendered:
    initializeTOCTracking();
    initializeTabs(); // Initialize tabs after data is loaded
    initializePrismWithDelay(); // Initialize Prism after data is loaded
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
    }
  });
});

window.addEventListener('scroll', () => {
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

    document.getElementById('tocStepNumber').textContent = `${phaseNumber}.${stepNumber}`;
    document.getElementById('tocStepTitle').textContent = stepTitle;
    document.getElementById('tocStepFile').textContent = stepFile;
  }

  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const scrollPercent = Math.min(100, (scrollTop / docHeight) * 100);
  document.getElementById('tocProgressBar').style.width = `${scrollPercent}%`;
});
