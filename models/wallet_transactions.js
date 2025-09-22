const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('wallet_transactions', {
    wallet_transaction_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    wallet_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'user_wallets',
        key: 'wallet_id'
      }
    },
    transaction_type: {
      type: DataTypes.ENUM('credit','debit','hold','release','cashback','refund'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: false
    },
    previous_balance: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: false
    },
    new_balance: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: false
    },
    reference_type: {
      type: DataTypes.ENUM('order','refund','topup','cashback','referral','admin_adjustment'),
      allowNull: false
    },
    reference_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: " (JSON)"
    }
  }, {
    sequelize,
    tableName: 'wallet_transactions',
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "wallet_transaction_id" },
      //   ]
      // },
      {
        name: "idx_wallet",
        using: "BTREE",
        fields: [
          { name: "wallet_id" },
        ]
      },
      {
        name: "idx_transaction_type",
        using: "BTREE",
        fields: [
          { name: "transaction_type" },
        ]
      },
      {
        name: "idx_created_at",
        using: "BTREE",
        fields: [
          { name: "created_at" },
        ]
      },
    ]
  });
};
