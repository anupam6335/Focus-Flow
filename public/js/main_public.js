/**
 * Optimized Public Landing Page Interactions
 * Reduced animation intensity and improved performance
 */
let landingState = {
  leavesAnimation: true,
  lampLight: true,
  leavesInterval: null,
};

// Debounced resize handler
const debouncedOptimizeLayout = Helper.debounce(optimizeMobileLayout, 250);

function ensureSimultaneousLoad() {
  const publicLanding = document.getElementById("public-landing");
  if (publicLanding) {
    publicLanding.style.display = "none";
    publicLanding.offsetHeight;
    publicLanding.style.display = "flex";
    
    setTimeout(() => {
      publicLanding.classList.add("loaded");
    }, 100);
  }
}

/**
 * Mobile Layout Optimization with debounced resize
 */
function optimizeMobileLayout() {
  const publicLanding = document.getElementById("public-landing");
  if (!publicLanding) return;
  
  const isMobile = window.innerWidth <= 1100;
  if (isMobile) {
    document.body.style.overflow = "hidden";
    publicLanding.style.overflow = "hidden";
    publicLanding.style.height = "100vh";
    
    const content = document.querySelector(".landing-content");
    if (content) {
      const viewportHeight = window.innerHeight;
      const contentHeight = content.scrollHeight;
      if (contentHeight > viewportHeight * 0.8) {
        const scale = (viewportHeight * 0.8) / contentHeight;
        content.style.transform = `scale(${Math.min(scale, 0.9)})`;
      }
    }
  } else {
    document.body.style.overflow = "";
    publicLanding.style.overflow = "";
  }
}

// Initialize mobile optimization
function initMobileOptimization() {
  optimizeMobileLayout();
  window.addEventListener("resize", debouncedOptimizeLayout);
  window.addEventListener("orientationchange", function () {
    setTimeout(optimizeMobileLayout, 100);
  });
}

function initLandingPage() {
  setupLandingAnimations();
  setupLandingEventListeners();
  createLandingSandFlow();
  initMobileOptimization();
}

// Setup landing animations with reduced intensity
function setupLandingAnimations() {
  landingState.leavesAnimation = true;
  landingState.lampLight = true;
  
  startLandingLeavesAnimation();
  enableLandingLampLight();
  updateLandingAnimationUI();
}

// Setup event listeners for landing page
function setupLandingEventListeners() {
  const leavesToggle = document.getElementById("landing-toggle-leaves");
  const lampToggle = document.getElementById("landing-toggle-lamp");
  const studyLampBtn = document.getElementById("study-lamp-btn");
  
  if (leavesToggle) {
    leavesToggle.addEventListener("click", toggleLandingLeavesAnimation);
  }
  if (lampToggle) {
    lampToggle.addEventListener("click", toggleLandingLampLight);
  }
  if (studyLampBtn) {
    studyLampBtn.addEventListener("click", handleStudyLamp);
  }
}

// Update landing animation UI state
function updateLandingAnimationUI() {
  const leavesToggle = document.getElementById("landing-toggle-leaves");
  const lampToggle = document.getElementById("landing-toggle-lamp");
  
  if (leavesToggle) {
    leavesToggle.setAttribute("aria-pressed", "true");
    const toggleText = leavesToggle.querySelector(".toggle-text");
    if (toggleText) toggleText.textContent = "Leaves: On";
  }
  if (lampToggle) {
    lampToggle.setAttribute("aria-pressed", "true");
    const toggleText = lampToggle.querySelector(".toggle-text");
    if (toggleText) toggleText.textContent = "Lamp: Light";
  }
}

// Leaves animation controls - OPTIMIZED PERFORMANCE
function toggleLandingLeavesAnimation() {
  landingState.leavesAnimation = !landingState.leavesAnimation;
  const leavesToggle = document.getElementById("landing-toggle-leaves");
  
  if (leavesToggle) {
    leavesToggle.setAttribute("aria-pressed", landingState.leavesAnimation);
    const toggleText = leavesToggle.querySelector(".toggle-text");
    if (toggleText) {
      toggleText.textContent = `Leaves: ${landingState.leavesAnimation ? "On" : "Off"}`;
    }
  }
  
  if (landingState.leavesAnimation) {
    startLandingLeavesAnimation();
  } else {
    stopLandingLeavesAnimation();
  }
}

function startLandingLeavesAnimation() {
  const petalsContainer = document.getElementById("landing-petals");
  if (!petalsContainer) return;
  
  petalsContainer.innerHTML = "";
  
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  
  // Reduced initial petal count for performance
  for (let i = 0; i < 15; i++) {
    createLandingPetal(true);
  }
  
  // Slower interval for better performance
  landingState.leavesInterval = setInterval(() => {
    const currentPetals = document.querySelectorAll(".landing-petal").length;
    if (currentPetals < 20) {
      createLandingPetal();
    }
  }, 1500);
}

function createLandingPetal(initial = false) {
  const petalsContainer = document.getElementById("landing-petals");
  if (!petalsContainer) return;
  
  const petal = document.createElement("div");
  petal.className = "landing-petal";
  
  const isMobile = window.innerWidth < 768;
  const left = isMobile ? 10 + Math.random() * 80 : 5 + Math.random() * 90;
  const delay = initial ? Math.random() * 5 : 0;
  const duration = isMobile ? 12 + Math.random() * 6 : 10 + Math.random() * 8;
  const size = 0.6 + Math.random() * 0.8;
  const horizontalDrift = (Math.random() - 0.5) * (isMobile ? 30 : 50);
  
  const leafType = Math.floor(Math.random() * 3) + 1;
  const leafColor = Math.floor(Math.random() * 4) + 1;
  
  petal.innerHTML = getLandingLeafSVG(leafType, leafColor);
  
  // Use transform3d for GPU acceleration
  petal.style.cssText = `
    left: ${left}%;
    animation: landing-petal-fall ${duration}s linear ${delay}s forwards;
    transform: translate3d(${horizontalDrift}px, 0, 0) scale(${size});
    opacity: 0;
    will-change: transform, opacity;
  `;
  
  petalsContainer.appendChild(petal);
  
  setTimeout(() => {
    petal.style.opacity = "0.8";
  }, 50);
  
  setTimeout(() => {
    if (petal.parentNode) {
      petal.parentNode.removeChild(petal);
    }
  }, (duration + delay) * 1000);
}

function getLandingLeafSVG(type, colorClass) {
  const leafSVGs = {
    1: `<svg class="leaf-svg leaf-${colorClass}" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
         <g transform="scale(1.25)">
           <path d="M12.295,14.201 C12.43,14.088 12.557,13.969 12.676,13.847 C10.687,12.944 9.178,11.848 7.818,10.739 C6.194,10.735 4.52,10.321 3.663,9.262 C4.94,9.905 6.284,9.908 6.737,9.847 C2.898,6.381 1.835,2.992 1.835,2.992 C3.149,5.052 4.536,6.644 5.894,7.908 C5.325,6.82 5.658,4.808 5.658,4.808 C6.765,8.706 6.895,8.768 6.822,8.802 C7.722,9.531 8.697,10.216 9.509,10.739 C9.217,10.059 9.01,9.068 9.037,7.37 C9.037,7.37 9.759,10.932 10.893,11.809 C11.796,12.33 12.591,12.734 13.207,13.041 C14.183,11.585 14.188,7.703 11.796,6.144 C9.218,4.462 4.871,4.398 0.474,0.096 C-0.841,-1.191 1.603,10.132 5.144,13.289 C7.32,15.234 10.152,15.99 12.295,14.201 Z"/>
           <path d="M11.266,14.064 C11.266,14.064 12.446,14.677 13.8,15.275 C15.154,15.873 15.803,15.752 15.879,15.9 C15.957,16.05 15.918,14.258 15.918,14.258 C15.918,14.258 14.09,14.691 12.055,13.562 L11.266,14.064 Z"/>
         </g>
       </svg>`,
    2: `<svg class="leaf-svg leaf-${colorClass}" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
         <g transform="translate(20,0) scale(-1.25,1.25)">
           <path d="M12.295,14.201 C12.43,14.088 12.557,13.969 12.676,13.847 C10.687,12.944 9.178,11.848 7.818,10.739 C6.194,10.735 4.52,10.321 3.663,9.262 C4.94,9.905 6.284,9.908 6.737,9.847 C2.898,6.381 1.835,2.992 1.835,2.992 C3.149,5.052 4.536,6.644 5.894,7.908 C5.325,6.82 5.658,4.808 5.658,4.808 C6.765,8.706 6.895,8.768 6.822,8.802 C7.722,9.531 8.697,10.216 9.509,10.739 C9.217,10.059 9.01,9.068 9.037,7.37 C9.037,7.37 9.759,10.932 10.893,11.809 C11.796,12.33 12.591,12.734 13.207,13.041 C14.183,11.585 14.188,7.703 11.796,6.144 C9.218,4.462 4.871,4.398 0.474,0.096 C-0.841,-1.191 1.603,10.132 5.144,13.289 C7.32,15.234 10.152,15.99 12.295,14.201 Z"/>
           <path d="M11.266,14.064 C11.266,14.064 12.446,14.677 13.8,15.275 C15.154,15.873 15.803,15.752 15.879,15.9 C15.957,16.05 15.918,14.258 15.918,14.258 C15.918,14.258 14.09,14.691 12.055,13.562 L11.266,14.064 Z"/>
         </g>
       </svg>`,
    3: `<svg class="leaf-svg leaf-${colorClass}" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
         <g transform="translate(10,10) rotate(-18) translate(-10,-10) scale(1.25)">
           <path d="M12.295,14.201 C12.43,14.088 12.557,13.969 12.676,13.847 C10.687,12.944 9.178,11.848 7.818,10.739 C6.194,10.735 4.52,10.321 3.663,9.262 C4.94,9.905 6.284,9.908 6.737,9.847 C2.898,6.381 1.835,2.992 1.835,2.992 C3.149,5.052 4.536,6.644 5.894,7.908 C5.325,6.82 5.658,4.808 5.658,4.808 C6.765,8.706 6.895,8.768 6.822,8.802 C7.722,9.531 8.697,10.216 9.509,10.739 C9.217,10.059 9.01,9.068 9.037,7.37 C9.037,7.37 9.759,10.932 10.893,11.809 C11.796,12.33 12.591,12.734 13.207,13.041 C14.183,11.585 14.188,7.703 11.796,6.144 C9.218,4.462 4.871,4.398 0.474,0.096 C-0.841,-1.191 1.603,10.132 5.144,13.289 C7.32,15.234 10.152,15.99 12.295,14.201 Z"/>
           <path d="M11.266,14.064 C11.266,14.064 12.446,14.677 13.8,15.275 C15.154,15.873 15.803,15.752 15.879,15.9 C15.957,16.05 15.918,14.258 15.918,14.258 C15.918,14.258 14.09,14.691 12.055,13.562 L11.266,14.064 Z"/>
         </g>
       </svg>`,
  };
  
  return leafSVGs[type] || leafSVGs[1];
}

function stopLandingLeavesAnimation() {
  if (landingState.leavesInterval) {
    clearInterval(landingState.leavesInterval);
    landingState.leavesInterval = null;
  }
  
  document.querySelectorAll(".landing-petal").forEach((petal) => {
    petal.style.opacity = "0";
    setTimeout(() => {
      if (petal.parentNode) {
        petal.parentNode.removeChild(petal);
      }
    }, 800);
  });
}

// Lamp light controls
function toggleLandingLampLight() {
  landingState.lampLight = !landingState.lampLight;
  const lampToggle = document.getElementById("landing-toggle-lamp");
  
  if (lampToggle) {
    lampToggle.setAttribute("aria-pressed", landingState.lampLight);
    const toggleText = lampToggle.querySelector(".toggle-text");
    if (toggleText) {
      toggleText.textContent = `Lamp: ${landingState.lampLight ? "Light" : "Dim"}`;
    }
  }
  
  if (landingState.lampLight) {
    enableLandingLampLight();
  } else {
    disableLandingLampLight();
  }
}

function enableLandingLampLight() {
  const lampGlow = document.getElementById("landing-lamp-glow");
  const lampContainer = document.getElementById("landing-lamp");
  
  if (lampGlow) {
    lampGlow.style.opacity = "0.6";
  }
  if (lampContainer) {
    lampContainer.style.opacity = "0.8";
  }
}

function disableLandingLampLight() {
  const lampGlow = document.getElementById("landing-lamp-glow");
  const lampContainer = document.getElementById("landing-lamp");
  
  if (lampGlow) {
    lampGlow.style.opacity = "0.1";
  }
  if (lampContainer) {
    lampContainer.style.opacity = "0.3";
  }
}

// Sand flow animation with reduced intensity
function createLandingSandFlow() {
  const sandFlow = document.querySelector(".landing-sand-flow");
  if (!sandFlow) return;
  
  sandFlow.innerHTML = "";
  
  // Reduced grain count for performance
  for (let i = 0; i < 3; i++) {
    createLandingSandGrain(i * 0.8);
  }
}

function createLandingSandGrain(delay = 0) {
  const sandFlow = document.querySelector(".landing-sand-flow");
  if (!sandFlow) return;
  
  const grain = document.createElement("div");
  grain.className = "sand-grain";
  const duration = 4 + Math.random() * 2; // Slower fall
  const startDelay = delay + Math.random() * 1;
  
  grain.style.cssText = `
    animation: sand-flow-fall ${duration}s linear ${startDelay}s infinite;
    top: ${-8 - Math.random() * 4}px;
    background: linear-gradient(45deg, #fda085, #f6d365);
  `;
  
  sandFlow.appendChild(grain);
}

// Study lamp handler
function handleStudyLamp() {
  const lampToggle = document.getElementById("landing-toggle-lamp");
  if (lampToggle) {
    landingState.lampLight = !landingState.lampLight;
    lampToggle.setAttribute("aria-pressed", landingState.lampLight);
    
    const toggleText = lampToggle.querySelector(".toggle-text");
    if (toggleText) {
      toggleText.textContent = `Lamp: ${landingState.lampLight ? "Light" : "Dim"}`;
    }
    
    if (landingState.lampLight) {
      enableLandingLampLight();
    } else {
      disableLandingLampLight();
    }
    
    const studyBtn = document.getElementById("study-lamp-btn");
    if (studyBtn) {
      studyBtn.style.transform = "scale(0.95)";
      setTimeout(() => {
        studyBtn.style.transform = "";
      }, 200);
    }
  }
}

// Cleanup function to prevent memory leaks
function cleanupLandingPage() {
  if (landingState.leavesInterval) {
    clearInterval(landingState.leavesInterval);
  }
  window.removeEventListener("resize", debouncedOptimizeLayout);
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  const publicLanding = document.getElementById("public-landing");
  if (publicLanding && publicLanding.style.display !== "none") {
    initLandingPage();
    ensureSimultaneousLoad();
  }
});

// Export functions for global access with cleanup
window.landingApp = {
  toggleLandingLeavesAnimation,
  toggleLandingLampLight,
  handleStudyLamp,
  cleanupLandingPage
};