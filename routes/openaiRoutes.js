const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
	apiKey: process.env.OPENAI_SECRET_KEY, // Use your OpenAI API key from environment variables
});

// Proxy endpoint for OpenAI API
router.post('/chat', async (req, res) => {
	const { messages } = req.body;

	// Validate OpenAI API key
	if (!process.env.OPENAI_SECRET_KEY) {
		console.error('OpenAI API key is not configured');
		return res.status(500).json({
			message: 'OpenAI API key is not configured',
			error: 'MISSING_API_KEY',
		});
	}

	try {
		// Log the request (without sensitive data)
		console.log(
			'Attempting OpenAI request with message count:',
			messages.length
		);

		const completion = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			messages: messages,
			max_tokens: 1000, // Add a reasonable limit
			temperature: 0.7,
		});

		if (!completion.choices || !completion.choices[0]) {
			throw new Error('Invalid response from OpenAI');
		}

		res.json(completion.choices[0].message.content);
	} catch (error) {
		// Detailed error logging
		console.error('OpenAI API Error:', {
			message: error.message,
			code: error.code,
			type: error.type,
			stack: error.stack,
		});

		// Send appropriate error response
		res.status(500).json({
			message: 'Error fetching AI response',
			error: error.message,
			type: error.type || 'UNKNOWN_ERROR',
		});
	}
});

module.exports = router;
