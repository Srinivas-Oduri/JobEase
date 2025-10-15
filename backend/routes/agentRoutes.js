const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const agentController = require('../controllers/agentController'); // We will create this controller next

// @route   POST api/agents/start-application
// @desc    Trigger the multi-agent system to start job application process
// @access  Private
router.post('/start-application', auth, agentController.startApplicationProcess);

module.exports = router;
