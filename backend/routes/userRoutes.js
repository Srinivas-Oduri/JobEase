const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth'); // We will create this middleware next
const multer = require('multer'); // For file uploads

// Set up multer for resume file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/resumes/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + '-' + Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// @route   POST api/users/register
// @desc    Register user
// @access  Public
router.post('/register', userController.registerUser);

// @route   POST api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', userController.loginUser);

// @route   GET api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, userController.getUserProfile);

// @route   PUT api/users/profile
// @desc    Update user profile (additional questions, domain interests)
// @access  Private
router.put('/profile', auth, userController.updateUserProfile);


// @route   POST api/users/upload-resume
// @desc    Upload resume file
// @access  Private
router.post('/upload-resume', auth, upload.single('resume'), userController.uploadResumeFile);

module.exports = router;
