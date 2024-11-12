require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Security Middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(
	cors({
		origin:
			process.env.NODE_ENV === 'production'
				? process.env.FRONTEND_URL
				: 'http://localhost:3000',
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

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/openai', require('./routes/openaiRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(err.status || 500).json({
		success: false,
		message: err.message || 'Something went wrong!',
	});
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '127.0.0.1', () => {
	console.log(`Server is running on http://127.0.0.1:${PORT}`);
	console.log('Environment:', process.env.NODE_ENV);
	console.log('MongoDB URI:', process.env.MONGODB_URI);
});

module.exports = app;
