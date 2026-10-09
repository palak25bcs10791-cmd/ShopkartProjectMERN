const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');
const getRazorpayConfig = require('../config/razorpay');

const orderStatuses = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

function normalizeShippingAddress(shippingAddress) {
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return null;
  }

  const normalized = {
    fullName: typeof shippingAddress.fullName === 'string' ? shippingAddress.fullName.trim() : '',
    phone: typeof shippingAddress.phone === 'string' ? shippingAddress.phone.trim() : '',
    addressLine1: typeof shippingAddress.addressLine1 === 'string' ? shippingAddress.addressLine1.trim() : '',
    city: typeof shippingAddress.city === 'string' ? shippingAddress.city.trim() : '',
    state: typeof shippingAddress.state === 'string' ? shippingAddress.state.trim() : '',
    pincode: typeof shippingAddress.pincode === 'string' ? shippingAddress.pincode.trim() : '',
  };

  return normalized;
}

function validateShippingAddress(shippingAddress) {
  const normalized = normalizeShippingAddress(shippingAddress);
  if (!normalized) {
    return { valid: false, message: 'Shipping address is required' };
  }

  const requiredFields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
  for (const field of requiredFields) {
    if (!normalized[field]) {
      return { valid: false, message: `${field === 'addressLine1' ? 'Address' : field.charAt(0).toUpperCase() + field.slice(1)} is required` };
    }
  }

  if (!/^\d{10}$/.test(normalized.phone.replace(/\s+/g, ''))) {
    return { valid: false, message: 'Phone number must contain 10 digits' };
  }

  if (!/^\d{6}$/.test(normalized.pincode)) {
    return { valid: false, message: 'Pincode must contain 6 digits' };
  }

  return { valid: true, shippingAddress: normalized };
}

function getExpectedRazorpaySignature({ orderId, paymentId, secret }) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

async function createPaymentOrder(req, res) {
  let order;
  try {
    const { shippingAddress } = req.body || {};
    const validation = validateShippingAddress(shippingAddress);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const customer = await Customer.findById(req.customer._id);
    if (!customer || !Array.isArray(customer.cart) || customer.cart.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const productIds = customer.cart.map((cartItem) => cartItem && cartItem.product);
    if (productIds.some((productId) => !mongoose.isValidObjectId(productId))) {
      return res.status(400).json({ success: false, message: 'One or more products could not be found in your cart' });
    }

    const products = await Product.find({ _id: { $in: productIds } });
    const productsById = new Map(products.map((product) => [product._id.toString(), product]));
    const orderItems = [];
    let amountInPaise = 0;

    for (const cartItem of customer.cart) {
      const product = productsById.get(cartItem.product.toString());
      if (!product) {
        return res.status(400).json({ success: false, message: 'One or more products no longer exist' });
      }

      const quantity = Number(cartItem.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ success: false, message: `Invalid quantity for ${product.name}` });
      }

      const priceInPaise = Math.round(Number(product.price) * 100);
      if (!Number.isSafeInteger(priceInPaise) || priceInPaise < 1) {
        return res.status(400).json({ success: false, message: `Invalid price for ${product.name}` });
      }

      if (!Number.isFinite(product.stock) || product.stock < quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      }

      const itemAmountInPaise = priceInPaise * quantity;
      if (!Number.isSafeInteger(itemAmountInPaise) || !Number.isSafeInteger(amountInPaise + itemAmountInPaise)) {
        return res.status(400).json({ success: false, message: 'Order total is too large' });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price: priceInPaise / 100,
        quantity,
        image: product.image,
      });
      amountInPaise += itemAmountInPaise;
    }

    const razorpayConfig = getRazorpayConfig();
    if (!razorpayConfig) {
      return res.status(503).json({ success: false, message: 'Razorpay is not configured on the server' });
    }

    order = await Order.create({
      user: req.customer._id,
      customer: req.customer._id,
      items: orderItems,
      shippingAddress: validation.shippingAddress,
      totalAmount: amountInPaise / 100,
      paymentStatus: 'PENDING',
      status: 'PENDING_PAYMENT',
    });

    const razorpayOrderResponse = await razorpayConfig.client.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order._id.toString(),
    });

    order.razorpayOrderId = razorpayOrderResponse.id;
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Payment order created',
      shopKartOrderId: order._id,
      razorpayOrderId: order.razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      key: razorpayConfig.keyId,
      order,
    });
  } catch (error) {
    if (order) {
      try {
        await Order.deleteOne({ _id: order._id, paymentStatus: 'PENDING' });
      } catch (cleanupError) {
        console.error('Unable to remove incomplete payment order:', cleanupError);
      }
    }
    console.error('Unable to create payment order:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to create payment order' });
  }
}

async function verifyPayment(req, res) {
  try {
    const {
      shopKartOrderId,
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body || {};
    const localOrderId = shopKartOrderId || orderId;
    if (
      (localOrderId && !mongoose.isValidObjectId(localOrderId))
      || typeof razorpayOrderId !== 'string'
      || !razorpayOrderId
      || typeof razorpayPaymentId !== 'string'
      || !razorpayPaymentId
      || typeof razorpaySignature !== 'string'
      || !razorpaySignature
    ) {
      return res.status(400).json({ success: false, message: 'Payment verification details are incomplete' });
    }

    const lookupOrder = localOrderId
      ? await Order.findById(localOrderId)
      : await Order.findOne({ razorpayOrderId });
    if (!lookupOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderUserId = lookupOrder.user || lookupOrder.customer;
    if (!orderUserId || orderUserId.toString() !== req.customer._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot access this order' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(503).json({ success: false, message: 'Razorpay is not configured on the server' });
    }

    if (!lookupOrder.razorpayOrderId || lookupOrder.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const expectedSignature = getExpectedRazorpaySignature({
      orderId: lookupOrder.razorpayOrderId,
      paymentId: razorpayPaymentId,
      secret,
    });
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'hex');
    const suppliedSignatureBuffer = /^[a-f\d]{64}$/i.test(razorpaySignature)
      ? Buffer.from(razorpaySignature, 'hex')
      : Buffer.alloc(0);
    if (
      suppliedSignatureBuffer.length !== expectedSignatureBuffer.length
      || !crypto.timingSafeEqual(expectedSignatureBuffer, suppliedSignatureBuffer)
    ) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    if (lookupOrder.paymentStatus === 'PAID') {
      if (lookupOrder.razorpayPaymentId !== razorpayPaymentId) {
        return res.status(400).json({ success: false, message: 'Order has already been paid with a different payment' });
      }
      return res.status(200).json({ success: true, message: 'Payment already verified', order: lookupOrder });
    }

    if (lookupOrder.paymentStatus !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Order is not awaiting payment' });
    }

    const customer = await Customer.findById(req.customer._id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    lookupOrder.paymentStatus = 'PAID';
    lookupOrder.status = 'PLACED';
    lookupOrder.razorpayPaymentId = razorpayPaymentId;
    await lookupOrder.save();

    customer.cart = [];
    await customer.save();

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order: lookupOrder,
    });
  } catch (error) {
    console.error('Unable to verify payment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to verify payment' });
  }
}

async function getCustomerOrders(req, res) {
  try {
    const orders = await Order.find({
      $or: [{ user: req.customer._id }, { customer: req.customer._id }],
    }).sort({ createdAt: -1 }).lean();
    const normalizedOrders = orders.map((order) => ({
      ...order,
      totalAmount: order.totalAmount ?? order.total ?? 0,
      total: order.totalAmount ?? order.total ?? 0,
    }));

    return res.json({ success: true, orders: normalizedOrders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load orders' });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderUserId = order.user || order.customer;
    if (!orderUserId || orderUserId.toString() !== req.customer._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not allowed to view this order' });
    }

    return res.json({ success: true, order: { ...order, totalAmount: order.totalAmount ?? order.total ?? 0, total: order.totalAmount ?? order.total ?? 0 } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load order details' });
  }
}

async function advanceOrderStatus(req, res) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderUserId = order.user || order.customer;
    if (!orderUserId || orderUserId.toString() !== req.customer._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not allowed to update this order' });
    }

    if (order.paymentStatus !== 'PAID' || !orderStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Only paid orders can advance through fulfillment' });
    }

    const currentStatusIndex = orderStatuses.indexOf(order.status);
    if (currentStatusIndex === orderStatuses.length - 1) {
      return res.status(400).json({ success: false, message: 'Order is already delivered' });
    }

    order.status = orderStatuses[currentStatusIndex + 1];
    await order.save();
    return res.json({ success: true, order });
  } catch (error) {
    console.error('Unable to advance order status:', error);
    return res.status(500).json({ success: false, message: 'Unable to advance order status' });
  }
}

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getCustomerOrders,
  getOrderById,
  advanceOrderStatus,
};
