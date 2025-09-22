const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('job_queue', {
    job_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    job_type: {
      type: DataTypes.ENUM('email','sms','push_notification','analytics_calculation','inventory_sync','payment_processing','order_cleanup','file_processing'),
      allowNull: false
    },
    job_status: {
      type: DataTypes.ENUM('pending','processing','completed','failed','cancelled'),
      allowNull: false,
      defaultValue: "pending"
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Job parameters and data (JSON)"
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Job execution result (JSON)"
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    priority: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 5,
      comment: "1=highest, 10=lowest"
    },
    max_retries: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 3
    },
    current_retry: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    delay_seconds: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    next_retry_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    worker_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Worker process identifier"
    }
  }, {
    sequelize,
    tableName: 'job_queue',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "job_id" },
      //   ]
      // },
      {
        name: "idx_job_type_status",
        using: "BTREE",
        fields: [
          { name: "job_type" },
          { name: "job_status" },
        ]
      },
      {
        name: "idx_scheduled_at",
        using: "BTREE",
        fields: [
          { name: "scheduled_at" },
        ]
      },
      {
        name: "idx_priority_scheduled",
        using: "BTREE",
        fields: [
          { name: "priority" },
          { name: "scheduled_at" },
        ]
      },
      {
        name: "idx_next_retry_at",
        using: "BTREE",
        fields: [
          { name: "next_retry_at" },
        ]
      },
      {
        name: "idx_worker_id",
        using: "BTREE",
        fields: [
          { name: "worker_id" },
        ]
      },
    ]
  });
};
