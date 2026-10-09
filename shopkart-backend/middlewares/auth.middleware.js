const jwt = require('jsonwebtoken');
const Customer = require('../models/customer.model');

async function protect(req, res, next) {
	try {
		const token = req.cookies.token;
		if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shopkart-development-secret');
		const customer = await Customer.findById(decoded.customerId).select('-password');
		if (!customer) return res.status(401).json({ success: false, message: 'Customer not found' });
		req.customer = customer;
		next();
	} catch (error) {
		return res.status(401).json({ success: false, message: 'Invalid or expired session' });
	}
}

module.exports = protect;
