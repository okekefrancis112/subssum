import { NextFunction, Response } from 'express';
import Joi from 'joi';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import { HTTP_CODES } from '../../constants/app_defaults.constant';
import { SECURITY_TYPE } from '../../interfaces/otp.interface';

export async function validateSecurityType(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object()
    .keys({
      email: Joi.string().email().required(),
      security_type: Joi.string()
        .valid(SECURITY_TYPE.OTP, SECURITY_TYPE.SECRET_PASSWORD)
        .required(),
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
