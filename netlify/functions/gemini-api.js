const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    const { prompt, model, options } = data;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false,
          error: { message: 'Missing required prompt parameter' } 
        }),
      };
    }

    // Get the API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use the specified model or default to gemini-pro
    const modelName = model || 'gemini-pro';
    const geminiModel = genAI.getGenerativeModel({ model: modelName });

    // Generate content with the provided prompt
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...options
    });

    const response = result.response;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: {
          text: response.text(),
          candidates: response.candidates,
          promptFeedback: response.promptFeedback,
        },
      }),
    };
  } catch (error) {
    console.error('Error in Gemini API function:', error.message);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          message: error.message || 'An unknown error occurred',
          details: error.stack || null,
        },
      }),
    };
  }
};
