const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const Note = require('../models/Note');

// Public appointment booking endpoint
router.post('/create', async (req, res) => {
	try {
		const { name, email, phone, treatment, appointmentTime, notes } = req.body;

		// Basic validation
		if (!name || !email || !phone || !treatment || !appointmentTime) {
			return res
				.status(400)
				.json({ message: 'Please fill in all required fields' });
		}

		// Check for appointment conflicts
		const existingAppointment = await Appointment.findOne({
			appointmentTime: new Date(appointmentTime),
			status: { $in: ['pending', 'approved'] },
		});

		if (existingAppointment) {
			return res
				.status(400)
				.json({ message: 'This time slot is already booked' });
		}

		// Update user's phone number if they are logged in
		const user = await User.findOne({ email });
		if (user && (!user.phone || user.phone !== phone)) {
			user.phone = phone;
			await user.save();
		}

		// Create new appointment
		const newAppointment = new Appointment({
			patientName: name,
			email,
			phone,
			treatment,
			appointmentTime: new Date(appointmentTime),
			status: 'pending',
		});

		// Save the appointment first to get its ID
		await newAppointment.save();

		// Create initial note if notes are provided
		if (notes && notes.trim()) {
			const initialNote = new Note({
				appointmentId: newAppointment._id,
				type: 'booking',
				content: notes,
				addedBy: 'patient',
				addedById: user ? user._id : null,
			});

			const savedNote = await initialNote.save();

			// Add note to appointment's noteHistory
			newAppointment.noteHistory = [savedNote._id];
			await newAppointment.save();
		}

		res.status(201).json({
			message: 'Appointment booked successfully',
			appointment: newAppointment,
		});
	} catch (error) {
		console.error('Appointment booking error:', error);
		res.status(500).json({ message: 'Error booking appointment' });
	}
});

// Middleware to protect the routes
router.use(authMiddleware);

// Get all appointments for staff to view
router.get('/', async (req, res) => {
	try {
		const allAppointments = await Appointment.find().populate({
			path: 'noteHistory',
			select: 'type content createdAt addedBy',
		});
		res.status(200).json(allAppointments);
	} catch (error) {
		console.error('Error fetching all appointments:', error);
		res.status(500).json({ message: 'Error fetching appointments' });
	}
});

// Get appointments for the authenticated patient
router.get('/patient', async (req, res) => {
	try {
		const { email } = req.query;
		const patientAppointments = await Appointment.find({ email }).populate({
			path: 'noteHistory',
			select: 'type content createdAt addedBy',
		});
		res.status(200).json(patientAppointments);
	} catch (error) {
		console.error('Error fetching patient appointments:', error);
		res.status(500).json({ message: 'Error fetching appointments' });
	}
});

// Optional: Add filtering functionality for appointments
router.get('/filter', async (req, res) => {
	const { status } = req.query; // e.g., ?status=pending
	try {
		const filteredAppointments = await Appointment.find({ status });
		res.status(200).json(filteredAppointments);
	} catch (error) {
		console.error('Error fetching filtered appointments:', error);
		res.status(500).json({ message: 'Error fetching appointments' });
	}
});

// Update appointment status
router.put('/:id/status', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const { status, notes } = req.body;
		const user = req.user;

		if (!user || !user.id) {
			return res.status(401).json({ message: 'User not authenticated' });
		}

		// Validate status
		const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
		if (!validStatuses.includes(status)) {
			return res.status(400).json({ message: 'Invalid status' });
		}

		// Find appointment
		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: 'Appointment not found' });
		}

		try {
			// Create note document
			const noteType =
				status === 'approved'
					? 'approval'
					: status === 'rejected'
					? 'rejection'
					: 'cancellation';

			const newNote = new Note({
				appointmentId: appointment._id,
				type: noteType,
				content: notes || 'No notes provided',
				addedBy: user.role,
				addedById: user.id,
			});

			const savedNote = await newNote.save();

			// Update appointment
			appointment.status = status;
			appointment.notes = notes;
			if (!appointment.noteHistory) {
				appointment.noteHistory = [];
			}
			appointment.noteHistory.push(savedNote._id);

			await appointment.save();

			res.status(200).json({
				message: 'Appointment status updated successfully',
				appointment,
				note: savedNote,
			});
		} catch (noteError) {
			console.error('Error creating note:', noteError);
			// Still update the appointment even if note creation fails
			appointment.status = status;
			appointment.notes = notes;
			await appointment.save();

			res.status(200).json({
				message: 'Appointment status updated but note creation failed',
				appointment,
			});
		}
	} catch (error) {
		console.error('Error updating appointment status:', error);
		res.status(500).json({ message: 'Error updating appointment status' });
	}
});

module.exports = router;
