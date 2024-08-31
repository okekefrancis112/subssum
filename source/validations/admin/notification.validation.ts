import { NextFunction, Response } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import { HTTP_CODES } from '../../constants/app_defaults.constant';
import { INotificationUserCategory } from '../../interfaces/notification.interface';

export async function validateCreateNotification(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {

    // Define the valid user categories
    const validUserCategories = [
      INotificationUserCategory.ALL,
      INotificationUserCategory.INVESTED,
      INotificationUserCategory.NON_INVESTED,
      INotificationUserCategory.KYC_COMPLETED,
      INotificationUserCategory.KYC_NOT_COMPLETED,
    ];

  const schema = Joi.object().keys({
    category: Joi.string().required(),
    title: Joi.string().required(),
    content: Joi.string().required(),
    user_categories: Joi.array().items(Joi.string().valid(...validUserCategories)).required(),
  });

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateCreateSpecificNotification(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object().keys({
    category: Joi.string().required(),
    title: Joi.string().required(),
    content: Joi.string().required(),
    users: Joi.array().required(),
  });

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateNotificationId(req: ExpressRequest, res: Response, next: NextFunction) {
  if (!mongoose.Types.ObjectId.isValid(req.params.notification_id))
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.NOT_FOUND,
      error: 'Invalid Notification ID',
    });

  next();
}
