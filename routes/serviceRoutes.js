const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all services
router.get('/', async (req, res) => {
	try {
		const { category, limit } = req.query;
		const query = { isActive: true };

		if (category) {
			query.category = category;
		}

		const services = await Service.find(query)
			.populate('category', 'name')
			.sort({ name: 1 })
			.limit(parseInt(limit) || 0);

		res.json(services);
	} catch (error) {
		res.status(500).json({ message: 'Error fetching services' });
	}
});

// Add a new route to get services by category ID
router.get('/category/:categoryId', async (req, res) => {
	try {
		const services = await Service.find({
			category: req.params.categoryId,
			isActive: true,
		}).populate('category', 'name');

		res.json(services);
	} catch (error) {
		res.status(500).json({ message: 'Error fetching category services' });
	}
});

// Create service (admin only)
router.post('/', auth, upload.single('image'), async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ message: 'Access denied' });
		}

		const serviceData = { ...req.body };

		if (req.file) {
			// Convert buffer to base64
			const base64Image = Buffer.from(req.file.buffer).toString('base64');
			serviceData.image = {
				data: `data:${req.file.mimetype};base64,${base64Image}`,
				contentType: req.file.mimetype,
			};
		}

		const service = new Service(serviceData);
		await service.save();
		res.status(201).json(service);
	} catch (error) {
		console.error('Error creating service:', error);
		res.status(500).json({ message: 'Error creating service' });
	}
});

// Update service (admin only)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ message: 'Access denied' });
		}

		const updateData = { ...req.body };

		if (req.file) {
			// Convert buffer to base64
			const base64Image = Buffer.from(req.file.buffer).toString('base64');
			updateData.image = {
				data: `data:${req.file.mimetype};base64,${base64Image}`,
				contentType: req.file.mimetype,
			};
		}

		const updatedService = await Service.findByIdAndUpdate(
			req.params.id,
			updateData,
			{ new: true }
		);

		res.json(updatedService);
	} catch (error) {
		console.error('Error updating service:', error);
		res.status(500).json({ message: 'Error updating service' });
	}
});

// Delete service (admin only)
router.delete('/:id', auth, async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ message: 'Access denied' });
		}

		const service = await Service.findById(req.params.id);
		if (!service) {
			return res.status(404).json({ message: 'Service not found' });
		}

		// Delete image from cloudinary if exists
		if (service.image?.publicId) {
			await cloudinary.uploader.destroy(service.image.publicId);
		}

		await Service.findByIdAndDelete(req.params.id);
		res.json({ message: 'Service deleted successfully' });
	} catch (error) {
		res.status(500).json({ message: 'Error deleting service' });
	}
});

module.exports = router;
