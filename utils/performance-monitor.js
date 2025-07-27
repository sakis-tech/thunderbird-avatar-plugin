/**
 * Avatar Card View - Performance Monitor
 * Lightweight performance tracking and memory optimization
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      avatarFetches: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
      memoryUsage: 0,
      lastCleanup: Date.now(),
      errors: 0
    };
    
    this.observers = new Map();
    this.startTime = Date.now();
    this.enabled = true;
    
    this.init();
  }

  init() {
    // Monitor memory usage periodically
    setInterval(() => this.updateMemoryMetrics(), 30000); // Every 30 seconds
    
    // Cleanup old metrics periodically
    setInterval(() => this.cleanupMetrics(), 300000); // Every 5 minutes
    
    // Listen for performance events
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Monitor DOM mutations for performance impact
    if (typeof document !== 'undefined') {
      this.mutationObserver = new MutationObserver((mutations) => {
        this.trackMutations(mutations.length);
      });
    }
  }

  // Track avatar fetch performance
  async trackAvatarFetch(email, fetchFunction) {
    if (!this.enabled) return fetchFunction();
    
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();
    
    try {
      const result = await fetchFunction();
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Update metrics
      this.metrics.avatarFetches++;
      this.metrics.totalLoadTime += loadTime;
      this.metrics.averageLoadTime = this.metrics.totalLoadTime / this.metrics.avatarFetches;
      
      // Track cache performance
      if (result && result.fromCache) {
        this.metrics.cacheHits++;
      } else {
        this.metrics.cacheMisses++;
      }
      
      // Log slow operations
      if (loadTime > 1000) { // More than 1 second
        console.warn(`Slow avatar fetch for ${email}: ${loadTime.toFixed(2)}ms`);
      }
      
      this.updateMemoryMetrics();
      return result;
      
    } catch (error) {
      this.metrics.errors++;
      console.error('Avatar fetch error:', error);
      throw error;
    }
  }

  // Track cache operations
  trackCacheOperation(operation, hit = false) {
    if (!this.enabled) return;
    
    if (hit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  // Track DOM mutations
  trackMutations(count) {
    if (!this.enabled) return;
    
    // If too many mutations, might indicate performance issues
    if (count > 50) {
      console.warn(`High DOM mutation count: ${count}`);
    }
  }

  // Get current memory usage estimate
  getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  // Update memory metrics
  updateMemoryMetrics() {
    const memory = this.getMemoryUsage();
    if (memory) {
      this.metrics.memoryUsage = memory.used;
      
      // Warn if memory usage is high
      const usageRatio = memory.used / memory.limit;
      if (usageRatio > 0.8) {
        console.warn(`High memory usage: ${(usageRatio * 100).toFixed(1)}%`);
        this.suggestCleanup();
      }
    }
  }

  // Suggest cleanup when memory is high
  suggestCleanup() {
    // Suggest cache cleanup
    browser.runtime.sendMessage({
      action: 'suggestionCleanup',
      reason: 'high_memory_usage'
    }).catch(() => {
      // Background script might not be available
    });
  }

  // Get performance report
  getReport() {
    const uptime = Date.now() - this.startTime;
    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0 
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(1)
      : '0';
    
    const memory = this.getMemoryUsage();
    
    return {
      uptime: uptime,
      avatarFetches: this.metrics.avatarFetches,
      averageLoadTime: this.metrics.averageLoadTime.toFixed(2),
      cacheHitRate: `${cacheHitRate}%`,
      errors: this.metrics.errors,
      memoryUsage: memory ? this.formatBytes(memory.used) : 'Unknown',
      memoryLimit: memory ? this.formatBytes(memory.limit) : 'Unknown',
      lastCleanup: this.metrics.lastCleanup,
      timestamp: Date.now()
    };
  }

  // Get detailed metrics for debugging
  getDetailedMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      memory: this.getMemoryUsage(),
      observers: Array.from(this.observers.keys())
    };
  }

  // Format bytes for display
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Clean up old metrics
  cleanupMetrics() {
    // Reset counters if they get too large
    if (this.metrics.avatarFetches > 10000) {
      this.metrics.avatarFetches = Math.floor(this.metrics.avatarFetches / 2);
      this.metrics.totalLoadTime = Math.floor(this.metrics.totalLoadTime / 2);
      this.metrics.cacheHits = Math.floor(this.metrics.cacheHits / 2);
      this.metrics.cacheMisses = Math.floor(this.metrics.cacheMisses / 2);
    }
    
    this.metrics.lastCleanup = Date.now();
  }

  // Enable/disable monitoring
  setEnabled(enabled) {
    this.enabled = enabled;
    
    if (!enabled && this.mutationObserver) {
      this.mutationObserver.disconnect();
    } else if (enabled && this.mutationObserver && typeof document !== 'undefined') {
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }
  }

  // Reset all metrics
  reset() {
    this.metrics = {
      avatarFetches: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
      memoryUsage: 0,
      lastCleanup: Date.now(),
      errors: 0
    };
    this.startTime = Date.now();
  }

  // Benchmark function execution
  async benchmark(name, fn) {
    if (!this.enabled) return fn();
    
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.debug(`Benchmark ${name}: ${duration.toFixed(2)}ms`);
      
      if (startMemory) {
        const endMemory = this.getMemoryUsage();
        const memoryDiff = endMemory.used - startMemory.used;
        if (memoryDiff > 0) {
          console.debug(`Memory impact ${name}: +${this.formatBytes(memoryDiff)}`);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Benchmark ${name} failed:`, error);
      throw error;
    }
  }

  // Export metrics for external analysis
  exportMetrics() {
    return {
      ...this.getReport(),
      detailed: this.getDetailedMetrics(),
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
} else if (typeof window !== 'undefined') {
  window.PerformanceMonitor = PerformanceMonitor;
}

console.log('Avatar Card View: Performance Monitor loaded');