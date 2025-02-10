require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { scheduleAppointmentCompletion } = require('./jobs/appointmentJobs');

const app = express();

// Security Middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

const allowedOrigins =
	process.env.NODE_ENV === 'production'
		? [process.env.FRONTEND_URL.replace(/\/$/, '')] // Remove trailing slash if present
		: ['http://localhost:3000'];

app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin || allowedOrigins.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	})
);

// Set mongoose options
mongoose.set('strictQuery', false);

// MongoDB connection with better error handling
const connectDB = async () => {
	try {
		if (!process.env.MONGODB_URI) {
			throw new Error('MONGODB_URI is not defined in environment variables');
		}

		await mongoose.connect(process.env.MONGODB_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log('MongoDB Connected Successfully');
	} catch (err) {
		console.error('MongoDB connection error:', err.message);
		process.exit(1);
	}
};

// Connect to MongoDB
connectDB();

// Initialize the auto-completion job
scheduleAppointmentCompletion();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/openai', require('./routes/openaiRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(err.status || 500).json({
		success: false,
		message: err.message || 'Something went wrong!',
	});
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
	console.log(`Server is running on port ${PORT}`);
	console.log('Environment:', process.env.NODE_ENV);
	console.log('MongoDB URI:', process.env.MONGODB_URI);
});

module.exports = app;
