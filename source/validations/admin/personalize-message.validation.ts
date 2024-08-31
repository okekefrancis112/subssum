import { NextFunction, Response } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

export async function validateCreatePersonalizeMessage(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object().keys({
    morning_message: Joi.string().required(),
    afternoon_message: Joi.string().required(),
    evening_message: Joi.string().required(),
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


export async function validatePersonalizeMessageId(req: ExpressRequest, res: Response, next: NextFunction) {
  if (!mongoose.Types.ObjectId.isValid(req.params.message_id))
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.NOT_FOUND,
      error: 'Invalid Personalize Message ID',
    });

  next();
}
