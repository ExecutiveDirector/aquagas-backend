const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('product_categories', {
    category_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    category_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "category_name"
    },
    parent_category_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'product_categories',
        key: 'category_id'
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icon_url: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    sort_order: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'product_categories',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "category_id" },
        ]
      },
      {
        name: "category_name",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "category_name" },
        ]
      },
      {
        name: "idx_parent",
        using: "BTREE",
        fields: [
          { name: "parent_category_id" },
        ]
      },
      {
        name: "idx_active_sort",
        using: "BTREE",
        fields: [
          { name: "is_active" },
          { name: "sort_order" },
        ]
      },
    ]
  });
};
