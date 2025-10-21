require('dotenv').config({ path: './backend/.env' });
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const User = require('../models/User'); // Assuming User model is in ../models/User.js
const JobApplication = require('../models/JobApplication'); // Import JobApplication model
const geminiClient = require('./geminiClient'); // Assuming geminiClient is in the same directory

// Explicitly set the path to ChromeDriver service
const chromeService = new chrome.ServiceBuilder('d:\\AutoApply\\backend\\chromedriver-win64\\chromedriver-win64\\chromedriver.exe');

// Helper function to simulate human-like typing with delays
const typeWithDelay = async (element, text, minDelay = 50, maxDelay = 150) => {
  for (const char of text) {
    await element.sendKeys(char);
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
};

exports.fillApplicationForm = async (userId, applicationLink, jobData) => { // Removed userData argument
  console.log(`Form Filler: Starting application process for ${jobData.title} for user ${userId}`);

  let driver;
  const issues = [];
  let success = true;
  const filledFields = {};
  const model = geminiClient.getModel(); // Initialize Gemini model once at the beginning

  try {
    console.log('Form Filler: Attempting to initialize Selenium WebDriver...');
    // Initialize Selenium WebDriver
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(new chrome.Options().addArguments('--start-maximized')) // Start maximized for better visibility
      .setChromeService(chromeService) // Pass the service builder directly
      .build();
    console.log('Form Filler: Selenium WebDriver initialized using explicit ChromeDriver path. Browser should be visible.');
    // Note: As of Selenium 4, headless mode is controlled by the 'headless' option in ChromeOptions.
    // To run in non-headless mode, simply do not add the '--headless' argument.
    // The previous attempt `headless(false)` was incorrect syntax.

    // Fetch user data from MongoDB
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found.');
      return { success: false, issues: ['User not found.'] };
    }
    const { username, email, additionalQuestions, resumeData } = user;

    // --- Step 1: Navigate to linkedin.com and log in ---
    console.log('Attempting to navigate to linkedin.com for login...');
    await driver.get('https://www.linkedin.com/login', 30000); // Increased timeout to 30 seconds

    // Wait for the login form to appear
    await driver.wait(until.elementLocated(By.id('username')), 20000); // Increased timeout to 20 seconds

    const linkedinEmail = process.env.LINKEDIN_EMAIL;
    const linkedinPassword = process.env.LINKEDIN_PASSWORD;

    if (!linkedinEmail || !linkedinPassword) {
      issues.push('LINKEDIN_EMAIL or LINKEDIN_PASSWORD not found in .env');
      success = false;
      return { success, issues };
    }

    // Fill email or phone with human-like delay
    const emailField = await driver.findElement(By.id('username'));
    await typeWithDelay(emailField, linkedinEmail);
    filledFields.email = linkedinEmail;
    console.log('Filled email field with human-like delay.');

    // Fill password with human-like delay
    const passwordField = await driver.findElement(By.id('password'));
    await typeWithDelay(passwordField, linkedinPassword);
    filledFields.password = linkedinPassword;
    console.log('Filled password field with human-like delay.');

    // Click submit
    const submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));
    await submitButton.click();
    console.log('Clicked submit button.');

    // Wait for navigation after login (e.g., wait for a specific element on the dashboard or job page)
    await driver.wait(until.urlContains('linkedin.com/feed'), 15000); // Wait for feed page after login
    console.log('Login successful on linkedin.com.');

    // --- Step 2: Navigate to the job application link after successful login ---
    console.log(`Navigating to job application link: ${applicationLink}`);
    await driver.get(applicationLink);

    // At this point, the user is logged in and on the job page.
    console.log('Successfully navigated to the job URL after login.');

    // Find and click the "Easy Apply" button
    console.log('Attempting to find and click "Easy Apply" button...');
    const easyApplyButton = await driver.wait(until.elementLocated(By.id('jobs-apply-button-id')), 15000); // Increased timeout for element location
    // Use JavaScript to click the button to bypass potential interception
    await driver.executeScript("arguments[0].click();", easyApplyButton);
    console.log('Clicked "Easy Apply" button.');

    // --- Step 3: Fill the Easy Apply form pages ---
    let currentPage = 1;
    let reviewButtonFound = false;
    let previousQuestionsText = []; // Define questions outside the loop

    while (true) { // Loop indefinitely until a submit button is found or an error occurs
      console.log(`Processing Easy Apply form page ${currentPage}...`);

      // Wait for the Easy Apply modal container to appear
      await driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'jobs-easy-apply-modal') and @data-test-modal]")), 15000);
      let easyApplyForm = await driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'jobs-easy-apply-modal__content')]//form")), 15000);

      // Detect questions within the form
      const currentQuestionElements = await easyApplyForm.findElements(By.xpath(".//label | .//h3 | .//span[contains(@class, 't-bold')]"));
      const currentQuestionsText = [];
      for (const element of currentQuestionElements) {
        const text = await element.getText();
        if (text.trim().length > 0 && text.trim().length < 200) {
          currentQuestionsText.push(text.trim());
        }
      }
      console.log('Detected questions in Easy Apply form:', currentQuestionsText);

      let inputElements = await easyApplyForm.findElements(By.xpath(".//input[@type='text' or @type='email' or @type='tel' or @type='radio' or @type='checkbox'] | .//textarea | .//select"));

      for (let i = 0; i < inputElements.length; i++) {
        let associatedInput = inputElements[i];
        const tagName = await associatedInput.getTagName();
        const inputType = await associatedInput.getAttribute('type');
        const inputId = await associatedInput.getAttribute('id');
        
        // Attempt to find the label associated with the input
        let questionText = '';
        try {
          const questionLabelElement = await easyApplyForm.findElement(By.xpath(`.//label[@for='${inputId}']`));
          questionText = await questionLabelElement.getText();
        } catch (e) {
          // If no direct label, try to infer from nearby h3/span
          const nearbyTextElements = await associatedInput.findElements(By.xpath("./preceding-sibling::h3 | ./preceding-sibling::span[contains(@class, 't-bold')]"));
          if (nearbyTextElements.length > 0) {
            questionText = await nearbyTextElements[nearbyTextElements.length - 1].getText();
          }
        }

        let currentValue = '';
        if (tagName === 'select') {
          const selectedOption = await associatedInput.findElement(By.css('option:checked'));
          currentValue = await selectedOption.getText();
        } else if (inputType === 'radio' || inputType === 'checkbox') {
          currentValue = await associatedInput.isSelected(); // Returns boolean
        } else {
          currentValue = await associatedInput.getAttribute('value');
        }

        // Only fill if empty, not selected, or if it's a select element with a placeholder value
        const isPlaceholderSelect = (tagName === 'select' && (currentValue.toLowerCase().includes('select an option') || currentValue.toLowerCase().includes('please select')));
        if (!currentValue || (typeof currentValue === 'string' && currentValue.trim() === '') || (typeof currentValue === 'boolean' && !currentValue) || isPlaceholderSelect) {
          let answer = '';

          // Try to answer from user profile data
          if (questionText.toLowerCase().includes('email')) {
            answer = email;
          } else if (questionText.toLowerCase().includes('phone') || questionText.toLowerCase().includes('mobile')) {
            answer = user.phoneNumber || '123-456-7890'; // Use user's phone number if available, else placeholder
          } else if (additionalQuestions && additionalQuestions[questionText]) {
            answer = additionalQuestions[questionText];
          } else { // Use Gemini if no direct answer found
            let prompt = ``;
            let personaInstruction = ``;
            if (!resumeData || Object.keys(resumeData).length === 0) {
              personaInstruction = `You are a B.Tech 4th year student (fresher).`;
            }

            prompt = `${personaInstruction} Answer the following question based on the provided context. If the information is not explicitly available in the resume data, infer a concise and reasonable answer consistent with the persona. Your answer must be direct and concise, containing only the answer itself, without any introductory phrases or explanations about the resume data. For example, if asked about remote work and not specified, answer "No" or "Yes", not "The resume does not specify...". Prioritize providing a valid and expected answer for a fresher. If the question is about remote work and not specified in the resume, default to "No". If the question is about a location, provide a city and state, or "Remote" if applicable. If the question is about a specific skill or technology, and not found in the resume, provide a relevant skill or technology that a B.Tech 4th year student would typically possess.`;
            if (resumeData && Object.keys(resumeData).length > 0) {
              prompt += ` Here is the resume data: ${JSON.stringify(resumeData)}.`;
            }
            prompt += ` The question is: "${questionText}".`;

            // Add general instructions for numeric inputs
            if (questionText.toLowerCase().includes('years of experience') || questionText.toLowerCase().includes('cctc in lakhs') || questionText.toLowerCase().includes('salary')) {
              prompt += ` If the question asks for a numerical value, provide a concise whole number (e.g., "2" or "10"). The answer must be greater than or equal to 0. If the information is not explicitly mentioned or is 0, use "0" as a minimum valid response.`;
            } else {
              prompt += ` Provide a concise answer.`;
            }
            try {
              const result = await model.generateContent(prompt);
              if (result && result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                answer = result.candidates[0].content.parts[0].text;
              } else if (result && typeof result.text === 'function') { // Try result.text() if direct access fails
                answer = result.text();
              }
              
              if (!answer) {
                console.warn('Gemini API response or text content is undefined:', result);
                issues.push(`Gemini API failed to generate text for question: "${questionText}"`);
              }
            } catch (geminiError) {
              console.error('Error calling Gemini API:', geminiError);
              issues.push(`Error calling Gemini API for question "${questionText}": ${geminiError.message}`);
            }
          }

          if (answer) {
            if (tagName === 'select') {
              const options = await associatedInput.findElements(By.tagName('option'));
              const optionTexts = [];
              for (const option of options) {
                const text = await option.getText();
                if (text.trim() !== '') {
                  optionTexts.push(text.trim());
                }
              }

              if (optionTexts.length > 0) {
                let selectPrompt = ``;
                let personaInstruction = ``;
                if (!resumeData || Object.keys(resumeData).length === 0) {
                  personaInstruction = `You are a B.Tech 4th year student (fresher).`;
                }
                selectPrompt = `${personaInstruction} Given the question: "${questionText}" and the available options: ${JSON.stringify(optionTexts)}. Please choose the single best option from the provided list. If the answer is not explicitly available in the resume data, infer a reasonable choice consistent with the persona. Your answer must be direct and concise, containing only the chosen option's exact text, without any introductory phrases or explanations about the resume data. Prioritize providing a valid and expected answer for a fresher. If the question is about remote work and not specified in the resume, default to "No".`;
                let selectedOptionText = '';
                try {
                  const result = await model.generateContent(selectPrompt);
                  if (result && result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                    selectedOptionText = result.candidates[0].content.parts[0].text.trim();
                  } else if (result && typeof result.text === 'function') {
                    selectedOptionText = result.text().trim();
                  }
                  
                  if (selectedOptionText) {
                    console.log(`Attempting to select option "${selectedOptionText}" for question "${questionText}"`);
                    let optionFound = false;

                    // Try to select by value first, if available and matches
                    try {
                      const optionByValue = await associatedInput.findElement(By.xpath(`./option[normalize-space(.)='${selectedOptionText}']`));
                      await driver.executeScript("arguments[0].value = arguments[1];", associatedInput, await optionByValue.getAttribute('value'));
                      await driver.executeScript("arguments[0].dispatchEvent(new Event('change'));", associatedInput); // Trigger change event
                      optionFound = true;
                      console.log(`Selected option by value: "${selectedOptionText}"`);
                    } catch (e) {
                      console.log(`Could not select option by value for "${selectedOptionText}". Trying click-based approach. Error: ${e.message}`);
                    }

                    if (!optionFound) {
                      // If selecting by value fails, try the click-based approach
                      await associatedInput.click(); // Click the select element to open the dropdown
                      await driver.sleep(1000); // Short sleep for options to render

                      // Try LinkedIn-specific XPath for clickable elements
                      const linkedInOptionXPath = `//div[contains(@class, 'jobs-easy-apply-modal') and @data-test-modal]//*[contains(@class, 'artdeco-typeahead-result__content') or contains(@class, 'artdeco-list__item')]//span[normalize-space(text())='${selectedOptionText}']/ancestor::div[contains(@class, 'artdeco-list__item')] | //div[contains(@class, 'jobs-easy-apply-modal') and @data-test-modal]//*[contains(@class, 'artdeco-typeahead-result__content') or contains(@class, 'artdeco-list__item')][normalize-space(text())='${selectedOptionText}'] | //div[contains(@class, 'jobs-easy-apply-modal') and @data-test-modal]//*[self::div or self::span or self::li][normalize-space(text())='${selectedOptionText}']`;
                      
                      try {
                        const elementsToClick = await driver.wait(until.elementsLocated(By.xpath(linkedInOptionXPath)), 5000);
                        for (const element of elementsToClick) {
                          const isDisplayed = await element.isDisplayed();
                          if (isDisplayed) {
                            await driver.executeScript("arguments[0].click();", element); // Use JavaScript click for robustness
                            optionFound = true;
                            console.log(`Clicked LinkedIn-specific option: "${selectedOptionText}"`);
                            break;
                          }
                        }
                      } catch (e) {
                        console.log(`Could not find or click option using LinkedIn-specific XPath: ${selectedOptionText}. Error: ${e.message}`);
                      }
                    }

                    if (!optionFound) {
                      // Fallback to original method if custom element not found or not clickable
                      for (const option of options) {
                        const optionText = await option.getText();
                        if (optionText.trim() === selectedOptionText) {
                          await driver.executeScript("arguments[0].click();", option); // Use JavaScript click for robustness
                          optionFound = true;
                          console.log(`Clicked standard option: "${selectedOptionText}"`);
                          break;
                        }
                      }
                    }

                    if (optionFound) {
                      answer = selectedOptionText; // Update answer to the selected text
                    } else {
                      issues.push(`Gemini chose "${selectedOptionText}" for question "${questionText}", but it was not found in the options or could not be clicked.`);
                      console.error(`Failed to select option "${selectedOptionText}" for question "${questionText}".`);
                    }
                  } else {
                    issues.push(`Gemini failed to select an option for question: "${questionText}"`);
                    console.error(`Gemini failed to provide a selected option text for question: "${questionText}"`);
                  }
                } catch (geminiError) {
                  console.error('Error calling Gemini API for select:', geminiError);
                  issues.push(`Error calling Gemini API for select question "${questionText}": ${geminiError.message}`);
                }
              } else {
                issues.push(`No options found for select question: "${questionText}"`);
              }
            } else if (inputType === 'radio' || inputType === 'checkbox') {
              if (answer === true || answer.toLowerCase() === 'yes') { // Assuming answer is boolean or 'yes'
                try {
                  // Try to click the associated label instead of the input directly
                  const labelElement = await easyApplyForm.findElement(By.xpath(`.//label[@for='${inputId}']`));
                  await driver.executeScript("arguments[0].click();", labelElement);
                  console.log(`Clicked label for radio/checkbox with ID "${inputId}" for question "${questionText}"`);
                } catch (labelError) {
                  console.warn(`Could not find or click label for radio/checkbox with ID "${inputId}". Falling back to direct input click. Error: ${labelError.message}`);
                  // Fallback to direct input click if label click fails
                  await driver.executeScript("arguments[0].click();", associatedInput);
                  console.log(`Clicked radio/checkbox input directly with ID "${inputId}" for question "${questionText}"`);
                }
              }
            } else {
              // Validate numeric answers for specific questions
              if ((questionText.toLowerCase().includes('how many years of work experience') || questionText.toLowerCase().includes('cctc in lakhs')) && !isNaN(parseInt(answer)) && parseInt(answer) >= 0) {
                await associatedInput.sendKeys(parseInt(answer).toString());
              } else if ((questionText.toLowerCase().includes('how many years of work experience') || questionText.toLowerCase().includes('cctc in lakhs')) && (isNaN(parseInt(answer)) || parseInt(answer) < 0)) {
                issues.push(`Gemini provided an invalid numeric answer for "${questionText}": "${answer}". Expected a whole number greater than or equal to 0.`);
                // Attempt to provide a default valid answer if Gemini fails
                const defaultValidAnswer = "0";
                await associatedInput.sendKeys(defaultValidAnswer);
                answer = defaultValidAnswer;
                console.log(`Filled "${questionText}" with default valid answer "${defaultValidAnswer}" due to invalid Gemini response.`);
              } else {
                await associatedInput.sendKeys(answer);
              }
            }
            filledFields[questionText] = answer;
            console.log(`Filled question "${questionText}" with "${answer}"`);
            
            // Re-locate easyApplyForm and inputElements after an interaction
            easyApplyForm = await driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'jobs-easy-apply-modal__content')]//form")), 15000);
            inputElements = await easyApplyForm.findElements(By.xpath(".//input[@type='text' or @type='email' or @type='tel' or @type='radio' or @type='checkbox'] | .//textarea | .//select"));
          } else {
            issues.push(`Could not answer question: "${questionText}"`);
          }
        } else {
          console.log(`Question "${questionText}" already filled with "${currentValue}". Skipping.`);
        }
      }

      // Update previousQuestionsText for the next iteration's comparison
      previousQuestionsText = currentQuestionsText;

      // Check for "Submit application" button first
      const submitButtons = await driver.findElements(By.xpath("//button[contains(., 'Submit application')]"));
      if (submitButtons.length > 0 && await submitButtons[0].isDisplayed()) {
        console.log('Found "Submit application" button. Clicking it directly.');
        await driver.executeScript("arguments[0].click();", submitButtons[0]);
        console.log('Clicked "Submit application" button. Application submitted!');
        reviewButtonFound = true; // Mark as submitted to exit the loop
        break;
      }

      // Check for "Review" button
      const reviewButtons = await driver.findElements(By.xpath("//button[contains(., 'Review')]"));
      if (reviewButtons.length > 0 && await reviewButtons[0].isDisplayed()) {
        reviewButtonFound = true;
        // Before clicking Review, wait for any intercepting elements to disappear
        try {
          const interceptingElement = await driver.findElement(By.id('ember103')); // Based on error message
          await driver.wait(until.stalenessOf(interceptingElement), 5000); // Wait for it to disappear
          console.log('Intercepting element #ember103 disappeared before review.');
        } catch (e) {
          console.log('No intercepting element #ember103 found or it disappeared quickly before review.');
        }
        await driver.executeScript("arguments[0].click();", reviewButtons[0]);
        console.log('Clicked "Review" button.');
        // After clicking Review, wait for the Submit button to appear
        // Before waiting for Submit, wait for any intercepting elements to disappear
        try {
          const interceptingElement = await driver.findElement(By.id('ember103')); // Based on previous error messages
          await driver.wait(until.stalenessOf(interceptingElement), 5000); // Wait for it to disappear
          console.log('Intercepting element #ember103 disappeared after review.');
        } catch (e) {
          console.log('No intercepting element #ember103 found or it disappeared quickly after review.');
        }
        await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'Submit application')]")), 20000); // Increased timeout
        const submitButtonReview = await driver.findElement(By.xpath("//button[contains(., 'Submit application')]"));
        await driver.wait(until.elementIsVisible(submitButtonReview), 5000); // Wait for visibility
        console.log('Submit button page loaded and visible after Review.');
        break; // Exit loop after review and submit button is visible
      } else {
        // Before clicking Next/Continue, wait for any intercepting elements to disappear
        try {
          const interceptingElement = await driver.findElement(By.id('ember103')); // Based on error message
          await driver.wait(until.stalenessOf(interceptingElement), 5000); // Wait for it to disappear
          console.log('Intercepting element #ember103 disappeared.');
        } catch (e) {
          console.log('No intercepting element #ember103 found or it disappeared quickly.');
        }

        // Click "Next" or equivalent button
        const nextButtons = await driver.findElements(By.xpath("//button[contains(., 'Next')] | //button[contains(., 'Continue')]"));
        if (nextButtons.length > 0 && await nextButtons[0].isDisplayed()) {
          // Use JavaScript click to bypass potential interception for Next/Continue buttons
          await driver.executeScript("arguments[0].click();", nextButtons[0]);
          console.log('Clicked "Next" button.');
          // Wait for the content to change
          await driver.wait(async () => {
            const newQuestionElements = await easyApplyForm.findElements(By.xpath(".//label | .//h3 | .//span[contains(@class, 't-bold')]"));
            const newQuestionsText = [];
            for (const element of newQuestionElements) {
              const text = await element.getText();
              if (text.trim().length > 0 && text.trim().length < 200) {
                newQuestionsText.push(text.trim());
              }
            }
            // Check if the questions list has changed, indicating a new page
            return newQuestionsText.length > 0 && JSON.stringify(newQuestionsText) !== JSON.stringify(previousQuestionsText);
          }, 15000, 'Timed out waiting for next form page to load.');
          console.log('Next form page loaded.');
          currentPage++;
        } else {
          issues.push('No "Next", "Review", or "Submit application" button found on the current form page.');
          success = false;
          break; // Exit loop if no navigation button is found
        }
      }
    }

    const applicationResult = new JobApplication({
      userId,
      applicationLink,
      jobData,
      filledFields,
      issues,
      success,
    });
    await applicationResult.save();
    console.log('Job application result saved to database.');

    return { success, filledFields, issues, detectedQuestions: previousQuestionsText }; // Return the last detected questions

  } catch (error) {
    console.error(`Error filling application form for user ${userId}:`, error);
    const applicationResult = new JobApplication({
      userId,
      applicationLink,
      jobData,
      filledFields, // Save any fields that might have been filled before the error
      issues: issues.concat([`Error filling form: ${error.message}`]),
      success: false,
    });
    await applicationResult.save();
    console.log('Job application result (with error) saved to database.');
    return { success: false, issues: [`Error filling form: ${error.message}`] };
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
};
