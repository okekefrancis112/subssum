// Import express module
import express from 'express';

// Import controllers and validations
import * as notificationControllers from '../../controllers/admin/admin-notification.controller';
import * as notificationValidations from '../../validations/admin/notification.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';
import auth from '../../middlewares/auth.middleware';

// Create router instance
const router = express.Router();

// Routes for Admin-Notification

// POST route to create admin-notification
router.post(
  '/create',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-notifications'), // permission middleware
  notificationValidations.validateCreateNotification, // validation middleware
  notificationControllers.createNotification // controller to handle the request
);

// POST route to create admin-notification for a user
router.post(
  '/create-specific-user',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-notifications'), // permission middleware
  notificationValidations.validateCreateSpecificNotification, // validation middleware
  notificationControllers.createSpecificUsersNotification // controller to handle the request
);

// GET route to get an admin-notification
router.get(
  '/get/:notification_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-notifications'), // permission middleware
  notificationValidations.validateNotificationId, // validation middleware
  notificationControllers.getSingleNotification // controller to handle the request
);

// GET route to get all admin-notifications
router.get(
  '/get',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-notifications'), // permission middleware
  notificationControllers.getNotifications // controller to handle the request
);

// PUT route to edit an admin-notification
router.put(
  '/update/:notification_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-notifications'), // permission middleware
  notificationValidations.validateNotificationId, // validation middleware
  notificationControllers.updateNotification // controller to handle the request
);

// DELETE route to delete an admin-notification
router.delete(
  '/delete/:notification_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-notifications'), // permission middleware
  notificationValidations.validateNotificationId, // validation middleware
  notificationControllers.deleteNotification // controller to handle the request
);

// GET route to export admin-notifications
router.get(
  '/export',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('export-notifications'), // permission middleware
  notificationControllers.exportNotifications // controller to handle the request
);

// Export router
export default router;
