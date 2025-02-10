const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Note = require('../models/Note');
const { addHours, isBefore } = require('date-fns');

// Schedule job to run every 5 minutes
const scheduleAppointmentCompletion = () => {
	cron.schedule(
		'*/5 * * * *',
		async () => {
			try {
				const now = new Date();

				// Find appointments that:
				// 1. Are confirmed
				// 2. Appointment time + 1 hour is in the past
				// 3. Haven't been marked as no-show or cancelled
				const pastAppointments = await Appointment.find({
					status: 'confirmed',
					appointmentTime: {
						$lt: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
					},
				});

				console.log(
					`Found ${pastAppointments.length} appointments to complete`
				);

				for (const appointment of pastAppointments) {
					const appointmentEndTime = addHours(
						new Date(appointment.appointmentTime),
						1
					);

					if (isBefore(appointmentEndTime, now)) {
						// Create system note
						const newNote = new Note({
							appointmentId: appointment._id,
							type: 'completed',
							content:
								'Automatically marked as completed (1 hour after scheduled time)',
							addedBy: 'system',
							addedById: null,
						});

						const savedNote = await newNote.save();

						// Update appointment
						appointment.status = 'completed';
						appointment.noteHistory.push(savedNote._id);
						await appointment.save();

						console.log(`Completed appointment ${appointment._id}`);
					}
				}
			} catch (error) {
				console.error('Error in completing appointments:', error);
			}
		},
		{
			scheduled: true,
			timezone: 'Asia/Singapore', // Adjust to your timezone
		}
	);
};

module.exports = { scheduleAppointmentCompletion };
