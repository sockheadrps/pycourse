// Flow Diagram JavaScript
class FlowDiagram {
  constructor() {
    this.currentPhase = 0;
    this.currentStep = 0;
    this.phases = window.flowData.phases || [];
    this.totalPhases = this.phases.length;
    this.isInitialLoad = true;

    this.init();
  }

  init() {
    this.setupKeyboardControls();
    this.updateDisplay();

    // Mark initial load as complete after a short delay
    setTimeout(() => {
      this.isInitialLoad = false;
    }, 500);
  }

  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      // Only handle keyboard events when the flow tab is active
      const flowTab = document.getElementById('flow-tab');
      if (!flowTab || !flowTab.classList.contains('active')) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.previousPhase();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.nextPhase();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.previousStep();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.nextStep();
          break;
        case 'Home':
          e.preventDefault();
          this.goToFirstPhase();
          break;
        case 'End':
          e.preventDefault();
          this.goToLastPhase();
          break;
      }
    });
  }

  previousPhase() {
    if (this.currentPhase > 0) {
      this.currentPhase--;
      this.currentStep = 0;
      this.updateDisplay();
    }
  }

  nextPhase() {
    if (this.currentPhase < this.totalPhases - 1) {
      this.currentPhase++;
      this.currentStep = 0;
      this.updateDisplay();
    }
  }

  previousStep() {
    const currentPhaseSteps = this.phases[this.currentPhase]?.steps || [];
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateDisplay();
    } else if (this.currentPhase > 0) {
      // Go to last step of previous phase
      this.currentPhase--;
      const prevPhaseSteps = this.phases[this.currentPhase]?.steps || [];
      this.currentStep = prevPhaseSteps.length - 1;
      this.updateDisplay();
    }
  }

  nextStep() {
    const currentPhaseSteps = this.phases[this.currentPhase]?.steps || [];
    if (this.currentStep < currentPhaseSteps.length - 1) {
      this.currentStep++;
      this.updateDisplay();
    } else if (this.currentPhase < this.totalPhases - 1) {
      // Go to first step of next phase
      this.currentPhase++;
      this.currentStep = 0;
      this.updateDisplay();
    }
  }

  goToFirstPhase() {
    this.currentPhase = 0;
    this.currentStep = 0;
    this.updateDisplay();
  }

  goToLastPhase() {
    this.currentPhase = this.totalPhases - 1;
    this.currentStep = 0;
    this.updateDisplay();
  }

  updateDisplay() {
    // Remove active classes from all phases and steps
    document.querySelectorAll('.phase').forEach((phase) => {
      phase.classList.remove('active');
    });
    document.querySelectorAll('.step').forEach((step) => {
      step.classList.remove('active');
      step.blur(); // Remove focus from all steps
    });

    // Add active class to current phase
    const currentPhaseElement = document.querySelector(`[data-phase="${this.currentPhase + 1}"]`);
    if (currentPhaseElement) {
      currentPhaseElement.classList.add('active');
    }

    // Add active class and focus to current step
    const currentStepElement = document.querySelector(
      `[data-phase="${this.currentPhase + 1}"] [data-step="${this.currentStep + 1}"]`
    );
    if (currentStepElement) {
      currentStepElement.classList.add('active');
      currentStepElement.focus(); // Add focus to the current step
    }

    // Check if this is the last step of the last phase
    const isLastPhase = this.currentPhase === this.totalPhases - 1;
    const currentPhaseSteps = this.phases[this.currentPhase]?.steps || [];
    const isLastStep = this.currentStep === currentPhaseSteps.length - 1;
    const isLastStepOfLastPhase = isLastPhase && isLastStep;

    // Scroll to position the step appropriately (only after initial load)
    if (!this.isInitialLoad && currentStepElement) {
      if (isLastStepOfLastPhase) {
        // For the very last step, scroll to show it at the bottom
        currentStepElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else {
        // Check if the element is out of view (either above or below viewport)
        const rect = currentStepElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const isAboveViewport = rect.top < 0;
        const isBelowViewport = rect.bottom > viewportHeight;

        if (isAboveViewport) {
          // Element is above viewport - scroll to bring it into view at the top
          const offset = 120; // pixels from top for better spacing
          const elementRect = currentStepElement.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetScrollTop = scrollTop + elementRect.top - offset;

          window.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth',
          });
        } else if (isBelowViewport) {
          // Element is below viewport - scroll to bring it into view
          const offset = 120; // pixels from top for better spacing
          const elementRect = currentStepElement.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetScrollTop = scrollTop + elementRect.top - offset;

          window.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth',
          });
        }
      }
    }
  }
}

// Initialize the flow diagram when the page loads
document.addEventListener('DOMContentLoaded', () => {
  if (window.flowData) {
    new FlowDiagram();
  }
});

// Add some additional interactive features
document.addEventListener('DOMContentLoaded', () => {
  // Add click handlers to phases for quick navigation
  document.querySelectorAll('.phase').forEach((phase, index) => {
    phase.addEventListener('click', () => {
      // You could add quick navigation here if needed
    });
  });

  // Add hover effects for better UX
  document.querySelectorAll('.step').forEach((step) => {
    step.addEventListener('mouseenter', () => {
      // Only apply hover effect if the step is not currently active
      if (!step.classList.contains('active')) {
        step.style.transform = 'scale(1.01)';
      }
    });

    step.addEventListener('mouseleave', () => {
      // Only reset if the step is not currently active
      if (!step.classList.contains('active')) {
        step.style.transform = '';
      }
    });
  });

  // Add smooth scrolling for better navigation
  const smoothScrollTo = (element) => {
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  };

  // Add keyboard shortcuts info (optional)
  const addKeyboardInfo = () => {
    const keyboardInfo = document.createElement('div');
    keyboardInfo.className = 'keyboard-info';
    keyboardInfo.innerHTML = `
            <div style="position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 15px; border-radius: 8px; font-size: 0.9rem; z-index: 1000;">
                <strong>Keyboard Shortcuts:</strong><br>
                ← → Navigate phases<br>
                ↑ ↓ Navigate steps<br>
                Home/End Jump to first/last
            </div>
        `;
    document.body.appendChild(keyboardInfo);
  };

  // Uncomment the line below to show keyboard shortcuts
  // addKeyboardInfo();
});
