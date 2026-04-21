const crypto = require("crypto");
const Product = require("../models/Product");
const { getProducts, saveProducts } = require("../lib/fileStore");

const EARTH_RADIUS_KM = 6371;
const DEFAULT_CATEGORY = "Other";

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampRating(value) {
  const rating = parseNumber(value);
  if (rating === null) return null;

  return Math.min(5, Math.max(1, rating));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function hasCoordinates(value) {
  return (
    typeof value?.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    typeof value?.longitude === "number" &&
    Number.isFinite(value.longitude)
  );
}

function normalizeCoords(latitude, longitude) {
  const parsedLatitude = parseNumber(latitude);
  const parsedLongitude = parseNumber(longitude);

  if (parsedLatitude === null || parsedLongitude === null) {
    return null;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

function calculateDistanceKm(from, to) {
  if (!hasCoordinates(from) || !hasCoordinates(to)) {
    return null;
  }

  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return Number((EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

function asPlainObject(value) {
  if (!value) return value;

  if (typeof value.toObject === "function") {
    return value.toObject();
  }

  return JSON.parse(JSON.stringify(value));
}

function toStringId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeShop(shop = {}, seller) {
  const name = shop.name?.trim?.() || seller?.name?.trim?.() || "";
  const price = parseNumber(shop.price);
  const latitude = parseNumber(shop.latitude);
  const longitude = parseNumber(shop.longitude);
  const rating = clampRating(shop.rating);

  if (!name) {
    throw createError(400, "Shop name is required");
  }

  if (price === null) {
    throw createError(400, "A valid product price is required");
  }

  return {
    sellerId: seller?._id || shop.sellerId,
    name,
    price,
    dist: parseNumber(shop.dist) ?? 0,
    rating: rating ?? 0,
    reviewCount: Number(shop.reviewCount || 0),
    latitude,
    longitude,
    locationLabel: shop.locationLabel?.trim?.() || "",
  };
}

function getEffectiveDistance(shop) {
  const liveDistance = parseNumber(shop.distanceKm);
  if (liveDistance !== null) return liveDistance;

  return parseNumber(shop.dist);
}

function getEffectiveRating(shop) {
  return parseNumber(shop.rating) ?? 0;
}

function buildComparison(shops = []) {
  const pricedShops = shops.filter((shop) => parseNumber(shop.price) !== null);
  const shopsWithDistance = shops.filter((shop) => getEffectiveDistance(shop) !== null);

  const cheapestShop = pricedShops.reduce((best, current) => {
    if (!best) return current;
    return current.price < best.price ? current : best;
  }, null);

  const nearestShop = shopsWithDistance.reduce((best, current) => {
    if (!best) return current;
    return getEffectiveDistance(current) < getEffectiveDistance(best) ? current : best;
  }, null);

  const highestRatedShop = shops.reduce((best, current) => {
    if (!best) return current;
    return getEffectiveRating(current) > getEffectiveRating(best) ? current : best;
  }, null);

  const prices = pricedShops.map((shop) => shop.price);

  return {
    shopCount: shops.length,
    cheapestShop,
    nearestShop,
    highestRatedShop,
    priceRange: prices.length
      ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
        }
      : null,
  };
}

function decorateProduct(product, userCoords) {
  const plain = asPlainObject(product);

  const shops = (plain.shops || []).map((shop) => {
    const normalizedShop = {
      ...shop,
      _id: toStringId(shop._id),
      sellerId: toStringId(shop.sellerId),
      price: parseNumber(shop.price) ?? 0,
      rating: parseNumber(shop.rating) ?? 0,
      reviewCount: Number(shop.reviewCount || 0),
      latitude: parseNumber(shop.latitude),
      longitude: parseNumber(shop.longitude),
    };

    const distanceKm = calculateDistanceKm(userCoords, normalizedShop);

    return {
      ...normalizedShop,
      distanceKm,
      displayDistanceKm: distanceKm ?? parseNumber(shop.dist),
    };
  });

  return {
    ...plain,
    _id: toStringId(plain._id),
    shops,
    reviews: plain.reviews || [],
    comparison: buildComparison(shops),
  };
}

function productMatchesSearch(product, search) {
  const term = search?.trim?.().toLowerCase();
  if (!term) return true;

  return (
    product.name?.toLowerCase?.().includes(term) ||
    product.category?.toLowerCase?.().includes(term) ||
    product.shops?.some(
      (shop) =>
        shop.name?.toLowerCase?.().includes(term) ||
        shop.locationLabel?.toLowerCase?.().includes(term)
    )
  );
}

function productMatchesCategory(product, category) {
  if (!category || category === "All") return true;
  return (product.category || DEFAULT_CATEGORY).toLowerCase() === category.toLowerCase();
}

function filterShops(shops, filters) {
  const minPrice = parseNumber(filters.minPrice);
  const maxPrice = parseNumber(filters.maxPrice);
  const maxDistance = parseNumber(filters.maxDistance);
  const minRating = parseNumber(filters.minRating);

  return shops.filter((shop) => {
    const price = parseNumber(shop.price);
    const distance = getEffectiveDistance(shop);
    const rating = getEffectiveRating(shop);

    if (minPrice !== null && price !== null && price < minPrice) return false;
    if (maxPrice !== null && price !== null && price > maxPrice) return false;
    if (maxDistance !== null && distance !== null && distance > maxDistance) return false;
    if (minRating !== null && rating < minRating) return false;

    return true;
  });
}

function sortShops(shops, sortBy, hasUserCoords) {
  const sorted = [...shops];

  if (sortBy === "price") {
    return sorted.sort((a, b) => (parseNumber(a.price) ?? Infinity) - (parseNumber(b.price) ?? Infinity));
  }

  if (sortBy === "rating") {
    return sorted.sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a));
  }

  if (sortBy === "nearest" || hasUserCoords) {
    return sorted.sort(
      (a, b) => (getEffectiveDistance(a) ?? Infinity) - (getEffectiveDistance(b) ?? Infinity)
    );
  }

  return sorted;
}

async function listProducts(options = {}) {
  const {
    useFileDb,
    search = "",
    category = "All",
    latitude,
    longitude,
    sortBy = "nearest",
  } = options;
  const userCoords = normalizeCoords(latitude, longitude);

  const query = {};
  if (category && category !== "All") {
    query.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  }

  if (search?.trim?.()) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
    query.$or = [
      { name: searchRegex },
      { category: searchRegex },
      { "shops.name": searchRegex },
      { "shops.locationLabel": searchRegex },
    ];
  }

  const rawProducts = useFileDb
    ? await getProducts()
    : await Product.find(query).sort({ updatedAt: -1, _id: -1 }).lean();

  return rawProducts
    .map((product) => decorateProduct(product, userCoords))
    .filter((product) => productMatchesSearch(product, search))
    .filter((product) => productMatchesCategory(product, category))
    .map((product) => {
      const filteredShops = filterShops(product.shops, options);
      const shops = sortShops(filteredShops, sortBy, Boolean(userCoords));

      return {
        ...product,
        shops,
        comparison: buildComparison(shops),
      };
    })
    .filter((product) => product.shops.length > 0);
}

async function createProduct(body, options = {}) {
  const productName = body.name?.trim();
  const productCategory = body.category?.trim() || DEFAULT_CATEGORY;
  const incomingShop = body.shops?.[0];

  if (!productName || !incomingShop) {
    throw createError(400, "Product name and seller details are required");
  }

  const shop = normalizeShop(incomingShop, options.seller);
  if (options.useFileDb && !shop._id) {
    shop._id = crypto.randomUUID();
  }

  if (options.useFileDb) {
    const products = await getProducts();
    const existingProduct = products.find(
      (product) =>
        product.name?.toLowerCase?.() === productName.toLowerCase() &&
        (product.category || DEFAULT_CATEGORY).toLowerCase() === productCategory.toLowerCase()
    );

    if (existingProduct) {
      const existingShopIndex = (existingProduct.shops || []).findIndex(
        (item) =>
          toStringId(item.sellerId) === toStringId(options.seller?._id) ||
          item.name?.toLowerCase?.() === shop.name.toLowerCase()
      );

      if (existingShopIndex >= 0) {
        existingProduct.shops[existingShopIndex] = {
          ...existingProduct.shops[existingShopIndex],
          ...shop,
        };
      } else {
        existingProduct.shops = [...(existingProduct.shops || []), shop];
      }

      existingProduct.image = existingProduct.image || body.image;
      await saveProducts(products);
      return decorateProduct(existingProduct);
    }

    const newProduct = {
      _id: crypto.randomUUID(),
      name: productName,
      category: productCategory,
      image: body.image,
      averageRating: 0,
      reviewCount: 0,
      shops: [shop],
      reviews: [],
    };
    products.push(newProduct);
    await saveProducts(products);
    return decorateProduct(newProduct);
  }

  let product = await Product.findOne({
    name: new RegExp(`^${escapeRegex(productName)}$`, "i"),
    category: new RegExp(`^${escapeRegex(productCategory)}$`, "i"),
  });

  if (!product) {
    product = await Product.create({
      name: productName,
      category: productCategory,
      image: body.image,
      shops: [shop],
    });

    return decorateProduct(product);
  }

  const existingShop = product.shops.find(
    (item) =>
      toStringId(item.sellerId) === toStringId(options.seller?._id) ||
      item.name?.toLowerCase?.() === shop.name.toLowerCase()
  );

  if (existingShop) {
    existingShop.set({
      ...shop,
      _id: existingShop._id,
      reviewCount: existingShop.reviewCount || 0,
      rating: existingShop.reviewCount ? existingShop.rating : shop.rating,
    });
  } else {
    product.shops.push(shop);
  }

  product.image = product.image || body.image;
  await product.save();

  return decorateProduct(product);
}

function findShop(product, shopId) {
  return (product.shops || []).find(
    (shop) => toStringId(shop._id) === toStringId(shopId) || shop.name === shopId
  );
}

function averageRating(reviews) {
  if (!reviews.length) return 0;

  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return Number((total / reviews.length).toFixed(1));
}

function recalculateRatings(product) {
  const productReviews = (product.reviews || []).filter(
    (review) => review.targetType === "product"
  );

  product.averageRating = averageRating(productReviews);
  product.reviewCount = productReviews.length;

  (product.shops || []).forEach((shop) => {
    const shopReviews = (product.reviews || []).filter(
      (review) =>
        review.targetType === "shop" &&
        toStringId(review.shopId) === toStringId(shop._id)
    );

    shop.reviewCount = shopReviews.length;
    if (shopReviews.length) {
      shop.rating = averageRating(shopReviews);
    }
  });
}

function upsertReview(product, reviewInput) {
  const reviewTargetType = reviewInput.targetType === "shop" ? "shop" : "product";
  const reviewUserId = toStringId(reviewInput.user._id);
  const reviewShopId = reviewTargetType === "shop" ? reviewInput.shopId : "";

  const existingReview = (product.reviews || []).find(
    (review) =>
      toStringId(review.user) === reviewUserId &&
      review.targetType === reviewTargetType &&
      toStringId(review.shopId || "") === toStringId(reviewShopId)
  );

  const reviewPayload = {
    user: reviewInput.user._id,
    userName: reviewInput.user.name || reviewInput.user.email || "Customer",
    targetType: reviewTargetType,
    shopId: reviewShopId,
    rating: reviewInput.rating,
    comment: reviewInput.comment,
  };

  if (existingReview) {
    Object.assign(existingReview, reviewPayload, { updatedAt: new Date() });
    return;
  }

  product.reviews.push(reviewPayload);
}

async function addReview(productId, body, options = {}) {
  const rating = clampRating(body.rating);
  const targetType = body.targetType === "shop" ? "shop" : "product";
  const comment = body.comment?.trim?.() || "";

  if (!rating) {
    throw createError(400, "Rating must be between 1 and 5");
  }

  if (targetType === "shop" && !body.shopId) {
    throw createError(400, "Shop id is required for shop reviews");
  }

  if (options.useFileDb) {
    const products = await getProducts();
    const product = products.find((item) => item._id === productId);
    if (!product) throw createError(404, "Product not found");

    if (targetType === "shop") {
      const shop = findShop(product, body.shopId);
      if (!shop) throw createError(404, "Shop not found");
      body.shopId = shop._id;
    }

    product.reviews = product.reviews || [];
    upsertReview(product, {
      user: options.user,
      targetType,
      shopId: body.shopId,
      rating,
      comment,
    });
    recalculateRatings(product);
    await saveProducts(products);

    return decorateProduct(product);
  }

  const product = await Product.findById(productId);
  if (!product) throw createError(404, "Product not found");

  if (targetType === "shop") {
    const shop = findShop(product, body.shopId);
    if (!shop) throw createError(404, "Shop not found");
    body.shopId = shop._id;
  }

  upsertReview(product, {
    user: options.user,
    targetType,
    shopId: body.shopId,
    rating,
    comment,
  });
  recalculateRatings(product);
  await product.save();

  return decorateProduct(product);
}

async function getProductReviews(productId, useFileDb) {
  if (useFileDb) {
    const products = await getProducts();
    const product = products.find((item) => item._id === productId);
    if (!product) throw createError(404, "Product not found");
    return product.reviews || [];
  }

  const product = await Product.findById(productId).select("reviews").lean();
  if (!product) throw createError(404, "Product not found");

  return product.reviews || [];
}

async function deleteProduct(productId, options = {}) {
  if (!productId) {
    throw createError(400, "Product id is required");
  }

  if (options.useFileDb) {
    const products = await getProducts();
    const productIndex = products.findIndex((product) => product._id === productId);
    if (productIndex === -1) throw createError(404, "Product not found");

    const product = products[productIndex];
    if (options.user?.role === "admin") {
      products.splice(productIndex, 1);
      await saveProducts(products);
      return { msg: "Product deleted successfully" };
    }

    const shopIndex = (product.shops || []).findIndex(
      (shop) =>
        toStringId(shop.sellerId) === toStringId(options.user?._id) ||
        shop.name === options.user?.name
    );

    if (shopIndex === -1) {
      throw createError(403, "You can only delete your own seller listing");
    }

    if (product.shops.length <= 1) {
      products.splice(productIndex, 1);
    } else {
      product.shops.splice(shopIndex, 1);
      recalculateRatings(product);
    }

    await saveProducts(products);
    return { msg: "Seller listing deleted successfully" };
  }

  const product = await Product.findById(productId);
  if (!product) throw createError(404, "Product not found");

  if (options.user?.role === "admin") {
    await Product.findByIdAndDelete(productId);
    return { msg: "Product deleted successfully" };
  }

  const shop = product.shops.find(
    (item) =>
      toStringId(item.sellerId) === toStringId(options.user?._id) ||
      item.name === options.user?.name
  );

  if (!shop) {
    throw createError(403, "You can only delete your own seller listing");
  }

  if (product.shops.length <= 1) {
    await Product.findByIdAndDelete(productId);
  } else {
    product.shops.pull(shop._id);
    recalculateRatings(product);
    await product.save();
  }

  return { msg: "Seller listing deleted successfully" };
}

module.exports = {
  listProducts,
  createProduct,
  deleteProduct,
  addReview,
  getProductReviews,
  calculateDistanceKm,
};
