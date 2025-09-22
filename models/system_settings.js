const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('system_settings', {
    setting_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    setting_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "setting_key"
    },
    setting_value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    setting_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "string"
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
      comment: "Safe to expose to frontend"
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "general"
    }
  }, {
    sequelize,
    tableName: 'system_settings',
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "setting_id" },
      //   ]
      // },
      {
        name: "setting_key",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "setting_key" },
        ]
      },
      {
        name: "idx_setting_key",
        using: "BTREE",
        fields: [
          { name: "setting_key" },
        ]
      },
      {
        name: "idx_public",
        using: "BTREE",
        fields: [
          { name: "is_public" },
        ]
      },
    ]
  });
};
