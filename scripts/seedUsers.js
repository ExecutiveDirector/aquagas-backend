const sequelize = require('../config/db');
const initModels = require('../models/init-models');
const models = initModels(sequelize);

async function seedUsers() {
  await models.users.create({ name: "Test User", email: "test@example.com" });
  console.log("✅ Users seeded");
  process.exit();
}

seedUsers();
