import { Types } from 'mongoose';
import { Response } from 'express';
import { ExpressRequest } from '../../server';
import { export2Csv, throwIfAdminUserUndefined } from '../../util';
import ResponseHandler from '../../util/response-handler';
import auditRepository from '../../repositories/audit.repository';
import { IAuditActivityStatus, IAuditActivityType } from '../../interfaces/audit.interface';
import { HTTP_CODES } from '../../constants/app_defaults.constant';
import personalizeMessageRepository from '../../repositories/personalize-message.repository';


/****
 *
 *
 * Admin Create Personalize Message
 */

export async function createPersonalizeMessage(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const {
      morning_message,
      afternoon_message,
      evening_message,
    } = req.body;

    const message = await personalizeMessageRepository.create({

      morning_message,
      afternoon_message,
      evening_message,
      created_by: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.CREATED,
      message: 'Personalize Message created successfully',
      data: message,
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
 * Fetch Single Personalize Message
 */
export async function getSinglePersonalizeMessage(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const _id = new Types.ObjectId(req.params.message_id);
    const message = await personalizeMessageRepository.getOne({_id: _id});

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Personalize Message created successfully',
      data: message,
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
 * Fetch Personalize Messages
 */
export async function getPersonalizeMessages(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const { messages, pagination } = await personalizeMessageRepository.findPersonalizeMessageAdmin(req);

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Personalize Message fetched successfully',
      data: { messages, pagination },
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
 * Update Personalize Message
 */

export async function updatePersonalizeMessage(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const _id = new Types.ObjectId(req.params.message_id);
    const {
      morning_message,
      afternoon_message,
      evening_message,
    } = req.body;

    const message = await personalizeMessageRepository.atomicUpdate({_id:_id}, {
      $set: {
        morning_message,
        afternoon_message,
        evening_message,
      },
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Personalize Message updated successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Personalize Message updated successfully',
      data: message,
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
 * Set Default Personalize Message
 */

export async function setDefaultPersonalizeMessage(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const _id = new Types.ObjectId(req.params.message_id);

    const message = await personalizeMessageRepository.getOne({ _id: _id });

    // Check if exchange_rate exists
    if (!message) {
      // Send an appropriate response and error message if the exchange_rate does not exist
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: `Message does not exist`,
      });
    }

    if (message.is_default) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.CONFLICT,
        error: `Sorry, this message has already been set as your default message.`,
      });
    }

    await personalizeMessageRepository.batchUpdate( { is_default: true }, { $set: { is_default: false } });

    const default_message = await personalizeMessageRepository.atomicUpdate({ _id: _id }, {
      $set: {
        is_default: true,
      },
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Personalize Message updated successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.AUDIT,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! This message is now your default message.',
      data: default_message,
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
 * Delete Personalize Message
 */
export async function deletePersonalizeMessage(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const _id = new Types.ObjectId(req.params.message_id);
    const message = await personalizeMessageRepository.delete({ _id: _id });

    // Audit
    await auditRepository.create({
      req,
      title: 'Personalize Message deleted successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.AUDIT,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Personalize Message deleted successfully',
      data: message,
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
 * Export Personalize Message
 */
export async function exportPersonalizeMessage(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const message = await personalizeMessageRepository.findMessagesNoPagination({req});
    const fields = [
      'morning_message',
      'afternoon_message',
      'evening_message',
      'is_default',
      'created_date',
      'created_time',
    ];

    export2Csv(res, message, 'personalize_messages', fields);

  } catch (error: any | Error | unknown) {
    return ResponseHandler.sendErrorResponse({ res, code: 500, error: error.message });
  }
}
