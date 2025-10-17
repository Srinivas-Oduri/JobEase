const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  // Data from initial questions (not in resume)
  additionalQuestions: {
    'Are you legally authorized to work in this country': String,
    'Will you now or in the future require sponsorship for employment (e.g., H-1B)': String,
    'What is your desired start date': String,
    'Are you willing to relocate': String,
    'What are your salary expectations for this role': String,
    'Why are you interested in this position': String,
    'How did you hear about this job opening': String,
    linkedin: String,
    github: String,
    experienceInYears: Number,
    codingPlatformLink: String,
  },
  // Parsed data from resume
  resumeData: {
    personalInfo: {
      name: String,
      email: String,
      phone: String,
      portfolio: String,
      address: String,
    },
    summary: String,
    skills: [String],
    experience: [{
      title: String,
      company: String,
      duration: String,
      description: String,
    }],
    education: [{
      degree: String,
      institution: String,
      year: String,
    }],
    projects: [{
      title: String,
      description: String,
      technologies: [String],
      link: String,
    }],
    achievements: [{ // Renamed from awards
      name: String,
      date: String,
      issuer: String,
    }],
    certifications: [{
      name: String,
      date: String,
      issuer: String,
    }],
    languages: [String],
    // Add any other relevant fields parsed from resume
  },
  // Stored resume file path or reference
  resumeFile: {
    type: String,
  },
  // User's domain interests for job scraping
  domainInterests: [String],
  // Job application status (dashboard)
  applications: [{
    jobTitle: String,
    company: String,
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['success', 'issue', 'pending'],
      default: 'pending',
    },
    jobLink: String,
    issueDetails: String, // Details if status is 'issue'
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema, 'autoapply');
