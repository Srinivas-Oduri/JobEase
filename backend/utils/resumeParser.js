const fs = require('fs');
const pdfParse = require('pdf-parse');

async function parseResumePdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const resumeText = data.text;

    // Placeholder for AI model integration
    // In a real-world scenario, you would send `resumeText` to an AI model API
    // and receive a structured JSON object with segregated data.
    // For demonstration, we'll simulate a structured output.

    // Example of a more comprehensive parsed data structure
    const parsedData = {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        linkedin: '',
        github: '',
        portfolio: '',
        address: '',
      },
      summary: '',
      skills: [],
      experience: [],
      education: [],
      projects: [],
      awards: [],
      certifications: [],
      languages: [],
      // Add any other relevant fields
    };

    // --- AI Model Integration Placeholder ---
    // This is where you would call your AI model.
    // For now, we'll use a simple placeholder that attempts to extract some basic info
    // and then relies on a more advanced model for segregation.

    // Basic extraction (can be enhanced by AI)
    const allLines = resumeText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    // Find name: first line that looks like a name (2-4 capitalized words), but not section headers
    parsedData.personalInfo.name = allLines.find(line => line.match(/^[A-Z][a-z]+(?: [A-Z][a-z]+){1,3}$/) && !line.includes('Skills') && !line.includes('Education') && !line.includes('Projects') && !line.includes('Design') && !line.includes('Logic')) || '';
    parsedData.personalInfo.email = resumeText.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0] || '';
    parsedData.personalInfo.phone = resumeText.match(/(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/)?.[0] || '';
    parsedData.personalInfo.linkedin = resumeText.match(/(?:linkedin\.com\/in\/|linkedin\.com\/)([a-zA-Z0-9_-]+)/)?.[0] || '';
    parsedData.personalInfo.github = resumeText.match(/(?:github\.com\/)([a-zA-Z0-9_-]+)/)?.[0] || '';

    // Simulate AI model processing for segregation
    // In a real application, this would be an API call to an NLP model
    const aiParsedResult = await simulateAiResumeParsing(resumeText); // This function needs to be implemented or replaced with actual AI call

    if (aiParsedResult) {
      Object.assign(parsedData, aiParsedResult);
    }

    console.log('Parsed Resume Data (AI-enhanced):', parsedData);
    return parsedData;

  } catch (error) {
    console.error('Error parsing resume PDF:', error);
    return null;
  }
}

// This is a placeholder function to simulate AI resume parsing.
// In a real application, you would replace this with an actual API call to an AI/NLP service.
async function simulateAiResumeParsing(resumeText) {
  // This is a very basic simulation. A real AI model would do much better.

  // Extract summary/objective - handle different variations
  const summaryMatch = resumeText.match(/(?:Objective|Career Objective)[\s\S]*?(?:Technical Skills|Key Skills|Skills Summary|Certifications|Projects|Internships|Education|\Z)/);
  const summary = summaryMatch ? summaryMatch[0].replace(/(?:Objective|Career Objective|Technical Skills|Key Skills|Skills Summary|Certifications|Projects|Internships|Education)/g, '').trim() : '';

  // Extract skills - handle different formats
  let skills = [];
  const skillsSectionMatch = resumeText.match(/(?:Technical Skills|Key Skills|Skills Summary)[\s\S]*?(?:Certifications|Projects|Internships|Education|\Z)/);
  if (skillsSectionMatch) {
    const skillsText = skillsSectionMatch[0].replace(/(?:Technical Skills|Key Skills|Skills Summary|Certifications|Projects|Internships|Education)/g, '').trim();
    // Split by various delimiters and clean
    const skillItems = skillsText.split(/[,;\n]/).map(s => s.trim()).filter(s => s.length > 0 && !s.match(/^\d/) && !s.includes(':'));
    skills = skillItems;
  }

  // Extract education
  const educationMatch = resumeText.match(/Education[\s\S]*?(?:Projects|Internships|Certifications|Achievements|\Z)/);
  const education = educationMatch ? [{ description: educationMatch[0].replace(/Education|Projects|Internships|Certifications|Achievements/g, '').trim() }] : [];

  // Extract projects
  const projectsMatch = resumeText.match(/Projects[\s\S]*?(?:Internships|Certifications|Achievements|Education|\Z)/);
  const projects = projectsMatch ? [{ description: projectsMatch[0].replace(/Projects|Internships|Certifications|Achievements|Education/g, '').trim() }] : [];

  // Extract certifications
  const certificationsMatch = resumeText.match(/Certifications[\s\S]*?(?:Projects|Internships|Achievements|Education|\Z)/);
  const certifications = certificationsMatch ? [{ description: certificationsMatch[0].replace(/Certifications|Projects|Internships|Achievements|Education/g, '').trim() }] : [];

  // Extract awards
  const awardsMatch = resumeText.match(/(?:Achievements|Achievements & Activities)[\s\S]*?(\Z)/);
  const awards = awardsMatch ? [{ description: awardsMatch[0].replace(/Achievements|Achievements & Activities/g, '').trim() }] : [];

  // Experience (internships)
  const experienceMatch = resumeText.match(/Internships[\s\S]*?(?:Certifications|Projects|Achievements|Education|\Z)/);
  const experience = experienceMatch ? [{ description: experienceMatch[0].replace(/Internships|Certifications|Projects|Achievements|Education/g, '').trim() }] : [];

  return {
    summary: summary,
    skills: skills,
    experience: experience,
    education: education,
    projects: projects,
    certifications: certifications,
    awards: awards,
    // Add more fields as the AI model would extract
  };
}

module.exports = { parseResumePdf };
