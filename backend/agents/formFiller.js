const puppeteer = require('puppeteer');
const User = require('../models/User'); // Assuming User model is in ../models/User.js

exports.fillApplicationForm = async (userId, applicationLink, jobData) => {
  console.log(`Form Filler: Navigating to ${applicationLink} to fill application for ${jobData.title} for user ${userId}`);

  let browser;
  const issues = [];
  let success = true;
  const filledFields = {};

  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(applicationLink, { waitUntil: 'networkidle2' });

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found.');
      return { success: false, issues: ['User not found.'] };
    }

    const { username, email, additionalQuestions, resumeData } = user;

    // Helper function to find and type into a field
    const typeIntoField = async (selector, value) => {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.type(value);
          return true;
        }
      } catch (e) {
        // console.warn(`Could not type into ${selector}: ${e.message}`);
      }
      return false;
    };

    // Helper function to find an element by its text content (for labels)
    const findElementByText = async (text, tagName = '*') => {
      return page.evaluateHandle((text, tagName) => {
        const elements = Array.from(document.querySelectorAll(tagName));
        for (const el of elements) {
          if (el.innerText.includes(text)) {
            return el;
          }
        }
        return null;
      }, text, tagName);
    };

    // --- Fill basic contact information ---
    // Name
    if (username) {
      if (await typeIntoField('input[name*="name"]', username) ||
          await typeIntoField('input[id*="name"]', username) ||
          await typeIntoField('input[placeholder*="Name"]', username)) {
        filledFields.name = username;
      } else {
        issues.push('Could not fill name field.');
      }
    }

    // Email
    if (email) {
      if (await typeIntoField('input[name*="email"]', email) ||
          await typeIntoField('input[id*="email"]', email) ||
          await typeIntoField('input[placeholder*="Email"]', email)) {
        filledFields.email = email;
      } else {
        issues.push('Could not fill email field.');
      }
    }

    // --- Fill additional questions from user profile ---
    if (additionalQuestions) {
      for (const [question, answer] of Object.entries(additionalQuestions)) {
        let filled = false;

        // Try to find input fields by placeholder, name, or id
        const lowerCaseQuestion = question.toLowerCase();
        const directSelector = `input[placeholder*="${question}"]` +
                               `,input[name*="${lowerCaseQuestion.replace(/\s/g, '')}"]` +
                               `,input[id*="${lowerCaseQuestion.replace(/\s/g, '')}"]` +
                               `,textarea[placeholder*="${question}"]` +
                               `,textarea[name*="${lowerCaseQuestion.replace(/\s/g, '')}"]` +
                               `,textarea[id*="${lowerCaseQuestion.replace(/\s/g, '')}"]`;

        filled = await typeIntoField(directSelector, answer);

        if (!filled) {
          // Try to find by label text
          const labelElementHandle = await findElementByText(question, 'label');
          if (labelElementHandle && labelElementHandle.asElement()) {
            const labelElement = labelElementHandle.asElement();
            const inputId = await labelElement.evaluate(el => el.getAttribute('for'));
            if (inputId) {
              const inputSelector = `#${inputId}`;
              filled = await typeIntoField(inputSelector, answer);
            } else {
              // If label has no 'for' attribute, try to find a sibling input/textarea
              const siblingInput = await labelElement.$('+ input, + textarea');
              if (siblingInput) {
                await siblingInput.type(answer);
                filled = true;
              }
            }
          }
        }

        if (filled) {
          filledFields[question] = answer;
        } else {
          issues.push(`Could not fill question: "${question}"`);
        }
      }
    }

    // --- Fill resume data (skills, experience, education) into relevant text areas ---
    if (resumeData) {
      const resumeText = `Skills: ${resumeData.skills ? resumeData.skills.join(', ') : ''}\n` +
                         `Experience: ${resumeData.experience ? resumeData.experience.map(exp => `${exp.title} at ${exp.company} (${exp.duration}) - ${exp.description}`).join('\n') : ''}\n` +
                         `Education: ${resumeData.education ? resumeData.education.map(edu => `${edu.degree} from ${edu.institution} (${edu.year})`).join('\n') : ''}`;

      // Try to find a general "About Me", "Cover Letter", or "Experience" textarea
      const generalTextAreaSelector = 'textarea[name*="about"]' +
                                      ',textarea[id*="about"]' +
                                      ',textarea[placeholder*="About"]' +
                                      ',textarea[name*="coverletter"]' +
                                      ',textarea[id*="coverletter"]' +
                                      ',textarea[placeholder*="Cover Letter"]' +
                                      ',textarea[name*="experience"]' +
                                      ',textarea[id*="experience"]' +
                                      ',textarea[placeholder*="Experience"]';

      const filledResumeData = await typeIntoField(generalTextAreaSelector, resumeText);
      if (filledResumeData) {
        filledFields.resumeData = 'Filled into general text area.';
      } else {
        issues.push('Could not find a general text area to input resume data.');
      }
    }

    // TODO: Implement logic for dropdowns, radio buttons, checkboxes, and AI-driven element recognition
    // This will require more advanced Puppeteer interactions and potentially LLM calls for dynamic questions.

    console.log('Form filling complete.');

    return { success: issues.length === 0, filledFields, issues };

  } catch (error) {
    console.error(`Error filling application form for user ${userId}:`, error);
    return { success: false, issues: [`Error filling form: ${error.message}`] };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
