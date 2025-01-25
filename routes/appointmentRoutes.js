const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const Note = require('../models/Note');
const { format } = require('date-fns');

router.post('/create', async (req, res) => {
	try {
		const { name, email, phone, address, treatment, appointmentTime, notes } =
			req.body;

		// Basic validation
		if (
			!name ||
			!email ||
			!phone ||
			!address ||
			!treatment ||
			!appointmentTime
		) {
			return res
				.status(400)
				.json({ message: 'Please fill in all required fields' });
		}

		// Check for appointment conflicts
		const existingAppointment = await Appointment.findOne({
			appointmentTime: new Date(appointmentTime),
			status: { $in: ['confirmed', 'approved'] },
		});

		if (existingAppointment) {
			return res
				.status(400)
				.json({ message: 'This time slot is already booked' });
		}

		// Check for existing user and handle accordingly
		let user = await User.findOne({ email });

		if (!user) {
			// Create temporary user with address
			const temporaryPassword = Math.random().toString(36).slice(-8);
			user = new User({
				name,
				email,
				phone,
				address,
				password: temporaryPassword,
				isTemporaryUser: true,
				role: 'patient',
			});
			await user.save();
		} else if (user.isTemporaryUser) {
			// Update temporary user's details
			user.name = name;
			user.phone = phone;
			user.address = address;
			await user.save();
		} else {
			// Update user's details including address
			user.phone = phone;
			user.address = address;
			await user.save();
		}

		// Create new appointment without address
		const newAppointment = new Appointment({
			patientName: name,
			email,
			phone,
			treatment,
			appointmentTime: new Date(appointmentTime),
			status: 'confirmed',
			notes: notes || '',
		});

		await newAppointment.save();

		// Create initial note if notes are provided
		if (notes && notes.trim()) {
			const initialNote = new Note({
				appointmentId: newAppointment._id,
				type: 'booking',
				content: notes,
				addedBy: 'patient',
				addedById: user._id,
			});

			const savedNote = await initialNote.save();

			// Add note to appointment's noteHistory
			newAppointment.noteHistory = [savedNote._id];
			await newAppointment.save();
		}

		res.status(201).json({
			message: user.isTemporaryUser
				? 'Appointment booked successfully! You can complete your registration using this email address.'
				: 'Appointment booked successfully!',
			appointment: newAppointment,
		});
	} catch (error) {
		console.error('Error creating appointment:', error);
		res
			.status(500)
			.json({ message: error.message || 'Error creating appointment' });
	}
});

// Get booked slots for a specific date (public endpoint)
router.get('/booked-slots', async (req, res) => {
	try {
		const { date } = req.query;
		const startDate = new Date(date);
		startDate.setHours(0, 0, 0, 0);

		const endDate = new Date(date);
		endDate.setHours(23, 59, 59, 999);

		const bookedAppointments = await Appointment.find({
			appointmentTime: {
				$gte: startDate,
				$lte: endDate,
			},
			status: 'confirmed',
		});

		const bookedSlots = bookedAppointments.map((appointment) =>
			format(new Date(appointment.appointmentTime), 'h:mm a')
		);
		res.json({ bookedSlots });
	} catch (error) {
		console.error('Error fetching booked slots:', error);
		res.status(500).json({ message: 'Error fetching booked slots' });
	}
});

// Protected routes below this middleware
router.use(authMiddleware);

// Get all appointments for staff to view
router.get('/', async (req, res) => {
	try {
		const allAppointments = await Appointment.find()
			.populate({
				path: 'treatment',
				select: 'name price duration',
				model: 'Service',
			})
			.populate({
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
		const patientAppointments = await Appointment.find({ email })
			.populate('treatment', 'name price duration')
			.populate({
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
	const { status } = req.query;
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
		const validStatuses = ['confirmed', 'completed', 'no_show', 'cancelled'];
		if (!validStatuses.includes(status)) {
			return res.status(400).json({ message: 'Invalid status' });
		}

		// Find appointment
		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: 'Appointment not found' });
		}

		// Create note document
		const newNote = new Note({
			appointmentId: appointment._id,
			type: status,
			content: notes || 'No notes provided',
			addedBy: user.role,
			addedById: user.id,
		});

		const savedNote = await newNote.save();

		// Update appointment
		appointment.status = status;
		appointment.noteHistory.push(savedNote._id);
		await appointment.save();

		res.status(200).json({
			message: 'Appointment updated successfully',
			appointment,
			note: savedNote,
		});
	} catch (error) {
		console.error('Error updating appointment:', error);
		res.status(500).json({ message: 'Error updating appointment' });
	}
});

// Update appointment reschedule
router.put('/:id/reschedule', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const { newDateTime, reason } = req.body;
		const user = req.user;

		if (!user || !user.id) {
			return res.status(401).json({ message: 'User not authenticated' });
		}

		// Find appointment
		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: 'Appointment not found' });
		}

		const oldDateTime = appointment.appointmentTime;

		// Create note for the reschedule
		const newNote = new Note({
			appointmentId: appointment._id,
			type: 'reschedule_note',
			content: `Appointment rescheduled from ${format(
				oldDateTime,
				'PPpp'
			)} to ${format(new Date(newDateTime), 'PPpp')}. Reason: ${reason}`,
			addedBy: user.role,
			addedById: user.id,
		});

		const savedNote = await newNote.save();

		// Update appointment time (status remains 'confirmed')
		appointment.appointmentTime = newDateTime;
		appointment.noteHistory.push(savedNote._id);
		await appointment.save();

		res.status(200).json({
			message: 'Appointment rescheduled successfully',
			appointment,
			note: savedNote,
		});
	} catch (error) {
		console.error('Error rescheduling appointment:', error);
		res.status(500).json({ message: 'Error rescheduling appointment' });
	}
});

module.exports = router;
