import { FilterQuery, Types, UpdateQuery } from "mongoose";
import { Blog } from "../models";
import { IBlogDocument, IBlogStatus } from "../interfaces/blog.interface";
import { ExpressRequest } from "../server";
import { repoTime, repoPagination, repoSearch } from "../util";

class BlogRepository {

    public async create({
        category_id,
        title,
        content,
        image,
        slug,
        author,
        tags,
        created_by,
    }: {
        category_id: Types.ObjectId;
        title: string;
        content: string;
        image?: string;
        slug: string;
        author: string;
        tags: Array<Types.ObjectId>;
        created_by: Types.ObjectId;
        }): Promise<IBlogDocument> {
        const data = {
            category_id: category_id,
            title: title,
            content: content,
            slug: slug,
            image: image,
            author: author,
            tags: tags,
            created_by: created_by,
        };
        return await Blog.create(data);
    }

    public async getOne(
        query: FilterQuery<IBlogDocument>,
        populate: string = "",
        select: string = ""
    ): Promise<IBlogDocument | null> {
        return Blog.findOne(query).select(select).populate(populate).lean(true);
    }

    public async find(
        query: FilterQuery<IBlogDocument>,
        populate: string = ""
    ): Promise<IBlogDocument[]> {
        return Blog.find(query).populate(populate).sort({ createdAt: -1 }).exec();
    }

    public async atomicUpdate(
        query: FilterQuery<IBlogDocument>,
        record: UpdateQuery<IBlogDocument>,
        session: any = null
    ): Promise<IBlogDocument | null> {
        return Blog.findOneAndUpdate(query, record, {
            session,
            new: true,
        });
    }

    // Delete blog by blog_id
    public async delete(query: FilterQuery<IBlogDocument>,): Promise<IBlogDocument | null> {
        return Blog.findOneAndDelete(query);
    }

    // Function to get all blogs (Admin)
  public async findBlogAdmin(req: ExpressRequest): Promise<IBlogDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    let period = String(query.period) || 'all'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the amountFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the amountTo

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter to the filter object
    const filter = { ...timeFilter, is_deleted: false };

    // Get the blogs and total documents from the database
    const [blogs, total] = await Promise.all([
        Blog.find(filter)
        .lean(true)
        .sort({ createdAt: -1 })
        .limit(perpage)
        .skip(page * perpage - perpage),
        Blog.aggregate([
        { $match: filter },
        { $count: 'count' },
      ]),
    ]);

    const pagination = repoPagination({ page, perpage, total: total[0]?.count! });

    // Return data and pagination information
    return { data: blogs, pagination };
  }

  // Get FAQs (Landing page)
  public async findBlog(req: ExpressRequest): Promise<IBlogDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
        search: search,
        searchArray: [
            "title",
            "content",
        ],
    });

    // Add timeFilter to the filter object
    const filter = { ...searching, status : IBlogStatus.PUBLISHED, is_deleted: false };

    // Get the FAQs and total documents from the database
    const [blogs] = await Promise.all([
        Blog.find(filter)
            .lean(true)
            .sort({ createdAt: -1 })
            .limit(perpage)
            .skip(page * perpage - perpage),
    ]);

    const total = await this.countDocs(filter);
    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return { data: blogs, pagination };
  }

  public async countDocs(query: any): Promise<IBlogDocument | null | any> {
    return Blog.countDocuments({ ...query });
  }

}

export default new BlogRepository();
