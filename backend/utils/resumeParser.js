// resumeParser.js
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { getModel } = require('../agents/geminiClient');

// ✅ Main PDF parsing function
async function parseResumePdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const resumeText = data.text;

    const parsedData = {
      personalInfo: { name:'', email:'', phone:'', linkedin:'', github:'', portfolio:'', address:'' },
      summary: '',
      skills: [],
      experience: [],
      education: [],
      projects: [],
      achievements: [], // Renamed from awards
      certifications: [],
      languages: [],
    };

    const aiParsedResult = await aiResumeParsing(resumeText);

    if (aiParsedResult) Object.assign(parsedData, aiParsedResult);

    console.log('✅ Parsed Resume Data (AI-enhanced):', parsedData);
    return parsedData;

  } catch (error) {
    console.error('❌ Error parsing resume PDF:', error);
    return null;
  }
}

// ✅ AI Resume Parsing
async function aiResumeParsing(resumeText) {
  try {
    const model = getModel(); // uses gemini-pro by default

    const prompt = `You are a highly skilled resume parsing AI. Extract a JSON object with the following structure:
"personalInfo": { "name": string, "email": string, "phone": string, "linkedin": string, "github": string, "portfolio": string, "address": string },
"summary": string,
"skills": string[],
"experience": [{ "title": string, "company": string, "duration": string, "description": string }],
"education": [{ "institution": string, "degree": string, "year": string }],
"projects": [{ "title": string, "description": string, "technologies": string[], "link": string }],
"achievements": [{ "name": string, "date": string, "issuer": string }], // Renamed from awards
"certifications": [{ "name": string, "date": string, "issuer": string }],
"languages": string[].
Ensure all fields exist, even if empty, and strictly adhere to the specified types (e.g., string for description, array of objects for awards/certifications).
Extract all awards and achievements from the resume into the "achievements" array.

Resume Text:
\`\`\`
${resumeText}
\`\`\``;

    const result = await model.generateContent(prompt);
    const text = result.text; // Corrected: directly access text property

    // ✅ Extract JSON from code block if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) return JSON.parse(jsonMatch[1]);

    return JSON.parse(text);

  } catch (error) {
    console.error('❌ Error calling Gemini API or parsing response:', error);
    return null;
  }
}

module.exports = { parseResumePdf };
