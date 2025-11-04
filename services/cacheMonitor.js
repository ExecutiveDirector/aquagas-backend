// services/cacheMonitor.js
const multiLayerCache = require('./multiLayerCache');

class CacheMonitor {
  constructor() {
    this.startTime = Date.now();
  }

  async getMetrics() {
    const stats = await multiLayerCache.getStats();
    const uptime = Date.now() - this.startTime;

    return {
      uptime: Math.floor(uptime / 1000), // seconds
      memory: stats.memory,
      database: stats.database,
      performance: {
        hitRate: stats.memory.hitRate,
        requestsPerSecond: (stats.memory.hits + stats.memory.misses) / (uptime / 1000),
      },
    };
  }

  async logMetrics() {
    const metrics = await this.getMetrics();
    console.log('📊 Cache Metrics:', JSON.stringify(metrics, null, 2));
  }
}

module.exports = new CacheMonitor();