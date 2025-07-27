/**
 * Avatar Card View - Enhanced Background Script
 * High-performance background processing with advanced caching and message handling
 * 
 * Architecture:
 * - AvatarManager: Core avatar fetching and business logic
 * - CacheManager: Advanced LRU + TTL caching system
 * - MessageHandler: High-performance message communication
 * - ThunderbirdInjector: Thunderbird-specific integration
 */

// Enhanced modules will be loaded dynamically for WebExtensions compatibility
// Module loading handled by the class constructor

class EnhancedAvatarCardManager {
  constructor() {
    // Initialize basic properties first, then load modules
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.settings = {
      maxCacheSize: 200,
      cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
      avatarSize: 32,
      enableFavicon: true,
      enableLogoAPI: true,
      enableGoogleFavicon: true
    };
    
    // Add avatarManager property to fix undefined reference
    this.avatarManager = this;
    
    this.init();
  }

  async init() {
    console.log('Enhanced Avatar Card Manager: Initializing...');
    
    try {
      // Ensure avatarManager property is properly initialized
      if (!this.avatarManager) {
        this.avatarManager = this;
      }
      
      // Load settings from storage if available
      const stored = await browser.storage.local.get('avatarSettings');
      if (stored.avatarSettings) {
        this.settings = { ...this.settings, ...stored.avatarSettings };
      }
      
      // Ensure avatarManager.settings is accessible
      if (this.avatarManager && !this.avatarManager.settings) {
        this.avatarManager.settings = this.settings;
      }
      
      // Set up message listeners
      if (browser.runtime && browser.runtime.onMessage) {
        browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
      }
      
      // Set up periodic maintenance
      this.setupMaintenanceTasks();
      
      console.log('Enhanced Avatar Card Manager: Initialization complete');
    } catch (error) {
      console.error('Enhanced Avatar Card Manager: Initialization failed:', error);
    }
  }
  
  setupMaintenanceTasks() {
    // Memory cleanup
    setInterval(() => this.cleanCache(), 10 * 60 * 1000); // Every 10 minutes
  }
  
  performCleanup() {
    // Clean cache and force garbage collection hint
    this.cleanCache();
    if (typeof gc !== 'undefined') {
      gc();
    }
  }

  // Handle runtime messages
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'getAvatar':
          const avatar = await this.getAvatar(message.email);
          sendResponse({ success: true, avatar });
          break;
        case 'updateSettings':
          const settings = await this.updateSettings(message.settings);
          sendResponse({ success: true, settings });
          break;
        case 'clearCache':
          const result = this.clearCache();
          sendResponse({ success: true, result });
          break;
        case 'getCacheStats':
          const stats = this.getCacheStats();
          sendResponse({ success: true, stats });
          break;
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }

  async getAvatar(email) {
    if (!email) return null;
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check memory cache first
    const cached = this.cache.get(normalizedEmail);
    if (cached && Date.now() - cached.timestamp < this.settings.cacheExpiry) {
      return cached.data;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(normalizedEmail)) {
      return this.pendingRequests.get(normalizedEmail);
    }

    // Create new request
    const promise = this.fetchAvatar(normalizedEmail);
    this.pendingRequests.set(normalizedEmail, promise);
    
    try {
      const result = await promise;
      this.cacheAvatar(normalizedEmail, result);
      return result;
    } finally {
      this.pendingRequests.delete(normalizedEmail);
    }
  }

  async fetchAvatar(email) {
    // Use new business avatar system
    return this.getBusinessAvatar(email);
  }

  async getBusinessAvatar(email) {
    const domain = this.extractDomain(email);
    
    // Priority 1: Company favicon
    if (this.settings.enableFavicon) {
      try {
        const faviconUrl = await this.getFaviconUrl(domain);
        if (await this.validateImageUrl(faviconUrl)) {
          return {
            url: faviconUrl,
            type: 'favicon',
            domain: domain,
            size: this.settings.avatarSize,
            email: email
          };
        }
      } catch (error) {
        console.debug('Favicon fetch failed for', domain, error);
      }
    }

    // Priority 2: Logo APIs
    if (this.settings.enableLogoAPI) {
      try {
        const logoUrl = await this.getCompanyLogo(domain);
        if (await this.validateImageUrl(logoUrl)) {
          return {
            url: logoUrl,
            type: 'company-logo',
            domain: domain,
            size: this.settings.avatarSize,
            email: email
          };
        }
      } catch (error) {
        console.debug('Company logo fetch failed for', domain, error);
      }
    }

    // Priority 3: Google favicon service
    if (this.settings.enableGoogleFavicon) {
      try {
        const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${this.settings.avatarSize}`;
        if (await this.validateImageUrl(googleFaviconUrl)) {
          return {
            url: googleFaviconUrl,
            type: 'google-favicon',
            domain: domain,
            size: this.settings.avatarSize,
            email: email
          };
        }
      } catch (error) {
        console.debug('Google favicon fetch failed for', domain, error);
      }
    }

    // Fallback: Enhanced business initials
    return this.createBusinessInitials(email, domain);
  }

  getGravatarUrl(email) {
    const hash = this.md5Hash(email);
    return `https://www.gravatar.com/avatar/${hash}?s=${this.settings.avatarSize}&d=404`;
  }

  createBusinessInitials(email, domain) {
    const initials = this.generateBusinessInitials(email);
    const colors = this.getBusinessColors(domain);
    
    const svg = `
      <svg width="${this.settings.avatarSize}" height="${this.settings.avatarSize}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="businessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.2"/>
          </filter>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#businessGrad)" stroke="${colors.border}" stroke-width="1.5" filter="url(#shadow)"/>
        <text x="32" y="40" text-anchor="middle" fill="white" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" font-size="18" font-weight="600" letter-spacing="0.5px">${initials}</text>
      </svg>
    `.trim();
    
    return {
      url: `data:image/svg+xml;base64,${btoa(svg)}`,
      type: 'business-initials',
      domain: domain,
      size: this.settings.avatarSize,
      email: email,
      initials: initials
    };
  }

  cacheAvatar(email, data) {
    // Implement LRU cache
    if (this.cache.size >= this.settings.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(email, {
      data: data,
      timestamp: Date.now()
    });
  }

  cleanCache() {
    const now = Date.now();
    for (const [email, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.settings.cacheExpiry) {
        this.cache.delete(email);
      }
    }
  }

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Sync with avatarManager property if it exists
    if (this.avatarManager && this.avatarManager !== this) {
      this.avatarManager.settings = this.settings;
    }
    
    await browser.storage.local.set({ avatarSettings: this.settings });
    return this.settings;
  }

  clearCache() {
    this.cache.clear();
    return { cleared: true };
  }

  getCacheStats() {
    // Safe access to settings with fallback
    const settings = this.settings || this.avatarManager?.settings || {};
    
    return {
      size: this.cache.size,
      maxSize: settings.maxCacheSize || 200,
      settings: settings
    };
  }

  // Business avatar helper methods
  extractDomain(email) {
    if (!email) return null;
    const match = email.match(/@([^@]+\.[^@]+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  generateBusinessInitials(email) {
    const [localPart] = email.split('@');
    
    if (localPart.includes('.')) {
      // firstname.lastname@domain.com
      const parts = localPart.split('.');
      return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
    } else if (localPart.includes('-')) {
      // first-last@domain.com  
      const parts = localPart.split('-');
      return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
    } else if (localPart.length >= 2) {
      // Single name: take first two characters
      return localPart.substring(0, 2).toUpperCase();
    } else {
      // Single character: duplicate it
      return localPart.charAt(0).toUpperCase().repeat(2);
    }
  }

  getBusinessColors(domain) {
    const colorSchemes = [
      { primary: '#1e40af', secondary: '#3b82f6', border: '#1d4ed8' }, // Professional Blue
      { primary: '#047857', secondary: '#10b981', border: '#059669' }, // Corporate Green  
      { primary: '#7c2d12', secondary: '#ea580c', border: '#c2410c' }, // Business Orange
      { primary: '#581c87', secondary: '#8b5cf6', border: '#7c3aed' }, // Executive Purple
      { primary: '#374151', secondary: '#6b7280', border: '#4b5563' }, // Corporate Gray
      { primary: '#b91c1c', secondary: '#ef4444', border: '#dc2626' }, // Executive Red
      { primary: '#0f766e', secondary: '#14b8a6', border: '#0d9488' }, // Teal Corporate
      { primary: '#92400e', secondary: '#f59e0b', border: '#d97706' }  // Gold Business
    ];

    let hash = 0;
    const input = domain || email || 'default';
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return colorSchemes[Math.abs(hash) % colorSchemes.length];
  }

  async getFaviconUrl(domain) {
    if (!domain) throw new Error('No domain provided');
    
    // Try known business domains first
    const knownFavicon = this.getKnownBusinessFavicon(domain);
    if (knownFavicon) return knownFavicon;
    
    // Try multiple favicon locations
    const faviconUrls = [
      `https://${domain}/favicon.ico`,
      `https://www.${domain}/favicon.ico`,
      `https://${domain}/assets/favicon.ico`,
      `https://${domain}/images/favicon.ico`,
      `https://${domain}/favicon.png`,
      `https://${domain}/apple-touch-icon.png`
    ];

    for (const url of faviconUrls) {
      if (await this.validateImageUrl(url)) {
        return url;
      }
    }

    throw new Error(`No favicon found for ${domain}`);
  }

  async getCompanyLogo(domain) {
    if (!domain) throw new Error('No domain provided');
    
    // Clearbit Logo API (free tier)
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    
    const response = await fetch(clearbitUrl, { method: 'HEAD', mode: 'cors' });
    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
      return clearbitUrl;
    }
    
    throw new Error(`Company logo not found for ${domain}`);
  }

  getKnownBusinessFavicon(domain) {
    const knownFavicons = {
      'gmail.com': 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico',
      'outlook.com': 'https://outlook.live.com/favicon.ico',
      'hotmail.com': 'https://outlook.live.com/favicon.ico', 
      'yahoo.com': 'https://s.yimg.com/rz/l/favicon.ico',
      'microsoft.com': 'https://www.microsoft.com/favicon.ico',
      'google.com': 'https://www.google.com/favicon.ico',
      'apple.com': 'https://www.apple.com/favicon.ico',
      'amazon.com': 'https://www.amazon.com/favicon.ico',
      'salesforce.com': 'https://c1.sfdcstatic.com/etc/designs/sfdc-www/dist/images/favicons/favicon-32x32.png'
    };

    return knownFavicons[domain];
  }

  async validateImageUrl(url) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        cache: 'default'
      });
      
      return response.ok && response.headers.get('content-type')?.startsWith('image/');
    } catch (error) {
      return false;
    }
  }

  // Simple hash function for generating colors
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // MD5 hash for Gravatar (simplified version)
  md5Hash(str) {
    // For production, use a proper MD5 implementation
    // This is a placeholder that creates a consistent hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

// Initialize the enhanced avatar manager
const enhancedAvatarManager = new EnhancedAvatarCardManager();

// Maintain backward compatibility
const avatarManager = enhancedAvatarManager; // Legacy alias

// Alternative injection using tabs API for Thunderbird compatibility
class ThunderbirdInjector {
  constructor() {
    this.injectedTabs = new Set();
    this.init();
  }

  async init() {
    console.log('Thunderbird Injector initializing...');
    
    // Listen for tab updates
    if (browser.tabs && browser.tabs.onUpdated) {
      browser.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    }
    
    // Listen for tab activation
    if (browser.tabs && browser.tabs.onActivated) {
      browser.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
    }
    
    // Initial injection attempt
    setTimeout(() => this.injectIntoExistingTabs(), 1000);
  }

  async handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && this.isThunderbirdUrl(tab.url)) {
      console.log('Thunderbird tab updated, injecting:', tab.url);
      await this.injectIntoTab(tabId);
    }
  }

  async handleTabActivated(activeInfo) {
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      if (this.isThunderbirdUrl(tab.url)) {
        console.log('Thunderbird tab activated, injecting:', tab.url);
        await this.injectIntoTab(activeInfo.tabId);
      }
    } catch (error) {
      console.debug('Tab activation check failed:', error);
    }
  }

  isThunderbirdUrl(url) {
    if (!url) return false;
    return url.includes('chrome://messenger/') ||
           url.includes('about:3pane') ||
           url.includes('about:message') ||
           url.includes('messenger.xhtml') ||
           url.includes('messenger.xul');
  }

  async injectIntoTab(tabId) {
    if (this.injectedTabs.has(tabId)) {
      return; // Already injected
    }

    try {
      // Inject CSS first
      await browser.tabs.insertCSS(tabId, {
        file: 'content/avatar-cards.css',
        allFrames: true
      });

      // Inject scripts
      await browser.tabs.executeScript(tabId, {
        file: 'content/content-script.js',
        allFrames: true
      });

      await browser.tabs.executeScript(tabId, {
        file: 'content/thunderbird-integration.js',
        allFrames: true
      });

      this.injectedTabs.add(tabId);
      console.log('Successfully injected into Thunderbird tab:', tabId);

    } catch (error) {
      console.debug('Injection failed for tab:', tabId, error);
    }
  }

  async injectIntoExistingTabs() {
    try {
      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        if (this.isThunderbirdUrl(tab.url)) {
          await this.injectIntoTab(tab.id);
        }
      }
    } catch (error) {
      console.debug('Failed to inject into existing tabs:', error);
    }
  }
}

// Initialize Thunderbird injector
const thunderbirdInjector = new ThunderbirdInjector();

console.log('Avatar Card View: Background script loaded with Thunderbird injection');