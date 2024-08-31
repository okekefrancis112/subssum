// Import express module
import express from 'express';

// Import controllers and validations
import * as paystackWebhookControllers from '../../controllers/webhooks/paystack';
import * as flutterwaveWebhookControllers from '../../controllers/webhooks/flutterwave';

// Create router instance
const router = express.Router();

// Routes for Webhooks

// POST route to create paystack webhook
router.post('/paystack', paystackWebhookControllers.paystackWebhook);

// POST route to create flutter webhook
router.post('/flutterwave', flutterwaveWebhookControllers.flutterwaveWebhook);

// Export router
export default router;
