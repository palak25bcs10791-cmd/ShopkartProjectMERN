const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0.01 },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, trim: true },
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  addressLine1: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator(value) {
        return Array.isArray(value) && value.length > 0;
      },
      message: 'Order must include at least one item',
    },
  },
  shippingAddress: { type: shippingAddressSchema, required: true },
  totalAmount: { type: Number, required: true, min: 0.01 },
  total: { type: Number, min: 0.01 },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED'],
    default: 'PENDING',
  },
  status: {
    type: String,
    enum: ['PENDING_PAYMENT', 'PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'],
    default: 'PENDING_PAYMENT',
  },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
}, { timestamps: true });

orderSchema.pre('save', function preSaveHook() {
  if (!this.customer && this.user) {
    this.customer = this.user;
  }
  if (this.totalAmount && !this.total) {
    this.total = this.totalAmount;
  }
  if (!this.totalAmount && this.total) {
    this.totalAmount = this.total;
  }
});

module.exports = mongoose.model('Order', orderSchema);
