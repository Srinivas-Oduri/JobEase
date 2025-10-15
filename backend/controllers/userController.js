const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parseResumePdf } = require('../utils/resumeParser'); // Import the resume parser

// User Registration
exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    console.log(`Attempting to register user with email: ${email}`);
    let user = await User.findOne({ email });
    if (user) {
      console.log(`User with email ${email} already exists.`);
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      username,
      email,
      password,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    console.log('User object before saving:', user);
    try {
      await user.save();
      console.log('User saved successfully:', user);
    } catch (saveErr) {
      console.error('Error saving user:', saveErr.message);
      return res.status(500).send('Error saving user');
    }

    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// User Login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update User Profile (additional questions, domain interests)
exports.updateUserProfile = async (req, res) => {
  const { additionalQuestions } = req.body; // additionalQuestions is already a plain object from frontend

  const userFields = {};
  if (additionalQuestions) {
    // Mongoose can often handle direct assignment of plain objects to Map types
    // when using findByIdAndUpdate with $set, or when saving the document.
    // The previous error was due to explicitly converting to Map *before* Mongoose's internal handling.
    userFields.additionalQuestions = additionalQuestions;
  }

  try {
    console.log('Received update profile request. User ID:', req.user.id);
    console.log('Request body:', req.body);
    console.log('User fields to update:', userFields);

    let user = await User.findById(req.user.id);
    if (!user) {
      console.error('User not found for ID:', req.user.id);
      return res.status(404).json({ msg: 'User not found' });
    }

    // Use findByIdAndUpdate with $set for partial updates
    // Mongoose should handle the conversion of the plain object to a Map internally.
    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: userFields },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error('Error in updateUserProfile:', err.message);
    // Log the full error stack for more details
    console.error(err.stack);
    res.status(500).send('Server error');
  }
};

// Upload Resume File (requires multer)
exports.uploadResumeFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.resumeFile = req.file.path; // Store the path to the uploaded file

    // Parse the resume and store the data
    const parsedData = await parseResumePdf(req.file.path);
    if (parsedData) {
      user.resumeData = parsedData;
    } else {
      console.warn('Resume parsing failed or returned no data.');
    }

    await user.save();

    res.json({ msg: 'Resume uploaded and parsed successfully', filePath: req.file.path, resumeData: parsedData });
  } catch (err) {
    console.error('Error in uploadResumeFile:', err.message);
    res.status(500).send('Server error');
  }
};
