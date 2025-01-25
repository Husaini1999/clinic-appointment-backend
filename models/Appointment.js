const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
	patientName: {
		type: String,
		required: [true, 'Patient name is required'],
		trim: true,
	},
	email: {
		type: String,
		required: [true, 'Email is required'],
		trim: true,
	},
	phone: {
		type: String,
		required: [true, 'Phone number is required'],
		trim: true,
	},
	weight: {
		type: Number,
		required: false,
		min: [0, 'Weight cannot be negative'],
	},
	height: {
		type: Number,
		required: false,
		min: [0, 'Height cannot be negative'],
	},
	treatment: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Service',
		required: [true, 'Treatment type is required'],
	},
	appointmentTime: {
		type: Date,
		required: [true, 'Appointment time is required'],
	},
	status: {
		type: String,
		enum: ['confirmed', 'completed', 'no_show', 'cancelled'],
		default: 'confirmed',
	},
	notes: {
		type: String,
		trim: true,
	},
	noteHistory: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Note',
		},
	],
	createdAt: {
		type: Date,
		default: Date.now,
	},
	// Add updatedAt field to track when status changes
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

// Update the updatedAt field before saving
AppointmentSchema.pre('save', function (next) {
	this.updatedAt = new Date();
	next();
});

// Index for querying appointments by date and status
AppointmentSchema.index({ appointmentTime: 1, status: 1 });

// Middleware to check for appointment conflicts
AppointmentSchema.pre('save', async function (next) {
	if (this.isModified('appointmentTime')) {
		const appointmentStart = new Date(this.appointmentTime);
		const appointmentEnd = new Date(this.appointmentTime);
		appointmentEnd.setMinutes(appointmentEnd.getMinutes() + 30); // 30-minute slot

		const conflictingAppointment = await this.constructor.findOne({
			appointmentTime: {
				$gte: appointmentStart,
				$lt: appointmentEnd,
			},
			status: { $in: ['confirmed'] },
			_id: { $ne: this._id },
		});

		if (conflictingAppointment) {
			throw new Error('This time slot is already booked');
		}
	}
	next();
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
