const productService = require("../services/productService");

function sendError(res, error, fallbackMessage) {
  return res.status(error.status || 500).json({
    msg: error.message || fallbackMessage,
  });
}

// GET all products with optional location, search, and comparison filters.
exports.getProducts = async (req, res) => {
  try {
    const data = await productService.listProducts({
      ...req.query,
      useFileDb: req.app.locals.useFileDb,
    });

    return res.json(data);
  } catch (error) {
    return sendError(res, error, "Products could not be loaded");
  }
};

// ADD product or attach the seller's shop to an existing product.
exports.addProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.body, {
      useFileDb: req.app.locals.useFileDb,
      seller: req.user,
    });

    return res.status(201).json(product);
  } catch (error) {
    return sendError(res, error, "Product could not be saved");
  }
};

exports.addProductReview = async (req, res) => {
  try {
    const product = await productService.addReview(req.params.id, req.body, {
      useFileDb: req.app.locals.useFileDb,
      user: req.user,
    });

    return res.status(201).json(product);
  } catch (error) {
    return sendError(res, error, "Review could not be saved");
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await productService.getProductReviews(
      req.params.id,
      req.app.locals.useFileDb
    );

    return res.json(reviews);
  } catch (error) {
    return sendError(res, error, "Reviews could not be loaded");
  }
};

// DELETE product for admin, or just the seller's listing for sellers.
exports.deleteProduct = async (req, res) => {
  try {
    const result = await productService.deleteProduct(req.params.id, {
      useFileDb: req.app.locals.useFileDb,
      user: req.user,
    });

    return res.json(result);
  } catch (error) {
    return sendError(res, error, "Product could not be deleted");
  }
};
