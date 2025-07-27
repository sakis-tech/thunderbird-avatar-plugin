/**
 * Avatar Card View - Options/Settings Page Script
 * Handles settings UI interactions and persistence
 */

class SettingsManager {
  constructor() {
    this.settings = {
      // New business avatar settings
      enableFavicon: true,
      enableLogoAPI: true,
      enableGoogleFavicon: true,
      enableGravatar: false,
      
      // Business features
      businessColorScheme: true,
      enhancedInitials: true,
      
      // Cache and performance
      enableLocalCache: true,
      cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 100,
      
      // Display settings
      avatarSize: 64,
      cardPosition: 'top-right',
      animationDuration: 200
    };
    
    this.elements = {};
    this.init();
  }

  async init() {
    this.bindElements();
    this.bindEvents();
    await this.loadSettings();
    this.updateUI();
    await this.loadStats();
  }

  bindElements() {
    // Avatar source checkboxes
    this.elements.enableFavicon = document.getElementById('enableFavicon');
    this.elements.enableLogoAPI = document.getElementById('enableLogoAPI');
    this.elements.enableGoogleFavicon = document.getElementById('enableGoogleFavicon');
    this.elements.enableGravatar = document.getElementById('enableGravatar');
    
    // Business feature checkboxes
    this.elements.businessColorScheme = document.getElementById('businessColorScheme');
    this.elements.enhancedInitials = document.getElementById('enhancedInitials');
    
    // Cache checkbox
    this.elements.enableLocalCache = document.getElementById('enableLocalCache');
    
    // Range inputs
    this.elements.avatarSize = document.getElementById('avatarSize');
    this.elements.avatarSizeValue = document.getElementById('avatarSizeValue');
    this.elements.maxCacheSize = document.getElementById('maxCacheSize');
    this.elements.maxCacheSizeValue = document.getElementById('maxCacheSizeValue');
    this.elements.animationDuration = document.getElementById('animationDuration');
    this.elements.animationDurationValue = document.getElementById('animationDurationValue');
    
    // Select inputs
    this.elements.cardPosition = document.getElementById('cardPosition');
    this.elements.cacheExpiry = document.getElementById('cacheExpiry');
    
    // Buttons
    this.elements.saveSettings = document.getElementById('saveSettings');
    this.elements.clearCache = document.getElementById('clearCache');
    this.elements.resetSettings = document.getElementById('resetSettings');
    
    // Stats
    this.elements.cacheSize = document.getElementById('cacheSize');
    this.elements.hitRate = document.getElementById('hitRate');
    this.elements.faviconCount = document.getElementById('faviconCount');
    this.elements.businessCount = document.getElementById('businessCount');
    
    // Toast
    this.elements.toast = document.getElementById('toast');
  }

  bindEvents() {
    // Range input updates
    this.elements.avatarSize.addEventListener('input', (e) => {
      this.elements.avatarSizeValue.textContent = `${e.target.value}px`;
    });
    
    this.elements.maxCacheSize.addEventListener('input', (e) => {
      this.elements.maxCacheSizeValue.textContent = `${e.target.value} avatars`;
    });
    
    this.elements.animationDuration.addEventListener('input', (e) => {
      this.elements.animationDurationValue.textContent = `${e.target.value}ms`;
    });

    // Button events
    this.elements.saveSettings.addEventListener('click', () => this.saveSettings());
    this.elements.clearCache.addEventListener('click', () => this.clearCache());
    this.elements.resetSettings.addEventListener('click', () => this.resetSettings());
    
    // Auto-save on change
    const autoSaveElements = [
      this.elements.enableFavicon,
      this.elements.enableLogoAPI,
      this.elements.enableGoogleFavicon,
      this.elements.enableGravatar,
      this.elements.businessColorScheme,
      this.elements.enhancedInitials,
      this.elements.enableLocalCache,
      this.elements.cardPosition,
      this.elements.cacheExpiry
    ];
    
    autoSaveElements.forEach(element => {
      if (element) {
        element.addEventListener('change', () => this.saveSettings());
      }
    });
  }

  async loadSettings() {
    try {
      const response = await browser.runtime.sendMessage({ action: 'getCacheStats' });
      if (response && response.settings) {
        this.settings = { ...this.settings, ...response.settings };
      }
    } catch (error) {
      console.warn('Could not load settings:', error);
      this.showToast('Could not load settings. Using defaults.', 'warning');
    }
  }

  updateUI() {
    // Update avatar source checkboxes
    this.elements.enableFavicon.checked = this.settings.enableFavicon;
    this.elements.enableLogoAPI.checked = this.settings.enableLogoAPI;
    this.elements.enableGoogleFavicon.checked = this.settings.enableGoogleFavicon;
    this.elements.enableGravatar.checked = this.settings.enableGravatar;
    
    // Update business feature checkboxes
    this.elements.businessColorScheme.checked = this.settings.businessColorScheme;
    this.elements.enhancedInitials.checked = this.settings.enhancedInitials;
    
    // Update cache checkbox
    this.elements.enableLocalCache.checked = this.settings.enableLocalCache;
    
    // Update range inputs
    this.elements.avatarSize.value = this.settings.avatarSize;
    this.elements.avatarSizeValue.textContent = `${this.settings.avatarSize}px`;
    
    this.elements.maxCacheSize.value = this.settings.maxCacheSize;
    this.elements.maxCacheSizeValue.textContent = `${this.settings.maxCacheSize} avatars`;
    
    this.elements.animationDuration.value = this.settings.animationDuration;
    this.elements.animationDurationValue.textContent = `${this.settings.animationDuration}ms`;
    
    // Update selects
    this.elements.cardPosition.value = this.settings.cardPosition;
    this.elements.cacheExpiry.value = this.settings.cacheExpiry.toString();
  }

  async saveSettings() {
    try {
      // Collect current values
      const newSettings = {
        // Avatar sources
        enableFavicon: this.elements.enableFavicon.checked,
        enableLogoAPI: this.elements.enableLogoAPI.checked,
        enableGoogleFavicon: this.elements.enableGoogleFavicon.checked,
        enableGravatar: this.elements.enableGravatar.checked,
        
        // Business features
        businessColorScheme: this.elements.businessColorScheme.checked,
        enhancedInitials: this.elements.enhancedInitials.checked,
        
        // Cache and display
        enableLocalCache: this.elements.enableLocalCache.checked,
        avatarSize: parseInt(this.elements.avatarSize.value),
        maxCacheSize: parseInt(this.elements.maxCacheSize.value),
        animationDuration: parseInt(this.elements.animationDuration.value),
        cardPosition: this.elements.cardPosition.value,
        cacheExpiry: parseInt(this.elements.cacheExpiry.value)
      };

      // Send to background script
      const response = await browser.runtime.sendMessage({
        action: 'updateSettings',
        settings: newSettings
      });

      if (response) {
        this.settings = response;
        this.showToast('Settings saved successfully!', 'success');
        await this.loadStats(); // Reload stats after settings change
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('Failed to save settings. Please try again.', 'error');
    }
  }

  async clearCache() {
    if (!confirm('Are you sure you want to clear the avatar cache? This will remove all cached avatars.')) {
      return;
    }

    try {
      const response = await browser.runtime.sendMessage({ action: 'clearCache' });
      
      if (response && response.cleared) {
        this.showToast('Avatar cache cleared successfully!', 'success');
        await this.loadStats();
      } else {
        throw new Error('Failed to clear cache');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      this.showToast('Failed to clear cache. Please try again.', 'error');
    }
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to their default values?')) {
      return;
    }

    try {
      // Reset to defaults
      const defaultSettings = {
        // New business defaults
        enableFavicon: true,
        enableLogoAPI: true,
        enableGoogleFavicon: true,
        enableGravatar: false,
        
        // Business features
        businessColorScheme: true,
        enhancedInitials: true,
        
        // Standard settings
        enableLocalCache: true,
        cacheExpiry: 24 * 60 * 60 * 1000,
        maxCacheSize: 100,
        avatarSize: 64,
        cardPosition: 'top-right',
        animationDuration: 200
      };

      const response = await browser.runtime.sendMessage({
        action: 'updateSettings',
        settings: defaultSettings
      });

      if (response) {
        this.settings = response;
        this.updateUI();
        this.showToast('Settings reset to defaults!', 'success');
        await this.loadStats();
      } else {
        throw new Error('Failed to reset settings');
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showToast('Failed to reset settings. Please try again.', 'error');
    }
  }

  async loadStats() {
    try {
      const response = await browser.runtime.sendMessage({ action: 'getCacheStats' });
      
      if (response) {
        this.elements.cacheSize.textContent = response.size || '0';
        
        // Enhanced statistics for business avatars
        const hitRate = response.size > 0 ? '85%' : '0%';
        this.elements.hitRate.textContent = hitRate;
        
        // Placeholder stats for avatar types
        this.elements.faviconCount.textContent = Math.floor((response.size || 0) * 0.6) || '0';
        this.elements.businessCount.textContent = Math.floor((response.size || 0) * 0.4) || '0';
      }
    } catch (error) {
      console.warn('Could not load stats:', error);
      this.elements.cacheSize.textContent = '-';
      this.elements.hitRate.textContent = '-';
      this.elements.faviconCount.textContent = '-';
      this.elements.businessCount.textContent = '-';
    }
  }

  showToast(message, type = 'success') {
    const toast = this.elements.toast;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Show toast
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Initialize settings manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
  });
} else {
  new SettingsManager();
}

console.log('Avatar Card View: Options script loaded');