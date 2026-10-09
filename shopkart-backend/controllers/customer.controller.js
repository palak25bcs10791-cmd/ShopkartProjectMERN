const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');
const generateToken = require('../utils/generateToken');

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function registerCustomer(req, res) {
  try {
    const { fullName, email, password, phone } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedName = typeof fullName === 'string' ? fullName.trim() : '';
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';

    if (!normalizedName || !normalizedEmail || typeof password !== 'string' || !normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existingCustomer = await Customer.findOne({ email: normalizedEmail });
    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await Customer.create({
      fullName: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
    });

    res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function loginCustomer(req, res) {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const customer = await Customer.findOne({ email: normalizedEmail });
    if (typeof password !== 'string' || !customer || !(await bcrypt.compare(password, customer.password))) {
      return res.status(401).json({ success: false, message: 'Invalid Credentials' });
    }
    res.cookie('token', generateToken(customer._id.toString()), cookieOptions).json({
      success: true,
      message: 'Login successful',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getCurrentCustomer(req, res) {
  res.json({ success: true, customer: req.customer });
}

function logoutCustomer(req, res) {
  res.clearCookie('token', cookieOptions).json({ success: true, message: 'Logged out successfully' });
}

async function getWishlist(req, res) {
  try {
    const customer = await Customer.findById(req.customer._id).populate('wishlist').lean();
    return res.json({ success: true, wishlist: customer?.wishlist || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load wishlist' });
  }
}

async function addToWishlist(req, res) {
  try {
    const productId = req.body?.productId || req.body?._id;
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const customer = await Customer.findById(req.customer._id);
    if (!customer.wishlist.some((id) => id.toString() === productId.toString())) {
      customer.wishlist.push(productId);
      await customer.save();
    }

    const populated = await Customer.findById(req.customer._id).populate('wishlist').lean();
    return res.status(200).json({ success: true, wishlist: populated.wishlist || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update wishlist' });
  }
}

async function removeFromWishlist(req, res) {
  try {
    const { productId } = req.params;
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const customer = await Customer.findById(req.customer._id);
    customer.wishlist = customer.wishlist.filter((id) => id.toString() !== productId.toString());
    await customer.save();

    const populated = await Customer.findById(req.customer._id).populate('wishlist').lean();
    return res.json({ success: true, wishlist: populated.wishlist || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update wishlist' });
  }
}

async function getCart(req, res) {
  try {
    const customer = await Customer.findById(req.customer._id).populate('cart.product').lean();
    const cart = (customer?.cart || []).filter((item) => item?.product).map((item) => ({
      product: item.product,
      quantity: Number(item.quantity) || 1,
    }));

    return res.json({ success: true, cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load cart' });
  }
}

async function addToCart(req, res) {
  try {
    const { productId } = req.params;
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const customer = await Customer.findById(req.customer._id);
    customer.cart = Array.isArray(customer.cart) ? customer.cart : [];
    const existingItem = customer.cart.find((item) => item.product.toString() === productId.toString());

    if (existingItem) {
      const nextQuantity = existingItem.quantity + 1;
      if (nextQuantity > product.stock) {
        return res.status(400).json({ success: false, message: 'Quantity exceeds available stock' });
      }
      existingItem.quantity = nextQuantity;
    } else {
      if (product.stock < 1) {
        return res.status(400).json({ success: false, message: 'Product is out of stock' });
      }
      customer.cart.push({ product: productId, quantity: 1 });
    }

    await customer.save();
    const updated = await Customer.findById(req.customer._id).populate('cart.product').lean();
    return res.status(200).json({
      success: true,
      message: 'Cart updated',
      cart: (updated?.cart || []).filter((item) => item?.product).map((item) => ({
        product: item.product,
        quantity: Number(item.quantity) || 1,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update cart' });
  }
}

async function updateCartItem(req, res) {
  try {
    const { productId } = req.params;
    const quantity = Number(req.body?.quantity);

    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const customer = await Customer.findById(req.customer._id);
    customer.cart = Array.isArray(customer.cart) ? customer.cart : [];
    const existingItem = customer.cart.find((item) => item.product.toString() === productId.toString());

    if (!existingItem) {
      return res.status(404).json({ success: false, message: 'Product not in cart' });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ success: false, message: 'Quantity exceeds available stock' });
    }

    existingItem.quantity = quantity;
    await customer.save();

    const updated = await Customer.findById(req.customer._id).populate('cart.product').lean();
    return res.json({
      success: true,
      message: 'Cart updated',
      cart: (updated?.cart || []).filter((item) => item?.product).map((item) => ({
        product: item.product,
        quantity: Number(item.quantity) || 1,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update cart' });
  }
}

async function removeCartItem(req, res) {
  try {
    const { productId } = req.params;
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const customer = await Customer.findById(req.customer._id);
    customer.cart = Array.isArray(customer.cart) ? customer.cart : [];
    const originalCount = customer.cart.length;
    customer.cart = customer.cart.filter((item) => item.product.toString() !== productId.toString());

    if (customer.cart.length === originalCount) {
      return res.status(404).json({ success: false, message: 'Product not in cart' });
    }

    await customer.save();
    const updated = await Customer.findById(req.customer._id).populate('cart.product').lean();
    return res.json({
      success: true,
      message: 'Product removed from cart',
      cart: (updated?.cart || []).filter((item) => item?.product).map((item) => ({
        product: item.product,
        quantity: Number(item.quantity) || 1,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update cart' });
  }
}

module.exports = {
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
};
