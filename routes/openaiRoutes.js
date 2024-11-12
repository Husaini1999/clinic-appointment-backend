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

	try {
		const completion = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo', // or any other model you want to use
			messages: messages,
		});
		res.json(completion.choices[0].message.content);
	} catch (error) {
		console.error('Error fetching AI response:', error);
		res.status(500).json({ message: 'Error fetching AI response' });
	}
});

module.exports = router;
