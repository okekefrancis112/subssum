import { NextFunction, Response } from 'express';
import Joi from 'joi';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

export async function validateLoginAdminUser(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object()
    .keys({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).max(128).required(),
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

export async function validateCreateAdminUser(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object().keys({
    email: Joi.string().email().required(),
    role: Joi.string().required(),
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

export async function validateCompleteAdminUser(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object().keys({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    password: Joi.string().required(),
    confirm_password: Joi.string().required(),
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

export async function validateRecoverAdmin(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object().keys({
    email: Joi.string().email().required(),
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

export async function validateVerifyOtp(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object().keys({
    email: Joi.string().email().required(),
    otp: Joi.string().length(4).required(),
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

export async function validateResetPassword(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const schema = Joi.object().keys({
    token: Joi.string().required(),
    new_password: Joi.string().required(),
    confirm_password: Joi.string().required(),
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

// export async function validateVerifyUser(
//   req: ExpressRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<Response | void> {
//   const schema = Joi.object().keys({
//     email: Joi.string().email().required(),
//     otp: Joi.string().length(4).required(),
//   });

//   const validation = schema.validate(req.body);

//   if (validation.error) {
//     const error = validation.error.message
//       ? validation.error.message
//       : validation.error.details[0].message;

//     return ResponseHandler.sendErrorResponse({ res, code:HTTP_CODES.BAD_REQUEST, error });
//   }

//   return next();
// }

// export async function validateResendVerification(
//   req: ExpressRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<Response | void> {
//   const schema = Joi.object().keys({
//     email: Joi.string().email().required(),
//   });

//   const validation = schema.validate(req.body);

//   if (validation.error) {
//     const error = validation.error.message
//       ? validation.error.message
//       : validation.error.details[0].message;

//     return ResponseHandler.sendErrorResponse({ res, code:HTTP_CODES.BAD_REQUEST, error });
//   }

//   return next();
// }

// export async function validateEmailRecovery(
//   req: ExpressRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<Response | void> {
//   const schema = Joi.object().keys({
//     email: Joi.string().email().required(),
//   });

//   const validation = schema.validate(req.body);

//   if (validation.error) {
//     const error = validation.error.message
//       ? validation.error.message
//       : validation.error.details[0].message;

//     return ResponseHandler.sendErrorResponse({ res, code:HTTP_CODES.BAD_REQUEST, error });
//   }

//   return next();
// }

// export async function validateResetPassword(
//   req: ExpressRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<Response | void> {
//   const schema = Joi.object().keys({
//     token: Joi.string().required(),
//     new_password: Joi.string().required(),
//     confirm_password: Joi.string().required(),
//   });

//   const validation = schema.validate(req.body);

//   if (validation.error) {
//     const error = validation.error.message
//       ? validation.error.message
//       : validation.error.details[0].message;

//     return ResponseHandler.sendErrorResponse({ res, code:HTTP_CODES.BAD_REQUEST, error });
//   }

//   return next();
// }

// export async function validateLinkBank(
//   req: ExpressRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<Response | void> {
//   const schema = Joi.object().keys({
//     code: Joi.string().required(),
//   });

//   const validation = schema.validate(req.body);

//   if (validation.error) {
//     const error = validation.error.message
//       ? validation.error.message
//       : validation.error.details[0].message;

//     return ResponseHandler.sendErrorResponse({ res, code:HTTP_CODES.BAD_REQUEST, error });
//   }

//   return next();
// }

// export async function validateResetUserPassword(
//   req: ExpressRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<Response | void> {
//   const schema = Joi.object().keys({
//     current_password: Joi.string().required(),
//     new_password: Joi.string().required(),
//     confirm_password: Joi.string().required(),
//   });

//   const validation = schema.validate(req.body);

//   if (validation.error) {
//     const error = validation.error.message
//       ? validation.error.message
//       : validation.error.details[0].message;

//     return ResponseHandler.sendErrorResponse({ res, code:HTTP_CODES.BAD_REQUEST, error });
//   }

//   return next();
// }

// export async function validateResolveAccount(
//   req: ExpressRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<Response | void> {
//   const schema = Joi.object().keys({
//     account_number: Joi.string().required(),
//     bank_code: Joi.string().required(),
//   });

//   const validation = schema.validate(req.body);

//   if (validation.error) {
//     const error = validation.error.message
//       ? validation.error.message
//       : validation.error.details[0].message;

//     return ResponseHandler.sendErrorResponse({ res, code:HTTP_CODES.BAD_REQUEST, error });
//   }

//   return next();
// }

// export async function validateAddBank(
//   req: ExpressRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<Response | void> {
//   const schema = Joi.object().keys({
//     bank_name: Joi.string().required(),
//     account_number: Joi.string().required(),
//     account_name: Joi.string().required(),
//     primary: Joi.boolean().required(),
//   });

//   const validation = schema.validate(req.body);

//   if (validation.error) {
//     const error = validation.error.message
//       ? validation.error.message
//       : validation.error.details[0].message;

//     return ResponseHandler.sendErrorResponse({ res, code:HTTP_CODES.BAD_REQUEST, error });
//   }

//   return next();
// }
