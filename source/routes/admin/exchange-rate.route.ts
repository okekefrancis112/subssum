// Import express module
import express from 'express';

// Import controllers and validations
import * as exchangeRateControllers from '../../controllers/admin/exchange-rate.controller';
import * as exchangeRateValidations from '../../validations/admin/exchange-rate.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';

// Create router instance
const router = express.Router();

// Routes for Exchange Rate

// POST route to create exchange rate
router.post(
  '/create-new',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-exchange-rate'), // permission middleware
  exchangeRateValidations.validateNewCreateExchangeRate, // validation middleware
  exchangeRateControllers.createNewExchangeRate // controller to handle the request
);

// GET route to get single exchange rate
router.get(
  '/get/:exchange_rate_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-exchange-rates'), // permission middleware
  exchangeRateValidations.validateExchangeRateId, // validation middleware
  exchangeRateControllers.getSingleExchangeRate // controller to handle the request
);

// GET route to get all exchange rates
router.get(
  '/get',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-exchange-rates'), // permission middleware
  exchangeRateControllers.getExchangeRates // controller to handle the request
);

// PUT route to edit exchange rate
router.put(
  '/new-update/:exchange_rate_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-exchange-rate'), // permission middleware
  exchangeRateValidations.validateExchangeRateId, // validation middleware
  exchangeRateControllers.updateNewExchangeRate // controller to handle the request
);

// PUT route to create default exchange rate
router.put(
  '/default/:exchange_rate_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-exchange-rate'), // permission middleware
  exchangeRateValidations.validateExchangeRateId, // validation middleware
  exchangeRateControllers.setDefaultExchangeRate // controller to handle the request
);

// DELETE route to delete exchange rate
router.delete(
  '/delete/:exchange_rate_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-exchange-rate'), // permission middleware
  exchangeRateValidations.validateExchangeRateId, // validation middleware
  exchangeRateControllers.deleteExchangeRate // controller to handle the request
);

// GET route to export new exchange rates
router.get(
  '/export-new',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-exchange-rates'), // permission middleware
  exchangeRateControllers.exportNewExchangeRate // controller to handle the request
);

// Export router
export default router;
