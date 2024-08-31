import { FilterQuery } from "mongoose";
import { BlogCategory } from "../models";
import { IBlogCategoryDocument } from "../interfaces/blog-category.interface";

class BlogCategoryRepository {
    // This function creates an Blog categories document in the database
    public async create({
        category_name,
        category_description,
        category_alias,
    }: {
        category_name: string;
        category_description: string;
        category_alias: string;
    }): Promise<IBlogCategoryDocument | null | any> {
        return await BlogCategory.create({ category_name, category_description, category_alias });
    }

    // Get all blog categories
    public async get(): Promise<IBlogCategoryDocument | null | any> {
        return BlogCategory.find();
    }

    // Get blog categories by category_alias
    public async getOne(
        query: FilterQuery<IBlogCategoryDocument>,
        populate: string = ""
    ): Promise<IBlogCategoryDocument | null | any> {
        return BlogCategory.findOne(query).populate(populate).lean(true);
    }

}

export default new BlogCategoryRepository();
