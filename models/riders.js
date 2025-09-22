const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('riders', {
    rider_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    account_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'auth_accounts',
        key: 'account_id'
      },
      unique: "riders_ibfk_1"
    },
    vendor_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "NULL for independent riders",
      references: {
        model: 'vendors',
        key: 'vendor_id'
      }
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    vehicle_type: {
      type: DataTypes.ENUM('motorcycle','bicycle','tuk_tuk','van','pickup'),
      allowNull: false,
      defaultValue: "motorcycle"
    },
    vehicle_registration: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: "vehicle_registration"
    },
    driving_license_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: "driving_license_no"
    },
    license_expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    insurance_policy_no: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    insurance_expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    national_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: "national_id"
    },
    emergency_contact_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    emergency_contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    rating: {
      type: DataTypes.DECIMAL(3,2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_reviews: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    total_deliveries: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    current_status: {
      type: DataTypes.ENUM('offline','available','busy','on_delivery','on_break'),
      allowNull: false,
      defaultValue: "offline"
    },
    max_delivery_distance_km: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: false,
      defaultValue: 15.00
    },
    vehicle_capacity_kg: {
      type: DataTypes.DECIMAL(6,2),
      allowNull: false,
      defaultValue: 50.00
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(6,2),
      allowNull: true,
      comment: "For independent riders"
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5,4),
      allowNull: false,
      defaultValue: 0.2000,
      comment: "20% default"
    },
    verification_documents: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Document URLs and verification status (JSON)"
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    last_location_update: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'riders',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "rider_id" },
      //   ]
      // },
      {
        name: "account_id",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "account_id" },
        ]
      },
      {
        name: "vehicle_registration",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "vehicle_registration" },
        ]
      },
      {
        name: "driving_license_no",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "driving_license_no" },
        ]
      },
      {
        name: "national_id",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "national_id" },
        ]
      },
      {
        name: "idx_vendor",
        using: "BTREE",
        fields: [
          { name: "vendor_id" },
        ]
      },
      {
        name: "idx_status",
        using: "BTREE",
        fields: [
          { name: "current_status" },
        ]
      },
      {
        name: "idx_verified_active",
        using: "BTREE",
        fields: [
          { name: "is_verified" },
          { name: "is_active" },
        ]
      },
      {
        name: "idx_rating",
        using: "BTREE",
        fields: [
          { name: "rating" },
        ]
      },
    ]
  });
};
