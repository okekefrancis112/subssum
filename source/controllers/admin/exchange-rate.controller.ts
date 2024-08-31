import { Types } from 'mongoose';
import { Response } from 'express';
import { ExpressRequest } from '../../server';
import { export2Csv, throwIfAdminUserUndefined } from '../../util';
import ResponseHandler from '../../util/response-handler';
import auditRepository from '../../repositories/audit.repository';
import { IAuditActivityStatus, IAuditActivityType } from '../../interfaces/audit.interface';
import { HTTP_CODES } from '../../constants/app_defaults.constant';
import exchangeRateRepository from '../../repositories/exchange-rate.repository';


/****
 *
 *
 * Admin Create Exchange Rate
 */
export async function createNewExchangeRate(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const {
      ngn_usd_buy_rate,
      ngn_usd_sell_rate,
      eur_usd_buy_rate,
      eur_usd_sell_rate,
      gbp_usd_buy_rate,
      gbp_usd_sell_rate,
      cad_usd_buy_rate,
      cad_usd_sell_rate,
    } = req.body;

    const rate = await exchangeRateRepository.create({
      ngn_usd_buy_rate,
      ngn_usd_sell_rate,
      eur_usd_buy_rate,
      eur_usd_sell_rate,
      gbp_usd_buy_rate,
      gbp_usd_sell_rate,
      cad_usd_buy_rate,
      cad_usd_sell_rate,
      created_by: admin_user._id,
    });

      // Audit
      await auditRepository.create({
        req,
        title: 'Exchange rate created successfully',
        name: `${admin_user.first_name} ${admin_user.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: admin_user._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.CREATED,
        message: 'Exchange rate created successfully',
        data: rate,
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
 * Fetch Single Exchange Rate
 */
export async function getSingleExchangeRate(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const exchange_rate_id = new Types.ObjectId(req.params.exchange_rate_id);
    const exchange_rate = await exchangeRateRepository.getOne({_id: exchange_rate_id });

    // Audit
    await auditRepository.create({
      req,
      title: 'Exchange Rate fetched successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Exchange Rate fetched successfully',
      data: exchange_rate,
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
 * Fetch Exchange Rates
 */
export async function getExchangeRates(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { exchange_rates, pagination } = await exchangeRateRepository.findExchangeRateAdmin(req);

      // Audit
      await auditRepository.create({
        req,
        title: 'Exchange Rates fetched successfully',
        name: `${admin_user.first_name} ${admin_user.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: admin_user._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Exchange Rates fetched successfully',
        data: {
          exchange_rates,
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
}

/****
 *
 *
 * Update Exchange Rate
 */

export async function updateNewExchangeRate(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const exchange_rate_id = new Types.ObjectId(req.params.exchange_rate_id);

    Object.keys(req.body).forEach((e: string) => {
      if (req.body[e] === '' || req.body[e] === 'null' || req.body[e] === 'undefined' || req.body[e] === 'invalid') {
        delete req.body[e];
      }
    });

    const exchange_rate = await exchangeRateRepository.atomicUpdate({_id: exchange_rate_id}, req.body)

      // Audit
      await auditRepository.create({
        req,
        title: 'Exchange Rate updated successfully',
        name: `${admin_user.first_name} ${admin_user.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: admin_user._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Exchange Rate updated successfully',
        data: exchange_rate,
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
 * Set Default Exchange Rate
 */

export async function setDefaultExchangeRate(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const exchange_rate_id = new Types.ObjectId(req.params.exchange_rate_id);
    const exchange_rate = await exchangeRateRepository.getOne({ _id: exchange_rate_id });

    // Check if exchange_rate exists
    if (!exchange_rate) {
      // Send an appropriate response and error message if the exchange_rate does not exist
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: `Exchange rate does not exist`,
      });
    }

    if (exchange_rate.is_default) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.CONFLICT,
        error: `Sorry, this exchange rate has already been set as your default rate.`,
      });
    }

    await exchangeRateRepository.batchUpdate({ is_default: true },{ $set: { is_default: false } });

    const fx_rate = await exchangeRateRepository.atomicUpdate({_id: exchange_rate_id}, {
      $set: {
        is_default: true,
      },
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Exchange Rate updated successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! This exchange rate is now your default exchange rate.',
      data: fx_rate,
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
 * Delete Exchange Rate
 */
export async function deleteExchangeRate(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const exchange_rate_id = new Types.ObjectId(req.params.exchange_rate_id);
    const exchange_rate = await exchangeRateRepository.delete({_id: exchange_rate_id});

    // Audit
    await auditRepository.create({
      req,
      title: 'Exchange Rate deleted successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Exchange Rate deleted successfully',
      data: exchange_rate,
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
 * Export Exchange Rates
 */
export async function exportNewExchangeRate(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const exchange_rates = await exchangeRateRepository.findNewExchangeNoPagination({req});
    const fields = [
      'created_date',
      'created_time',
      'is_default',
      'ngn_usd_buy_rate',
      'ngn_usd_sell_rate',
      'eur_usd_buy_rate',
      'eur_usd_sell_rate',
      'gbp_usd_buy_rate',
      'gbp_usd_sell_rate',
      'cad_usd_buy_rate',
      'cad_usd_sell_rate',
    ];

    export2Csv(res, exchange_rates, 'exchange_rates', fields);

  } catch (error: any | Error | unknown) {
    return ResponseHandler.sendErrorResponse({ res, code: 500, error: error.message });
  }
}