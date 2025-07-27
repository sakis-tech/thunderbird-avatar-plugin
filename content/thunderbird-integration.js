/**
 * Avatar Card View - Enhanced Thunderbird Integration
 * Specific integration for Thunderbird's internal APIs and DOM structure
 */

// Wait for Thunderbird's internal APIs to be available
if (typeof window.MozXULElement !== 'undefined') {
  console.log('Thunderbird XUL environment detected');
}

// Enhanced email detection for Thunderbird
class ThunderbirdEmailDetector {
  constructor(cardInjector) {
    this.cardInjector = cardInjector;
    this.setupThunderbirdSpecificHooks();
  }

  setupThunderbirdSpecificHooks() {
    // Hook into Thunderbird's message display
    if (window.gMessageDisplay) {
      console.log('Thunderbird gMessageDisplay found, hooking into message events');
      
      // Monitor when messages are displayed
      const originalDisplayMessage = window.gMessageDisplay.displayMessage;
      if (originalDisplayMessage) {
        window.gMessageDisplay.displayMessage = function(...args) {
          const result = originalDisplayMessage.apply(this, args);
          setTimeout(() => {
            console.log('Message displayed, scanning for avatars...');
            this.cardInjector?.scanForEmails();
          }, 300);
          return result;
        }.bind(this);
      }
    }

    // Hook into thread tree selection changes
    if (window.gFolderDisplay) {
      console.log('Thunderbird gFolderDisplay found');
      
      const threadTree = document.getElementById('threadTree');
      if (threadTree) {
        threadTree.addEventListener('select', () => {
          setTimeout(() => {
            console.log('Thread selection changed, scanning...');
            this.cardInjector?.scanForEmails();
          }, 200);
        });
      }
    }

    // Monitor for tab changes in multi-tab mode
    if (window.gTabmail) {
      console.log('Thunderbird gTabmail found, monitoring tab changes');
      
      const originalSwitchToTab = window.gTabmail.switchToTab;
      if (originalSwitchToTab) {
        window.gTabmail.switchToTab = function(...args) {
          const result = originalSwitchToTab.apply(this, args);
          setTimeout(() => {
            console.log('Tab switched, scanning for avatars...');
            this.cardInjector?.scanForEmails();
          }, 400);
          return result;
        }.bind(this);
      }
    }
  }

  // Extract email from Thunderbird-specific elements
  extractEmailFromThunderbirdElement(element) {
    // Check for Thunderbird's specific attributes
    const thunderbirdAttrs = [
      'emailAddress',
      'emailaddress', 
      'value',
      'label',
      'headerValue',
      'displayName'
    ];

    for (const attr of thunderbirdAttrs) {
      const value = element.getAttribute(attr);
      if (value && value.includes('@')) {
        return value;
      }
    }

    // Check parent elements for email context
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      for (const attr of thunderbirdAttrs) {
        const value = parent.getAttribute(attr);
        if (value && value.includes('@')) {
          return value;
        }
      }
      parent = parent.parentElement;
      depth++;
    }

    return null;
  }

  // Find Thunderbird message header elements
  findMessageHeaders() {
    const headerSelectors = [
      '#expandedHeaderView .headerValue',
      '#collapsedHeaderView .headerValue', 
      '.message-header-row .headerValue',
      '#messageHeader .headerValue'
    ];

    const headers = [];
    headerSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const email = this.extractEmailFromThunderbirdElement(el);
        if (email) {
          headers.push({ element: el, email });
        }
      });
    });

    return headers;
  }

  // Find thread pane entries
  findThreadPaneEntries() {
    const threadEntries = [];
    const threadTree = document.getElementById('threadTree');
    
    if (threadTree) {
      const treeCells = threadTree.querySelectorAll('treecell');
      treeCells.forEach(cell => {
        const email = this.extractEmailFromThunderbirdElement(cell);
        if (email) {
          threadEntries.push({ element: cell, email });
        }
      });
    }

    return threadEntries;
  }

  // Enhanced scanning with Thunderbird-specific logic
  performThunderbirdScan() {
    console.log('Performing Thunderbird-specific email scan...');
    
    const headers = this.findMessageHeaders();
    const threadEntries = this.findThreadPaneEntries();
    
    console.log(`Found ${headers.length} header emails, ${threadEntries.length} thread emails`);
    
    [...headers, ...threadEntries].forEach(({ element, email }) => {
      if (this.cardInjector && !this.cardInjector.activeCards.has(element)) {
        console.log(`Creating avatar for: ${email}`);
        this.cardInjector.createAvatarCard(email, element);
      }
    });
  }
}

// Integrate with the main avatar injector when it's ready
if (typeof window.avatarInjector !== 'undefined') {
  window.thunderbirdDetector = new ThunderbirdEmailDetector(window.avatarInjector);
} else {
  // Wait for the main script to load
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (typeof window.avatarInjector !== 'undefined') {
        window.thunderbirdDetector = new ThunderbirdEmailDetector(window.avatarInjector);
      }
    }, 1000);
  });
}

console.log('Thunderbird integration script loaded');