const puppeteer = require('puppeteer');
const User = require('../models/User'); // Assuming User model is in ../models/User.js
const { parseResumePdf } = require('../utils/resumeParser'); // Import the resume parser utility

exports.uploadResumeToForm = async (userId, applicationLink, resumeFilePath) => {
  console.log(`Resume Uploader: Attempting to upload resume from ${resumeFilePath} to ${applicationLink} for user ${userId}`);

  if (!resumeFilePath) {
    console.log('No resume file path provided.');
    return { success: false, message: 'No resume file path provided.' };
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(applicationLink, { waitUntil: 'networkidle2' });

    // Find the file input element (this might need to be more robust)
    // Common selectors: 'input[type="file"]', 'input[name="resume"]', 'input#resume-upload'
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumeFilePath);
      console.log(`Successfully attached ${resumeFilePath} to the form.`);
      // You might need to click a submit button here if the form doesn't auto-submit
      // await page.click('button[type="submit"]');
      // await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } else {
      console.warn('Could not find a file input element on the page.');
      return { success: false, message: 'Could not find file input on the form.' };
    }

    // After successful upload (or simulation), parse the resume and update user data
    const parsedData = await parseResumePdf(resumeFilePath);
    if (parsedData) {
      await User.findByIdAndUpdate(userId, { resumeData: parsedData, resumeFile: resumeFilePath });
      console.log(`User ${userId} resumeData updated successfully.`);
    } else {
      console.warn(`Failed to parse resume for user ${userId}.`);
    }

    return { success: true, message: 'Resume uploaded and parsed successfully.' };

  } catch (error) {
    console.error(`Error uploading resume for user ${userId}:`, error);
    return { success: false, message: `Error uploading resume: ${error.message}` };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
