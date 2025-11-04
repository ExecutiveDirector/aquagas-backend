
// ============================================
// Redis Cache Service (Optional - for production)
// ============================================

// services/redisCacheService.jsredisCacheService.js
const redis = require('redis');

class RedisCacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) return new Error('Redis retry limit exceeded');
            return retries * 100;
          },
        },
      });

      this.client.on('error', (err) => console.error('Redis error:', err));
      this.client.on('connect', () => console.log('Redis connected'));

      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Redis connection failed:', error);
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected) return;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key) {
    if (!this.isConnected) return;

    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  async flush() {
    if (!this.isConnected) return;

    try {
      await this.client.flushAll();
    } catch (error) {
      console.error('Redis flush error:', error);
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

module.exports = new RedisCacheService();
