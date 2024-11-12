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
	treatment: {
		type: String,
		required: [true, 'Treatment type is required'],
		enum: [
			'General Checkup',
			'Dental Care',
			'Physiotherapy',
			'Pediatric Care',
			'Vaccination',
			'Geriatric Care',
		],
	},
	appointmentTime: {
		type: Date,
		required: [true, 'Appointment time is required'],
	},
	status: {
		type: String,
		enum: ['pending', 'approved', 'rejected', 'cancelled'],
		default: 'pending',
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
		const conflictingAppointment = await this.constructor.findOne({
			appointmentTime: this.appointmentTime,
			status: { $in: ['pending', 'approved'] },
			_id: { $ne: this._id },
		});

		if (conflictingAppointment) {
			throw new Error('This time slot is already booked');
		}
	}
	next();
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
