const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('system_events', {
    event_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    event_type: {
      type: DataTypes.ENUM('order_placed','payment_completed','delivery_assigned','delivery_completed','user_registered','vendor_approved','system_alert'),
      allowNull: false
    },
    event_category: {
      type: DataTypes.ENUM('business','technical','security','performance'),
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('info','warning','error','critical'),
      allowNull: false,
      defaultValue: "info"
    },
    event_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Structured event payload (JSON)"
    },
    related_entity_type: {
      type: DataTypes.ENUM('order','user','vendor','rider'),
      allowNull: true
    },
    related_entity_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    source_system: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "main_app"
    },
    correlation_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Request\/session correlation"
    }
  }, {
    sequelize,
    tableName: 'system_events',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "event_id" },
        ]
      },
      {
        name: "idx_event_type",
        using: "BTREE",
        fields: [
          { name: "event_type" },
        ]
      },
      {
        name: "idx_event_category",
        using: "BTREE",
        fields: [
          { name: "event_category" },
        ]
      },
      {
        name: "idx_severity",
        using: "BTREE",
        fields: [
          { name: "severity" },
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
        name: "idx_correlation",
        using: "BTREE",
        fields: [
          { name: "correlation_id" },
        ]
      },
    ]
  });
};
