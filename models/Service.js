const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Service name is required'],
		trim: true,
	},
	category: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Category',
		required: [true, 'Category is required'],
	},
	description: {
		type: String,
		trim: true,
	},
	duration: {
		type: Number,
		required: [true, 'Duration is required'],
		min: [5, 'Duration must be at least 5 minutes'],
	},
	price: {
		type: Number,
		required: [true, 'Price is required'],
		min: [0, 'Price cannot be negative'],
	},
	image: {
		data: {
			type: String,
			maxLength: [5242880, 'Image size cannot exceed 5MB'],
		},
		contentType: String,
	},
	isActive: {
		type: Boolean,
		default: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model('Service', ServiceSchema);
