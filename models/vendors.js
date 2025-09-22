const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('vendors', {
    vendor_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    account_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true,
      references: {
        model: 'auth_accounts',
        key: 'account_id'
      }
    },

    business_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    trading_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    brand: {
      type: DataTypes.ENUM('Total','Rubis','Shell','Kobil','Vivo','Independent'),
      allowNull: true,
      defaultValue: "Independent"
    },
    business_registration_no: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: "business_registration_no"
    },
    tax_pin: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: "tax_pin"
    },
    license_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: "license_number"
    },
    contact_person: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    business_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    business_email: {
      type: DataTypes.STRING(320),
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
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5,4),
      allowNull: false,
      defaultValue: 0.1500,
      comment: "15% default"
    },
    minimum_order_amount: {
      type: DataTypes.DECIMAL(8,2),
      allowNull: false,
      defaultValue: 0.00
    },
    delivery_radius_km: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: false,
      defaultValue: 10.00
    },
    average_prep_time_minutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 30
    },
    business_hours: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Operating hours per day (JSON)"
    },
    verification_documents: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Document URLs and status (JSON)"
    },
    bank_account_details: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Encrypted banking info (JSON)"
    },
    currency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: "KES"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'vendors',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "vendor_id" },
      //   ]
      // },
      {
        name: "business_registration_no",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "business_registration_no" },
        ]
      },
      {
        name: "tax_pin",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "tax_pin" },
        ]
      },
      {
        name: "license_number",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "license_number" },
        ]
      },
      {
        name: "idx_brand",
        using: "BTREE",
        fields: [
          { name: "brand" },
        ]
      },
      {
        name: "idx_verified",
        using: "BTREE",
        fields: [
          { name: "is_verified" },
        ]
      },
      {
        name: "idx_featured",
        using: "BTREE",
        fields: [
          { name: "is_featured" },
        ]
      },
      {
        name: "idx_rating",
        using: "BTREE",
        fields: [
          { name: "rating" },
        ]
      },
      {
        name: "idx_business_name",
        using: "BTREE",
        fields: [
          { name: "business_name", length: 191 },
        ]
      },
    ]
  });
};
