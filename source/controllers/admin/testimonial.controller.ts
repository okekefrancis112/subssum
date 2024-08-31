import { Types } from 'mongoose';
import { Response } from 'express';

import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import testimonialRepository from '../../repositories/testimonial.repository';
import { UploadedFile } from 'express-fileupload';
import ImageService from '../../services/image.service';
import UtilFunctions, { slugify, throwIfAdminUserUndefined } from '../../util';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

/****
 *
 *
 * Admin Create Testimonial
 */

export async function createTestimonial(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { name, job_role, content } = req.body;
    let uploadTestimonialImage;

    if (req.files?.image) {
      const image = req.files.image as UploadedFile;

      const validateFileResult = await UtilFunctions.validateUploadedFile({
        file: image,
      });

      if (!validateFileResult.success) {
        return ResponseHandler.sendErrorResponse({
          code: HTTP_CODES.BAD_REQUEST,
          error: validateFileResult.error as string,
          res,
        });
      }

      uploadTestimonialImage = await ImageService.uploadImageToS3(
        `testimonial-${UtilFunctions.generateRandomString(7)}`,
        image,
        image.mimetype
      );
    }
    const slug: string = slugify(name);

    const testimonial = await testimonialRepository.create({
      name,
      slug: slug,
      job_role,
      content,
      image: uploadTestimonialImage,
      created_by: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.CREATED,
      message: 'Testimonial created successfully',
      data: testimonial,
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
 * Fetch All Testimonials
 */
export async function getTestimonials(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const testimonial = await testimonialRepository.findTestimonialAdmin(req);

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Your testimonials are here!',
      data: testimonial,
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
 * Fetch Testimonial
 */
export async function getSingleTestimonial(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const testimonial_id = new Types.ObjectId(req.params.testimonial_id);
    const testimonial = await testimonialRepository.getOne({_id: testimonial_id });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Your testimonial is here!',
      data: testimonial,
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
 * Update Testimonial
 */

export async function updateTestimonial(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { name, job_role, content } = req.body;
    const testimonial_id = new Types.ObjectId(req.params.testimonial_id);
    const testimonial = await testimonialRepository.getOne({_id: testimonial_id });
    const testimonial_image = testimonial?.image;

    if (testimonial_image) {
      await ImageService.deleteImageFromS3(testimonial_image);
    }

    let uploadTestimonialImage;

    if (req.files?.image) {
      const image = req.files.image as UploadedFile;

      const validateFileResult = await UtilFunctions.validateUploadedFile({
        file: image,
      });

      if (!validateFileResult.success) {
        return ResponseHandler.sendErrorResponse({
          code: HTTP_CODES.BAD_REQUEST,
          error: validateFileResult.error as string,
          res,
        });
      }

      uploadTestimonialImage = await ImageService.uploadImageToS3(
        `testimonial-${UtilFunctions.generateRandomString(7)}`,
        image,
        image.mimetype
      );
    }

    const slug: string = slugify(name);

    const editTestimonial = await testimonialRepository.atomicUpdate(testimonial_id, {
      $set: {
        name: name,
        slug: slug,
        job_role: job_role,
        content: content,
        image: uploadTestimonialImage,
      },
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your testimonial has been updated.',
      data: editTestimonial,
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
 * Delete Testimonial
 */
export async function deleteTestimonial(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const testimonial_id = new Types.ObjectId(req.params.testimonial_id);
    const testimonial = await testimonialRepository.getOne({_id: testimonial_id });
    const testimonial_image = testimonial?.image;

    if (testimonial_image) {
      await ImageService.deleteImageFromS3(testimonial_image);
    }

    const delData = await testimonialRepository.delete({_id: testimonial_id});

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Testimonial deleted like it never existed.',
      data: delData,
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

/****
 *
 *
 *
 * Get Testimonials Landing Page
 */

export async function getTestimonialsLanding(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const data = await testimonialRepository.findTestimonialLandingPage();

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your testimonials have been gathered.',
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
 * Fetch Testimonial
 */
export async function getSingleTestimonialLanding(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const testimonial_id = new Types.ObjectId(req.params.testimonial_id);

    const data = await testimonialRepository.getOne({_id: testimonial_id });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your testimonial has been gathered.',
      data: data,
    });
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}
