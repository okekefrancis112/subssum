import { Types } from 'mongoose';
import { Response } from 'express';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import learnRepository from '../../repositories/learn.repository';
import { UploadedFile } from 'express-fileupload';
import ImageService from '../../services/image.service';
import UtilFunctions, { export2Csv, throwIfAdminUserUndefined } from '../../util';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

/****
 *
 *
 * Admin Create Learn
 */

export async function createLearn(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { category_id, video_url, video_name, is_default } = req.body;

    if (!category_id) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: 'You need to enter a category ID.',
      });
    }
    let uploadLearnImage;

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

      uploadLearnImage = await ImageService.uploadImageToS3(
        `learn-${UtilFunctions.generateRandomString(7)}`,
        image,
        image.mimetype
      );
    }

    if(is_default === "true") {
      await learnRepository.findDefaultAndUpdate(
        { $set: { "is_default": false } },
      )
    }

    const learn = await learnRepository.create({
      category_id: new Types.ObjectId(category_id),
      video_name,
      video_url,
      image: uploadLearnImage,
      is_default,
      created_by: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.CREATED,
      message: 'Well done! Your latest Learn content is now live.',
      data: learn,
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
 * Fetch Learn By Category
 */

export async function getLearnsByCategory(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const category_id = req.params.category_id;

    const learns = await learnRepository.getLearnByCategory({
      category_id: new Types.ObjectId(category_id),
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Learns fetched successfully',
      data: learns,
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
 * Fetch All Learns
 */
export async function getLearns(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { learn, pagination } = await learnRepository.findLearnAdmin(req);

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Learns fetched successfully',
      data: { learn, pagination },
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
 * Fetch Single Learn
 */
export async function getSingleLearn(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const learn_id = new Types.ObjectId(req.params.learn_id);
    const learn = await learnRepository.getOne({_id: learn_id });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Learn fetched successfully',
      data: learn,
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
 * Update Learn
 */

export async function updateLearn(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { category_id, video_name, video_url, is_default } = req.body;
    const learn_id = new Types.ObjectId(req.params.learn_id);
    const learn = await learnRepository.getOne({_id: learn_id });
    const learn_image = learn?.image;

    if (learn_image) {
      await ImageService.deleteImageFromS3(learn_image);
    }

    let uploadLearnImage;

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

      uploadLearnImage = await ImageService.uploadImageToS3(
        `learn-${UtilFunctions.generateRandomString(7)}`,
        image,
        image.mimetype
      );
    }

    if(is_default === "true") {
      await learnRepository.findDefaultAndUpdate(
        { $set: { "is_default": false } },
      )
    }

    const editLearn = await learnRepository.atomicUpdate(learn_id, {
      $set: {
        category_id: new Types.ObjectId(category_id),
        video_name: video_name,
        video_url: video_url,
        image: uploadLearnImage,
        is_default: is_default,
      },
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Learn updated successfully',
      data: editLearn,
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
 * Delete Learn
 */
export async function deleteLearn(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const learn_id = new Types.ObjectId(req.params.learn_id);
    const learn = await learnRepository.getOne({_id: learn_id });
    const learn_image = learn?.image;

    if (learn_image) {
      await ImageService.deleteImageFromS3(learn_image);
    }

    const delData = await learnRepository.delete({_id: learn_id});

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Learn deleted successfully',
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

/****
 *
 *
 * Export Learn
 */
export async function exportLearn(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const learn = await learnRepository.findLearnNoPagination(req);
    const fields = [ 'video_url', 'video_name', 'image', 'is_default' ];

    export2Csv(res, learn, 'learn', fields);

    } catch (error: any | Error | unknown) {
    return ResponseHandler.sendErrorResponse({ res, code: 500, error: error.message });
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
 * Get Learn Categories Landing Page
 */

export async function getLearnCategories(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const learnCategories = await learnRepository.getCategories();

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Learn categories fetched successfully',
      data: learnCategories,
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
 * Get Learns By Category Landing Page
 */

export async function getLearnsByCategoryLandingPage(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const category_id = req.params.category_id;

    const learns = await learnRepository.getLearnByCategory({
      category_id: new Types.ObjectId(category_id),
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Learns fetched successfully',
      data: learns,
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
 * Get Learns Landing Page
 */

export async function getLearnsLanding(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const data = await learnRepository.findLearnLandingPage();

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Learns fetched successfully',
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
 * Fetch Learn
 */
export async function getSingleLearnLanding(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const learn_id = new Types.ObjectId(req.params.learn_id);

    const data = await learnRepository.getOne({_id: learn_id });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Learn fetched successfully',
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

/****
 *
 *
 * Fetch Default Learn
 */
export async function getDefaultLearn(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const learn = await learnRepository.findDefault({ "is_default": true });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Default Learn fetched successfully',
      data: learn,
    });
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}