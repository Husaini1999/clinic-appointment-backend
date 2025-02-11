const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
	appointmentId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Appointment',
		required: true,
	},
	type: {
		type: String,
		enum: [
			'confirmed',
			'completed',
			'no_show',
			'cancelled',
			'reschedule_note',
			'booking',
		],
		required: true,
	},
	content: {
		type: String,
		required: true,
		trim: true,
	},
	addedBy: {
		type: String,
		enum: ['patient', 'admin', 'staff', 'system'],
		required: true,
	},
	addedById: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: false,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const Note = mongoose.model('Note', NoteSchema);
module.exports = Note;
