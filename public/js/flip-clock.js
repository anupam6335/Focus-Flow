/**
 * FocusFlow - Flip Clock Timer Integration - WORKING VERSION WITH SOUND
 */
class FlipClockTimer {
  constructor() {
    this.state = {
      isRunning: false,
      totalSeconds: 0,
      remainingSeconds: 0,
      timerInterval: null,
      previousTimer: this.getStoredPreviousTimer(),
      currentDisplay: { minutes: 5, seconds: 0 }, // Start with 5:00
      soundEnabled: true,
    };
    this.elements = {};

    this.init();
  }

  getStoredPreviousTimer() {
    try {
      const stored = localStorage.getItem("focusFlow-previousTimer");
      return stored ? JSON.parse(stored) : { minutes: 5, seconds: 0 };
    } catch (error) {
      return { minutes: 5, seconds: 0 };
    }
  }

  savePreviousTimer(minutes, seconds) {
    try {
      const timer = { minutes, seconds };
      localStorage.setItem("focusFlow-previousTimer", JSON.stringify(timer));
      this.state.previousTimer = timer;
    } catch (error) {
      console.warn("Failed to save previous timer:", error);
    }
  }

  init() {
    try {
      this.initializeElements();
      this.setupEventListeners();

      // Initialize display with 5:00
      this.initializeDisplay();

      this.state.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize flip clock timer:", error);
    }
  }

  initializeElements() {
    // Basic control elements
    const elementIds = [
      "clock-set",
      "clock-stop",
      "clock-reset",
      "timer-set-modal",
      "close-timer-modal",
      "cancel-timer-modal",
      "start-timer-modal",
      "minutes-input",
      "seconds-input",
    ];

    elementIds.forEach((id) => {
      this.elements[id] = document.getElementById(id);
    });

    // Set initial values from previous timer
    if (this.state.previousTimer) {
      this.setTime(
        this.state.previousTimer.minutes,
        this.state.previousTimer.seconds
      );
    }
  }

  initializeDisplay() {
    // Initialize with 5:00 by default
    const defaultMinutes = 5;
    const defaultSeconds = 0;

    // Update the state
    this.state.currentDisplay = {
      minutes: defaultMinutes,
      seconds: defaultSeconds,
    };

    // Update the visual display without animation for initial load
    this.updateFlipClockDisplay(defaultMinutes, defaultSeconds, true);
    this.updateButtonStates();
  }

  setupEventListeners() {
    // Clock set button
    if (this.elements["clock-set"]) {
      this.elements["clock-set"].addEventListener("click", () => {
        this.showTimerModal();
      });
    }

    // Other control buttons
    if (this.elements["clock-stop"]) {
      this.elements["clock-stop"].addEventListener("click", () => {
        this.togglePlayStop();
      });
    }

    if (this.elements["clock-reset"]) {
      this.elements["clock-reset"].addEventListener("click", () => {
        this.resetTimer();
      });
    }

    // Modal buttons
    if (this.elements["close-timer-modal"]) {
      this.elements["close-timer-modal"].addEventListener("click", () => {
        this.hideTimerModal();
      });
    }

    if (this.elements["cancel-timer-modal"]) {
      this.elements["cancel-timer-modal"].addEventListener("click", () => {
        this.hideTimerModal();
      });
    }

    if (this.elements["start-timer-modal"]) {
      this.elements["start-timer-modal"].addEventListener("click", () => {
        this.startTimerFromModal();
      });
    }

    // Quick presets
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("preset-btn")) {
        const minutes = parseInt(e.target.dataset.minutes) || 0;
        const seconds = parseInt(e.target.dataset.seconds) || 0;
        this.setTime(minutes, seconds);

        // Update active state
        document.querySelectorAll(".preset-btn").forEach((btn) => {
          btn.classList.remove("active");
        });
        e.target.classList.add("active");
      }
    });

    // Keyboard handling
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.elements["timer-set-modal"] &&
        this.elements["timer-set-modal"].style.display === "flex"
      ) {
        this.hideTimerModal();
      }
    });
  }

  showTimerModal() {
    if (!this.elements["timer-set-modal"]) {
      console.error("Timer modal element not found!");
      return;
    }

    this.elements["timer-set-modal"].style.display = "flex";

    // Set previous timer values
    if (this.state.previousTimer) {
      this.setTime(
        this.state.previousTimer.minutes,
        this.state.previousTimer.seconds
      );
    }

    // Focus the minutes input
    setTimeout(() => {
      if (this.elements["minutes-input"]) {
        this.elements["minutes-input"].focus();
        this.elements["minutes-input"].select();
      }
    }, 100);
  }

  hideTimerModal() {
    if (this.elements["timer-set-modal"]) {
      this.elements["timer-set-modal"].style.display = "none";
    }
  }

  setTime(minutes, seconds) {
    if (this.elements["minutes-input"]) {
      this.elements["minutes-input"].value = minutes;
    }
    if (this.elements["seconds-input"]) {
      this.elements["seconds-input"].value = seconds;
    }
  }

  startTimerFromModal() {
    if (!this.elements["minutes-input"] || !this.elements["seconds-input"]) {
      this.showToast("Timer inputs not found");
      return;
    }

    const minutes = parseInt(this.elements["minutes-input"].value) || 0;
    const seconds = parseInt(this.elements["seconds-input"].value) || 0;

    const totalSeconds = minutes * 60 + seconds;

    if (totalSeconds <= 0) {
      this.showToast("Please set a valid time");
      return;
    }

    // Save as previous timer for next time
    this.savePreviousTimer(minutes, seconds);
    this.startTimer(totalSeconds);
    this.hideTimerModal();
  }

  togglePlayStop() {
    if (this.state.isRunning) {
      this.stopTimer();
    } else {
      if (this.state.remainingSeconds === 0 && this.state.totalSeconds > 0) {
        this.state.remainingSeconds = this.state.totalSeconds;
        this.startTimer(this.state.remainingSeconds);
      } else if (this.state.remainingSeconds > 0) {
        this.startTimer(this.state.remainingSeconds);
      } else {
        this.showTimerModal();
      }
    }
  }

  startTimer(totalSeconds) {
    if (this.state.isRunning) {
      this.stopTimer();
    }

    this.state.totalSeconds = totalSeconds;
    this.state.remainingSeconds = totalSeconds;
    this.state.isRunning = true;

    this.updateButtonStates();
    this.updateDisplay();

    this.state.timerInterval = setInterval(() => {
      this.state.remainingSeconds--;
      this.updateDisplay();

      if (this.state.remainingSeconds <= 0) {
        this.timerComplete();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }

    this.state.isRunning = false;
    this.updateButtonStates();
  }

  resetTimer() {
    this.stopTimer();
    this.state.remainingSeconds = this.state.totalSeconds;
    this.updateDisplay();
    this.updateButtonStates();
  }

  updateButtonStates() {
    const isRunning = this.state.isRunning;
    const hasTimeSet = this.state.totalSeconds > 0;
    const hasRemainingTime = this.state.remainingSeconds > 0;

    // Update toggle button
    if (this.elements["clock-stop"]) {
      if (isRunning) {
        this.elements["clock-stop"].innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                    Stop
                `;
        this.elements["clock-stop"].classList.remove("play-btn");
      } else {
        this.elements["clock-stop"].innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5,3 19,12 5,21" fill="currentColor"/>
                    </svg>
                    Play
                `;
        this.elements["clock-stop"].classList.add("play-btn");
      }

      this.elements["clock-stop"].disabled = !hasRemainingTime && !hasTimeSet;
    }

    // Update other buttons
    if (this.elements["clock-set"]) {
      this.elements["clock-set"].disabled = isRunning;
    }

    if (this.elements["clock-reset"]) {
      this.elements["clock-reset"].disabled = !hasTimeSet || isRunning;
    }
  }

  updateDisplay() {
    const minutes = Math.floor(this.state.remainingSeconds / 60);
    const seconds = this.state.remainingSeconds % 60;

    // Only update if the display has actually changed
    if (
      this.state.currentDisplay.minutes !== minutes ||
      this.state.currentDisplay.seconds !== seconds
    ) {
      this.state.currentDisplay = { minutes, seconds };
      this.updateFlipClockDisplay(minutes, seconds, false);
    }
  }

  updateFlipClockDisplay(minutes, seconds, isInitial = false) {
    // Break down into individual digits
    const minuteTen = Math.floor(minutes / 10);
    const minuteUnit = minutes % 10;
    const secondTen = Math.floor(seconds / 10);
    const secondUnit = seconds % 10;

    // Update each digit
    if (isInitial) {
      // For initial load, set without animation
      this.setDigitInitialValue("minute-ten", minuteTen);
      this.setDigitInitialValue("minute-unit", minuteUnit);
      this.setDigitInitialValue("second-ten", secondTen);
      this.setDigitInitialValue("second-unit", secondUnit);
    } else {
      // For updates during timer, use flip animation
      this.updateDigit("minute-ten", minuteTen);
      this.updateDigit("minute-unit", minuteUnit);
      this.updateDigit("second-ten", secondTen);
      this.updateDigit("second-unit", secondUnit);
    }
  }

  setDigitInitialValue(digitClass, value) {
    const card = document.querySelector(`.flip-card.${digitClass}`);
    if (!card) {
      console.warn(`Flip card not found: .${digitClass}`);
      return;
    }

    // Set all elements to the same value without animation
    const top = card.querySelector(".top");
    const bottom = card.querySelector(".bottom");
    const flipTop = card.querySelector(".flip-top");
    const flipBottom = card.querySelector(".flip-bottom");

    if (top) top.textContent = value;
    if (bottom) bottom.textContent = value;
    if (flipTop) flipTop.textContent = value;
    if (flipBottom) flipBottom.textContent = value;
  }

  updateDigit(digitClass, newValue) {
    const card = document.querySelector(`.flip-card.${digitClass}`);
    if (!card) {
      console.warn(`Flip card not found: .${digitClass}`);
      return;
    }

    const top = card.querySelector(".top");
    const bottom = card.querySelector(".bottom");
    const flipTop = card.querySelector(".flip-top");
    const flipBottom = card.querySelector(".flip-bottom");

    if (!top || !bottom || !flipTop || !flipBottom) {
      console.warn(`Card elements not found for: .${digitClass}`);
      return;
    }

    const currentValue = parseInt(top.textContent || "0");

    // Only update if the value has changed
    if (currentValue !== newValue) {
      // Set the new value on flip elements
      flipTop.textContent = currentValue; // Start with current value
      flipBottom.textContent = newValue; // End with new value

      // Set the new value for the next flip
      top.textContent = newValue;
      bottom.textContent = newValue;

      // Add animation class
      card.classList.add("flipping");

      // After animation completes, remove animation class
      setTimeout(() => {
        card.classList.remove("flipping");
        // Reset flip elements for next animation
        flipTop.textContent = newValue;
        flipBottom.textContent = newValue;
      }, 600);
    }
  }
  playCompletionSound() {
    if (!this.state.soundEnabled) return;

    try {
      // Create audio context for the beep sound
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure the beep sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Frequency in Hz
      oscillator.type = "sine";

      // Configure volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.3,
        audioContext.currentTime + 0.1
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 1.5
      );

      // Play the sound
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1.5);

      // Play two more beeps for better notification
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();

        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);

        oscillator2.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator2.type = "sine";

        gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode2.gain.linearRampToValueAtTime(
          0.3,
          audioContext.currentTime + 0.1
        );
        gainNode2.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + 1.0
        );

        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 1.0);
      }, 500);

      setTimeout(() => {
        const oscillator3 = audioContext.createOscillator();
        const gainNode3 = audioContext.createGain();

        oscillator3.connect(gainNode3);
        gainNode3.connect(audioContext.destination);

        oscillator3.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator3.type = "sine";

        gainNode3.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode3.gain.linearRampToValueAtTime(
          0.3,
          audioContext.currentTime + 0.1
        );
        gainNode3.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + 1.0
        );

        oscillator3.start(audioContext.currentTime);
        oscillator3.stop(audioContext.currentTime + 1.0);
      }, 1500);
    } catch (error) {
      console.warn("Could not play completion sound:", error);
      // Fallback: Use browser notification if sound fails
      if (Notification.permission === "granted") {
        new Notification("FocusFlow Timer Complete!", {
          body: "Time to take a break! 🎉",
          icon: "/favicon.ico",
        });
      }
    }
  }

  timerComplete() {
    this.stopTimer();

    // Play completion sound
    this.playCompletionSound();

    // Show visual notification
    this.showToast("Timer finished! Time to take a break 🎉");

    // Reset for next use
    this.state.totalSeconds = 0;
    this.updateButtonStates();
  }

  showToast(message) {
    if (window.app && window.app.showToast) {
      window.app.showToast(message);
    }
  }

  destroy() {
    this.stopTimer();
    this.state.isInitialized = false;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  window.flipClockTimer = new FlipClockTimer();
});

// Also initialize if DOM is already loaded
if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  window.flipClockTimer = new FlipClockTimer();
}
