require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/product.model');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const products = await Product.find().sort({ createdAt: 1 }).lean();
  const seen = new Set();
  const duplicates = [];

  for (const p of products) {
    const key = `${p.name}|${p.category}|${p.price}|${p.image}`;
    if (seen.has(key)) duplicates.push(p._id);
    else seen.add(key);
  }

  if (duplicates.length) {
    await Product.deleteMany({ _id: { $in: duplicates } });
    console.log('Deleted duplicates:', duplicates.length);
  } else {
    console.log('No duplicate entries found.');
  }

  const uniqueCatalog = [
    { name: 'Mechanical Keyboard', description: 'RGB mechanical keyboard with blue switches and hot-swappable keys.', price: 2999, category: 'Electronics', image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=900&q=80', stock: 10 },
    { name: 'Noise Cancelling Headphones', description: 'Wireless over-ear headphones with immersive sound and active noise cancellation.', price: 4999, category: 'Electronics', image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80', stock: 25 },
    { name: 'Smartwatch Pro', description: 'Track health, workouts, notifications and calls with a sleek premium design.', price: 6999, category: 'Electronics', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80', stock: 18 },
    { name: 'Classic Cotton T-Shirt', description: 'Comfortable everyday tee designed for all-day wear and easy styling.', price: 799, category: 'Fashion', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', stock: 40 },
    { name: 'Leather Travel Backpack', description: 'Water-resistant backpack with padded straps and spacious compartments.', price: 2499, category: 'Fashion', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', stock: 12 },
    { name: 'The Pragmatic Programmer', description: 'A hands-on guide to software craftsmanship, delivery and engineering excellence.', price: 599, category: 'Books', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80', stock: 15 },
    { name: 'Atomic Habits', description: 'A practical system for building better habits and improving your life.', price: 449, category: 'Books', image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80', stock: 22 },
    { name: 'Ceramic Coffee Mug', description: 'Premium ceramic mug crafted for your daily coffee ritual and cozy mornings.', price: 499, category: 'Home', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80', stock: 30 },
    { name: 'Minimal Table Lamp', description: 'Warm ambient lighting with a modern minimal silhouette for any room.', price: 1799, category: 'Home', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', stock: 17 },
    { name: 'Office Chair', description: 'Ergonomic office chair for comfort, posture and productivity during long work hours.', price: 5899, category: 'Home', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', stock: 8 }
  ];

  const existing = await Product.find().lean();
  const existingMap = new Map(existing.map((p) => [`${p.name}|${p.category}|${p.price}|${p.image}`, true]));

  for (const item of uniqueCatalog) {
    const key = `${item.name}|${item.category}|${item.price}|${item.image}`;
    if (!existingMap.has(key)) {
      await Product.create(item);
      console.log('Inserted:', item.name);
    }
  }

  const finalCount = await Product.countDocuments();
  console.log('Final product count:', finalCount);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
