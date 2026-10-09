const express = require('express');
const router = express.Router();
const {
  registerCustomer,
  loginCustomer,
  getCurrentCustomer,
  logoutCustomer,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
} = require('../controllers/customer.controller');
const protect = require('../middlewares/auth.middleware');

router.post('/register', registerCustomer);
router.post('/login', loginCustomer);
router.get('/me', protect, getCurrentCustomer);
router.post('/logout', logoutCustomer);
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist', protect, addToWishlist);
router.delete('/wishlist/:productId', protect, removeFromWishlist);
router.get('/cart', protect, getCart);
router.post('/cart/:productId', protect, addToCart);
router.patch('/cart/:productId', protect, updateCartItem);
router.delete('/cart/:productId', protect, removeCartItem);

module.exports = router;