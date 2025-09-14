const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('reviews', {
    review_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'order_id'
      }
    },
    reviewer_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    reviewer_type: {
      type: DataTypes.ENUM('user','vendor','rider'),
      allowNull: false
    },
    reviewee_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    reviewee_type: {
      type: DataTypes.ENUM('vendor','rider','user'),
      allowNull: false
    },
    overall_rating: {
      type: DataTypes.DECIMAL(2,1),
      allowNull: false
    },
    service_rating: {
      type: DataTypes.DECIMAL(2,1),
      allowNull: true
    },
    quality_rating: {
      type: DataTypes.DECIMAL(2,1),
      allowNull: true
    },
    delivery_rating: {
      type: DataTypes.DECIMAL(2,1),
      allowNull: true
    },
    review_title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    review_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pros: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cons: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    review_images: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Array of image URLs (JSON)"
    },
    is_anonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    helpful_votes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    total_votes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    vendor_response: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    vendor_response_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'reviews',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "review_id" },
        ]
      },
      {
        name: "idx_order",
        using: "BTREE",
        fields: [
          { name: "order_id" },
        ]
      },
      {
        name: "idx_reviewer",
        using: "BTREE",
        fields: [
          { name: "reviewer_type" },
          { name: "reviewer_id" },
        ]
      },
      {
        name: "idx_reviewee",
        using: "BTREE",
        fields: [
          { name: "reviewee_type" },
          { name: "reviewee_id" },
        ]
      },
      {
        name: "idx_rating",
        using: "BTREE",
        fields: [
          { name: "overall_rating" },
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
        name: "idx_created_at",
        using: "BTREE",
        fields: [
          { name: "created_at" },
        ]
      },
    ]
  });
};
