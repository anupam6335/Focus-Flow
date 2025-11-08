/**
 * Public Landing Page Interactions
 * Updated with proper lamp and leaves visibility
 */

let landingState = {
    leavesAnimation: true,
    lampLight: true,
    leavesInterval: null
};

// Ensure both containers load simultaneously
function ensureSimultaneousLoad() {
    const publicLanding = document.getElementById('public-landing');
    if (publicLanding) {
        // Force reflow to ensure both containers render together
        publicLanding.style.display = 'none';
        publicLanding.offsetHeight; // Trigger reflow
        publicLanding.style.display = 'flex';
        
        // Add loaded class after a small delay to ensure rendering
        setTimeout(() => {
            publicLanding.classList.add('loaded');
        }, 100);
    }
}



// Setup landing animations
function setupLandingAnimations() {
    // Start with animations enabled
    landingState.leavesAnimation = true;
    landingState.lampLight = true;
    
    // Start leaves animation
    startLandingLeavesAnimation();
    enableLandingLampLight();
    
    // Update UI state
    updateLandingAnimationUI();
}

// Setup event listeners for landing page
function setupLandingEventListeners() {
    // Toggle buttons
    const leavesToggle = document.getElementById('landing-toggle-leaves');
    const lampToggle = document.getElementById('landing-toggle-lamp');
    const studyLampBtn = document.getElementById('study-lamp-btn');

    if (leavesToggle) {
        leavesToggle.addEventListener('click', toggleLandingLeavesAnimation);
    }

    if (lampToggle) {
        lampToggle.addEventListener('click', toggleLandingLampLight);
    }

    if (studyLampBtn) {
        studyLampBtn.addEventListener('click', handleStudyLamp);
    }

    console.log('Landing page event listeners setup completed');
}

// Update landing animation UI state
function updateLandingAnimationUI() {
    const leavesToggle = document.getElementById('landing-toggle-leaves');
    const lampToggle = document.getElementById('landing-toggle-lamp');

    if (leavesToggle) {
        leavesToggle.setAttribute('aria-pressed', 'true');
        const toggleText = leavesToggle.querySelector('.toggle-text');
        if (toggleText) toggleText.textContent = "Leaves: On";
    }

    if (lampToggle) {
        lampToggle.setAttribute('aria-pressed', 'true');
        const toggleText = lampToggle.querySelector('.toggle-text');
        if (toggleText) toggleText.textContent = "Lamp: Light";
    }
}

// Leaves animation controls - FIXED VISIBILITY
function toggleLandingLeavesAnimation() {
    landingState.leavesAnimation = !landingState.leavesAnimation;
    
    const leavesToggle = document.getElementById('landing-toggle-leaves');
    if (leavesToggle) {
        leavesToggle.setAttribute('aria-pressed', landingState.leavesAnimation);
        const toggleText = leavesToggle.querySelector('.toggle-text');
        if (toggleText) {
            toggleText.textContent = `Leaves: ${landingState.leavesAnimation ? 'On' : 'Off'}`;
        }
    }

    if (landingState.leavesAnimation) {
        startLandingLeavesAnimation();
    } else {
        stopLandingLeavesAnimation();
    }
}

function startLandingLeavesAnimation() {
    const petalsContainer = document.getElementById('landing-petals');
    if (!petalsContainer) {
        console.error('Landing petals container not found');
        return;
    }

    petalsContainer.innerHTML = '';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    // Create initial petals - INCREASED VISIBILITY
    for (let i = 0; i < 20; i++) {
        createLandingPetal(true);
    }

    // Continuous petal creation
    landingState.leavesInterval = setInterval(() => {
        const currentPetals = document.querySelectorAll('.landing-petal').length;
        if (currentPetals < 25) {
            createLandingPetal();
        }
    }, 1200);
}

function createLandingPetal(initial = false) {
    const petalsContainer = document.getElementById('landing-petals');
    if (!petalsContainer) return;

    const petal = document.createElement('div');
    petal.className = 'landing-petal'; // Changed class name

    const isMobile = window.innerWidth < 768;
    const left = isMobile ? 10 + Math.random() * 80 : 5 + Math.random() * 90;
    const delay = initial ? Math.random() * 5 : 0;
    const duration = isMobile ? 10 + Math.random() * 5 : 8 + Math.random() * 6;
    const size = 0.6 + Math.random() * 0.8;
    const horizontalDrift = (Math.random() - 0.5) * (isMobile ? 40 : 60);

    petal.style.cssText = `
        left: ${left}%;
        animation: landing-petal-fall ${duration}s linear ${delay}s forwards;
        transform: translateX(${horizontalDrift}px) scale(${size});
        opacity: 0;
    `;

    petalsContainer.appendChild(petal);

    // Fade in - INCREASED VISIBILITY
    setTimeout(() => {
        petal.style.opacity = '0.8';
    }, 50);

    // Remove after animation
    setTimeout(() => {
        if (petal.parentNode) {
            petal.parentNode.removeChild(petal);
        }
    }, (duration + delay) * 1000);
}

function stopLandingLeavesAnimation() {
    if (landingState.leavesInterval) {
        clearInterval(landingState.leavesInterval);
        landingState.leavesInterval = null;
    }

    // Fade out existing petals
    document.querySelectorAll('.landing-petal').forEach((petal) => {
        petal.style.opacity = '0';
        setTimeout(() => {
            if (petal.parentNode) {
                petal.parentNode.removeChild(petal);
            }
        }, 800);
    });
}

// Lamp light controls - FIXED VISIBILITY
function toggleLandingLampLight() {
    landingState.lampLight = !landingState.lampLight;
    
    const lampToggle = document.getElementById('landing-toggle-lamp');
    if (lampToggle) {
        lampToggle.setAttribute('aria-pressed', landingState.lampLight);
        const toggleText = lampToggle.querySelector('.toggle-text');
        if (toggleText) {
            toggleText.textContent = `Lamp: ${landingState.lampLight ? 'Light' : 'Dim'}`;
        }
    }

    if (landingState.lampLight) {
        enableLandingLampLight();
    } else {
        disableLandingLampLight();
    }
}

function enableLandingLampLight() {
    const lampGlow = document.getElementById('landing-lamp-glow');
    const lampContainer = document.getElementById('landing-lamp');
    
    if (lampGlow) {
        lampGlow.style.opacity = '0.6'; // Increased visibility
    }
    if (lampContainer) {
        lampContainer.style.opacity = '0.8'; // Increased visibility
    }
}

function disableLandingLampLight() {
    const lampGlow = document.getElementById('landing-lamp-glow');
    const lampContainer = document.getElementById('landing-lamp');
    
    if (lampGlow) {
        lampGlow.style.opacity = '0.1'; // Very dim but still visible
    }
    if (lampContainer) {
        lampContainer.style.opacity = '0.3'; // Reduced but visible
    }
}

// Sand flow animation
function createLandingSandFlow() {
    const sandFlow = document.querySelector('.landing-sand-flow');
    if (!sandFlow) return;
    
    sandFlow.innerHTML = '';
    
    // Create continuous sand flow
    for (let i = 0; i < 4; i++) {
        createLandingSandGrain(i * 0.8);
    }
}

function createLandingSandGrain(delay = 0) {
    const sandFlow = document.querySelector('.landing-sand-flow');
    if (!sandFlow) return;
    
    const grain = document.createElement('div');
    grain.className = 'sand-grain';
    
    const duration = 3 + Math.random() * 1.5;
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
    const lampToggle = document.getElementById('landing-toggle-lamp');
    if (lampToggle) {
        // Toggle lamp light
        landingState.lampLight = !landingState.lampLight;
        lampToggle.setAttribute('aria-pressed', landingState.lampLight);
        
        const toggleText = lampToggle.querySelector('.toggle-text');
        if (toggleText) {
            toggleText.textContent = `Lamp: ${landingState.lampLight ? 'Light' : 'Dim'}`;
        }
        
        if (landingState.lampLight) {
            enableLandingLampLight();
        } else {
            disableLandingLampLight();
        }
        
        // Show subtle feedback
        const studyBtn = document.getElementById('study-lamp-btn');
        if (studyBtn) {
            studyBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                studyBtn.style.transform = '';
            }, 200);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the public landing page
    const publicLanding = document.getElementById('public-landing');
    if (publicLanding && publicLanding.style.display !== 'none') {
        console.log('Initializing public landing page...');
        initLandingPage();
         ensureSimultaneousLoad();
    }
});

// Export functions for global access
window.landingApp = {
    toggleLandingLeavesAnimation,
    toggleLandingLampLight,
    handleStudyLamp
};