// Import express module
import express from 'express';

// Import controllers and validations
import * as notificationControllers from '../../controllers/user/notification.controller';
import * as adminNotificationControllers from '../../controllers/admin/admin-notification.controller';
import * as notificationValidations from '../../validations/admin/notification.validation';
import auth from '../../middlewares/auth.middleware';

// Create router instance
const router = express.Router();

// Routes for Notification

// GET route to get one user notification
router.get(
  '/get/:notification_id',
  auth.auth, // authentication middleware
  notificationValidations.validateNotificationId, // validation middleware
  notificationControllers.getSingleNotification // controller to handle the request
);

// GET route to get all user notifications
router.get(
  '/get',
  auth.auth, // authentication middleware
  notificationControllers.getNotifications // controller to handle the request
);

// GET route to get all user notifications
router.get(
  '/get-recent',
  auth.auth, // authentication middleware
  notificationControllers.getRecentNotifications // controller to handle the request
);

// PUT route to mark as read all user notifications
router.put(
  '/mark-as-read',
  auth.auth, // authentication middleware
  notificationControllers.markAllAsRead // controller to handle the request
);

// DELETE route to delete a notification
router.delete(
  '/delete/:notification_id',
  auth.auth, // authentication middleware
  notificationValidations.validateNotificationId, // validation middleware
  notificationControllers.deleteNotification // controller to handle the request
);

// DELETE route to delete all notifications
router.delete(
  '/delete',
  auth.auth, // authentication middleware
  notificationControllers.deleteAllNotification // controller to handle the request
);

/***********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * ********************** ADMIN NOTIFICATION ***************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 */

// GET route to get one admin notification
router.get(
  '/get-admin-notification/:notification_id',
  auth.auth, // authentication middleware
  notificationValidations.validateNotificationId, // validation middleware
  adminNotificationControllers.getSingleNotificationLanding // controller to handle the request
);

// GET route to get all admin notifications
router.get(
  '/get-admin-notifications',
  auth.auth, // authentication middleware
  adminNotificationControllers.getNotificationsLanding // controller to handle the request
);

// PUT route to mark as read admin notification
router.put(
  '/admin-mark-as-read',
  auth.auth, // authentication middleware
  adminNotificationControllers.markAllAsRead // controller to handle the request
);

// DELETE route to delete a notification
router.delete(
  '/admin-delete-notification/:notification_id',
  auth.auth, // authentication middleware
  notificationValidations.validateNotificationId, // validation middleware
  adminNotificationControllers.deleteSingleNotification // controller to handle the request
);

// DELETE route to delete all notifications
router.delete(
  '/admin-delete-notifications',
  auth.auth, // authentication middleware
  adminNotificationControllers.deleteAllNotification // controller to handle the request
);

// Export router
export default router;
