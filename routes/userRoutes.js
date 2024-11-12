const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get all users (admin/staff only)
router.get('/', auth, async (req, res) => {
	try {
		// Check if requesting user is staff
		if (!['staff', 'admin'].includes(req.user.role)) {
			return res.status(403).json({ message: 'Access denied' });
		}

		const users = await User.find().select('-password');
		res.json(users);
	} catch (error) {
		res.status(500).json({ message: 'Server error' });
	}
});

// Get specific user by ID
router.get('/:id', auth, async (req, res) => {
	try {
		// Check if user is requesting their own info or is staff
		if (
			!['staff', 'admin'].includes(req.user.role) &&
			req.user._id.toString() !== req.params.id
		) {
			return res.status(403).json({ message: 'Access denied' });
		}

		const user = await User.findById(req.params.id).select('-password');
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		res.json(user);
	} catch (error) {
		res.status(500).json({ message: 'Server error' });
	}
});

// Update user role (staff only)
router.put('/:userId/role', auth, async (req, res) => {
	try {
		const requestingUser = req.user; // From auth middleware
		const { role } = req.body;

		// Only admins can change roles
		if (requestingUser.role !== 'admin') {
			return res
				.status(403)
				.json({ message: 'Unauthorized to change user roles' });
		}

		// Validate role is one of allowed values
		if (!['admin', 'staff', 'patient'].includes(role)) {
			return res.status(400).json({ message: 'Invalid role specified' });
		}

		const user = await User.findByIdAndUpdate(
			req.params.userId,
			{ role },
			{ new: true }
		).select('-password');

		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		res.json(user);
	} catch (error) {
		console.error('Error updating user role:', error);
		res.status(500).json({ message: 'Error updating user role' });
	}
});

module.exports = router;
