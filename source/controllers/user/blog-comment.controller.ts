import { Response } from "express";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import {
    HTTP_CODES,
} from "../../constants/app_defaults.constant";
import { Types } from "mongoose";
import { throwIfUndefined } from "../../util";
import blogCommentsRepository from "../../repositories/blog-comments.repository";

/****
 *
 *
 *
 * Create comments
 */

 export async function createBlogComment(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const blog_id = new Types.ObjectId(req.params.blog_id);
    const { comment } = req.body;
    const comments = await blogCommentsRepository.create({
      user_id: user._id,
      blog_id,
      comment
    })

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Commented.',
      data: comments,
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
 * Edit comment
 */

export async function editBlogComment(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    throwIfUndefined(req.user, 'req.user');
    const comment_id = new Types.ObjectId(req.params.comment_id);
    const commentt = await blogCommentsRepository.getOne({_id: comment_id, is_deleted: false });
    const { comment } = req.body;

    // Check if comment exists
    if (!commentt) {
      // Send an appropriate response and error message if the comment does not exist
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: `comment does not exist`,
      });
    }

    const edit_comment = await blogCommentsRepository.atomicUpdate({_id: comment_id }, {
      $set:{
        comment: comment ?? commentt.comment,
      },
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Blog comment edited.',
      data: edit_comment,
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
 * Get comments
 */

export async function getBlogComments(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    throwIfUndefined(req.user, 'req.user');
    const blog_id = new Types.ObjectId(req.params.blog_id);

    const comments = await blogCommentsRepository.find(
      {blog_id: blog_id, is_deleted: false}
    );

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Blog comments retrieved.',
      data: comments,
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
 * Fetch Single Blog Comments
 */
export async function getSingleBlogComment(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    throwIfUndefined(req.user, 'req.user');
    const comment_id = new Types.ObjectId(req.params.comment_id);

    const comment = await blogCommentsRepository.getOne({_id: comment_id, is_deleted: false});

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Your blog comment has been fetched successfully!.',
        data: comment,
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
 * Delete Blog Comment
 */
export async function deleteBlogComment(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    throwIfUndefined(req.user, 'req.user');
    const comment_id = new Types.ObjectId(req.params.comment_id);

    const delData = await blogCommentsRepository.atomicUpdate({_id: comment_id}, {
      $set: { is_deleted: true },
    });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Your blog comment has been deleted successfully!.',
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