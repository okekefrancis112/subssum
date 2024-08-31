import os from 'os';
import { Types } from 'mongoose';
import { Response } from 'express';
import getMac, { isMAC } from 'getmac';
import { ExpressRequest } from '../../server';
import { throwIfAdminUserUndefined } from '../../util';
import ResponseHandler from '../../util/response-handler';
import auditRepository from '../../repositories/audit.repository';
import { IAuditActivityStatus, IAuditActivityType } from '../../interfaces/audit.interface';
import faqRepository from '../../repositories/faq.repository';
import { HTTP_CODES } from '../../constants/app_defaults.constant';
/****
 *
 *
 * Admin Create Faq
 */

export async function createFaq(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { category_id, question, answer } = req.body;

    if (!category_id) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: 'Hold up! You forgot to input the category ID.',
      });
    }

    const faq = await faqRepository.create({
      category_id: new Types.ObjectId(category_id),
      question,
      answer,
      created_by: admin_user._id,
    });

    if (faq) {
      // Audit
      await auditRepository.create({
        req,
        title: 'Faq created successfully',
        name: `${admin_user.first_name} ${admin_user.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.SUCCESS,
        user: admin_user._id,
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.CREATED,
        message: 'Success! Your FAQs have been fetched.',
        data: faq,
      });
    }
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
 * Fetch FAQs By Category
 */

export async function getFaqsByCategory(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const category_id = req.params.category_id;

    const faqs = await faqRepository.get({
      category_id: new Types.ObjectId(category_id),
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Faqs fetched successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your FAQs have been fetched.',
      data: faqs,
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
 * Fetch Single Faq
 */
export async function getSingleFaq(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const faq_id = new Types.ObjectId(req.params.faq_id);
    const faq = await faqRepository.getOne({ _id: faq_id });

    // Audit
    await auditRepository.create({
      req,
      title: 'Faq fetched successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your FAQ have been fetched.',
      data: faq,
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
 * Fetch Faqs
 */
export async function getFaqs(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const faqs = await faqRepository.findFaq(req);

    // Audit
    await auditRepository.create({
      req,
      title: 'Faqs fetched successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your FAQs have been fetched.',
      data: faqs,
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
 * Update Faqs
 */

export async function updateFaq(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const faq_id = new Types.ObjectId(req.params.faq_id);
    const { category_id, question, answer } = req.body;

    const faq = await faqRepository.atomicUpdate({_id: faq_id}, {
      $set: { category_id: new Types.ObjectId(category_id), question: question, answer: answer },
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Faq updated successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your Faq has been updated.',
      data: faq,
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
 * Delete Faq
 */
export async function deleteFaq(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const faq_id = new Types.ObjectId(req.params.faq_id);
    const faq = await faqRepository.delete({_id: faq_id});

    // Audit
    await auditRepository.create({
      req,
      title: 'Faq deleted successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Poof! FAQ deleted successfully.',
      data: faq,
    });
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/***********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * ********************** LANDING PAGE *********************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 */

/***
 *
 *
 *
 * Get Faq Categories Landing Page
 */

export async function getFaqCategories(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const faqCategories = await faqRepository.getCategories();

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Faq categories successfully retrieved.',
      data: faqCategories,
    });
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/***
 *
 *
 *
 * Get Faqs By Category Landing Page
 */

export async function getFaqsByCategoryLandingPage(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const category_id = req.params.category_id;

    const faqs = await faqRepository.get({
      category_id: new Types.ObjectId(category_id),
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your FAQ category has been fetched.',
      data: faqs,
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
 *
 * Get Faqs Landing Page
 */

export async function getFaqsLanding(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const { data } = await faqRepository.findFaqLandingPage(req);
    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your FAQs have been fetched.',
      data,
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
 * Fetch Faq
 */
export async function getSingleFaqLanding(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const faq_id = new Types.ObjectId(req.params.faq_id);

    const faq = await faqRepository.getOne({_id: faq_id });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your FAQ have been fetched',
      data: faq,
    });
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}
