const puppeteer = require('puppeteer');
const User = require('../models/User'); // Assuming User model is in ../models/User.js

exports.scrapeJobs = async (userId, jobType, numJobs) => {
  console.log(`Job Scraper: Starting to scrape ${numJobs} ${jobType} jobs for user ${userId}`);

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found.');
      return [];
    }

    const { resumeData, domainInterests } = user;
    const skills = resumeData && resumeData.skills ? resumeData.skills.join(', ') : '';
    const experience = resumeData && resumeData.experience && resumeData.experience.length > 0 ? resumeData.experience[0].title : ''; // Use first experience title as a keyword
    const keywords = `${skills} ${experience} ${domainInterests ? domainInterests.join(', ') : ''} ${jobType}`.trim();

    if (!keywords) {
      console.log('No relevant keywords found for scraping.');
      return [];
    }

    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords)}`; // LinkedIn search URL

    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    let scrapedJobs = [];
    let currentPage = 0;
    const maxJobsPerPage = 25; // LinkedIn typically shows around 25 jobs per page
    const maxPages = Math.ceil(numJobs / maxJobsPerPage);

    while (scrapedJobs.length < numJobs && currentPage < maxPages) {
      // Scroll down to load more jobs
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await new Promise(r => setTimeout(r, 2000)); // Wait for new jobs to load

      const jobsOnPage = await page.evaluate(() => {
        const jobCards = Array.from(document.querySelectorAll('.job-search-card'));
        return jobCards.map(card => {
          const titleElement = card.querySelector('h3.base-search-card__title');
          const companyElement = card.querySelector('h4.base-search-card__subtitle a');
          const locationElement = card.querySelector('span.job-search-card__location');
          const linkElement = card.querySelector('a.base-card__full-link');

          return {
            title: titleElement ? titleElement.innerText.trim() : 'N/A',
            company: companyElement ? companyElement.innerText.trim() : 'N/A',
            location: locationElement ? locationElement.innerText.trim() : 'N/A',
            description: 'N/A', // LinkedIn job description requires navigating to individual job page
            link: linkElement ? linkElement.href : 'N/A',
            applicationLink: linkElement ? linkElement.href : 'N/A',
            requiresResumeUpload: true,
          };
        });
      });

      scrapedJobs = scrapedJobs.concat(jobsOnPage);
      console.log(`Scraped ${jobsOnPage.length} jobs from page ${currentPage + 1}. Total: ${scrapedJobs.length}`);

      // LinkedIn loads more jobs on scroll, so we simulate scrolling
      // If we need to go to the next "page" (which is more like loading more results),
      // we'll rely on the scroll and the loop condition.
      currentPage++;
    }

    // Filter jobs to the requested number
    const finalJobs = scrapedJobs.slice(0, numJobs);
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
