// controllers/productController.js
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

// Get all products
exports.getProducts = async (req, res, next) => {
  try {
    const products = await models.products.findAll();
    res.json(products);
  } catch (err) {
    next(err);
  }
};

// Get all categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await models.categories.findAll();
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

// Get featured products (example: featured flag in DB)
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const featured = await models.products.findAll({ where: { isFeatured: true } });
    res.json(featured);
  } catch (err) {
    next(err);
  }
};

// Search products
exports.searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    const products = await models.products.findAll({
      where: {
        name: { [sequelize.Op.like]: `%${q}%` }
      }
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
};

// Get product details
exports.getProductDetails = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await models.products.findByPk(productId, {
      include: [{ model: models.categories }, { model: models.vendors }]
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// Check product availability
exports.checkAvailability = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const vendors = await models.vendor_products.findAll({
      where: { productId, quantity: { [sequelize.Op.gt]: 0 } },
      include: [{ model: models.vendors }]
    });
    res.json(vendors);
  } catch (err) {
    next(err);
  }
};

// Get vendors selling a product
exports.getProductVendors = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const vendors = await models.vendor_products.findAll({
      where: { productId },
      include: [{ model: models.vendors }]
    });
    res.json(vendors);
  } catch (err) {
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
