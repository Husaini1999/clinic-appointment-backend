const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
	appointmentId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Appointment',
		required: true,
	},
	type: {
		type: String,
		enum: ['booking', 'approval', 'rejection', 'cancellation'],
		required: true,
	},
	content: {
		type: String,
		required: true,
		trim: true,
	},
	addedBy: {
		type: String,
		enum: ['patient', 'staff', 'admin'],
		required: true,
	},
	addedById: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const Note = mongoose.model('Note', NoteSchema);
module.exports = Note;
