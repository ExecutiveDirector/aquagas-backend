const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

// 📑 Get all templates
exports.getTemplates = async (req, res, next) => {
  try {
    const templates = await models.notification_templates.findAll();
    res.json(templates);
  } catch (err) {
    next(err);
  }
};

// ➕ Create template
exports.createTemplate = async (req, res, next) => {
  try {
    const { name, content } = req.body;
    const template = await models.notification_templates.create({ name, content });
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
};

// ✏️ Update template
exports.updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, content } = req.body;

    const template = await models.notification_templates.findByPk(id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    await template.update({ name, content });
    res.json(template);
  } catch (err) {
    next(err);
  }
};

// ❌ Delete template
exports.deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await models.notification_templates.findByPk(id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    await template.destroy();
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    next(err);
  }
};
