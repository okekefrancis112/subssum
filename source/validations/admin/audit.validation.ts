import { NextFunction, Response } from 'express';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import mongoose from 'mongoose';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

export async function validateAuditId(req: ExpressRequest, res: Response, next: NextFunction) {
  if (!mongoose.Types.ObjectId.isValid(req.params.audit_id))
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.NOT_FOUND,
      error: 'Invalid Audit ID',
    });

  next();
}
