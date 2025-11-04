// services/geocodingService.js
const axios = require('axios');
const NodeCache = require('node-cache');

class GeocodingService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours
    this.apiKey = process.env.GEOAPIFY_API_KEY;
    this.baseUrl = 'https://api.geoapify.com/v1/geocode';
  }

  async reverseGeocode(lat, lon) {
    // Check cache first
    const cacheKey = `reverse_${lat}_${lon}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Cache hit for:', cacheKey);
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/reverse`, {
        params: {
          lat,
          lon,
          apiKey: this.apiKey,
        },
      });

      const features = response.data.features;
      if (features && features.length > 0) {
        const properties = features[0].properties;
        
        const result = {
          address: properties.formatted || 'Unknown',
          street: properties.street || properties.address_line1,
          city: properties.city || properties.locality,
          state: properties.state,
          country: properties.country,
          postcode: properties.postcode,
        };

        // Cache the result
        this.cache.set(cacheKey, result);
        return result;
      }

      throw new Error('No results found');
    } catch (error) {
      console.error('Geocoding error:', error.message);
      throw error;
    }
  }

  async forwardGeocode(address) {
    const cacheKey = `forward_${address}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          text: address,
          apiKey: this.apiKey,
        },
      });

      const features = response.data.features;
      if (features && features.length > 0) {
        const { geometry, properties } = features[0];
        
        const result = {
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0],
          address: properties.formatted,
        };

        this.cache.set(cacheKey, result);
        return result;
      }

      throw new Error('No results found');
    } catch (error) {
      console.error('Geocoding error:', error.message);
      throw error;
    }
  }
}

module.exports = new GeocodingService();