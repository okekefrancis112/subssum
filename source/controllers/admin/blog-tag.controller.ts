import { Types } from 'mongoose';
import { Response } from 'express';

import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import { throwIfAdminUserUndefined } from '../../util';
import { HTTP_CODES } from '../../constants/app_defaults.constant';
import blogTagsRepository from '../../repositories/blog-tags.repository';

export async function createBlogTag(req: ExpressRequest, res: Response) {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { tag_name, tag_description } = req.body;

    const tag = await blogTagsRepository.create({
      tag_name,
      tag_description,
      created_by: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! The blog tag has been created.',
      data: tag,
    });
  } catch (err: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${err}`,
    });
  }
}

export async function getBlogTag(req: ExpressRequest, res: Response) {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { tag_id } = req.params;

    const blog_tag = await blogTagsRepository.getOne({
      _id: new Types.ObjectId(tag_id),
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Your blog tag have been retrieved successfully!',
      data: blog_tag,
    });
  } catch (err: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${err}`,
    });
  }
}

export async function getBlogTags(req: ExpressRequest, res: Response) {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');

    const tags = await blogTagsRepository.get();

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Your blog tags have been retrieved successfully!',
      data: tags,
    });
  } catch (err: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${err}`,
    });
  }
}

export async function deleteBlogTag(req: ExpressRequest, res: Response) {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { tag_id } = req.params;

    const data = await blogTagsRepository.delete({_id: new Types.ObjectId(tag_id)});

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: "And... it's gone! Blog Tag deleted successfully.",
        data
      });
  } catch (err: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${err}`,
    });
  }
}

export async function editBlogTag(req: ExpressRequest, res: Response) {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { tag_id } = req.params;
    const { tag_name, tag_description } = req.body;

    const get_tag = await blogTagsRepository.getOne({ _id: new Types.ObjectId(tag_id) });

    if (!get_tag) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: 'Blog tag not found',
      });
    }

    const tag = await blogTagsRepository.atomicUpdate({_id: new Types.ObjectId(tag_id)}, {
      $set: {
        tag_name: tag_name ?? get_tag?.tag_name,
        tag_description: tag_description ?? get_tag?.tag_description,
      },
    });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Nice work! Blog tag successfully updated.',
        data: tag
      });
  } catch (err: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${err}`,
    });
  }
}
