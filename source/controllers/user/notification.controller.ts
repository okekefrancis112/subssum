import { Types } from 'mongoose';
import { Response } from 'express';
import { ExpressRequest } from '../../server';
import { throwIfUndefined } from '../../util';
import ResponseHandler from '../../util/response-handler';
import auditRepository from '../../repositories/audit.repository';
import { IAuditActivityStatus, IAuditActivityType } from '../../interfaces/audit.interface';
import { HTTP_CODES } from '../../constants/app_defaults.constant';
import notificationRepository from '../../repositories/notification.repository';
import { INotificationStatus } from '../../interfaces/notification.interface';
import userRepository from '../../repositories/user.repository';

/****
 *
 *
 * Fetch Single Notification
 */
export async function getSingleNotification(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const notification_id = new Types.ObjectId(req.params.notification_id);
    const notification = await notificationRepository.getNotificationById({ notification_id });

    // Check if notification exists
    if (!notification) {
      // Send an appropriate response and error message if the notification does not exist
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: `Notification does not exist`,
      });
    }

    const read_notification = await notificationRepository.atomicUpdate(notification_id, {
      $set: {
        status: INotificationStatus.READ,
      },
    });

    const update_count = await userRepository.atomicUpdate(user._id, {
      $inc: { notification_count: -1 },
    });

    if (read_notification && update_count) {
      // Audit
      await auditRepository.create({
        req,
        title: 'Viewed Notification',
        name: `${user.first_name} ${user.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: user._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Viewed notification.',
        data: read_notification,
      });
    }
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Fetch Notifications
 */
export async function getNotifications(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const notifications = await notificationRepository.getNotifications({ user_id: user._id });

    if (notifications) {
      // Audit
      await auditRepository.create({
        req,
        title: 'Notifications fetched successfully',
        name: `${user?.first_name} ${user?.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: user?._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Notifications fetched successfully',
        data: notifications,
      });
    }
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Fetch Recent Notifications
 */
export async function getRecentNotifications(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const notifications = await notificationRepository.getRecentNotifications({
      user_id: user._id,
    });

    if (notifications) {
      // Audit
      await auditRepository.create({
        req,
        title: 'Notifications fetched successfully',
        name: `${user?.first_name} ${user?.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: user?._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Notifications fetched successfully',
        data: notifications,
      });
    }
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Mark As Read
 */
export async function markAllAsRead(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const user_id = new Types.ObjectId(user._id);

    const read_notification = await notificationRepository.markAllAsRead(user_id, {
      $set: {
        status: INotificationStatus.READ,
      },
    });

    const update_count = await userRepository.atomicUpdate(user._id, {
      $set: {
        notification_count: 0,
      },
    });

    if (read_notification && update_count) {
      // Audit
      await auditRepository.create({
        req,
        title: 'Marked All As Read.',
        name: `${user?.first_name} ${user?.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: user?._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Marked All As Read.',
        data: read_notification,
      });
    }
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Delete Notification
 */
export async function deleteNotification(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const notification_id = new Types.ObjectId(req.params.notification_id);
    const del = await notificationRepository.deleteNotification(notification_id);

    if (del) {
      // Audit
      await auditRepository.create({
        req,
        title: 'Notification deleted successfully',
        name: `${user.first_name} ${user.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: user._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Notification deleted successfully',
        data: del,
      });
    }
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Delete All Notification
 */
export async function deleteAllNotification(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const del = await notificationRepository.deleteAllNotification({ user_id: user._id });

    if (del) {
      // Audit
      await auditRepository.create({
        req,
        title: 'Notifications deleted successfully',
        name: `${user.first_name} ${user.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: user._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Notifications deleted successfully',
        data: del,
      });
    }
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}
