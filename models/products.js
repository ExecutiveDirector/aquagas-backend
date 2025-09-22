const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('products', {
    product_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    category_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'product_categories',
        key: 'category_id'
      }
    },
    product_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    product_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "product_code"
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    size_specification: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "e.g., 13kg, 6kg, 3kg"
    },
    unit_of_measure: {
      type: DataTypes.ENUM('kg','liters','pieces','meters'),
      allowNull: false,
      defaultValue: "kg"
    },
    base_price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    min_price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      comment: "Minimum allowed selling price"
    },
    max_price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      comment: "Maximum allowed selling price"
    },
    weight_kg: {
      type: DataTypes.DECIMAL(6,3),
      allowNull: true
    },
    dimensions_json: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Length, width, height in cm (JSON)"
    },
    carbon_footprint_kg: {
      type: DataTypes.DECIMAL(8,4),
      allowNull: true
    },
    safety_certifications: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Safety standards and certifications (JSON)"
    },
    storage_requirements: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    product_images: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Array of image URLs (JSON)"
    },
    specifications: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Technical specifications (JSON)"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'products',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "product_id" },
      //   ]
      // },
      {
        name: "product_code",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "product_code" },
        ]
      },
      {
        name: "idx_category",
        using: "BTREE",
        fields: [
          { name: "category_id" },
        ]
      },
      {
        name: "idx_product_code",
        using: "BTREE",
        fields: [
          { name: "product_code" },
        ]
      },
      {
        name: "idx_active_featured",
        using: "BTREE",
        fields: [
          { name: "is_active" },
          { name: "is_featured" },
        ]
      },
      {
        name: "idx_search",
        type: "FULLTEXT",
        fields: [
          { name: "product_name" },
          { name: "description" },
        ]
      },
    ]
  });
};
