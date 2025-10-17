const puppeteer = require('puppeteer');
const User = require('../models/User'); // Assuming User model is in ../models/User.js
const { getModel } = require('./geminiClient'); // Import Gemini client

exports.scrapeJobs = async (userId, jobType, numJobs) => {
  console.log(`Job Scraper: Starting to scrape ${numJobs} ${jobType} jobs for user ${userId}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true, // Use 'new' for new headless mode, or false for visible browser (for debugging)
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // This might help with some environments
        '--disable-gpu'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 }); // Set a consistent viewport size

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found.');
      return [];
    }

    const { resumeData, additionalQuestions } = user;

    // Prepare data for Gemini model
    const resumeText = `
      Skills: ${resumeData && resumeData.skills ? resumeData.skills.join(', ') : 'N/A'}
      Experience: ${resumeData && resumeData.experience ? resumeData.experience.map(exp => `${exp.title} at ${exp.company}`).join('; ') : 'N/A'}
      Education: ${resumeData && resumeData.education ? resumeData.education.map(edu => `${edu.degree} from ${edu.institution}`).join('; ') : 'N/A'}
      Projects: ${resumeData && resumeData.projects ? resumeData.projects.map(proj => proj.title).join('; ') : 'N/A'}
      Summary: ${resumeData && resumeData.summary ? resumeData.summary : 'N/A'}
    `;

    const questionsText = `
      Additional Questions:
      ${additionalQuestions ? Object.entries(additionalQuestions).map(([key, value]) => `${key}: ${value}`).join('\n') : 'N/A'}
    `;

    const prompt = `
      Analyze the following user's resume data and answers to additional questions.
      Based on their skills, experience, education, and interests, suggest 3-5 job domains or roles (e.g., "Software Engineer", "Data Scientist", "Frontend Developer", "DevOps Engineer", "Product Manager") that would be most suitable for them.
      Provide the output as a comma-separated list of job domains/roles, without any additional text or explanation.

      Resume Data:
      ${resumeText}

      Additional Questions Data:
      ${questionsText}
    `;

    console.log('Job Scraper: Sending user data to Gemini model for analysis...');
    const geminiModel = getModel();
    const modelResponse = await geminiModel.generateContent([{ text: prompt }]);
    const suggestedDomains = modelResponse.candidates[0].content.parts[0].text.trim();
    console.log(`Job Scraper: Gemini model suggested domains/roles: ${suggestedDomains}`);

    if (!suggestedDomains) {
      console.log('No relevant domains/roles suggested by Gemini model.');
      return [];
    }

    const keywords = `${suggestedDomains}`.trim();
    let searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords)}`;

    // Add jobType filter for internships
    if (jobType.toLowerCase() === 'internship') {
      searchUrl += '&f_JT=I'; // LinkedIn filter for Job Type: Internship
    } else if (jobType.toLowerCase() === 'full-time') {
      searchUrl += '&f_JT=F'; // LinkedIn filter for Job Type: Full-time
    }
    // Add more job type filters as needed
    console.log(`Job Scraper: Constructed search URL: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    let scrapedJobs = [];
    let currentPage = 0;
    const maxJobsPerPage = 25; // LinkedIn typically shows around 25 jobs per page
    let pagesToScrape = Math.max(2, Math.ceil(numJobs / maxJobsPerPage)); // Start with a minimum of 2 pages

    // Helper function to get job description from individual job page
    const getJobDescription = async (jobPage, jobLink) => {
      if (!jobLink || jobLink === 'N/A') return 'N/A';
      try {
        await jobPage.goto(jobLink, { waitUntil: 'networkidle2', timeout: 30000 });
        const description = await jobPage.evaluate(() => {
          const descriptionElement = document.querySelector('.jobs-description__content');
          return descriptionElement ? descriptionElement.innerText.trim() : 'N/A';
        });
        return description;
      } catch (descError) {
        console.error(`Error fetching description for ${jobLink}:`, descError.message);
        return 'N/A';
      }
    };

    let allScrapedJobs = []; // Store all jobs before filtering
    while (allScrapedJobs.length < numJobs * 5 && currentPage < pagesToScrape) { // Scrape more initially to allow for filtering
      const previousJobCount = allScrapedJobs.length;

      // Scroll down to load more jobs
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await new Promise(r => setTimeout(r, 2000)); // Wait for new jobs to load

      // Check for and click "Load more results" button if it exists
      // Using a more robust selector and waiting for it to be clickable
      const loadMoreButtonSelector = '.infinite-scroller__show-more-button, button[aria-label="Load more results"]';
      const loadMoreButton = await page.$(loadMoreButtonSelector);

      if (loadMoreButton) {
        try {
          console.log('Attempting to click "Load more results" button.');
          await page.waitForSelector(loadMoreButtonSelector, { visible: true, timeout: 5000 });
          await page.click(loadMoreButtonSelector);
          await new Promise(r => setTimeout(r, 2000)); // Wait for new jobs to load after clicking
        } catch (clickError) {
          console.warn(`Could not click "Load more results" button: ${clickError.message}. Continuing with scroll.`);
          // Fallback to just scrolling if button click fails
          await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
          });
          await new Promise(r => setTimeout(r, 2000)); // Wait for new jobs to load
        }
      }

      const jobsOnPage = await page.evaluate(() => {
        const jobCards = Array.from(document.querySelectorAll('.jobs-search__results-list li')); // More general selector for job listings
        return jobCards.map(card => {
          const titleElement = card.querySelector('h3.base-search-card__title, .base-card__title');
          const companyElement = card.querySelector('h4.base-search-card__subtitle, .base-card__subtitle');
          const locationElement = card.querySelector('span.job-search-card__location, .job-card-container__metadata-item');
          const linkElement = card.querySelector('a.base-card__full-link, .base-card__full-link');

          return {
            title: titleElement ? titleElement.innerText.trim() : 'N/A',
            company: companyElement ? companyElement.innerText.trim() : 'N/A',
            location: locationElement ? locationElement.innerText.trim() : 'N/A',
            description: 'N/A', // Will be populated later
            link: linkElement ? linkElement.href : 'N/A',
            applicationLink: linkElement ? linkElement.href : 'N/A',
            requiresResumeUpload: true,
          };
        });
      });

      // Filter out duplicate jobs
      const newJobs = jobsOnPage.filter(job => !allScrapedJobs.some(existingJob => existingJob.link === job.link));
      allScrapedJobs = allScrapedJobs.concat(newJobs);
      console.log(`Scraped ${newJobs.length} new jobs from page ${currentPage + 1}. Total: ${allScrapedJobs.length}`);

      currentPage++;

      // If no new jobs were found on this "page" and we've scraped at least 2 pages,
      // increase the pagesToScrape to try and find more jobs.
      if (allScrapedJobs.length === previousJobCount && currentPage >= 2) {
        console.log('No new jobs found on this page. Increasing page count to find more jobs.');
        pagesToScrape++; // Increase page count to continue scraping
        if (pagesToScrape > 10) { // Set a reasonable upper limit to prevent infinite loops
          console.log('Reached maximum page increase limit. Stopping scraping.');
          break;
        }
      }
    }

    // Now, iterate through allScrapedJobs to get descriptions and filter by experience
    const jobDescriptionPage = await browser.newPage();
    await jobDescriptionPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await jobDescriptionPage.setViewport({ width: 1280, height: 800 });

    const filteredJobs = [];
    const userExperience = additionalQuestions && additionalQuestions.experienceInYears !== undefined ? additionalQuestions.experienceInYears : 0;

    for (const job of allScrapedJobs) {
      if (filteredJobs.length >= numJobs) break; // Stop if we have enough jobs

      console.log(`Fetching description for: ${job.title} at ${job.company}`);
      job.description = await getJobDescription(jobDescriptionPage, job.link);

      // Simple experience filtering logic
      let meetsExperience = true;
      if (job.description !== 'N/A') {
        const descriptionLower = job.description.toLowerCase();
        const experienceMatch = descriptionLower.match(/(\d+)\+\s*years?\s*experience/);
        const minExperienceRequired = experienceMatch ? parseInt(experienceMatch[1], 10) : 0;

        // If "entry-level" or "internship" is mentioned and user has low experience
        if ((descriptionLower.includes('entry-level') || descriptionLower.includes('internship')) && userExperience <= 1) {
          meetsExperience = true; // Suitable for freshers/interns
        } else if (minExperienceRequired > 0) {
          meetsExperience = userExperience >= minExperienceRequired;
        } else if (userExperience === 0 && !descriptionLower.includes('entry-level') && !descriptionLower.includes('internship')) {
          // If user is a fresher and job doesn't explicitly mention entry-level/internship, assume it's not for freshers
          meetsExperience = false;
        }
      }

      if (meetsExperience) {
        filteredJobs.push(job);
      }
    }

    // Filter jobs to the requested number
    const finalJobs = filteredJobs.slice(0, numJobs);
    console.log(`Job Scraper: Finished scraping. Found ${finalJobs.length} jobs.`);
    return finalJobs;

  } catch (error) {
    console.error(`Error during job scraping for user ${userId}:`, error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
