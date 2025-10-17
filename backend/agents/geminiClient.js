// geminiClient.js
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set in environment variables.');
  process.exit(1);
}

// ✅ Single shared Gemini client forced to v1
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ✅ Default model
const DEFAULT_MODEL = "gemini-2.5-flash"; // Changed default model to a newer, commonly available model

// ✅ Get Generative Model
function getModel(modelName = DEFAULT_MODEL) {
  return {
    generateContent: async (prompt) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      return response;
    },
  };
}

// ✅ Export
module.exports = { ai, getModel };
