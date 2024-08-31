// Import express module
import express from 'express';

import * as homeControllers from '../../controllers/home/numbers_story.controller';


// Create router instance
const router = express.Router();

// Routes for Home
// POST route to create a Number Story
router.post('/', homeControllers.createNumberStory);


// Export router
export default router;
