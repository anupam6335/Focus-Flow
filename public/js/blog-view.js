// FocusFlow Blog View - Enhanced User Experience
// Optimized for 10/10 UI/UX

class BlogViewManager {
  constructor() {
    this.floatingHeader = null;
    this.scrollProgress = null;
    this.searchPanel = null;
    this.minimap = null;
    this.isMobile = false;
    this.isTablet = false;
    this.isDesktop = false;
    this.scrollThreshold = 200;
    this.lastScrollY = 0;
    this.ticking = false;
    this.searchIndex = [];
    this.currentSearchTerm = '';
    
    this.init();
  }
  
  init() {
    this.detectDeviceType();
    this.setupDeviceConfig();
    this.initFloatingHeader();
    this.initSearchPanel();
    this.initMinimap();
    this.initBookmark();
    this.initScrollTracking();
    this.initKeyboardNavigation();
    this.initCodeBlocks();
    this.initTouchOptimizations();
    this.initPerformanceOptimizations();
    
    // Add search shortcut hint
    this.addSearchShortcutHint();
    
    // Calculate reading time
    this.calculateReadingTime();
    
    // Update on resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  detectDeviceType() {
    const width = window.innerWidth;
    this.isMobile = width <= 768;
    this.isTablet = width > 768 && width <= 1024;
    this.isDesktop = width > 1024;
    
    // Update scroll threshold based on device
    this.scrollThreshold = this.isMobile ? 100 : 200;
  }
  
  setupDeviceConfig() {
    // Add device class to body for CSS targeting
    document.body.classList.remove('is-mobile', 'is-tablet', 'is-desktop');
    if (this.isMobile) {
      document.body.classList.add('is-mobile');
    } else if (this.isTablet) {
      document.body.classList.add('is-tablet');
    } else {
      document.body.classList.add('is-desktop');
    }
  }
  
  initFloatingHeader() {
    this.floatingHeader = document.getElementById('floating-header');
    this.scrollProgress = document.getElementById('scroll-progress');
    const mainHeader = document.querySelector('.header');
    
    if (!this.floatingHeader) return;
    
    // Calculate header height dynamically
    this.headerHeight = mainHeader ? mainHeader.offsetHeight : 0;
    
    // Set initial state
    this.updateFloatingHeader();
    
    // Listen for scroll with throttling
    window.addEventListener('scroll', this.handleScroll.bind(this));
    
    // Connect floating header actions
    this.connectFloatingActions();
  }
  
  handleScroll() {
    if (!this.ticking) {
      requestAnimationFrame(() => {
        this.updateFloatingHeader();
        this.updateMinimapOnScroll();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }
  
  updateFloatingHeader() {
    const scrollY = window.scrollY;
    
    // Show/hide floating header
    if (scrollY > this.scrollThreshold) {
      this.floatingHeader.classList.add('visible');
      document.body.classList.add('has-floating-header');
    } else {
      this.floatingHeader.classList.remove('visible');
      document.body.classList.remove('has-floating-header');
    }
    
    // Update scroll progress
    if (this.scrollProgress) {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? (scrollY / scrollHeight) * 100 : 0;
      this.scrollProgress.style.width = `${scrollPercent}%`;
    }
    
    this.lastScrollY = scrollY;
  }
  
  connectFloatingActions() {
    // Connect bookmark buttons
    const floatingBookmarkBtn = document.getElementById('floating-bookmark-btn');
    const mainBookmarkBtn = document.getElementById('bookmark-btn');
    
    if (floatingBookmarkBtn && mainBookmarkBtn) {
      floatingBookmarkBtn.addEventListener('click', () => {
        mainBookmarkBtn.click();
      });
      
      // Sync initial state
      if (mainBookmarkBtn.classList.contains('active')) {
        floatingBookmarkBtn.classList.add('active');
      }
    }
    
    // Connect search buttons
    const floatingSearchBtn = document.getElementById('floating-search-btn');
    const mainSearchBtn = document.getElementById('search-btn');
    
    if (floatingSearchBtn && mainSearchBtn) {
      floatingSearchBtn.addEventListener('click', () => {
        mainSearchBtn.click();
      });
    }
    
    // Connect other action buttons
    this.connectButton('edit');
    this.connectButton('delete');
    this.connectButton('share');
  }
  
  connectButton(action) {
    const floatingBtn = document.querySelector(`.floating-action-btn.${action}-btn`);
    const mainBtn = document.querySelector(`.action-btn.${action}-btn`);
    
    if (floatingBtn && mainBtn) {
      floatingBtn.addEventListener('click', () => {
        mainBtn.click();
      });
    }
  }
  
  initSearchPanel() {
    this.searchPanel = document.getElementById('search-panel');
    const searchBtn = document.getElementById('search-btn');
    const floatingSearchBtn = document.getElementById('floating-search-btn');
    const searchPanelClose = document.getElementById('search-panel-close');
    const searchPanelInput = document.getElementById('search-panel-input');
    const searchResults = document.getElementById('search-results');
    
    // Build search index
    this.buildSearchIndex();
    
    // Open search panel
    const openSearchPanel = () => {
      this.searchPanel.classList.add('active');
      searchPanelInput.focus();
      
      // On mobile, prevent body scroll
      if (this.isMobile) {
        document.body.style.overflow = 'hidden';
      }
    };
    
    // Close search panel
    const closeSearchPanel = () => {
      this.searchPanel.classList.remove('active');
      searchPanelInput.value = '';
      searchResults.innerHTML = '';
      
      // Restore body scroll on mobile
      if (this.isMobile) {
        document.body.style.overflow = '';
      }
    };
    
    // Event listeners
    if (searchBtn) searchBtn.addEventListener('click', openSearchPanel);
    if (floatingSearchBtn) floatingSearchBtn.addEventListener('click', openSearchPanel);
    if (searchPanelClose) searchPanelClose.addEventListener('click', closeSearchPanel);
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.searchPanel.classList.contains('active')) {
        closeSearchPanel();
      }
    });
    
    // Close when clicking outside on desktop
    if (!this.isMobile) {
      document.addEventListener('click', (e) => {
        if (this.searchPanel.classList.contains('active') &&
            !this.searchPanel.contains(e.target) &&
            !searchBtn.contains(e.target) &&
            !floatingSearchBtn.contains(e.target)) {
          closeSearchPanel();
        }
      });
    }
    
    // Search input handler
    if (searchPanelInput) {
      searchPanelInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        this.currentSearchTerm = term;
        
        if (term.length >= 2) {
          this.performSearch(term, searchResults);
        } else {
          searchResults.innerHTML = '';
        }
      });
    }
    
    // Make close button more accessible on mobile
    if (this.isMobile && searchPanelClose) {
      searchPanelClose.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        width: 56px;
        height: 56px;
        background: rgba(231, 76, 60, 0.2);
        border-color: rgba(231, 76, 60, 0.4);
        z-index: 10001;
      `;
    }
  }
  
  buildSearchIndex() {
    const content = document.querySelector('.blog-content-body');
    if (!content) return;
    
    // Get all text content and headings
    const headings = content.querySelectorAll('h2, h3');
    const paragraphs = content.querySelectorAll('p');
    const codeBlocks = content.querySelectorAll('pre code');
    
    this.searchIndex = [];
    
    // Index headings
    headings.forEach((heading, index) => {
      this.searchIndex.push({
        type: 'heading',
        level: heading.tagName.toLowerCase(),
        text: heading.textContent.trim(),
        element: heading,
        id: heading.id || `heading-${index}`
      });
    });
    
    // Index paragraphs (first 200 chars)
    paragraphs.forEach((para, index) => {
      const text = para.textContent.trim();
      if (text.length > 50) {
        this.searchIndex.push({
          type: 'paragraph',
          text: text.substring(0, 200),
          fullText: text,
          element: para,
          id: `para-${index}`
        });
      }
    });
    
    // Index code blocks (first 150 chars)
    codeBlocks.forEach((code, index) => {
      const text = code.textContent.trim();
      if (text.length > 30) {
        this.searchIndex.push({
          type: 'code',
          text: text.substring(0, 150),
          fullText: text,
          element: code.closest('.code-block'),
          id: `code-${index}`
        });
      }
    });
  }
  
  performSearch(term, resultsContainer) {
    const normalizedTerm = term.toLowerCase();
    const matches = [];
    
    // Search through index
    this.searchIndex.forEach(item => {
      if (item.text.toLowerCase().includes(normalizedTerm)) {
        matches.push(item);
      }
    });
    
    // Display results
    this.displaySearchResults(matches, resultsContainer);
  }
  
  displaySearchResults(matches, container) {
    if (matches.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <p>No results found for "${this.currentSearchTerm}"</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    
    matches.forEach((match, index) => {
      const icon = match.type === 'heading' ? '📑' : 
                  match.type === 'code' ? '💻' : '📝';
      
      const excerpt = this.highlightText(match.text, this.currentSearchTerm);
      
      html += `
        <div class="search-result-item" data-id="${match.id}" tabindex="0">
          <div class="search-result-title">
            ${icon} ${match.type.charAt(0).toUpperCase() + match.type.slice(1)}
          </div>
          <div class="search-result-preview">${excerpt}</div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        this.scrollToSearchResult(id);
      });
      
      // Add keyboard support
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = item.dataset.id;
          this.scrollToSearchResult(id);
        }
      });
    });
  }
  
  highlightText(text, term) {
    const normalizedText = text.toLowerCase();
    const normalizedTerm = term.toLowerCase();
    const index = normalizedText.indexOf(normalizedTerm);
    
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + term.length);
    const after = text.substring(index + term.length);
    
    return `${before}<mark>${match}</mark>${after}`;
  }
  
  scrollToSearchResult(id) {
    const match = this.searchIndex.find(item => item.id === id);
    if (!match || !match.element) return;
    
    // Calculate offset for floating header
    const headerOffset = this.isMobile ? 120 : 80;
    const elementPosition = match.element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    
    // Close search panel
    this.searchPanel.classList.remove('active');
    if (this.isMobile) {
      document.body.style.overflow = '';
    }
    
    // Smooth scroll to element
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
    
    // Highlight the element briefly
    const originalBg = match.element.style.backgroundColor;
    match.element.style.backgroundColor = 'rgba(163, 177, 138, 0.2)';
    match.element.style.transition = 'background-color 1s ease';
    
    setTimeout(() => {
      match.element.style.backgroundColor = originalBg;
      setTimeout(() => {
        match.element.style.transition = '';
      }, 1000);
    }, 1500);
  }
  
  initMinimap() {
    this.minimap = document.querySelector('.blog-minimap');
    const minimapToggle = document.getElementById('minimap-toggle');
    const minimapNav = document.querySelector('.minimap-nav');
    
    if (minimapToggle && minimapNav) {
      minimapToggle.addEventListener('click', () => {
        minimapNav.classList.toggle('collapsed');
        minimapToggle.classList.toggle('collapsed');
        
        // Update aria-label
        const isCollapsed = minimapNav.classList.contains('collapsed');
        minimapToggle.setAttribute('aria-label', 
          isCollapsed ? 'Expand table of contents' : 'Collapse table of contents'
        );
      });
    }
    
    // Initialize minimap links
    this.initMinimapLinks();
  }
  
  initMinimapLinks() {
    const minimapLinks = document.querySelectorAll('.minimap-link, .minimap-sublink');
    
    minimapLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          this.scrollToSection(targetId);
        }
      });
    });
  }
  
  updateMinimapOnScroll() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + (this.isMobile ? 140 : 100);
    
    let currentSection = null;
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        currentSection = section.id;
      }
    });
    
    if (currentSection) {
      this.updateActiveMinimapLink(`#${currentSection}`);
    }
  }
  
  scrollToSection(targetId) {
    const targetElement = document.querySelector(targetId);
    if (!targetElement) return;
    
    // Calculate offset for floating header
    const headerOffset = this.isMobile ? 120 : 80;
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    
    // Smooth scroll
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
    
    // Update URL without page reload
    history.pushState(null, null, targetId);
    
    // Update active state
    this.updateActiveMinimapLink(targetId);
  }
  
  updateActiveMinimapLink(targetId) {
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
  
  initBookmark() {
    const bookmarkBtn = document.getElementById('bookmark-btn');
    const floatingBookmarkBtn = document.getElementById('floating-bookmark-btn');
    
    if (bookmarkBtn) {
      // Check if already bookmarked
      const bookmarkKey = `bookmark_${window.location.pathname}`;
      const isBookmarked = localStorage.getItem(bookmarkKey);
      
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
          localStorage.setItem(bookmarkKey, 'true');
          this.showToast('Blog bookmarked!', 'success');
        } else {
          localStorage.removeItem(bookmarkKey);
          this.showToast('Bookmark removed', 'info');
        }
      });
    }
  }
  
  initScrollTracking() {
    // Track reading progress for analytics
    let lastScrollPosition = 0;
    let maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progressKey = `reading_progress_${window.location.pathname}`;
    
    const trackScroll = () => {
      const currentScroll = window.scrollY;
      const scrollPercentage = Math.round((currentScroll / maxScroll) * 100);
      
      // Save progress every 20% change
      if (Math.abs(scrollPercentage - lastScrollPosition) >= 20) {
        localStorage.setItem(progressKey, scrollPercentage);
        lastScrollPosition = scrollPercentage;
        
        // Update reading time if needed
        if (scrollPercentage > 50) {
          this.updateReadingTimeEstimate(scrollPercentage);
        }
      }
    };
    
    window.addEventListener('scroll', trackScroll);
    
    // Restore reading position
    const savedProgress = localStorage.getItem(progressKey);
    if (savedProgress) {
      setTimeout(() => {
        const scrollTo = (parseInt(savedProgress) / 100) * maxScroll;
        window.scrollTo({ top: scrollTo, behavior: 'smooth' });
      }, 800);
    }
  }
  
  initKeyboardNavigation() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) searchBtn.click();
      }
      
      // Ctrl/Cmd + K to open search (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) searchBtn.click();
      }
      
      // Escape to close search panel
      if (e.key === 'Escape') {
        if (this.searchPanel && this.searchPanel.classList.contains('active')) {
          this.searchPanel.classList.remove('active');
          const searchInput = document.getElementById('search-panel-input');
          if (searchInput) searchInput.value = '';
          const searchResults = document.getElementById('search-results');
          if (searchResults) searchResults.innerHTML = '';
        }
      }
      
      // Space to scroll down, Shift+Space to scroll up
      if (e.key === ' ' && !e.target.matches('input, textarea, button, [contenteditable]')) {
        e.preventDefault();
        if (e.shiftKey) {
          window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
        } else {
          window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        }
      }
    });
    
    // Focus management for accessibility
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        // Add focus styles to all focusable elements
        document.querySelectorAll('a, button, input, textarea, select, [tabindex]').forEach(el => {
          el.classList.add('keyboard-focus');
        });
      }
    });
    
    document.addEventListener('click', () => {
      // Remove keyboard focus styles on mouse interaction
      document.querySelectorAll('.keyboard-focus').forEach(el => {
        el.classList.remove('keyboard-focus');
      });
    });
  }
  
  initCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.code-block code');
    
    codeBlocks.forEach((codeBlock, index) => {
      // Add copy button
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-code-btn';
      copyButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span class="copy-text">Copy</span>
      `;
      copyButton.setAttribute('aria-label', 'Copy code to clipboard');
      
      // Position the button
      const pre = codeBlock.parentElement;
      pre.style.position = 'relative';
      copyButton.style.position = 'absolute';
      copyButton.style.top = '12px';
      copyButton.style.right = '12px';
      copyButton.style.zIndex = '10';
      
      pre.appendChild(copyButton);
      
      // Copy functionality
      copyButton.addEventListener('click', async () => {
        const code = codeBlock.textContent;
        try {
          await navigator.clipboard.writeText(code);
          copyButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
            <span class="copy-text">Copied!</span>
          `;
          copyButton.classList.add('copied');
          
          setTimeout(() => {
            copyButton.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span class="copy-text">Copy</span>
            `;
            copyButton.classList.remove('copied');
          }, 2000);
          
          this.showToast('Code copied to clipboard!', 'success');
        } catch (err) {
          this.showToast('Failed to copy code', 'error');
        }
      });
      
      // Add line numbers for larger code blocks
      if (codeBlock.textContent.split('\n').length > 10) {
        this.addLineNumbers(codeBlock);
      }
    });
    
    // Add CSS for copy button
    const style = document.createElement('style');
    style.textContent = `
      .copy-code-btn {
        background: rgba(27, 27, 27, 0.8);
        border: 1px solid #444;
        border-radius: 8px;
        color: #e6e6e6;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 200ms ease;
        backdrop-filter: blur(10px);
      }
      
      .copy-code-btn:hover {
        background: rgba(163, 177, 138, 0.2);
        border-color: var(--accent);
        transform: translateY(-2px);
      }
      
      .copy-code-btn.copied {
        background: rgba(46, 204, 113, 0.2);
        border-color: #2ecc71;
        color: #2ecc71;
      }
      
      .copy-code-btn svg {
        width: 14px;
        height: 14px;
      }
      
      @media (max-width: 768px) {
        .copy-code-btn {
          padding: 6px 12px;
          font-size: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  addLineNumbers(codeBlock) {
    const lines = codeBlock.textContent.split('\n');
    const lineNumbers = lines.map((_, i) => i + 1).join('\n');
    
    const lineNumbersElement = document.createElement('div');
    lineNumbersElement.className = 'line-numbers';
    lineNumbersElement.textContent = lineNumbers;
    lineNumbersElement.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      padding: 24px 12px;
      color: #666;
      font-family: monospace;
      font-size: 14px;
      line-height: 1.6;
      text-align: right;
      user-select: none;
      pointer-events: none;
      border-right: 1px solid #333;
      background: rgba(0, 0, 0, 0.1);
    `;
    
    const pre = codeBlock.parentElement;
    pre.style.paddingLeft = '60px';
    pre.style.position = 'relative';
    pre.appendChild(lineNumbersElement);
  }
  
  initTouchOptimizations() {
    if (!this.isMobile) return;
    
    // Increase touch target sizes
    const touchElements = document.querySelectorAll('button, .tag, .minimap-link, .action-icon');
    
    touchElements.forEach(el => {
      if (el.offsetWidth < 44 || el.offsetHeight < 44) {
        el.style.minWidth = '44px';
        el.style.minHeight = '44px';
        el.style.padding = '12px';
      }
    });
    
    // Add touch feedback
    touchElements.forEach(el => {
      el.addEventListener('touchstart', () => {
        el.style.transform = 'scale(0.95)';
      }, { passive: true });
      
      el.addEventListener('touchend', () => {
        el.style.transform = '';
      }, { passive: true });
    });
    
    // Prevent zoom on double-tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }
  
  initPerformanceOptimizations() {
    // Lazy load images
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });
      
      images.forEach(img => imageObserver.observe(img));
    }
    
    // Debounce scroll events
    this.handleScroll = this.debounce(this.handleScroll.bind(this), 16);
    window.addEventListener('scroll', this.handleScroll);
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  calculateReadingTime() {
    const content = document.querySelector('.blog-content-body');
    const readingTimeElement = document.getElementById('reading-time');
    
    if (!content || !readingTimeElement) return;
    
    const text = content.textContent || content.innerText;
    const wordCount = text.trim().split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200); // 200 words per minute
    
    readingTimeElement.textContent = `${readingTimeMinutes} min read`;
    
    // Store for later updates
    this.baseReadingTime = readingTimeMinutes;
  }
  
  updateReadingTimeEstimate(progress) {
    const readingTimeElement = document.getElementById('reading-time');
    if (!readingTimeElement || !this.baseReadingTime) return;
    
    // Estimate remaining time based on scroll progress
    const remainingPercentage = (100 - progress) / 100;
    const estimatedRemaining = Math.ceil(this.baseReadingTime * remainingPercentage);
    
    if (estimatedRemaining > 0 && estimatedRemaining < this.baseReadingTime) {
      readingTimeElement.textContent = `~${estimatedRemaining}m remaining`;
    }
  }
  
  addSearchShortcutHint() {
    // Only show on desktop
    if (this.isMobile) return;
    
    const hint = document.createElement('div');
    hint.className = 'search-shortcut-hint';
    hint.innerHTML = `
      <kbd>Ctrl</kbd> + <kbd>F</kbd> to search
    `;
    
    document.body.appendChild(hint);
    
    // Show briefly on page load
    setTimeout(() => {
      hint.classList.add('visible');
      
      setTimeout(() => {
        hint.classList.remove('visible');
        
        // Remove after animation
        setTimeout(() => {
          if (document.body.contains(hint)) {
            document.body.removeChild(hint);
          }
        }, 300);
      }, 3000);
    }, 2000);
  }
  
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('role', 'alert');
    
    const toastContainer = document.getElementById('toast') || this.createToastContainer();
    toastContainer.appendChild(toast);
    
    // Remove after delay
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    }, 4000);
    
    // Add CSS for toast if not exists
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 16px 24px;
          margin-bottom: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          transform: translateY(-20px);
          opacity: 0;
          transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
          max-width: 400px;
          word-break: break-word;
        }
        
        .toast.show {
          transform: translateY(0);
          opacity: 1;
        }
        
        .toast.hide {
          transform: translateY(-20px);
          opacity: 0;
        }
        
        .toast-success {
          border-left: 4px solid #2ecc71;
          background: rgba(46, 204, 113, 0.05);
        }
        
        .toast-error {
          border-left: 4px solid #e74c3c;
          background: rgba(231, 76, 60, 0.05);
        }
        
        .toast-info {
          border-left: 4px solid var(--accent);
          background: rgba(163, 177, 138, 0.05);
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    `;
    document.body.appendChild(container);
    return container;
  }
  
  handleResize() {
    this.detectDeviceType();
    this.setupDeviceConfig();
    
    // Recalculate header height
    const mainHeader = document.querySelector('.header');
    this.headerHeight = mainHeader ? mainHeader.offsetHeight : 0;
    
    // Update scroll threshold
    this.scrollThreshold = this.isMobile ? 100 : 200;
    
    // Rebuild search index if content width changed significantly
    const contentWidth = document.querySelector('.blog-content-body')?.offsetWidth;
    if (contentWidth && Math.abs(this.lastContentWidth - contentWidth) > 100) {
      this.buildSearchIndex();
      this.lastContentWidth = contentWidth;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const blogView = new BlogViewManager();
  
  // Make accessible globally if needed
  window.blogView = blogView;
  
  // Add smooth scrolling for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      blogView.scrollToSection(targetId);
    });
  });
  
  // Initialize tags functionality
  const tags = document.querySelectorAll('.tag');
  tags.forEach(tag => {
    tag.addEventListener('click', () => {
      const tagName = tag.textContent;
      blogView.showToast(`Filtering by: ${tagName}`, 'info');
      // In a real app, you would filter blog posts here
    });
  });
  
  // Add loading animation for better perceived performance
  document.body.classList.add('loaded');
  
  // Log initialization for debugging
  console.log('Blog View 10/10 UX initialized');
});