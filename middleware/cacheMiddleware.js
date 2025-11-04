// ============================================
// Cache Middleware for Express
// ============================================

// middleware/cacheMiddleware.js
const multiLayerCache = require('../services/multiLayerCache');

/**
 * Cache middleware for API responses
 */
function cacheMiddleware(duration = 3600) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `api:${req.originalUrl || req.url}`;
    
    try {
      const cached = await multiLayerCache.get(key);
      
      if (cached) {
        console.log(`API Cache HIT: ${key}`);
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(body) {
        multiLayerCache.set(key, body, null, null, duration);
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

module.exports = cacheMiddleware;