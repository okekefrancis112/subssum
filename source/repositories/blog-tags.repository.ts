import { FilterQuery, Types, UpdateQuery } from "mongoose";
import { BlogTag } from "../models";
import { IBlogDocument } from "../interfaces/blog.interface";
import { IBlogTagDocument } from "../interfaces/blog-tag.interface";

class BlogTagRepository {

    // This function creates an Blog tags document in the database
    public async create({
        tag_name,
        tag_description,
        created_by
    }: {
        tag_name: string;
        tag_description: string;
        created_by: Types.ObjectId;
    }): Promise<IBlogTagDocument | null> {
        return await BlogTag.create({ tag_name, tag_description, created_by });
    }

    // Get all blog tags
    public async get(): Promise<IBlogTagDocument | null | any> {
        return BlogTag.find();
    }

    // Get blog tags by tag_alias
    public async getOne(
        query: FilterQuery<IBlogTagDocument>,
        populate: string = ""
    ): Promise<IBlogTagDocument | null> {
        return BlogTag.findOne(query).populate(populate).lean(true);
    }

    public async atomicUpdate(
        query: FilterQuery<IBlogTagDocument>,
        record: UpdateQuery<IBlogTagDocument>,
        session: any = null
    ): Promise<IBlogDocument | null> {
        return BlogTag.findOneAndUpdate(query, record, {
            session,
            new: true,
        });
    }

    // Delete blog_tag by tag_id
    public async delete(query: FilterQuery<IBlogTagDocument>,): Promise<IBlogTagDocument | null> {
        return BlogTag.findOneAndDelete(query);
    }

}

export default new BlogTagRepository();
