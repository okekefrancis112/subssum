import { Response } from 'express';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import auditRepository from '../../repositories/audit.repository';
import { IAuditActivityStatus, IAuditActivityType } from '../../interfaces/audit.interface';
import { export2Csv, throwIfAdminUserUndefined } from '../../util';
import referRepository from '../../repositories/refer.repository';
import { HTTP_CODES } from '../../constants/app_defaults.constant';
import userRepository from '../../repositories/user.repository';

/***************
 *
 * @param req
 * @param res
 * @returns
 *
 */

export const getRefer = async (req: ExpressRequest, res: Response) => {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');

    const { data, pagination } = await referRepository.getAll(req);

      // Audit
      await auditRepository.create({
        req,
        title: 'Referral fetched successfully',
        name: `${admin_user.first_name} ${admin_user.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: admin_user._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Success! Referral information retrieved.',
        data: { data, pagination },
      });
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
};

/***************
 *
 * @param req
 * @param res
 * @returns
 *
 */

export const getReferrals = async (req: ExpressRequest, res: Response) => {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const invested_referred_users = await userRepository.findAggregate([
      {
        $match: {
          referred_by: { $ne: null },
          has_invest: true,
        }
      }
    ]);
    const referred_users = await userRepository.findAggregate([
      {
        $match: {
          referred_by: { $ne: null },
        }
      }
    ]);
    const { data, pagination } = await referRepository.getAll(req);

      // Audit
      await auditRepository.create({
        req,
        title: 'Referral fetched successfully',
        name: `${admin_user.first_name} ${admin_user.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: admin_user._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Success! Referral information retrieved.',
        data: {
          invested_referred_users: invested_referred_users?.length,
          referred_users: referred_users?.length,
          data,
          pagination
        },
      });

  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
};

export const exportReferrals = async (req: ExpressRequest, res: Response) => {
  try {

    const refer_data = await referRepository.getAllNoPagination( req );
    const fields = [ 'first_name', 'middle_name', 'last_name', 'email', 'referral_count', 'invested_referral',  'amount_earned'];

    export2Csv(res, refer_data, 'referrals', fields);

  } catch (error) {
    return ResponseHandler.sendErrorResponse({ res, code: 500, error: `${error}` });
  }
};

export const getSingleReferral = async (req: ExpressRequest, res: Response) => {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { data, pagination } = await referRepository.getAllUserReferrals(req);

    // Audit
    await auditRepository.create({
      req,
      title: 'User Referral fetched successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Your referral information has been retrieved.',
      data: { data, pagination },
    });

  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
};

export const exportSingleReferral = async (req: ExpressRequest, res: Response) => {
  try {

    const refer_data = await referRepository.getAllUserReferralsNoPagination(req);
    const fields = [ 'first_name', 'middle_name', 'last_name', 'email', 'has_invest', 'investment_amount', 'investment_category', 'current_returns', 'created_date', 'created_time' ];

    export2Csv(res, refer_data, 'referrals-user', fields);

  } catch (error) {
    return ResponseHandler.sendErrorResponse({ res, code: 500, error: `${error}` });
  }
};

