import { NextFunction, Response } from 'express';
import mongoose from 'mongoose';
import Joi from 'joi';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

export async function validateInvestmentQuery(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object()
    .keys({
      investment_status: Joi.string().valid('all', 'pending', 'matured').required(),
    })
    .unknown();

  const validation = schema.validate(req.query);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateInvestmentId(req: ExpressRequest, res: Response, next: NextFunction) {
  if (!mongoose.Types.ObjectId.isValid(req.params.investment_id))
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.NOT_FOUND,
      error: 'Invalid investment id',
    });

  next();
}
