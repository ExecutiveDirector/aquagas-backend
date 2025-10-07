// controllers/productController.js
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

// Get all products
// Get products (all or filtered)
exports.getProducts = async (req, res, next) => {
  try {
    const products = await models.products.findAll({
      where: { is_active: true },
      include: [{
        model: models.product_categories,
        as: 'category',
        attributes: ['category_id', 'category_name']
      }],
      order: [
        ['is_featured', 'DESC'],
        ['created_at', 'DESC']
      ]
    });

    // Format response
    const formattedProducts = products.map(product => ({
      id: product.product_id.toString(),
      product_id: product.product_id,
      title: product.product_name,
      product_name: product.product_name,
      product_code: product.product_code,
      brand: product.brand,
      description: product.description,
      size_specification: product.size_specification,
      price: parseFloat(product.base_price),
      base_price: parseFloat(product.base_price),
      image: extractFirstImage(product.product_images),
      product_images: product.product_images,
      is_active: Boolean(product.is_active),
      isActive: Boolean(product.is_active),
      is_featured: Boolean(product.is_featured),
      category: product.category
    }));

    res.json({ products: formattedProducts });
  } catch (err) {
    console.error('Error fetching products:', err);
    next(err);
  }
};

// Get all categories
// Get product categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await models.product_categories.findAll({
      where: { is_active: true },
      attributes: ['category_id', 'category_name', 'description', 'icon_url'],
      order: [['sort_order', 'ASC'], ['category_name', 'ASC']]
    });

    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    next(err);
  }
};

// Get featured products (example: featured flag in DB)
// Get featured products
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await models.products.findAll({
      where: { 
        is_active: true,
        is_featured: true 
      },
      limit: 10,
      order: [['created_at', 'DESC']]
    });

    const formattedProducts = products.map(product => ({
      id: product.product_id.toString(),
      product_id: product.product_id,
      title: product.product_name,
      product_name: product.product_name,
      price: parseFloat(product.base_price),
      image: extractFirstImage(product.product_images),
      brand: product.brand,
      size_specification: product.size_specification,
      isActive: Boolean(product.is_active),
      is_featured: true
    }));

    res.json(formattedProducts);
  } catch (err) {
    console.error('Error fetching featured products:', err);
    next(err);
  }
};

// Search products
// Search products
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, category } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const where = {
      is_active: true,
      [Op.or]: [
        { product_name: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
        { brand: { [Op.like]: `%${q}%` } }
      ]
    };

    if (category) {
      where.category_id = category;
    }

    const products = await models.products.findAll({
      where,
      include: [{
        model: models.product_categories,
        as: 'category',
        attributes: ['category_id', 'category_name']
      }],
      limit: 50
    });

    const formattedProducts = products.map(product => ({
      id: product.product_id.toString(),
      product_id: product.product_id,
      title: product.product_name,
      product_name: product.product_name,
      product_code: product.product_code,
      brand: product.brand,
      description: product.description,
      size_specification: product.size_specification,
      price: parseFloat(product.base_price),
      image: extractFirstImage(product.product_images),
      isActive: Boolean(product.is_active),
      category: product.category
    }));

    res.json(formattedProducts);
  } catch (err) {
    console.error('Error searching products:', err);
    next(err);
  }
};

// Get product details
// Get product details
exports.getProductDetails = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await models.products.findByPk(productId, {
      include: [{
        model: models.product_categories,
        as: 'category'
      }]
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get vendor inventory for this product
    const inventory = await models.vendor_inventory.findAll({
      where: { 
        product_id: productId,
        is_available: true,
        current_stock: { [Op.gt]: 0 }
      },
      include: [
        {
          model: models.vendor_outlets,
          as: 'outlet',
          include: [{
            model: models.vendors,
            as: 'vendor'
          }]
        }
      ]
    });

    const formattedProduct = {
      id: product.product_id.toString(),
      product_id: product.product_id,
      title: product.product_name,
      product_name: product.product_name,
      product_code: product.product_code,
      brand: product.brand,
      description: product.description,
      size_specification: product.size_specification,
      unit_of_measure: product.unit_of_measure,
      price: parseFloat(product.base_price),
      base_price: parseFloat(product.base_price),
      min_price: product.min_price ? parseFloat(product.min_price) : null,
      max_price: product.max_price ? parseFloat(product.max_price) : null,
      weight_kg: product.weight_kg ? parseFloat(product.weight_kg) : null,
      images: parseProductImages(product.product_images),
      image: extractFirstImage(product.product_images),
      specifications: product.specifications,
      safety_certifications: product.safety_certifications,
      storage_requirements: product.storage_requirements,
      isActive: Boolean(product.is_active),
      is_featured: Boolean(product.is_featured),
      category: product.category,
      available_at: inventory.map(inv => ({
        outlet_id: inv.outlet.outlet_id,
        outlet_name: inv.outlet.outlet_name,
        vendor_name: inv.outlet.vendor.business_name,
        vendor_rating: parseFloat(inv.outlet.vendor.rating) || 0,
        price: parseFloat(inv.selling_price),
        stock: inv.current_stock,
        latitude: parseFloat(inv.outlet.latitude),
        longitude: parseFloat(inv.outlet.longitude),
        contact_phone: inv.outlet.contact_phone
      }))
    };

    res.json(formattedProduct);
  } catch (err) {
    console.error('Error fetching product details:', err);
    next(err);
  }
};;

// Check product availability
// Check product availability
exports.checkAvailability = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { lat, lng } = req.query;

    const whereClause = {
      product_id: productId,
      is_available: true,
      current_stock: { [Op.gt]: 0 }
    };

    const inventory = await models.vendor_inventory.findAll({
      where: whereClause,
      include: [
        {
          model: models.vendor_outlets,
          as: 'outlet',
          include: [{
            model: models.vendors,
            as: 'vendor',
            where: { is_active: true }
          }]
        }
      ]
    });

    let availableLocations = inventory.map(inv => ({
      outlet_id: inv.outlet.outlet_id,
      outlet_name: inv.outlet.outlet_name,
      vendor_name: inv.outlet.vendor.business_name,
      price: parseFloat(inv.selling_price),
      stock: inv.current_stock,
      latitude: parseFloat(inv.outlet.latitude),
      longitude: parseFloat(inv.outlet.longitude)
    }));

    // Calculate distance if coordinates provided
    if (lat && lng) {
      availableLocations = availableLocations.map(loc => ({
        ...loc,
        distance_km: calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          loc.latitude,
          loc.longitude
        )
      })).sort((a, b) => a.distance_km - b.distance_km);
    }

    res.json({
      available: availableLocations.length > 0,
      total_stock: availableLocations.reduce((sum, loc) => sum + loc.stock, 0),
      locations: availableLocations
    });
  } catch (err) {
    console.error('Error checking availability:', err);
    next(err);
  }
};

// Get vendors selling a product
// Get vendors selling a product
exports.getProductVendors = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const inventory = await models.vendor_inventory.findAll({
      where: { 
        product_id: productId,
        is_available: true 
      },
      include: [
        {
          model: models.vendor_outlets,
          as: 'outlet',
          include: [{
            model: models.vendors,
            as: 'vendor',
            where: { is_active: true }
          }]
        }
      ]
    });

    const vendors = inventory.map(inv => ({
      vendor_id: inv.outlet.vendor.vendor_id,
      vendor_name: inv.outlet.vendor.business_name,
      outlet_id: inv.outlet.outlet_id,
      outlet_name: inv.outlet.outlet_name,
      rating: parseFloat(inv.outlet.vendor.rating) || 0,
      price: parseFloat(inv.selling_price),
      stock: inv.current_stock,
      location: {
        latitude: parseFloat(inv.outlet.latitude),
        longitude: parseFloat(inv.outlet.longitude),
        address: `${inv.outlet.address_line_1}, ${inv.outlet.city}`
      }
    }));

    res.json(vendors);
  } catch (err) {
    console.error('Error fetching product vendors:', err);
    next(err);
  }
};

// Get product reviews
exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const reviews = await models.reviews.findAll({ where: { productId } });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};

// Add a product review
exports.addProductReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const review = await models.reviews.create({
      productId,
      userId: req.user.id, // authenticated user
      rating,
      comment
    });
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
};

// Get products nearby with vendor info
exports.getNearbyProducts = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.product_code,
        p.brand,
        p.description,
        p.size_specification,
        p.base_price,
        p.product_images,
        p.is_active,
        p.is_featured,
        vi.current_stock as stock,
        vi.selling_price as price,
        vi.is_available,
        v.vendor_id,
        v.business_name as vendor_name,
        v.rating,
        vo.outlet_id,
        vo.outlet_name,
        vo.latitude as vendor_latitude,
        vo.longitude as vendor_longitude,
        vo.contact_phone,
        (6371 * acos(
          cos(radians(${parseFloat(lat)})) 
          * cos(radians(vo.latitude)) 
          * cos(radians(vo.longitude) - radians(${parseFloat(lng)})) 
          + sin(radians(${parseFloat(lat)})) 
          * sin(radians(vo.latitude))
        )) as distance_km
      FROM products p
      INNER JOIN vendor_inventory vi ON p.product_id = vi.product_id
      INNER JOIN vendor_outlets vo ON vi.outlet_id = vo.outlet_id
      INNER JOIN vendors v ON vo.vendor_id = v.vendor_id
      WHERE p.is_active = 1
        AND vi.is_available = 1
        AND vi.current_stock > 0
        AND v.is_active = 1
      HAVING distance_km <= ${parseFloat(radius)}
      ORDER BY distance_km ASC, v.rating DESC, p.is_featured DESC
    `;

    const [results] = await sequelize.query(query);

    // Group by vendor
    const vendorMap = {};
    results.forEach(row => {
      const vendorName = row.vendor_name;
      
      if (!vendorMap[vendorName]) {
        vendorMap[vendorName] = {
          name: vendorName,
          vendor_id: row.vendor_id,
          rating: parseFloat(row.rating) || 0,
          location: {
            latitude: parseFloat(row.vendor_latitude),
            longitude: parseFloat(row.vendor_longitude)
          },
          distance_km: parseFloat(row.distance_km),
          products: []
        };
      }

      vendorMap[vendorName].products.push({
        id: row.product_id.toString(),
        product_id: row.product_id,
        title: row.product_name,
        product_name: row.product_name,
        product_code: row.product_code,
        brand: row.brand,
        description: row.description,
        size_specification: row.size_specification,
        price: parseFloat(row.price || row.base_price),
        base_price: parseFloat(row.base_price),
        image: extractFirstImage(row.product_images),
        stock: row.stock,
        availability: row.is_available ? 'Available' : 'Out of Stock',
        isActive: Boolean(row.is_active),
        is_active: Boolean(row.is_active),
        is_featured: Boolean(row.is_featured),
        vendor_name: vendorName,
        vendor_latitude: parseFloat(row.vendor_latitude),
        vendor_longitude: parseFloat(row.vendor_longitude),
        outlet_id: row.outlet_id,
        outlet_name: row.outlet_name,
        sales: 0 // Can be calculated from order_items if needed
      });
    });

    const vendors = Object.values(vendorMap);

    res.json({ vendors });
  } catch (err) {
    console.error('Error fetching nearby products:', err);
    next(err);
  }
};

// Helper functions
function extractFirstImage(productImagesJson) {
  if (!productImagesJson) return '';
  try {
    const images = JSON.parse(productImagesJson);
    return Array.isArray(images) && images.length > 0 ? images[0] : '';
  } catch (e) {
    return productImagesJson || '';
  }
}

function parseProductImages(productImagesJson) {
  if (!productImagesJson) return [];
  try {
    const images = JSON.parse(productImagesJson);
    return Array.isArray(images) ? images : [productImagesJson];
  } catch (e) {
    return [productImagesJson];
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// // Placeholder for reviews (implement if needed)
// exports.getProductReviews = async (req, res, next) => {
//   res.json({ reviews: [], message: 'Reviews not yet implemented' });
// };

// exports.addProductReview = async (req, res, next) => {
//   res.status(501).json({ message: 'Reviews not yet implemented' });
// };



// module.exports = exports;