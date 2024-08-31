import { NextFunction, Response } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import { IAssetType } from '../../interfaces/listing.interface';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

export async function validateCreateListing(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object()
    .keys({
      project_name: Joi.string().required(),
      description: Joi.string().required(),
      location: Joi.string().required(),
      holding_period: Joi.number().required(),
      // available_tokens: Joi.number().required(),
      // audience: Joi.string()
      //   .valid(IListingAudience.ALL, IListingAudience.USER, IListingAudience.THIRD_PARTY)
      //   .required(),
      returns: Joi.number().required(),
    }).unknown();

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateCreateNewListing(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object()
    .keys({
      project_name: Joi.string().required(),
      description: Joi.string().required(),
      location: Joi.string().required(),
      holding_period: Joi.number().required(),
      map_url: Joi.string().required(),
      asset_type: Joi.string()
        .valid(
          IAssetType.RESIDENTIAL,
          IAssetType.COMMERCIAL,
          IAssetType.MIXED_USE,
          )
        .required(),
        fixed_returns: Joi.number().required(),
        flexible_returns: Joi.number().required(),
    }).unknown();

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateListingId(req: ExpressRequest, res: Response, next: NextFunction) {
  if (!mongoose.Types.ObjectId.isValid(req.params.listing_id))
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.NOT_FOUND,
      error: 'Invalid Listing ID',
    });

  next();
}

export async function validateListingFaqId(req: ExpressRequest, res: Response, next: NextFunction) {
  if (!mongoose.Types.ObjectId.isValid(req.params.faq_id))
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.NOT_FOUND,
      error: 'Invalid Listing Faq ID',
    });

  next();
}

export async function validateListingAssetInsightId(req: ExpressRequest, res: Response, next: NextFunction) {
  if (!mongoose.Types.ObjectId.isValid(req.params.insight_id))
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.NOT_FOUND,
      error: 'Invalid Listing Asset Insight ID',
    });

  next();
}