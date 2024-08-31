import { Types } from 'mongoose';
import { Response } from 'express';

import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import auditRepository from '../../repositories/audit.repository';
import { IAuditActivityStatus, IAuditActivityType } from '../../interfaces/audit.interface';
import { UploadedFile } from 'express-fileupload';
import ImageService from '../../services/image.service';
import UtilFunctions, { slugify, throwIfAdminUserUndefined } from '../../util';
import { HTTP_CODES } from '../../constants/app_defaults.constant';
import blogRepository from '../../repositories/blog.repository';
import { IBlogStatus } from '../../interfaces/blog.interface';
import blogCategoriesRepository from '../../repositories/blog-categories.repository';
import blogCommentsRepository from '../../repositories/blog-comments.repository';

export async function getBlogCategories(req: ExpressRequest, res: Response) {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');

    const tags = await blogCategoriesRepository.get();

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Your blog categories have been retrieved successfully!',
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

/****
 *
 *
 * Admin Create Blog
 */

export async function createBlog(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { category_id, title, content, author, tags } = req.body;
    let uploadBlogImage;

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

      uploadBlogImage = await ImageService.uploadImageToS3(
        `blog-${UtilFunctions.generateRandomString(7)}`,
        image,
        image.mimetype
      );
    }
    const slug: string = slugify(title);

    const blog = await blogRepository.create({
      category_id,
      title,
      content,
      image: uploadBlogImage,
      slug: slug,
      author,
      tags: tags,
      created_by: admin_user._id,
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Success! Your blog has been created.',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.CREATED,
      message: 'blog created successfully',
      data: blog,
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
 * Fetch All Blogs
 */
export async function getBlogs(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const blog = await blogRepository.findBlogAdmin(req);

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Your blogs are here!',
      data: blog,
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
 * Fetch All Blogs by category
 */
export async function getBlogsByCategory(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const category_id = new Types.ObjectId(req.params.category_id);
    const blog = await blogRepository.find({category_id: category_id, is_deleted: false});

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Your blogs are here!',
      data: blog,
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
 * Fetch Blog
 */
export async function getSingleBlog(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const blog_id = new Types.ObjectId(req.params.blog_id);
    const blog = await blogRepository.getOne({_id: blog_id, is_deleted: false});

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Your blog is here!',
      data: blog,
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
 * Publish Blog
 */
export async function publishBlog(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const blog_id = new Types.ObjectId(req.params.blog_id);
    const blog = await blogRepository.getOne({_id: blog_id, is_deleted: false});

    // Check if blog exists
    if (!blog) {
      // Send an appropriate response and error message if the blog does not exist
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: `blog does not exist`,
      });
    }

    const publish = await blogRepository.atomicUpdate({_id: blog_id}, {
      $set: {
        status: IBlogStatus.PUBLISHED,
      },
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Blog published successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Blog published successfully',
      data: publish,
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
 * Edit Blog
 */

export async function editBlog(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { title, content, author, tags } = req.body;
    const blog_id = new Types.ObjectId(req.params.blog_id);
    const blog = await blogRepository.getOne({_id: blog_id });
    const blog_image = blog?.image;

    if (blog_image) {
      await ImageService.deleteImageFromS3(blog_image);
    }

    let uploadBlogImage;

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

      uploadBlogImage = await ImageService.uploadImageToS3(
        `blog-${UtilFunctions.generateRandomString(7)}`,
        image,
        image.mimetype
      );
    }

    const editBlog = await blogRepository.atomicUpdate({_id: blog_id}, {
      $set: {
        title: title ?? blog?.title,
        content: content ?? blog?.content,
        image: uploadBlogImage ?? blog?.image,
        slug: slugify(title) ?? blog?.slug,
        author: author ?? blog?.author,
        tags: tags ?? blog?.tags,
      },
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Blog updated successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Your blog has been updated.',
      data: editBlog,
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
 * Hard delete Blog
 */
export async function hardDeleteBlog(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const blog_id = new Types.ObjectId(req.params.blog_id);
    const blog = await blogRepository.getOne({_id: blog_id });
    const blog_image = blog?.image;

    if (blog_image) {
      await ImageService.deleteImageFromS3(blog_image);
    }

    const delData = await blogRepository.delete({_id: blog_id});

    // Audit
    await auditRepository.create({
      req,
      title: 'Blog deleted successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Success! Blog deleted like it never existed.',
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
 * Delete Blog
 */
export async function deleteBlog(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const blog_id = new Types.ObjectId(req.params.blog_id);

    const delData = await blogRepository.atomicUpdate({_id: blog_id}, {$set: { is_deleted: true }});

    // Audit
    await auditRepository.create({
      req,
      title: 'Blog deleted successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });
      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.OK,
        message: 'Your blog has been deleted successfully!.',
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
 * Delete Blog Comment
 */
export async function deleteBlogComment(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const comment_id = new Types.ObjectId(req.params.comment_id);

    const delData = await blogCommentsRepository.atomicUpdate({_id: comment_id}, {
      $set: { is_deleted: true },
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Blog comment deleted successfully',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
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