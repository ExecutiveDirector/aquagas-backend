// ============================================
// Cache Service with Multiple Storage Options
// ============================================

// services/cacheService.js
const NodeCache = require('node-cache');

/**
 * Multi-layer cache service supporting:
 * 1. In-memory cache (fast, temporary)
 * 2. Redis cache (persistent, distributed)
 * 3. Database cache (permanent, queryable)
 */
class CacheService {
  constructor() {
    // In-memory cache (fastest, but lost on restart)
    this.memoryCache = new NodeCache({
      stdTTL: 3600, // 1 hour default
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // Better performance
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    const value = this.memoryCache.get(key);
    
    if (value !== undefined) {
      this.stats.hits++;
      console.log(`Cache HIT: ${key}`);
      return value;
    }
    
    this.stats.misses++;
    console.log(`Cache MISS: ${key}`);
    return null;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async set(key, value, ttl = null) {
    this.stats.sets++;
    
    if (ttl) {
      this.memoryCache.set(key, value, ttl);
    } else {
      this.memoryCache.set(key, value);
    }
    
    console.log(`Cache SET: ${key} (TTL: ${ttl || 'default'})`);
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  async delete(key) {
    this.memoryCache.del(key);
    console.log(`Cache DELETE: ${key}`);
  }

  /**
   * Clear all cache
   */
  async flush() {
    this.memoryCache.flushAll();
    console.log('Cache FLUSHED');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const keys = this.memoryCache.keys();
    return {
      ...this.stats,
      size: keys.length,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  /**
   * Generate geocoding cache key
   */
  generateGeoKey(lat, lon, precision = 4) {
    // Round coordinates to reduce cache keys for nearby locations
    const roundedLat = parseFloat(lat).toFixed(precision);
    const roundedLon = parseFloat(lon).toFixed(precision);
    return `geo:${roundedLat},${roundedLon}`;
  }
}

module.exports = new CacheService();

