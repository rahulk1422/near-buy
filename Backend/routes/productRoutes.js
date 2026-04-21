const router = require("express").Router();
const {
  getProducts,
  addProduct,
  deleteProduct,
  addProductReview,
  getProductReviews,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/", getProducts);
router.get("/:id/reviews", getProductReviews);
router.post("/", protect, authorize("seller", "admin"), addProduct);
router.post("/:id/reviews", protect, addProductReview);
router.delete("/:id", protect, authorize("seller", "admin"), deleteProduct);

module.exports = router;


