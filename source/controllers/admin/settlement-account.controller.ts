import { Types } from 'mongoose';
import { Response } from 'express';
import { ExpressRequest } from '../../server';
import { export2Csv, throwIfAdminUserUndefined } from '../../util';
import ResponseHandler from '../../util/response-handler';
import auditRepository from '../../repositories/audit.repository';
import { IAuditActivityStatus, IAuditActivityType } from '../../interfaces/audit.interface';
import { HTTP_CODES } from '../../constants/app_defaults.constant';
import settlementAccountRepository from '../../repositories/settlement-account.repository';

/****
 *
 *
 * Admin Create Settlement Account
 */

export async function createSettlementAccount(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const {
      account_number,
      routing_number,
      account_type,
      swift_code,
      recipient_info,
      bank_info,
      special_instructions,
    } = req.body;

    const account = await settlementAccountRepository.createSettlementAccount({
      account_number,
      routing_number,
      account_type,
      swift_code,
      recipient_info,
      bank_info,
      special_instructions,
      created_by: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.CREATED,
      message: 'Settlement Account created successfully',
      data: account,
    });

  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Fetch Single Settlement Account
 */
export async function getSingleSettlementAccount(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const _id = new Types.ObjectId(req.params.account_id);
    const account = await settlementAccountRepository.getOne({_id: _id});

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Fetched Settlement Account successfully',
      data: account,
    });

  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Fetch Settlement Accounts
 */
export async function getSettlementAccounts(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const { accounts, pagination } = await settlementAccountRepository.findSettlementAccountAdmin(req);

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Settlement Account fetched successfully',
      data: { accounts, pagination },
    });

  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Update Settlement Account
 */

export async function updateSettlementAccount(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const _id = new Types.ObjectId(req.params.account_id);
    Object.keys(req.body).forEach((e: string) => {
      if (req.body[e] === '' || req.body[e] === 'null' || req.body[e] === 'undefined' || req.body[e] === 'Invalid Date' || req.body[e] === 'invalid') {
        delete req.body[e];
      }
    });

    const account = await settlementAccountRepository.atomicUpdate(_id, req.body);

    // Audit
    await auditRepository.create({
      req,
      title: 'Settlement Account updated successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Settlement Account updated successfully',
      data: account,
    });

  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Set Default Settlement Account
 */

export async function setDefaultSettlementAccount(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const _id = new Types.ObjectId(req.params.account_id);

    const account = await settlementAccountRepository.getOne({ _id: _id });

    // Check if account exists
    if (!account) {
      // Send an appropriate response and error message if the exchange_rate does not exist
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: `Account does not exist`,
      });
    }

    if (account.is_active) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.CONFLICT,
        error: `Sorry, this account has already been set as your default account.`,
      });
    }

    await settlementAccountRepository.batchUpdate({ $set: { is_active: false } });

    const default_account = await settlementAccountRepository.atomicUpdate(
      {_id: _id},
      {
        $set: {
          is_active: true,
        },
      });

    // Audit
    await auditRepository.create({
      req,
      title: 'Default settlement account updated successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.AUDIT,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! This account is now your default account.',
      data: default_account,
    });

  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Delete Settlement Account
 */
export async function deleteSettlementAccount(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const _id = new Types.ObjectId(req.params.account_id);
    const account = await settlementAccountRepository.delete({_id: _id});

    // Audit
    await auditRepository.create({
      req,
      title: 'Settlement Account deleted successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.AUDIT,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Settlement Account deleted successfully',
      data: account,
    });

  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}


/****
 *
 *
 * Export Settlement Account
 */
export async function exportSettlementAccount(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const accounts = await settlementAccountRepository.findAccountsNoPagination({req});
    const fields = [
      'account_number',
      'routing_number',
      'account_type',
      'swift_code',
      'recipient_info',
      'bank_info',
      'special_instructions',
      'is_active',
      'created_date',
      'created_time',
    ];

    export2Csv(res, accounts, 'settlement_account', fields);

  } catch (error: any | Error | unknown) {
    return ResponseHandler.sendErrorResponse({ res, code: 500, error: error.message });
  }
}