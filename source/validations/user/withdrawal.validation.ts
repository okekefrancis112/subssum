import { NextFunction, Response } from 'express';
import Joi from 'joi';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

export async function validateWithdrawal(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object()
    .keys({
      amount: Joi.number().required(),
      new_bank: Joi.string().valid('yes', 'no').required(),
    })
    .unknown();

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateVerifyRequest(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object()
    .keys({
      otp: Joi.string().required(),
    })
    .unknown();

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}
