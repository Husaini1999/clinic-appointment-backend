const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const Service = require('../models/Service');
const upload = require('../middleware/upload');

// Get all categories
router.get('/', async (req, res) => {
	try {
		const categories = await Category.find({ isActive: true });
		res.json(categories);
	} catch (error) {
		res.status(500).json({ message: 'Error fetching categories' });
	}
});

// Create category (admin only)
router.post('/', auth, upload.single('image'), async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ message: 'Access denied' });
		}

		const categoryData = { ...req.body };

		if (req.file) {
			const base64Image = Buffer.from(req.file.buffer).toString('base64');
			categoryData.image = {
				data: `data:${req.file.mimetype};base64,${base64Image}`,
				contentType: req.file.mimetype,
			};
		}

		const category = new Category(categoryData);
		await category.save();
		res.status(201).json(category);
	} catch (error) {
		console.error('Error creating category:', error);
		res.status(500).json({ message: 'Error creating category' });
	}
});

// Update category (admin only)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ message: 'Access denied' });
		}

		const updateData = { ...req.body, updatedAt: Date.now() };

		if (req.file) {
			const base64Image = Buffer.from(req.file.buffer).toString('base64');
			updateData.image = {
				data: `data:${req.file.mimetype};base64,${base64Image}`,
				contentType: req.file.mimetype,
			};
		}

		const category = await Category.findByIdAndUpdate(
			req.params.id,
			updateData,
			{ new: true }
		);
		res.json(category);
	} catch (error) {
		console.error('Error updating category:', error);
		res.status(500).json({ message: 'Error updating category' });
	}
});

// Delete category (admin only)
router.delete('/:id', auth, async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ message: 'Access denied' });
		}

		// Check if category has services
		const servicesCount = await Service.countDocuments({
			category: req.params.id,
		});
		if (servicesCount > 0) {
			return res.status(400).json({
				message: 'Cannot delete category with existing services',
			});
		}

		await Category.findByIdAndDelete(req.params.id);
		res.json({ message: 'Category deleted successfully' });
	} catch (error) {
		res.status(500).json({ message: 'Error deleting category' });
	}
});

// Add this new route to get a single category
router.get('/:id', async (req, res) => {
	try {
		const category = await Category.findById(req.params.id);
		if (!category) {
			return res.status(404).json({ message: 'Category not found' });
		}
		res.json(category);
	} catch (error) {
		res.status(500).json({ message: 'Error fetching category' });
	}
});

module.exports = router;
