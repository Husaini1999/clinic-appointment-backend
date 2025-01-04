const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({
				message: 'No token, authorization denied',
				tokenExpired: true,
			});
		}

		const token = authHeader.split(' ')[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		const userId = decoded._id || decoded.id;
		if (!userId) {
			return res.status(401).json({
				message: 'Invalid token format',
				tokenExpired: true,
			});
		}

		req.user = {
			id: userId,
			email: decoded.email,
			role: decoded.role,
		};

		next();
	} catch (error) {
		console.error('Auth middleware error:', error);
		if (error.name === 'JsonWebTokenError') {
			return res.status(401).json({
				message: 'Invalid token',
				tokenExpired: true,
			});
		}
		if (error.name === 'TokenExpiredError') {
			return res.status(401).json({
				message: 'Token expired',
				tokenExpired: true,
			});
		}
		res.status(401).json({
			message: 'Token is not valid',
			tokenExpired: true,
		});
	}
};

module.exports = authMiddleware;
