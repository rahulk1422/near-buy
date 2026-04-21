const router = require("express").Router();
const {
  signup,
  login,
  resetPassword,
  getUsers,
  updateUserStatus,
  deleteUser,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.post("/reset-password", resetPassword);
router.get("/users", protect, authorize("admin"), getUsers);
router.patch("/users/:id/status", protect, authorize("admin"), updateUserStatus);
router.delete("/users/:id", protect, authorize("admin"), deleteUser);

module.exports = router;

