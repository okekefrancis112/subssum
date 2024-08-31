import { Types, startSession } from 'mongoose';
import { Response } from 'express';
import { ExpressRequest } from '../../server';
import { export2Csv, link, throwIfAdminUserUndefined, throwIfUndefined } from '../../util';
import ResponseHandler from '../../util/response-handler';
import auditRepository from '../../repositories/audit.repository';
import { IAuditActivityStatus, IAuditActivityType } from '../../interfaces/audit.interface';
import { APP_CONSTANTS, HTTP_CODES, urls } from '../../constants/app_defaults.constant';
import adminNotificationRepository from '../../repositories/admin-notification.repository';
import userRepository from '../../repositories/user.repository';
import { INotificationStatus, INotificationUserCategory } from '../../interfaces/admin-notification.interface';
import { AdminNotificationTaskJob } from '../../services/queues/producer.service';




/****
 *
 *
 * Admin Create Notification
 */

export async function createNotification(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { category, title, content, user_categories } = req.body;

    for(let user_category of user_categories) {
      if (user_category === INotificationUserCategory.INVESTED) {
        await AdminNotificationTaskJob({
          name: 'Admin Notification',
          data: {
            category,
            title,
            content,
            action_link: `${link()}/invest`,
            user_category: INotificationUserCategory.INVESTED,
            created_by: new Types.ObjectId(admin_user._id),
          },
        });

      } else if (user_category === INotificationUserCategory.NON_INVESTED) {
          await AdminNotificationTaskJob({
            name: 'Admin Notification',
            data: {
              category,
              title,
              content,
              action_link: `${link()}/invest`,
              user_category: INotificationUserCategory.NON_INVESTED,
              created_by: new Types.ObjectId(admin_user._id),
            },
          });

          } else if (user_category === INotificationUserCategory.KYC_NOT_COMPLETED) {
            await AdminNotificationTaskJob({
              name: 'Admin Notification',
              data: {
                category,
                title,
                content,
                action_link: `${link()}/assets`,
                user_category: INotificationUserCategory.KYC_NOT_COMPLETED,
                created_by: new Types.ObjectId(admin_user._id),
              },
            });

            } else if (user_category === INotificationUserCategory.ALL) {
                await AdminNotificationTaskJob({
                  name: 'Admin Notification',
                  data: {
                    category,
                    title,
                    content,
                    action_link: `${link()}/assets`,
                    user_category: INotificationUserCategory.ALL,
                    created_by: new Types.ObjectId(admin_user._id),
                  },
                });

            }
    }

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.CREATED,
      message: 'Notification sent successfully',
    });

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
 * Admin Create Notification For Specific Users
 */

export async function createSpecificUsersNotification(req: ExpressRequest, res: Response): Promise<Response | void> {
  const session = await startSession(); //Start a session to perform DB operations in transaction
  session.startTransaction(); //Start the transaction on the DB
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { users }: { users: string[] } = req.body;

    const processUsers = await Promise.all(
      users.map(async (userId) => {
        const user = await userRepository.getById(new Types.ObjectId(userId));

        if (!user) {
          return {
            success: false,
            message: `User with ID => ${userId} does not exist`,
          };
        }
        const { category, title, content } = req.body;

          await adminNotificationRepository.createSession({
                category,
                user_id: new Types.ObjectId(user._id),
                title,
                content,
                action_link: `${link()}/assets`,
                user_category: INotificationUserCategory.SPECIFIC,
                created_by: new Types.ObjectId(admin_user._id),
                session,
              },
          );

        return {
          success: true,
          message: 'Successful',
        };
      })
    );

    const failedProcess = processUsers.filter((r) => r.success !== true);

    if (failedProcess.length > 0) {
      const errors = failedProcess.map((a) => a.message);
      await session.abortTransaction();
      session.endSession();
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: `${errors}`,
      });
    }

    await session.commitTransaction();
    session.endSession();

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.CREATED,
      message: 'Notification sent successfully',
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
 * Fetch Single Notification
 */
export async function getSingleNotification(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const notification_id = new Types.ObjectId(req.params.notification_id);
    const notification = await adminNotificationRepository.getOne({_id: notification_id });

    // Check if notification exists
    if (!notification) {
      // Send an appropriate response and error message if the notification does not exist
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: `Notification does not exist`,
      });
    }

    const read_notification = await adminNotificationRepository.atomicUpdate({_id: notification_id}, {
      $set: {
        status: INotificationStatus.READ,
      },
    });

      // Audit
      await auditRepository.create({
        req,
        title: 'Notification fetched successfully',
        name: `${admin_user.first_name} ${admin_user.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: admin_user._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Success! Notification fetched.',
        data: read_notification,
      });

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
export async function getNotifications(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { data, pagination } = await adminNotificationRepository.findNotificationAdmin(req);

    // Audit
    await auditRepository.create({
      req,
      title: 'Notifications fetched successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Notifications fetched.',
      data: { data, pagination },
    });

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
 * Update Notifications
 */

export async function updateNotification(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const notification_id = new Types.ObjectId(req.params.notification_id);
    const { category, title, user_category, content } = req.body;

    const update = await adminNotificationRepository.atomicUpdate({_id: notification_id}, {
      $set: { category: category, title: title, content: content, user_category: user_category },
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Notification updated successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: "You're a pro! Notification successfully updated.",
      data: update,
    });

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
export async function deleteNotification(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const notification_id = new Types.ObjectId(req.params.notification_id);
    const del = await adminNotificationRepository.delete({_id: notification_id});

    // Audit
    await auditRepository.create({
      req,
      title: 'Notification deleted successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Done! The notification has left the building.',
      data: del,
    });

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
 * Export Notifications
 */
export async function exportNotifications(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const notifications = await adminNotificationRepository.findNotificationNoPagination(req);
    const fields = [ 'category', 'user_category', 'title', 'content', 'status', 'created_date', 'created_time' ];

    export2Csv(res, notifications, 'notifications', fields);

    } catch (error: any | Error | unknown) {
    return ResponseHandler.sendErrorResponse({ res, code: 500, error: error.message });
  }
}



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
 * ********************** LANDING PAGE *********************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 */


/****
 *
 *
 *
 * Get Notifications Landing Page
 */

export async function getNotificationsLanding(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const user_id = throwIfUndefined(req.user, 'req.user')._id;
    const notification = await adminNotificationRepository.getAllNoPagination({query: user_id});

    if (notification) {
      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Success! Notifications fetched.',
        data: notification,
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
 * Fetch Single Notification
 */
export async function getSingleNotificationLanding(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const user_id = new Types.ObjectId(user._id);
    const notification_id = new Types.ObjectId(req.params.notification_id);
    const notification = await adminNotificationRepository.getOne({ _id: notification_id, user_id: user_id });

    // Check if notification exists
    if (!notification) {
      // Send an appropriate response and error message if the notification does not exist
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: `Notification does not exist`,
      });
    }

    const read_notification = await adminNotificationRepository.atomicUpdate({_id: notification_id}, {
      $set: {
        status: INotificationStatus.READ,
      },
    });

    const update_count = await userRepository.atomicUpdate(user_id, {
      $inc: { notification_count: -1 },
    });

    if (read_notification && update_count) {
      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Success! Notification fetched.',
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
 * Mark As Read
 */
export async function markAllAsRead(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const user_id = new Types.ObjectId(user._id);

    const read_notification = await adminNotificationRepository.batchUpdate({user_id: user_id}, {
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
        title: 'Marked As Read.',
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
 * Delete Single Notification
 */
export async function deleteSingleNotification(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
      const user = throwIfUndefined(req.user, 'req.user');
      const user_id = new Types.ObjectId(user._id);
      const notification_id = new Types.ObjectId(req.params.notification_id);
      const del = await adminNotificationRepository.delete({ user_id: user_id, _id: notification_id });

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
export async function deleteAllNotification(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
      const user = throwIfUndefined(req.user, 'req.user');
      const del = await adminNotificationRepository.batchDelete({user_id: user._id});

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
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}
