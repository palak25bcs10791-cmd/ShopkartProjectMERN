const jwt = require('jsonwebtoken');

function generateToken(customerId) {
	return jwt.sign({ customerId }, process.env.JWT_SECRET || 'shopkart-development-secret', {
		expiresIn: '7d',
	});
}

module.exports = generateToken;
