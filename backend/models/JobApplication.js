const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  applicationLink: {
    type: String,
    required: true,
  },
  jobData: {
    title: String,
    company: String,
    location: String,
  },
  filledFields: {
    type: Object, // Store key-value pairs of filled form fields
    default: {},
  },
  issues: {
    type: [String], // Array of strings for any issues encountered
    default: [],
  },
  success: {
    type: Boolean,
    required: true,
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('JobApplication', JobApplicationSchema);
