const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('notification_templates', {
    template_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    template_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "template_name"
    },
    template_type: {
      type: DataTypes.ENUM('push','sms','email','in_app'),
      allowNull: false
    },
    subject_template: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    body_template: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    variables: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Available template variables (JSON)"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'notification_templates',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "template_id" },
        ]
      },
      {
        name: "template_name",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "template_name" },
        ]
      },
      {
        name: "idx_template_name",
        using: "BTREE",
        fields: [
          { name: "template_name" },
        ]
      },
      {
        name: "idx_template_type",
        using: "BTREE",
        fields: [
          { name: "template_type" },
        ]
      },
      {
        name: "idx_active",
        using: "BTREE",
        fields: [
          { name: "is_active" },
        ]
      },
    ]
  });
};
