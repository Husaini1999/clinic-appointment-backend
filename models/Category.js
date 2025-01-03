const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Category name is required'],
		trim: true,
		unique: true,
	},
	description: {
		type: String,
		trim: true,
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

module.exports = mongoose.model('Category', CategorySchema);
