// ============================================
// Database Cache Model (MySQL / Sequelize)
// ============================================

const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db'); // your Sequelize instance

const GeocodingCache = sequelize.define('GeocodingCache', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  street: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  postcode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  formattedAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  source: {
    type: DataTypes.ENUM('geoapify', 'google', 'manual'),
    defaultValue: 'geoapify',
  },
  accessCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lastAccessedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  indexes: [
    {
      name: 'idx_coordinates',
      unique: false,
      fields: ['latitude', 'longitude'],
    },
    {
      name: 'idx_created_at',
      fields: ['created_at'], // Use snake_case to match your DB convention
    },
    {
      name: 'idx_last_accessed',
      fields: ['lastAccessedAt'],
    },
  ],
  tableName: 'geocoding_cache',
  timestamps: true, // Enable Sequelize timestamps
  underscored: true, // Use snake_case for auto-generated columns (created_at, updated_at)
  createdAt: 'created_at', // Map to your DB column name
  updatedAt: 'updated_at', // Map to your DB column name
});

// ==========================
// Custom Methods
// ==========================

/**
 * Record an access to this cache entry
 */
GeocodingCache.prototype.recordAccess = async function() {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  await this.save();
};

/**
 * Find cache entry by coordinates with tolerance
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} tolerance - Coordinate tolerance (default: 0.0001 ≈ 11 meters)
 * @returns {Promise<GeocodingCache|null>}
 */
GeocodingCache.findByCoordinates = async function(lat, lon, tolerance = 0.0001) {
  return await GeocodingCache.findOne({
    where: {
      latitude: { 
        [Op.between]: [lat - tolerance, lat + tolerance] 
      },
      longitude: { 
        [Op.between]: [lon - tolerance, lon + tolerance] 
      },
    },
    order: [['accessCount', 'DESC']], // Prefer most-accessed entries
  });
};

/**
 * Clean up old cache entries (older than specified days)
 * @param {number} days - Number of days to keep
 * @returns {Promise<number>} Number of deleted records
 */
GeocodingCache.cleanupOldEntries = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const result = await GeocodingCache.destroy({
    where: {
      created_at: {
        [Op.lt]: cutoffDate,
      },
      accessCount: {
        [Op.lt]: 5, // Only delete entries accessed less than 5 times
      },
    },
  });
  
  return result;
};

/**
 * Get cache statistics
 * @returns {Promise<Object>}
 */
GeocodingCache.getStatistics = async function() {
  const total = await GeocodingCache.count();
  const bySource = await GeocodingCache.findAll({
    attributes: [
      'source',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['source'],
    raw: true,
  });
  
  const avgAccess = await GeocodingCache.findOne({
    attributes: [
      [sequelize.fn('AVG', sequelize.col('accessCount')), 'avgAccess'],
    ],
    raw: true,
  });
  
  return {
    total,
    bySource,
    avgAccessCount: parseFloat(avgAccess?.avgAccess || 0).toFixed(2),
  };
};

module.exports = GeocodingCache;