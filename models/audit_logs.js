const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('audit_logs', {
    log_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    entity_type: {
      type: DataTypes.ENUM('user','vendor','rider','admin','order','product','payment'),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    action: {
      type: DataTypes.ENUM('create','update','delete','login','logout','status_change'),
      allowNull: false
    },
    old_values: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Previous state before change (JSON)"
    },
    new_values: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "New state after change (JSON)"
    },
    changed_fields: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Array of changed field names (JSON)"
    },
    performed_by_type: {
      type: DataTypes.ENUM('user','vendor','rider','admin','system'),
      allowNull: false
    },
    performed_by_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "IPv4 or IPv6"
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    request_method: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    request_path: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    request_body: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: " (JSON)"
    }
  }, {
    sequelize,
    tableName: 'audit_logs',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "log_id" },
        ]
      },
      {
        name: "idx_entity",
        using: "BTREE",
        fields: [
          { name: "entity_type" },
          { name: "entity_id" },
        ]
      },
      {
        name: "idx_action",
        using: "BTREE",
        fields: [
          { name: "action" },
        ]
      },
      {
        name: "idx_performed_by",
        using: "BTREE",
        fields: [
          { name: "performed_by_type" },
          { name: "performed_by_id" },
        ]
      },
      {
        name: "idx_created_at",
        using: "BTREE",
        fields: [
          { name: "created_at" },
        ]
      },
      {
        name: "idx_entity_action_date",
        using: "BTREE",
        fields: [
          { name: "entity_type" },
          { name: "entity_id" },
          { name: "action" },
          { name: "created_at" },
        ]
      },
    ]
  });
};
