import { Types } from 'mongoose';
import { Response } from 'express';
import { ExpressRequest } from '../../server';
import { throwIfAdminUserUndefined } from '../../util';
import ResponseHandler from '../../util/response-handler';
import auditRepository from '../../repositories/audit.repository';
import { IAuditActivityStatus, IAuditActivityType } from '../../interfaces/audit.interface';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

/****
 *
 *
 * Fetch Audits
 */
export async function getAudits(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const audits = await auditRepository.findAudit(req);

    // Audit
    await auditRepository.create({
      req,
      title: 'Audits fetched successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your audits have been fetched.',
      data: audits,
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
 * Fetch Single Audit
 */
export async function getSingleAudit(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const audit_id = new Types.ObjectId(req.params.audit_id);
    const audit = await auditRepository.getOne({_id: audit_id });

    // Audit
    await auditRepository.create({
      req,
      title: 'Audit fetched successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your audit has been fetched.',
      data: audit,
    });

  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}
