const axios = require('axios');
require('dotenv').config();

class AIHelper {
    static REQUEST_DELAY = 1000;
    static lastRequestTime = 0;

    /**
     * Generate AI response using configured model provider
     * @param {string} prompt 
     * @returns {string}
     */
    static async generateAIResponse(prompt) {
        const geminiApiKey = process.env.GOOGLE_API_KEY;
        const chatGptApiKey = process.env.OPENAI_API_KEY;

        if (!geminiApiKey || !chatGptApiKey) {
            throw new Error('Missing API Keys in environment variables.');
        }

        // Respect request delay
        const now = Date.now();
        const timeSinceLast = now - this.lastRequestTime;
        if (timeSinceLast < this.REQUEST_DELAY) {
            await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY - timeSinceLast));
        }

        // Determine provider (You can replace this with a DB call like your Laravel config)
        const modelProvider = process.env.AI_MODEL_PROVIDER || 'gemini';

        try {
            let responseText = '';

            if (modelProvider === 'gemini') {
                responseText = await this.callGemini(prompt, geminiApiKey);
            } else if (modelProvider === 'chatgpt') {
                responseText = await this.callChatGPT(prompt, chatGptApiKey);
            } else {
                throw new Error(`Invalid model provider: ${modelProvider}`);
            }

            this.lastRequestTime = Date.now();
            return responseText;

        } catch (error) {
            if (error.response?.status === 429) {
                throw new Error("API quota exceeded. Try again later.");
            }
            throw new Error(`AI service error: ${error.message}`);
        }
    }

    /**
     * Call Gemini API (gemma-3-4b-it)
     */
    static async callGemini(prompt, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.5
            }
        };

        const response = await axios.post(url, payload);
        return response.data.candidates[0].content.parts[0].text;
    }

    /**
     * Call ChatGPT API (gpt-4o)
     */
    static async callChatGPT(prompt, apiKey) {
        const url = 'https://api.openai.com/v1/chat/completions';

        const payload = {
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 1000
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    }
}

module.exports = AIHelper;