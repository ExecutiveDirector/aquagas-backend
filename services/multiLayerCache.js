// ============================================
// Unified Multi-Layer Cache Service
// ============================================

// services/multiLayerCache.js
const memoryCache = require('./cacheService');
const redisCache = require('./redisCacheService');
const dbCache = require('./dbCacheService');

class MultiLayerCache {
  constructor() {
    this.useRedis = process.env.USE_REDIS === 'true';
    this.useDB = process.env.USE_DB_CACHE === 'true';
  }

  /**
   * Initialize cache services
   */
  async initialize() {
    if (this.useRedis) {
      await redisCache.connect();
    }
    console.log('Multi-layer cache initialized');
  }

  /**
   * Get value with fallback through cache layers
   * Memory → Redis → Database → null
   */
  async get(key, lat = null, lon = null) {
    // Layer 1: Memory cache (fastest)
    let value = await memoryCache.get(key);
    if (value) return value;

    // Layer 2: Redis cache (fast, persistent)
    if (this.useRedis) {
      value = await redisCache.get(key);
      if (value) {
        // Store in memory for next time
        await memoryCache.set(key, value);
        return value;
      }
    }

    // Layer 3: Database cache (slower, but permanent)
    if (this.useDB && lat && lon) {
      value = await dbCache.getGeocodingCache(lat, lon);
      if (value) {
        // Store in higher layers for next time
        await memoryCache.set(key, value);
        if (this.useRedis) {
          await redisCache.set(key, value);
        }
        return value;
      }
    }

    return null;
  }

  /**
   * Set value in all cache layers
   */
  async set(key, value, lat = null, lon = null, ttl = 3600) {
    // Store in all layers
    await memoryCache.set(key, value, ttl);
    
    if (this.useRedis) {
      await redisCache.set(key, value, ttl);
    }
    
    if (this.useDB && lat && lon) {
      await dbCache.setGeocodingCache(lat, lon, value);
    }
  }

  /**
   * Delete from all cache layers
   */
  async delete(key) {
    await memoryCache.delete(key);
    
    if (this.useRedis) {
      await redisCache.delete(key);
    }
  }

  /**
   * Get statistics from all layers
   */
  async getStats() {
    const stats = {
      memory: memoryCache.getStats(),
    };

    if (this.useDB) {
      stats.database = await dbCache.getStats();
    }

    return stats;
  }

  /**
   * Cleanup old entries
   */
  async cleanup() {
    if (this.useDB) {
      await dbCache.cleanOldEntries(90);
    }
  }
}

module.exports = new MultiLayerCache();