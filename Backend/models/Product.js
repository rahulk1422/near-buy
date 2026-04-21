const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  name: {
    type: String,
    trim: true,
    required: true,
  },
  price: {
    type: Number,
    min: 0,
    required: true,
  },
  dist: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  latitude: Number,
  longitude: Number,
  locationLabel: {
    type: String,
    trim: true,
  },
});

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    targetType: {
      type: String,
      enum: ["product", "shop"],
      default: "product",
    },
    shopId: {
      type: mongoose.Schema.Types.Mixed,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true,
    index: true,
  },
  category: {
    type: String,
    trim: true,
    default: "Other",
    index: true,
  },
  image: String,
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  shops: [shopSchema],
  reviews: [reviewSchema],
}, { timestamps: true });

productSchema.index({
  name: "text",
  category: "text",
  "shops.name": "text",
  "shops.locationLabel": "text",
});

module.exports = mongoose.model("Product", productSchema);
