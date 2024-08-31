import { Response } from "express";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import {
    HTTP_CODES,
} from "../../constants/app_defaults.constant";
import blogRepository from "../../repositories/blog.repository";
import mongoose, { Types, startSession } from "mongoose";
import { IBlogStatus } from "../../interfaces/blog.interface";
import { throwIfUndefined } from "../../util";
import blogCategoriesRepository from "../../repositories/blog-categories.repository";
import blogTagsRepository from "../../repositories/blog-tags.repository";

/***
 *
 *
 *
 * Get Blogs Categories
 */

export async function getBlogCategories(
    req: ExpressRequest,
    res: Response
  ): Promise<Response | void> {
    try {
        const blogCategories = await blogCategoriesRepository.get();

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: 'Blog categories successfully retrieved.',
            data: blogCategories,
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
 * Get Blogs Tags
 */

export async function getBlogTags(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
      const blogCategories = await blogTagsRepository.get();

      return ResponseHandler.sendSuccessResponse({
          res,
          code: HTTP_CODES.OK,
          message: 'Blog tags successfully retrieved.',
          data: blogCategories,
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
 * Get Blogs By Category
 */

export async function getBlogsByCategory(
    req: ExpressRequest,
    res: Response
  ): Promise<Response | void> {
    try {
        const category_id = req.params.category_id;

        const blogs = await blogRepository.find({
            category_id: new Types.ObjectId(category_id),
            status: IBlogStatus.PUBLISHED,
            is_deleted: false
        });

        return ResponseHandler.sendSuccessResponse({
          res,
          code: HTTP_CODES.OK,
          message: 'Success! Your blog category has been fetched.',
          data: blogs,
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
 * Get Blogs By Tag
 */

export async function getBlogsByTag(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
      const { tags }: { tags: string[] } = req.body;

      const getBlogs = await blogRepository.find( {
          tags: { $in: tags.map(id => new mongoose.Types.ObjectId(id)) },
          status: IBlogStatus.PUBLISHED,
          is_deleted: false,
        }
      );

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Fetched.',
        data: getBlogs,
      });
  }
  catch (error) {
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
 * Get Blogs
 */

export async function getBlogs(req: ExpressRequest, res: Response): Promise<Response | void> {
    try {
      const { data } = await blogRepository.findBlog(req);
      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Success! Your Blogs have been fetched.',
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
 *
 * Get Single Blog
 */

export async function getBlog(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const blog_id = new Types.ObjectId(req.params.blog_id);
    const blog = await blogRepository.getOne({_id: blog_id, is_deleted: false, status: IBlogStatus.PUBLISHED });

    // Check if blog exists
    if (!blog) {
      // Send an appropriate response and error message if the blog does not exist
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: `Blog does not exist`,
      });
    }

    const data = await blogRepository.atomicUpdate({_id: blog._id}, {
      $addToSet:{
        views: user._id,
      },
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Viewed Blog.',
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
 *
 * Edit Blog likes
 */

 export async function likeBlog(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const user = throwIfUndefined(req.user, 'req.user');
    const blog_id = new Types.ObjectId(req.params.blog_id);
    const blog = await blogRepository.getOne({_id: blog_id, is_deleted: false });

    // Check if blog exists
    if (!blog) {
      // Send an appropriate response and error message if the blog does not exist
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: `Blog does not exist`,
      });
    }

    const likesAsString = blog?.likes?.map((like) => like.toString()) || [];

    if(likesAsString.includes(user.id)){
      await blogRepository.atomicUpdate({_id: blog._id}, {
        $pull:{
          likes: user._id,
        },
      });
      const getlikes = await blogRepository.getOne({_id: blog._id });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Unliked.',
        data: getlikes,
      });
    } else {
      await blogRepository.atomicUpdate({_id: blog._id}, {
        $addToSet:{
          likes: user._id,
        },
      });
      const getlikes = await blogRepository.getOne({_id: blog._id });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Liked.',
        data: getlikes,
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
