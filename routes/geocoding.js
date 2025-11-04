// routes/geocoding.js
const express = require('express');
const router = express.Router();
const multiLayerCache = require('../services/multiLayerCache');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const geocodingService = require('../services/geocodingService');

// Initialize cache on startup
multiLayerCache.initialize();

// Reverse geocoding with multi-layer cache
router.post('/reverse', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    // Generate cache key
    const cacheKey = multiLayerCache.generateGeoKey(latitude, longitude);
    
    // Try to get from cache (checks all layers)
    let result = await multiLayerCache.get(cacheKey, latitude, longitude);
    
    if (!result) {
      // Cache miss - call external API
      result = await geocodingService.reverseGeocode(latitude, longitude);
      
      // Store in all cache layers
      await multiLayerCache.set(cacheKey, result, latitude, longitude);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// Get cache statistics
router.get('/cache/stats', cacheMiddleware(60), async (req, res) => {
  const stats = await multiLayerCache.getStats();
  res.json(stats);
});

// Clear cache (admin only)
router.delete('/cache/clear', async (req, res) => {
  await multiLayerCache.delete('*');
  res.json({ message: 'Cache cleared' });
});

module.exports = router;