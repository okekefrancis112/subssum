// Import express module
import express from 'express';

// Import controllers and validations
import * as cardControllers from '../../controllers/user/card.controller';
import auth from '../../middlewares/auth.middleware';
import { validateAddCard, validateCardId } from '../../validations/user/card.validation';

// Create router instance
const router = express.Router();

// Routes for Card

// POST route to create a card
router.post('/add-card', auth.auth, validateAddCard, cardControllers.addCard);

// DELETE route to delete a card
router.delete('/delete-card/:card_id', auth.auth, validateCardId, cardControllers.deleteCard);

// POST route to assign a default card
router.post('/assign-default/:card_id', auth.auth, validateCardId, cardControllers.assignDefault);

// GET route to get all cards
router.get('/get', auth.auth, cardControllers.getCards);

// GET route to get default card
router.get('/get-default', auth.auth, cardControllers.getDefaultCard);

// Export router
export default router;
