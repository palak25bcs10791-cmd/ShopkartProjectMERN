const mongoose = require('mongoose');
const Product = require('../models/product.model');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createProduct(req, res) {
  const { name, description, price, category, image, stock } = req.body || {};
  if (![name, description, category, image].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ success: false, message: 'Name, description, category, and image are required' });
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ success: false, message: 'Price must be a number greater than 0' });
  }
  if (typeof stock !== 'number' || !Number.isFinite(stock) || stock < 0) {
    return res.status(400).json({ success: false, message: 'Stock must be a number greater than or equal to 0' });
  }

  try {
    const product = await Product.create({ name, description, price, category, image, stock });
    return res.status(201).json({ success: true, product });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Unable to create product' });
  }
}

async function getProducts(req, res) {
  try {
    const query = {};
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    if (search) query.name = { $regex: escapeRegex(search), $options: 'i' };
    if (category && category.toLowerCase() !== 'all') query.category = category;

    const sortOptions = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
    };
    const sort = sortOptions[req.query.sort] || { createdAt: -1 };
    const products = await Product.find(query)
      .select('name price category image stock')
      .sort(sort)
      .lean();

    return res.json({ success: true, count: products.length, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load products' });
  }
}

async function getProductById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' });
  }

  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load product' });
  }
}

module.exports = { createProduct, getProducts, getProductById };