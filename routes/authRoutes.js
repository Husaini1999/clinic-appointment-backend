const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Signup route
router.post('/signup', async (req, res) => {
	try {
		const { name, email, password, confirmPassword } = req.body;

		// Basic validation
		if (!name || !email || !password) {
			return res
				.status(400)
				.json({ message: 'Please fill in all required fields' });
		}

		// Check if user exists
		const existingUser = await User.findOne({ email });

		if (existingUser) {
			if (existingUser.isTemporaryUser) {
				// Update the temporary user with the new password and make them permanent
				existingUser.password = password;
				existingUser.isTemporaryUser = false;
				await existingUser.save();

				return res.status(200).json({
					message: 'Registration completed successfully! You can now log in.',
				});
			} else {
				// If user exists and is not temporary, return error
				return res.status(400).json({
					message: 'An account with this email already exists.',
				});
			}
		}

		// Validate password length
		if (password.length < 6) {
			return res
				.status(400)
				.json({ message: 'Password must be at least 6 characters' });
		}

		// Create new user
		const newUser = new User({ name, email, password });
		await newUser.save();

		res.status(201).json({ message: 'User registered successfully' });
	} catch (error) {
		console.error('Signup error:', error);
		res.status(500).json({ message: 'Server error' });
	}
});

// Login route
router.post('/login', async (req, res) => {
	const { email, password } = req.body;

	try {
		// Input validation
		if (!email || !password) {
			return res
				.status(400)
				.json({ message: 'Please provide both email and password' });
		}

		// Check if user exists
		const user = await User.findOne({ email }).select('+password'); // Explicitly select password
		if (!user) {
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		// Check password
		const isMatch = await user.matchPassword(password);
		if (!isMatch) {
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		// Create JWT token
		const token = jwt.sign(
			{
				_id: user._id,
				email: user.email,
				role: user.role,
			},
			process.env.JWT_SECRET,
			{ expiresIn: '1d' }
		);

		// Return success response
		res.json({
			success: true,
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({
			success: false,
			message: 'An error occurred during login. Please try again.',
		});
	}
});

// Add this new route
router.get('/user-details', authMiddleware, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select('-password');
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.json(user);
	} catch (error) {
		console.error('Error fetching user details:', error);
		res.status(500).json({ message: 'Server error' });
	}
});

// Add flexible endpoint to update user details
router.put('/update-user', authMiddleware, async (req, res) => {
	try {
		const updateFields = req.body;

		// Remove sensitive fields that shouldn't be updated directly
		delete updateFields.password;
		delete updateFields._id;
		delete updateFields.role;
		delete updateFields.createdAt;

		const user = await User.findById(req.user.id);

		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		// Update all provided fields
		Object.keys(updateFields).forEach((field) => {
			if (updateFields[field] !== undefined) {
				user[field] = updateFields[field];
			}
		});

		try {
			await user.save();
		} catch (validationError) {
			// Handle mongoose validation errors
			if (validationError.errors) {
				const errorMessages = Object.values(validationError.errors)
					.map((error) => error.message)
					.join(', ');
				return res.status(400).json({ message: errorMessages });
			}
			throw validationError;
		}

		// Return user without password
		const updatedUser = user.toObject();
		delete updatedUser.password;

		res.json({
			message: 'User updated successfully',
			user: updatedUser,
		});
	} catch (error) {
		console.error('Error updating user details:', error);
		res.status(500).json({
			message: error.message || 'Server error',
		});
	}
});

// Add password change endpoint
router.put('/change-password', authMiddleware, async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body;
		const user = await User.findById(req.user.id);

		// Verify current password
		const isMatch = await user.matchPassword(currentPassword);
		if (!isMatch) {
			return res.status(400).json({ message: 'Current password is incorrect' });
		}

		// Update password
		user.password = newPassword;
		await user.save();

		res.json({ message: 'Password updated successfully' });
	} catch (error) {
		console.error('Error changing password:', error);
		res.status(500).json({ message: 'Server error' });
	}
});

// Add this new route
router.get('/check-email/:email', async (req, res) => {
	try {
		const { email } = req.params;
		const user = await User.findOne({ email });
		res.json({ exists: !!user });
	} catch (error) {
		console.error('Error checking email:', error);
		res.status(500).json({ message: 'Server error' });
	}
});

module.exports = router;
