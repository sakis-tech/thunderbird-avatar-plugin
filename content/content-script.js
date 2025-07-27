/**
 * Avatar Card View - Content Script
 * Injects avatar cards into Thunderbird's email interface
 */

class AvatarCardInjector {
  constructor() {
    this.observer = null;
    this.activeCards = new Map();
    this.settings = {};
    this.init();
  }

  async init() {
    console.log('Avatar Card View: Content script initializing...', window.location.href);
    
    // Only run in Thunderbird contexts
    if (!this.isThunderbirdContext()) {
      console.log('Not a Thunderbird context, skipping initialization');
      return;
    }
    
    console.log('Thunderbird context detected, proceeding with initialization');
    
    // Load settings
    await this.loadSettings();
    
    // Wait for Thunderbird to be ready with multiple checks
    const startWhenReady = () => {
      console.log('Document ready state:', document.readyState);
      if (document.body) {
        console.log('Body found, starting observer');
        setTimeout(() => this.startObserving(), 500); // Small delay for Thunderbird to fully load
      } else {
        console.log('Body not found, waiting...');
        setTimeout(startWhenReady, 100);
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startWhenReady);
    } else {
      startWhenReady();
    }
  }

  async loadSettings() {
    try {
      const response = await browser.runtime.sendMessage({ action: 'getCacheStats' });
      this.settings = response.settings || {};
    } catch (error) {
      console.warn('Could not load settings:', error);
      // Use defaults
      this.settings = {
        avatarSize: 64,
        cardPosition: 'top-right',
        animationDuration: 200
      };
    }
  }

  startObserving() {
    console.log('Starting to observe email interface...');
    
    // Performance optimization: Batch DOM updates
    this.pendingScans = new Set();
    this.scanQueue = [];
    
    // Initial scan
    this.scanForEmails();
    
    // Set up mutation observer with performance optimizations
    this.observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      const addedElements = new Set();
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Batch added nodes for efficient processing
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (this.isEmailRelatedElement(node)) {
                addedElements.add(node);
                shouldScan = true;
              }
            }
          }
        }
      });
      
      if (shouldScan) {
        // Enhanced debouncing with batched processing
        clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => {
          this.batchProcessElements(Array.from(addedElements));
        }, 150); // Slightly longer debounce for better performance
      }
    });

    // Optimize observer for better performance
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      // Only observe what we need
      attributes: false,
      characterData: false
    });
  }

  isEmailRelatedElement(element) {
    // Check for modern Thunderbird email-related elements
    const emailSelectors = [
      'message-header',
      'message-container', 
      'thread-pane',
      'message-pane',
      'thread-tree',
      'message-browser',
      'card-container',
      'thread-card',
      'headerValue',
      'address-row'
    ];
    
    if (element.id && (
      element.id.includes('thread') ||
      element.id.includes('message') ||
      element.id.includes('header')
    )) {
      return true;
    }
    
    if (element.classList) {
      for (const selector of emailSelectors) {
        if (element.classList.contains(selector) || 
            element.querySelector(`[class*="${selector}"]`)) {
          return true;
        }
      }
    }
    
    // Check for email addresses in element or children
    const emailRegex = /@/;
    if (element.textContent && emailRegex.test(element.textContent)) {
      return true;
    }
    
    return false;
  }

  scanForEmails() {
    console.log('Scanning for emails...');
    
    // Enhanced Thunderbird selectors with inline message list integration
    const emailSelectors = [
      // 3-pane view message headers
      '#messageHeader .headerValue',
      '.message-header-row .headerValue',
      '.message-header-extra-container .headerValue',
      
      // Thread tree (message list) - enhanced for inline avatars
      '#threadTree treechildren treecell',
      '.tree-cell-text',
      'treecell[label*="@"]',
      '#threadTree .sender-column',
      '#threadTree .from-column',
      '.thread-row .sender',
      '.message-list-item .sender',
      
      // Cards view - modernized selectors
      '.card-container .sender',
      '.thread-card .sender-info',
      '.conversation-item .sender',
      '.message-item .from-info',
      
      // Message browser content
      '.moz-text-flowed',
      '.moz-signature',
      
      // Compose window
      '.address-row input',
      '.address-pill',
      '.recipient-pill',
      
      // Modern Thunderbird message list integration
      '.message-list-table .sender-col',
      '.unified-toolbar .from-field',
      '.quick-filter-bar .address-input',
      
      // Generic patterns
      '[emailaddress]',
      '[data-email]',
      '.from',
      '.sender',
      '.correspondent'
    ];

    let foundElements = 0;
    emailSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (this.processEmailElement(element)) {
            foundElements++;
          }
        });
      } catch (error) {
        console.debug('Error with selector:', selector, error);
      }
    });

    // Scan for email addresses in text content if no elements found
    if (foundElements === 0) {
      this.scanTextForEmails();
    }
    
    console.log(`Found ${foundElements} email elements to process`);
  }

  scanTextForEmails() {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script and style elements
          const parent = node.parentNode;
          if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent;
      const matches = text.match(emailRegex);
      
      if (matches) {
        matches.forEach(email => {
          // Find a suitable parent element to attach the avatar to
          const parentElement = this.findSuitableParent(node);
          if (parentElement && !this.activeCards.has(parentElement)) {
            this.createAvatarCard(email, parentElement);
          }
        });
      }
    }
  }

  findSuitableParent(textNode) {
    let current = textNode.parentNode;
    let depth = 0;
    
    while (current && depth < 5) {
      // Look for elements that look like headers or containers
      if (current.tagName && (
        current.classList?.contains('header') ||
        current.classList?.contains('from') ||
        current.classList?.contains('sender') ||
        current.classList?.contains('message') ||
        current.tagName === 'TD' ||
        current.tagName === 'TH'
      )) {
        return current;
      }
      
      current = current.parentNode;
      depth++;
    }
    
    return textNode.parentNode; // Fallback to immediate parent
  }

  // Helper method to determine if element is part of message list
  isMessageListElement(element) {
    if (!element) return false;
    
    // Check if element is within message list contexts
    const messageListSelectors = [
      '#threadTree',
      '.message-list-table',
      '.thread-row',
      '.message-list-item',
      '.conversation-item',
      '.message-item'
    ];
    
    for (const selector of messageListSelectors) {
      if (element.closest && element.closest(selector)) {
        return true;
      }
    }
    
    // Check element classes and IDs
    const elementClasses = element.className || '';
    const elementId = element.id || '';
    
    return elementClasses.includes('sender') || 
           elementClasses.includes('from-column') ||
           elementClasses.includes('correspondent') ||
           elementId.includes('threadTree') ||
           elementId.includes('messageList');
  }

  // Enhanced email label formatting
  formatEmailLabel(email) {
    if (!email) return '';
    
    // For inline avatars, we might want shorter labels
    const maxLength = 20;
    
    if (email.length > maxLength) {
      const [localPart, domain] = email.split('@');
      if (localPart.length > 8) {
        return `${localPart.substring(0, 6)}...@${domain}`;
      }
    }
    
    return email;
  }

  // Enhanced inline avatar positioning
  positionInlineAvatar(card, targetElement) {
    // For inline avatars, position relative to the parent element
    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Position to the left of the sender name in message list
    const top = rect.top + scrollTop + (rect.height - 32) / 2; // Center vertically
    const left = Math.max(rect.left + scrollLeft - 40, scrollLeft + 5); // Small avatar to the left
    
    card.style.position = 'absolute';
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
    card.style.zIndex = '9999'; // Lower z-index for inline avatars
    
    // Add inline-specific styling
    card.classList.add('inline-position');
  }

  processEmailElement(element) {
    let email = null;
    
    // Try different ways to extract email addresses
    email = element.getAttribute('emailaddress') ||
            element.getAttribute('emailAddress') ||
            element.getAttribute('data-email') ||
            element.getAttribute('from') ||
            element.getAttribute('label') ||
            element.getAttribute('value') ||
            element.textContent?.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)?.[0];
    
    if (email && email.includes('@') && !this.activeCards.has(element)) {
      console.log(`Processing email element with email: ${email}`);
      this.createAvatarCard(email.trim(), element);
      return true;
    }
    return false;
  }

  async createAvatarCard(email, targetElement) {
    console.log('Creating avatar card for:', email);
    
    try {
      // Get avatar data from background script
      const avatarData = await browser.runtime.sendMessage({
        action: 'getAvatar',
        email: email
      });

      if (!avatarData) return;

      // Determine if we need inline integration for message list
      const isMessageListItem = this.isMessageListElement(targetElement);
      
      // Create card element with enhanced styling
      const card = document.createElement('div');
      card.className = isMessageListItem ? 'avatar-card inline-avatar' : 'avatar-card';
      card.setAttribute('data-email', email);
      card.setAttribute('data-avatar-type', avatarData.type || 'unknown');
      card.classList.add('loading'); // Start with loading state
      
      // Create avatar image with enhanced loading
      const avatar = document.createElement('img');
      avatar.className = 'avatar-image';
      avatar.alt = `Avatar for ${email}`;
      avatar.width = this.settings.avatarSize || 64;
      avatar.height = this.settings.avatarSize || 64;
      
      // Enhanced loading with skeleton animation
      const loadingTimeout = setTimeout(() => {
        if (!avatar.complete) {
          card.classList.add('slow-loading');
        }
      }, 1000);
      
      // Handle image load success
      avatar.onload = () => {
        clearTimeout(loadingTimeout);
        card.classList.remove('loading', 'slow-loading');
        card.classList.add('loaded');
        // Trigger smooth fade-in animation
        requestAnimationFrame(() => {
          card.classList.add('visible');
        });
      };
      
      // Handle image load errors with better fallback
      avatar.onerror = () => {
        clearTimeout(loadingTimeout);
        card.classList.remove('loading', 'slow-loading');
        card.classList.add('error');
        avatar.src = this.createFallbackAvatar(email);
        // Retry with fallback
        avatar.onload = () => {
          card.classList.remove('error');
          card.classList.add('loaded', 'visible');
        };
      };

      // Set image source after event handlers
      avatar.src = avatarData.url;

      // Create email label with enhanced styling
      const label = document.createElement('div');
      label.className = 'avatar-email';
      label.textContent = this.formatEmailLabel(email);

      // Assemble card with smooth transitions
      card.appendChild(avatar);
      if (!isMessageListItem) {
        card.appendChild(label); // Hide label for inline avatars
      }

      // Enhanced positioning system
      if (isMessageListItem) {
        this.positionInlineAvatar(card, targetElement);
      } else {
        this.positionCard(card, targetElement);
      }
      
      document.body.appendChild(card);

      // Track active card with enhanced metadata
      this.activeCards.set(targetElement, {
        card: card,
        email: email,
        avatarData: avatarData,
        timestamp: Date.now(),
        isInline: isMessageListItem
      });

      // Add enhanced interactivity
      this.addInteractivity(card, targetElement);

      console.log('Avatar card created successfully for:', email, 'Type:', avatarData.type);

    } catch (error) {
      console.error('Error creating avatar card:', error);
    }
  }

  positionCard(card, targetElement) {
    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Position based on settings
    let top, left;
    
    switch (this.settings.cardPosition) {
      case 'top-left':
        top = rect.top + scrollTop - 10;
        left = rect.left + scrollLeft - 80;
        break;
      case 'top-right':
      default:
        top = rect.top + scrollTop - 10;
        left = rect.right + scrollLeft + 10;
        break;
      case 'bottom-right':
        top = rect.bottom + scrollTop + 10;
        left = rect.right + scrollLeft + 10;
        break;
      case 'bottom-left':
        top = rect.bottom + scrollTop + 10;
        left = rect.left + scrollLeft - 80;
        break;
    }

    // Ensure card stays within viewport
    const cardWidth = 80;
    const cardHeight = 100;
    
    if (left + cardWidth > window.innerWidth + scrollLeft) {
      left = window.innerWidth + scrollLeft - cardWidth - 10;
    }
    if (left < scrollLeft) {
      left = scrollLeft + 10;
    }
    if (top + cardHeight > window.innerHeight + scrollTop) {
      top = window.innerHeight + scrollTop - cardHeight - 10;
    }
    if (top < scrollTop) {
      top = scrollTop + 10;
    }

    card.style.position = 'absolute';
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
    card.style.zIndex = '10000';
  }

  addInteractivity(card, targetElement) {
    let hideTimeout;

    const showCard = () => {
      clearTimeout(hideTimeout);
      card.classList.add('visible');
    };

    const hideCard = () => {
      hideTimeout = setTimeout(() => {
        card.classList.remove('visible');
      }, 200);
    };

    // Show on hover of target element
    targetElement.addEventListener('mouseenter', showCard);
    targetElement.addEventListener('mouseleave', hideCard);

    // Keep card visible when hovering over it
    card.addEventListener('mouseenter', showCard);
    card.addEventListener('mouseleave', hideCard);

    // Enhanced accessibility support
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Avatar for ${card.getAttribute('data-email')}. Press Enter to copy email address.`);

    // Enhanced click and keyboard handling
    const copyEmail = async () => {
      const email = card.getAttribute('data-email');
      try {
        await navigator.clipboard.writeText(email);
        
        // Enhanced feedback with accessibility
        const feedback = document.createElement('div');
        feedback.className = 'avatar-feedback';
        feedback.textContent = 'Email copied!';
        feedback.setAttribute('role', 'status');
        feedback.setAttribute('aria-live', 'polite');
        card.appendChild(feedback);
        
        // Also announce to screen readers
        const announcement = document.createElement('div');
        announcement.className = 'sr-only';
        announcement.textContent = `Email address ${email} copied to clipboard`;
        announcement.setAttribute('aria-live', 'assertive');
        card.appendChild(announcement);
        
        setTimeout(() => {
          feedback.remove();
          announcement.remove();
        }, 2000);
      } catch (error) {
        console.warn('Could not copy email to clipboard:', error);
        
        // Fallback feedback
        const feedback = document.createElement('div');
        feedback.className = 'avatar-feedback';
        feedback.style.background = '#dc2626';
        feedback.textContent = 'Copy failed';
        card.appendChild(feedback);
        
        setTimeout(() => {
          feedback.remove();
        }, 2000);
      }
    };

    // Click handler
    card.addEventListener('click', copyEmail);
    
    // Keyboard handler for accessibility
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        copyEmail();
      } else if (event.key === 'Escape') {
        card.blur();
        hideCard();
      }
    });

    // Focus management
    card.addEventListener('focus', showCard);
    card.addEventListener('blur', hideCard);
  }

  createFallbackAvatar(email) {
    const initial = email.charAt(0).toUpperCase();
    const hue = this.simpleHash(email) % 360;
    
    const svg = `
      <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="32" fill="hsl(${hue}, 60%, 65%)" />
        <text x="32" y="42" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">${initial}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Check if we're in a Thunderbird context
  isThunderbirdContext() {
    const url = window.location.href;
    const userAgent = navigator.userAgent;
    
    // Check URL patterns that indicate Thunderbird
    if (url.includes('chrome://messenger/') ||
        url.includes('about:3pane') ||
        url.includes('about:message') ||
        url.includes('messenger.xhtml') ||
        url.includes('messenger.xul')) {
      return true;
    }
    
    // Check for Thunderbird-specific objects
    if (typeof window.messenger !== 'undefined' ||
        typeof window.browser !== 'undefined' && window.browser.runtime) {
      return true;
    }
    
    // Check user agent
    if (userAgent.includes('Thunderbird') || userAgent.includes('Betterbird')) {
      return true;
    }
    
    // Check for Thunderbird-specific DOM elements
    if (document.getElementById('messengerWindow') ||
        document.getElementById('threadTree') ||
        document.getElementById('messagePane')) {
      return true;
    }
    
    return false;
  }

  // Enhanced batch processing for performance
  batchProcessElements(elements) {
    // Process elements in batches to avoid blocking the UI
    const batchSize = 10;
    let currentBatch = 0;
    
    const processBatch = () => {
      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, elements.length);
      
      for (let i = start; i < end; i++) {
        const element = elements[i];
        if (element && !this.activeCards.has(element)) {
          this.processEmailElement(element);
        }
      }
      
      currentBatch++;
      
      if (end < elements.length) {
        // Process next batch on next frame
        requestAnimationFrame(processBatch);
      }
    };
    
    // Start processing
    requestAnimationFrame(processBatch);
  }

  // Enhanced cleanup method with memory management
  destroy() {
    // Clear all timeouts
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
    
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Batch remove all active cards for better performance
    const cardsToRemove = [];
    this.activeCards.forEach(({ card }) => {
      if (card.parentNode) {
        cardsToRemove.push(card);
      }
    });
    
    // Remove cards in batches
    const removeBatch = (cards) => {
      const batchSize = 20;
      for (let i = 0; i < Math.min(batchSize, cards.length); i++) {
        const card = cards[i];
        card.parentNode.removeChild(card);
      }
      
      if (cards.length > batchSize) {
        requestAnimationFrame(() => removeBatch(cards.slice(batchSize)));
      }
    };
    
    if (cardsToRemove.length > 0) {
      removeBatch(cardsToRemove);
    }
    
    // Clear collections
    this.activeCards.clear();
    this.pendingScans?.clear();
    if (this.scanQueue) {
      this.scanQueue.length = 0;
    }
  }
}

// Initialize the injector
const avatarInjector = new AvatarCardInjector();
window.avatarInjector = avatarInjector; // Make available to other scripts

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  avatarInjector.destroy();
});

// Add periodic scanning for dynamic content
setInterval(() => {
  if (avatarInjector && document.body) {
    avatarInjector.scanForEmails();
  }
}, 5000); // Scan every 5 seconds

console.log('Avatar Card View: Content script loaded');