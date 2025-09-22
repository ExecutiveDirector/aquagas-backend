const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('admin_users', {
    admin_id: {
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
      unique: "admin_users_ibfk_1"
    },
    admin_role: {
      type: DataTypes.ENUM('super_admin','operations_admin','finance_admin','support_admin','marketing_admin'),
      allowNull: false
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: "employee_id"
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    permissions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Granular permission settings (JSON)"
    },
    last_active_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'admin_users',
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "admin_id" },
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
        name: "employee_id",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "employee_id" },
        ]
      },
      {
        name: "idx_admin_role",
        using: "BTREE",
        fields: [
          { name: "admin_role" },
        ]
      },
      {
        name: "idx_employee_id",
        using: "BTREE",
        fields: [
          { name: "employee_id" },
        ]
      },
    ]
  });
};
