// Import express module
import express from 'express';

// Import controllers and validations
import * as auditControllers from '../../controllers/admin/audit.controller';
import * as auditValidations from '../../validations/admin/audit.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';

// Create router instance
const router = express.Router();

// Routes for Audit

// GET route to get all user audits
router.get(
    '/get',
    auth_admin.authAdmin, // authentication middleware
    accessAdminAuth('view-audits'), // permission middleware
    auditControllers.getAudits // controller to handle the request
  );

// GET route to get a user audit
  router.get(
    '/get/:audit_id',
    auth_admin.authAdmin, // authentication middleware
    accessAdminAuth('view-audits'), // permission middleware
    auditValidations.validateAuditId, // validation middleware
    auditControllers.getSingleAudit // controller to handle the request
  );

// Export router
export default router;