const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Load environment variables

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables.');
  // process.exit(1); // Exit if API key is critical for startup
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' }); // Using gemini-pro as preferred

exports.aiAnswerQuestion = async (question, resumeData, additionalQuestions) => {
  console.log(`AI Question Answerer: Attempting to answer "${question}"`);

  try {
    const resumeText = `Skills: ${resumeData.skills ? resumeData.skills.join(', ') : 'N/A'}\n` +
                       `Experience: ${resumeData.experience ? resumeData.experience.map(exp => `${exp.title} at ${exp.company} (${exp.duration}) - ${exp.description}`).join('\n') : 'N/A'}\n` +
                       `Education: ${resumeData.education ? resumeData.education.map(edu => `${edu.degree} from ${edu.institution} (${edu.year})`).join('\n') : 'N/A'}`;

    const additionalInfo = Object.entries(additionalQuestions || {}).map(([q, a]) => `${q}: ${a}`).join('\n');

    const prompt = `You are an AI assistant helping to answer job application questions.
    Based on the following resume data and additional user information, provide a concise and professional answer to the given question.
    If you cannot confidently answer, state that you cannot.

    ---
    Resume Data:
    ${resumeText}

    ---
    Additional User Information:
    ${additionalInfo || 'N/A'}

    ---
    Question: "${question}"

    Your Answer:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (text && text.toLowerCase().includes('cannot confidently answer')) {
      console.warn(`AI could not confidently answer: "${question}"`);
      return { answer: null, issue: 'AI could not confidently answer this question.' };
    }

    console.log(`AI Answered: "${question}" with "${text}"`);
    return { answer: text, issue: null };

  } catch (error) {
    console.error(`Error calling Gemini API for question "${question}":`, error);
    return { answer: null, issue: `Error generating answer: ${error.message}` };
  }
};
