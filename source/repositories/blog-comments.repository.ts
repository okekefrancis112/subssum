import { FilterQuery, Types, UpdateQuery } from "mongoose";
import { BlogComment } from "../models";
import { IBlogCommentDocument } from "../interfaces/blog-comment.interface";

class BlogCommentRepository {
    // This function creates an Blog categories document in the database
    public async create({
        user_id,
        blog_id,
        comment
    }: {
        user_id: Types.ObjectId;
        blog_id: Types.ObjectId;
        comment: string;
    }): Promise<IBlogCommentDocument> {
        return await BlogComment.create({ user_id, blog_id, comment });
    }

    // Get single blog comments by query
    public async getOne(
        query: FilterQuery<IBlogCommentDocument>,
        populate: string = ""
    ): Promise<IBlogCommentDocument | null> {
        return BlogComment.findOne(query).populate(populate).lean(true);
    }

    // Get blog categories by query object parameter provided
    public async find(
        query: FilterQuery<IBlogCommentDocument>,
        populate: string = ""
    ): Promise<IBlogCommentDocument[] | null> {
        return BlogComment.find(query).populate(populate).lean(true);
    }

    public async atomicUpdate(
        query: FilterQuery<IBlogCommentDocument>,
        record: UpdateQuery<IBlogCommentDocument>,
    ): Promise<IBlogCommentDocument | null> {
        return BlogComment.findOneAndUpdate(query, record, {
            new: true,
        });
    }
}

export default new BlogCommentRepository();
