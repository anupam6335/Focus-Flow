function initFloatingHeader() {
  const floatingHeader = document.getElementById('floating-header');
  const mainHeader = document.querySelector('.header');
  const scrollProgress = document.getElementById('scroll-progress');
  const body = document.body;
  
  if (!floatingHeader) return;
  
  // Adjust threshold based on screen size
  const isMobile = window.innerWidth <= 767;
  const headerHeight = mainHeader ? mainHeader.offsetHeight : 0;
  const showThreshold = isMobile ? 100 : 200; // Lower threshold on mobile
  
  let lastScrollY = window.scrollY;
  let ticking = false;
  
  function updateFloatingHeader() {
    const scrollY = window.scrollY;
    const isMobileNow = window.innerWidth <= 767;
    
    // Show/hide floating header based on scroll position
    if (scrollY > (isMobileNow ? 100 : 200)) {
      floatingHeader.classList.add('visible');
      body.classList.add('has-floating-header');
    } else {
      floatingHeader.classList.remove('visible');
      body.classList.remove('has-floating-header');
    }
    
    // Update scroll progress
    if (scrollProgress) {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? (scrollY / scrollHeight) * 100 : 0;
      scrollProgress.style.width = `${scrollPercent}%`;
    }
    
    lastScrollY = scrollY;
  }
  
  // Throttle scroll events for performance
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateFloatingHeader();
        ticking = false;
      });
      ticking = true;
    }
  }
  
  // Initial check
  updateFloatingHeader();
  
  // Listen for scroll
  window.addEventListener('scroll', onScroll);
  
  // Handle resize
  window.addEventListener('resize', updateFloatingHeader);
  
  // Connect floating header actions to existing functionality
  const floatingBookmarkBtn = document.getElementById('floating-bookmark-btn');
  const mainBookmarkBtn = document.getElementById('bookmark-btn');
  
  if (floatingBookmarkBtn && mainBookmarkBtn) {
    // Sync bookmark state
    floatingBookmarkBtn.addEventListener('click', () => {
      mainBookmarkBtn.click();
      floatingBookmarkBtn.classList.toggle('active');
    });
    
    // Initial sync
    if (mainBookmarkBtn.classList.contains('active')) {
      floatingBookmarkBtn.classList.add('active');
    }
  }
  
  // Connect floating search button
  const floatingSearchBtn = document.getElementById('floating-search-btn');
  const mainSearchBtn = document.getElementById('search-btn');
  
  if (floatingSearchBtn && mainSearchBtn) {
    floatingSearchBtn.addEventListener('click', () => {
      mainSearchBtn.click();
    });
  }
  
  // Connect other action buttons
  connectFloatingActions();
  
  // Calculate and display reading time
  calculateReadingTime();
}

// Add mobile-specific tooltips
function addFloatingHeaderTooltips() {
  const floatingButtons = document.querySelectorAll('.floating-action-btn');
  
  floatingButtons.forEach(button => {
    const textSpan = button.querySelector('.btn-text');
    if (textSpan) {
      const tooltipText = textSpan.textContent;
      
      // Add tooltip on mobile, remove on desktop
      const updateTooltip = () => {
        if (window.innerWidth <= 767) {
          button.setAttribute('title', tooltipText);
        } else {
          button.removeAttribute('title');
        }
      };
      
      // Initial setup
      updateTooltip();
      
      // Update on resize
      window.addEventListener('resize', updateTooltip);
    }
  });
}


function connectFloatingActions() {
  // Connect edit button
  const floatingEditBtn = document.querySelector('.floating-action-btn.edit-btn');
  const mainEditBtn = document.querySelector('.action-btn.edit-btn');
  
  if (floatingEditBtn && mainEditBtn) {
    floatingEditBtn.addEventListener('click', () => {
      mainEditBtn.click();
    });
  }
  
  // Connect delete button
  const floatingDeleteBtn = document.querySelector('.floating-action-btn.delete-btn');
  const mainDeleteBtn = document.querySelector('.action-btn.delete-btn');
  
  if (floatingDeleteBtn && mainDeleteBtn) {
    floatingDeleteBtn.addEventListener('click', () => {
      mainDeleteBtn.click();
    });
  }
  
  // Connect share button
  const floatingShareBtn = document.querySelector('.floating-action-btn.share-btn');
  const mainShareBtn = document.querySelector('.action-btn.share-btn');
  
  if (floatingShareBtn && mainShareBtn) {
    floatingShareBtn.addEventListener('click', () => {
      mainShareBtn.click();
    });
  }
}

function calculateReadingTime() {
  const content = document.querySelector('.blog-content-body');
  const readingTimeElement = document.getElementById('reading-time');
  
  if (!content || !readingTimeElement) return;
  
  const text = content.textContent || content.innerText;
  const wordCount = text.trim().split(/\s+/).length;
  const readingTimeMinutes = Math.ceil(wordCount / 200); // 200 words per minute
  
  readingTimeElement.textContent = `${readingTimeMinutes} min`;
}


// Update the DOMContentLoaded event listener to include initFloatingHeader
document.addEventListener('DOMContentLoaded', function() {
  // Initialize UI components
  initBlogView();
  initSearchPanel();
  initMinimap();
  initBookmark();
  initScrollTracking();
  initFloatingHeader(); // Add this line
  
  // Add search shortcut (Ctrl+F)
  document.addEventListener('keydown', handleSearchShortcut);
  
  // Add tooltips for floating header buttons on mobile
  addFloatingHeaderTooltips();
});

function addFloatingHeaderTooltips() {
  // Only add tooltips on mobile
  if (window.innerWidth <= 768) {
    const floatingButtons = document.querySelectorAll('.floating-action-btn');
    
    floatingButtons.forEach(button => {
      const textSpan = button.querySelector('.btn-text');
      if (textSpan) {
        const tooltipText = textSpan.textContent;
        button.setAttribute('title', tooltipText);
        
        // Remove tooltip on desktop
        window.addEventListener('resize', () => {
          if (window.innerWidth > 768) {
            button.removeAttribute('title');
          } else {
            button.setAttribute('title', tooltipText);
          }
        });
      }
    });
  }
}

function initBlogView() {
  // Initialize any blog-specific functionality
  console.log('Blog view initialized');
  
  // Add smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const headerOffset = 100;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        
        // Update active state in minimap
        updateActiveMinimapLink(targetId);
      }
    });
  });
}

function initSearchPanel() {
  const searchBtn = document.getElementById('search-btn');
  const searchPanel = document.getElementById('search-panel');
  const searchPanelClose = document.getElementById('search-panel-close');
  const searchPanelInput = document.getElementById('search-panel-input');
  const searchResults = document.getElementById('search-results');
  
  // Toggle search panel
  if (searchBtn && searchPanel) {
    searchBtn.addEventListener('click', () => {
      searchPanel.classList.add('active');
      searchPanelInput.focus();
      
      // On mobile, lock body scroll
      if (window.innerWidth <= 767) {
        document.body.style.overflow = 'hidden';
      }
    });
  }
  
  // Close search panel
  if (searchPanelClose) {
    searchPanelClose.addEventListener('click', () => {
      searchPanel.classList.remove('active');
      searchPanelInput.value = '';
      searchResults.innerHTML = '';
      
      // Restore body scroll on mobile
      if (window.innerWidth <= 767) {
        document.body.style.overflow = '';
      }
    });
  }
  
  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (searchPanel && searchPanel.classList.contains('active')) {
      if (!searchPanel.contains(e.target) && !searchBtn.contains(e.target)) {
        searchPanel.classList.remove('active');
        searchPanelInput.value = '';
        searchResults.innerHTML = '';
        
        // Restore body scroll on mobile
        if (window.innerWidth <= 767) {
          document.body.style.overflow = '';
        }
      }
    }
  });
  
  // Also close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchPanel && searchPanel.classList.contains('active')) {
      searchPanel.classList.remove('active');
      searchPanelInput.value = '';
      searchResults.innerHTML = '';
      
      if (window.innerWidth <= 767) {
        document.body.style.overflow = '';
      }
    }
  });
  
  // Rest of search functionality remains the same...
}

function initMinimap() {
  const minimapToggle = document.getElementById('minimap-toggle');
  const minimapNav = document.querySelector('.minimap-nav');
  
  if (minimapToggle && minimapNav) {
    minimapToggle.addEventListener('click', () => {
      minimapNav.classList.toggle('collapsed');
      minimapToggle.classList.toggle('collapsed');
    });
  }
  
  // Update active link on scroll
  window.addEventListener('scroll', updateMinimapOnScroll);
}

function updateMinimapOnScroll() {
  const sections = document.querySelectorAll('section[id]');
  const scrollPosition = window.scrollY + 120; // Offset for header
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const sectionId = section.getAttribute('id');
    
    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
      updateActiveMinimapLink(`#${sectionId}`);
    }
  });
}

function updateActiveMinimapLink(targetId) {
  // Remove active class from all minimap links
  document.querySelectorAll('.minimap-link, .minimap-sublink').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active class to the corresponding link
  const activeLink = document.querySelector(`.minimap-link[href="${targetId}"], .minimap-sublink[href="${targetId}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
    
    // If it's a sublink, also activate its parent
    if (activeLink.classList.contains('minimap-sublink')) {
      const parentLink = activeLink.closest('li')?.querySelector('.minimap-link');
      if (parentLink) {
        parentLink.classList.add('active');
      }
    }
  }
}

function initBookmark() {
  const bookmarkBtn = document.getElementById('bookmark-btn');
  const floatingBookmarkBtn = document.getElementById('floating-bookmark-btn');
  
  if (bookmarkBtn) {
    // Check if already bookmarked
    const isBookmarked = localStorage.getItem(`bookmark_${window.location.pathname}`);
    
    if (isBookmarked) {
      bookmarkBtn.classList.add('active');
      if (floatingBookmarkBtn) {
        floatingBookmarkBtn.classList.add('active');
      }
    }
    
    bookmarkBtn.addEventListener('click', () => {
      bookmarkBtn.classList.toggle('active');
      
      // Sync with floating bookmark button
      if (floatingBookmarkBtn) {
        floatingBookmarkBtn.classList.toggle('active');
      }
      
      if (bookmarkBtn.classList.contains('active')) {
        // Save bookmark
        localStorage.setItem(`bookmark_${window.location.pathname}`, 'true');
        showToast('Blog bookmarked!');
      } else {
        // Remove bookmark
        localStorage.removeItem(`bookmark_${window.location.pathname}`);
        showToast('Bookmark removed');
      }
    });
  }
  
  // Also handle floating bookmark button click if needed
  if (floatingBookmarkBtn) {
    floatingBookmarkBtn.addEventListener('click', () => {
      // Just trigger the main bookmark button
      if (bookmarkBtn) {
        bookmarkBtn.click();
      }
    });
  }
}

function initScrollTracking() {
  // Track reading progress (for analytics or personal tracking)
  let lastScrollPosition = 0;
  let maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    const scrollPercentage = Math.round((currentScroll / maxScroll) * 100);
    
    // Update reading progress (could be used for a progress bar)
    if (Math.abs(currentScroll - lastScrollPosition) > 100) {
      // Save reading progress every 100px
      localStorage.setItem(`reading_progress_${window.location.pathname}`, scrollPercentage);
      lastScrollPosition = currentScroll;
    }
  });
  
  // Restore reading position
  const savedProgress = localStorage.getItem(`reading_progress_${window.location.pathname}`);
  if (savedProgress) {
    setTimeout(() => {
      const scrollTo = (parseInt(savedProgress) / 100) * maxScroll;
      window.scrollTo({ top: scrollTo, behavior: 'smooth' });
    }, 500);
  }
}

function handleSearchShortcut(e) {
  // Ctrl+F or Cmd+F to open search panel
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    
    const searchBtn = document.getElementById('search-btn');
    const searchPanel = document.getElementById('search-panel');
    const floatingSearchBtn = document.getElementById('floating-search-btn');
    
    // Try to click the visible search button
    if (floatingSearchBtn && floatingSearchBtn.offsetParent !== null) {
      floatingSearchBtn.click();
    } else if (searchBtn) {
      searchBtn.click();
    }
  }
  
  // Escape to close search panel
  if (e.key === 'Escape') {
    const searchPanel = document.getElementById('search-panel');
    if (searchPanel && searchPanel.classList.contains('active')) {
      searchPanel.classList.remove('active');
      const searchInput = document.getElementById('search-panel-input');
      if (searchInput) {
        searchInput.value = '';
      }
      const searchResults = document.getElementById('search-results');
      if (searchResults) {
        searchResults.innerHTML = '';
      }
    }
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = message;
  
  const toastContainer = document.getElementById('toast') || createToastContainer();
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast';
  container.className = 'toast-container';
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
  return container;
}

// Add CSS for search highlights
const style = document.createElement('style');
style.textContent = `
  mark {
    background-color: rgba(163, 177, 138, 0.3);
    color: var(--accent);
    padding: 1px 3px;
    border-radius: 3px;
  }
  
  .no-results {
    text-align: center;
    padding: 20px;
    color: var(--muted);
    font-size: 14px;
  }
`;
document.head.appendChild(style);