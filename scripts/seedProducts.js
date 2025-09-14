const sequelize = require('../config/db');
const initModels = require('../models/init-models');
const models = initModels(sequelize);

async function seedProducts() {
  await models.products.create({ product_name: "Gas Cylinder 13kg", base_price: 1500 });
  console.log("✅ Products seeded");
  process.exit();
}

seedProducts();
