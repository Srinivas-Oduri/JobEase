const User = require('../models/User');
const { scrapeJobs } = require('../agents/jobScraper');
const { fillApplicationForm } = require('../agents/formFiller');
const { aiAnswerQuestion } = require('../agents/aiQuestionAnswerer');
const { uploadResumeToForm } = require('../agents/resumeUploader');
const JobApplication = require('../models/JobApplication'); // Import JobApplication model

exports.startApplicationProcess = async (req, res) => {
  const { numJobs, jobType } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (!user.resumeFile) {
      return res.status(400).json({ msg: 'Resume not uploaded. Please upload your resume first.' });
    }

    // 1. Job Scraping Agent
    const { scrapedJobs, appliedJobs, issues: scraperIssues } = await scrapeJobs(userId, jobType, numJobs);
    console.log(`Found ${scrapedJobs.length} jobs for ${jobType} type.`);

    if (scrapedJobs.length === 0 && appliedJobs.length === 0) {
      return res.status(200).json({ msg: 'No jobs found matching your criteria.', applications: [], issues: scraperIssues });
    }

    // The jobScraper now handles the application process internally,
    // and formFiller saves detailed results to the JobApplication model.
    // We just need to return the summary.
    res.json({
      msg: 'Job application process initiated and completed. Detailed results are stored in JobApplication model.',
      scrapedJobs: scrapedJobs,
      appliedJobs: appliedJobs, // This now contains summary of applied jobs with results
      issues: scraperIssues
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getJobApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const applications = await JobApplication.find({ userId }).sort({ appliedAt: -1 });
    res.json(applications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
