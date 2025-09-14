const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('iot_devices', {
    device_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    device_type: {
      type: DataTypes.ENUM('gas_sensor','smart_meter','pressure_gauge','leak_detector','usage_monitor'),
      allowNull: false
    },
    device_serial: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "device_serial"
    },
    device_model: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    manufacturer: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    firmware_version: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    calibration_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: " (JSON)"
    },
    alert_thresholds: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: " (JSON)"
    },
    measurement_units: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: " (JSON)"
    },
    sampling_interval_seconds: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 300
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    last_heartbeat: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_data_received: {
      type: DataTypes.DATE,
      allowNull: true
    },
    battery_level: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: true,
      comment: "Percentage"
    },
    signal_strength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "RSSI or similar"
    },
    installation_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    installation_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location_description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'iot_devices',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "device_id" },
        ]
      },
      {
        name: "device_serial",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "device_serial" },
        ]
      },
      {
        name: "idx_user",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "idx_device_type",
        using: "BTREE",
        fields: [
          { name: "device_type" },
        ]
      },
      {
        name: "idx_active_online",
        using: "BTREE",
        fields: [
          { name: "is_active" },
          { name: "is_online" },
        ]
      },
      {
        name: "idx_last_heartbeat",
        using: "BTREE",
        fields: [
          { name: "last_heartbeat" },
        ]
      },
    ]
  });
};
