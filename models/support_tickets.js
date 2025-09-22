const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('support_tickets', {
    ticket_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    rider_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'riders',
        key: 'rider_id'
      }
    },
    vendor_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'vendors',
        key: 'vendor_id'
      }
    },
    assigned_admin_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'admin_users',
        key: 'admin_id'
      }
    },
    ticket_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "Human-readable ticket ID",
      unique: "ticket_number"
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('order_issue','delivery_problem','payment_issue','product_quality','account_issue','technical_support','billing_inquiry','other'),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low','medium','high','urgent'),
      allowNull: false,
      defaultValue: "medium"
    },
    status: {
      type: DataTypes.ENUM('open','in_progress','waiting_customer','resolved','closed'),
      allowNull: false,
      defaultValue: "open"
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolution_time_hours: {
      type: DataTypes.DECIMAL(8,2),
      allowNull: true
    },
    customer_satisfaction_rating: {
      type: DataTypes.DECIMAL(2,1),
      allowNull: true
    },
    related_order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'order_id'
      }
    },
    attachments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Array of file URLs (JSON)"
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'support_tickets',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "ticket_id" },
      //   ]
      // },
      {
        name: "ticket_number",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "ticket_number" },
        ]
      },
      {
        name: "user_id",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "rider_id",
        using: "BTREE",
        fields: [
          { name: "rider_id" },
        ]
      },
      {
        name: "vendor_id",
        using: "BTREE",
        fields: [
          { name: "vendor_id" },
        ]
      },
      {
        name: "related_order_id",
        using: "BTREE",
        fields: [
          { name: "related_order_id" },
        ]
      },
      {
        name: "idx_ticket_number",
        using: "BTREE",
        fields: [
          { name: "ticket_number" },
        ]
      },
      {
        name: "idx_assigned_admin",
        using: "BTREE",
        fields: [
          { name: "assigned_admin_id" },
        ]
      },
      {
        name: "idx_status_priority",
        using: "BTREE",
        fields: [
          { name: "status" },
          { name: "priority" },
        ]
      },
      {
        name: "idx_category",
        using: "BTREE",
        fields: [
          { name: "category" },
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
