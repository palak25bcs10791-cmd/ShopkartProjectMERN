const express = require('express');
const {
  createPaymentOrder,
  verifyPayment,
  getCustomerOrders,
  getOrderById,
  advanceOrderStatus,
} = require('../controllers/order.controller');
const protect = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.post('/create-payment-order', createPaymentOrder);
router.post('/verify-payment', verifyPayment);
router.patch('/dev/:id/advance-status', advanceOrderStatus);
router.get('/', getCustomerOrders);
router.get('/:id', getOrderById);

module.exports = router;
