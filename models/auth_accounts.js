const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('auth_accounts', {
    account_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(320),
      allowNull: true,
      comment: "RFC 5321 compliant email",
      unique: "idx_email"
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: "E.164 format",
      unique: "idx_phone"
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "bcrypt\/argon2 hash"
    },
    role: {
      type: DataTypes.ENUM('user','vendor','rider','admin'),
      allowNull: false,
      defaultValue: "user"
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    phone_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    failed_login_attempts: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    lockout_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: "idx_password_reset"
    },
    reset_token_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    email_verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: "idx_email_verification"
    },
    phone_verification_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    phone_verification_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    two_factor_secret: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: "Base32 TOTP secret"
    },
    two_factor_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'auth_accounts',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "account_id" },
        ]
      },
      {
        name: "idx_phone",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "phone_number" },
        ]
      },
      {
        name: "idx_email",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email", length: 191 },
        ]
      },
      {
        name: "idx_password_reset",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "password_reset_token", length: 191 },
        ]
      },
      {
        name: "idx_email_verification",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email_verification_token", length: 191 },
        ]
      },
      {
        name: "idx_role",
        using: "BTREE",
        fields: [
          { name: "role" },
        ]
      },
      {
        name: "idx_active",
        using: "BTREE",
        fields: [
          { name: "is_active" },
        ]
      },
      {
        name: "idx_lockout",
        using: "BTREE",
        fields: [
          { name: "lockout_until" },
        ]
      },
    ]
  });
};
