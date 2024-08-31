// Import express module
import express from 'express';

// Import controllers and validations
import * as bankControllers from '../../controllers/user/bank.controller';
import * as BankValidations from '../../validations/user/bank.validation';
import auth from '../../middlewares/auth.middleware';

// Create router instance
const router = express.Router();

// Routes for Bank

// GET route to get all banks
router.get('/bank-list', auth.auth, bankControllers.bankList);

// POST route to resolve bank
router.post(
  '/resolve-account',
  auth.auth, // authentication middleware
  BankValidations.validateResolveAccount, // validation middleware
  bankControllers.resolveAccount // controller to handle the request
);

// POST route to add a bank
router.post('/add-bank', auth.auth, BankValidations.validateAddBank, bankControllers.addBank);

// POST route to add a foreign bank
router.post('/add-foreign-bank', auth.auth, BankValidations.validateAddForeignBank, bankControllers.addForeignBank);

// DELETE route to delete a bank
router.delete('/delete-bank/:bank_id', auth.auth, bankControllers.deleteBank);

// POST route to assign a default bank
router.post('/assign-default/:bank_id', auth.auth, bankControllers.assignDefault);

// GET route to get all banks
router.get('/get', auth.auth, bankControllers.getBanks);

// Export router
export default router;
