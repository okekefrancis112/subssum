import { NextFunction, Response } from 'express';
import Joi from 'joi';
import { ExpressRequest } from '../../server';
import { IPaymentGateway, ITransactionMedium } from '../../interfaces/transaction.interface';
import ResponseHandler from '../../util/response-handler';
import { serverErrorNotification, throwIfUndefined } from '../../util';
import walletRepository from '../../repositories/wallet.repository';
import { WALLET_STATUS } from '../../interfaces/wallet.interface';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

export async function validateFundWallet(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const user = throwIfUndefined(req.user, 'req.user');
  const schema = Joi.object()
    .keys({
      amount: Joi.number().required(),
      payment_gateway: Joi.string()
        .valid(
          IPaymentGateway.FLUTTERWAVE,
          IPaymentGateway.MONO,
          IPaymentGateway.PAYSTACK,
          IPaymentGateway.WALLET,
          IPaymentGateway.DIASPORA_TRANSFER,
        )
        .required(),
      channel: Joi.string()
        .valid(ITransactionMedium.BANK, ITransactionMedium.CARD, ITransactionMedium.DIRECT_DEBIT)
        .required(),
    })
    .unknown();

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    await serverErrorNotification(req, error, user);

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateVerifyWalletTransfer(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const user = throwIfUndefined(req.user, 'req.user');
  const schema = Joi.object().keys({
    otp: Joi.string().required(),
  });

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    await serverErrorNotification(req, error, user);

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateWalletName(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const user = throwIfUndefined(req.user, 'req.user');
  const schema = Joi.object()
    .keys({
      account_number: Joi.string()
        .length(10)
        .pattern(/^[0-9]+$/)
        .required(),
    })
    .unknown();

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    await serverErrorNotification(req, error, user);

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateWalletTransfer(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const user = throwIfUndefined(req.user, 'req.user');
  const schema = Joi.object()
    .keys({
      recipient_account_number: Joi.string()
        .length(10)
        .pattern(/^[0-9]+$/)
        .required(),
      amount: Joi.number().required(),
    })
    .unknown();

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    await serverErrorNotification(req, error, user);

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateWallet(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const user = throwIfUndefined(req.user, 'req.user');

  const wallet = await walletRepository.getByUserId({ user_id: user._id });

  if (!wallet) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.NOT_FOUND,
      error: 'Your wallet does not exist',
    });
  }

  if (wallet.status !== WALLET_STATUS.ACTIVE) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.FORBIDDEN,
      error: 'Your wallet is currently blocked, please contact support.',
    });
  }

  return next();
}

export async function validateSaveBeneficiary(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const user = throwIfUndefined(req.user, 'req.user');
  const schema = Joi.object().keys({
    recipient_account_number: Joi.string()
      .length(10)
      .pattern(/^[0-9]+$/)
      .required(),
  });

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    await serverErrorNotification(req, error, user);

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateWalletAccountNumber(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const user = throwIfUndefined(req.user, 'req.user');
  const schema = Joi.object().keys({
    account_number: Joi.string()
      .length(10)
      .pattern(/^[0-9]+$/)
      .required(),
  });

  const validation = schema.validate(req.params);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    await serverErrorNotification(req, error, user);

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}

export async function validateSendToReferWallet(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const user = throwIfUndefined(req.user, 'req.user');
  const schema = Joi.object().keys({
    amount: Joi.number().required(),
  });

  const validation = schema.validate(req.body);

  if (validation.error) {
    const error = validation.error.message
      ? validation.error.message
      : validation.error.details[0].message;

    await serverErrorNotification(req, error, user);

    return ResponseHandler.sendErrorResponse({ res, code: HTTP_CODES.BAD_REQUEST, error });
  }

  return next();
}
