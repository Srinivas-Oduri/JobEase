require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose'); // Import mongoose
const { fillApplicationForm } = require('./agents/formFiller');

const testFormFiller = async () => {
  // IMPORTANT: Replace '68f6dee96245caaae110e42c' with a valid MongoDB ObjectId for a user in your database.
  // This userId will be used to fetch resumeData and additionalQuestions.
  const userId = '68f6dee96245caaae110e42c';
  // const applicationLink = 'https://www.linkedin.com/jobs/view/backend-software-engineer-ml-python-at-bayside-solutions-4308291658/?refId=aBDknONy1H7oN6LaxPy6eg%3D%3D&trackingId=PnVRz5iqgahMt5Xdpm5wyQ%3D%3D';
  // const applicationLink='https://www.linkedin.com/jobs/view/4316331325/?alternateChannel=search&eBP=BUDGET_EXHAUSTED_JOB&refId=VK3Iae6SAon27nABv1q7tQ%3D%3D&trackingId=LGKzGATmn4sddi1VCpKXDQ%3D%3D';
  const applicationLink='https://www.linkedin.com/jobs/view/full-stack-ai-ml-engineer-at-edify-technologies-4312296568?position=5&pageNum=0&refId=XWl6W7JV%2FgN0e9V3rOxM3A%3D%3D&trackingId=d2aoR6Ree%2BFAbN0dr1Xu9Q%3D%3D'
  const jobData = {
    title: 'Backend Software Engineer',
    company: 'Bayside Solutions',
    location: 'United States',
  };

  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully for testing.');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return; // Exit if DB connection fails
  }

  console.log('Starting form filler test...');
  // The fillApplicationForm function now fetches user data from MongoDB using userId
  const result = await fillApplicationForm(userId, applicationLink, jobData);
  console.log('Form filler test completed. Result:', result);

  if (!result.success) {
    console.error('Form filling failed with issues:', result.issues);
  }

  // Disconnect from MongoDB after test
  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
};

testFormFiller();

