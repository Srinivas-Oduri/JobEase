const User = require('../models/User');
const { scrapeJobs } = require('../agents/jobScraper');
const { fillApplicationForm } = require('../agents/formFiller');
const { aiAnswerQuestion } = require('../agents/aiQuestionAnswerer');
const { uploadResumeToForm } = require('../agents/resumeUploader');

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
    const scrapedJobs = await scrapeJobs(userId, jobType, numJobs);
    console.log(`Found ${scrapedJobs.length} jobs for ${jobType} type.`);

    if (scrapedJobs.length === 0) {
      return res.status(200).json({ msg: 'No jobs found matching your criteria.', applications: [] });
    }

    const applicationsProcessed = [];

    for (const job of scrapedJobs) {
      let applicationStatus = 'pending';
      let issueDetails = '';
      let aiAnswers = {}; // To store AI-generated answers

      try {
        // 2. Form Filling Agent
        // The formFiller will attempt to fill all fields it can and return any questions it couldn't answer.
        const formFillResult = await fillApplicationForm(userId, job.applicationLink, job);

        if (!formFillResult.success) {
          applicationStatus = 'issue';
          issueDetails = `Form filling failed: ${formFillResult.issues.join('; ')}`;
          console.log(`Issue processing application for: ${job.title} at ${job.company}. Issues: ${issueDetails}`);
        } else {
          // If form filling was successful, check for questions that need AI
          if (formFillResult.issues && formFillResult.issues.length > 0) {
            for (const question of formFillResult.issues) {
              // Assuming issues from formFiller are questions that need AI
              const aiResponse = await aiAnswerQuestion(question, user.resumeData, user.additionalQuestions);
              if (aiResponse.answer) {
                aiAnswers[question] = aiResponse.answer;
                // In a more advanced setup, we would re-attempt filling the form with AI answers
                // For now, we just log and record the answer.
                console.log(`AI answered: "${question}" with "${aiResponse.answer}"`);
              } else {
                issueDetails += `AI could not answer: "${question}". ${aiResponse.issue || ''} `;
              }
            }
          }

          // 3. Resume Uploader Agent (if needed)
          if (job.requiresResumeUpload && user.resumeFile) {
            const uploadResult = await uploadResumeToForm(userId, job.applicationLink, user.resumeFile);
            if (!uploadResult.success) {
              issueDetails += `Failed to upload resume: ${uploadResult.message}. `;
            }
          }

          if (issueDetails) {
            applicationStatus = 'issue';
          } else {
            applicationStatus = 'success';
          }
          console.log(`Processed application for: ${job.title} at ${job.company} with status: ${applicationStatus}`);
        }
      } catch (agentError) {
        applicationStatus = 'issue';
        issueDetails = `Agent orchestration error: ${agentError.message}`;
        console.error(`Error during application for ${job.title}:`, agentError);
      }

      const newApplication = {
        jobTitle: job.title,
        company: job.company,
        jobLink: job.link,
        status: applicationStatus,
        issueDetails: issueDetails,
      };
      user.applications.push(newApplication);
      applicationsProcessed.push(newApplication);
    }

    await user.save();
    res.json({ msg: 'Job application process initiated and completed.', applications: applicationsProcessed });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
