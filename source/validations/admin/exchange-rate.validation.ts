import { NextFunction, Response } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

export async function validateCreateExchangeRate(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object().keys({
    currency: Joi.string().required(),
    third_party_buy_rate: Joi.string().required(),
    third_party_sell_rate: Joi.string().required(),
    keble_buy_rate: Joi.string().required(),
    keble_sell_rate: Joi.string().required(),
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

export async function validateNewCreateExchangeRate(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object().keys({
    ngn_usd_buy_rate: Joi.number().required(),
    ngn_usd_sell_rate: Joi.number().required(),
    eur_usd_buy_rate: Joi.number().required(),
    eur_usd_sell_rate: Joi.number().required(),
    gbp_usd_buy_rate: Joi.number().required(),
    gbp_usd_sell_rate: Joi.number().required(),
    cad_usd_buy_rate: Joi.number().required(),
    cad_usd_sell_rate: Joi.number().required(),
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

export async function validateExchangeRateId(req: ExpressRequest, res: Response, next: NextFunction) {
  if (!mongoose.Types.ObjectId.isValid(req.params.exchange_rate_id))
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.NOT_FOUND,
      error: 'Invalid Exchange Rate ID',
    });

  next();
}
