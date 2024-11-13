const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
	try {
		// Get token from header
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res
				.status(401)
				.json({
					message: 'No token, authorization denied',
					tokenExpired: true,
				});
		}

		// Verify token
		const token = authHeader.split(' ')[1];
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);

			// Check if token is about to expire (e.g., within 5 minutes)
			const currentTime = Math.floor(Date.now() / 1000);
			if (decoded.exp - currentTime < 300) {
				// 300 seconds = 5 minutes
				return res.status(401).json({
					message: 'Token is about to expire',
					tokenExpired: true,
				});
			}

			// Add user from payload
			req.user = decoded;
			next();
		} catch (jwtError) {
			return res.status(401).json({
				message: 'Token is expired or invalid',
				tokenExpired: true,
			});
		}
	} catch (error) {
		console.error('Auth middleware error:', error);
		res.status(401).json({
			message: 'Token is not valid',
			tokenExpired: true,
		});
	}
};

module.exports = authMiddleware;
