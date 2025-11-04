// ============================================
// Database Cache Service
// ============================================

// services/dbCacheService.js
const GeocodingCache = require('../models/GeocodingCache');

class DBCacheService {
  /**
   * Get geocoding data from database cache
   */
  async getGeocodingCache(lat, lon, tolerance = 0.0001) {
    try {
      const cached = await GeocodingCache.findByCoordinates(lat, lon, tolerance);
      
      if (cached) {
        // Record access for analytics
        await cached.recordAccess();
        console.log(`DB Cache HIT: ${lat},${lon}`);
        
        return {
          address: cached.address,
          street: cached.street,
          city: cached.city,
          state: cached.state,
          country: cached.country,
          postcode: cached.postcode,
          formattedAddress: cached.formattedAddress,
        };
      }
      
      console.log(`DB Cache MISS: ${lat},${lon}`);
      return null;
    } catch (error) {
      console.error('DB cache get error:', error);
      return null;
    }
  }

  /**
   * Save geocoding data to database cache
   */
  async setGeocodingCache(lat, lon, data, source = 'geoapify') {
    try {
      const cache = await GeocodingCache.findOneAndUpdate(
        { latitude: lat, longitude: lon },
        {
          ...data,
          source,
          updatedAt: new Date(),
          $inc: { accessCount: 1 },
        },
        { upsert: true, new: true }
      );
      
      console.log(`DB Cache SET: ${lat},${lon}`);
      return cache;
    } catch (error) {
      console.error('DB cache set error:', error);
      return null;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const total = await GeocodingCache.countDocuments();
      const bySource = await GeocodingCache.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]);
      const mostAccessed = await GeocodingCache.find()
        .sort({ accessCount: -1 })
        .limit(10)
        .select('latitude longitude address accessCount');

      return {
        totalCached: total,
        bySource,
        mostAccessed,
      };
    } catch (error) {
      console.error('DB cache stats error:', error);
      return null;
    }
  }

  /**
   * Clean old cache entries
   */
  async cleanOldEntries(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await GeocodingCache.deleteMany({
        lastAccessedAt: { $lt: cutoffDate },
      });

      console.log(`Cleaned ${result.deletedCount} old cache entries`);
      return result.deletedCount;
    } catch (error) {
      console.error('DB cache clean error:', error);
      return 0;
    }
  }
}

module.exports = new DBCacheService();