    import { FilterQuery, Types, UpdateQuery } from 'mongoose';
    import { ILearnCategoryDocument } from '../interfaces/learn-category.interface';
    import { Learn, LearnCategory } from '../models';
    import { ExpressRequest } from '../server';
    import UtilFunctions, { convertDate, repoPagination, repoTime } from '../util';
    import { ILearnDocument, IStatus } from '../interfaces/learn.interface';

    class LearnRepository {
    // This function creates an Learn categories document in the database
    public async createCategory({
        category_name,
        category_description,
        category_alias,
    }: {
        category_name: string;
        category_description: string;
        category_alias: string;
    }): Promise<ILearnCategoryDocument | null | any> {
        return await LearnCategory.create({ category_name, category_description, category_alias });
    }

    // This function creates an Learn document in the database
    public async create({
        category_id,
        video_name,
        video_url,
        image,
        is_default,
        status = IStatus.PUBLISHED,
        created_by,
    }: {
        category_id: Types.ObjectId;
        video_name: string;
        video_url: string;
        image?: string;
        is_default?: boolean;
        status?: string;
        created_by?: Types.ObjectId;
    }): Promise<ILearnDocument | null> {
        const data = { category_id, video_name, video_url, image, is_default, status, created_by };

        return await Learn.create(data);
    }

    // Update learn documents by learn_id
    public async atomicUpdate(
        query: FilterQuery<ILearnDocument>,
        record: UpdateQuery<ILearnDocument>,
        ): Promise<ILearnDocument | null> {
        return Learn.findOneAndUpdate(
          query, record, {
            new: true,
        });
      }

    // Delete learn documents by learn_id
    public async delete(query: FilterQuery<ILearnDocument>): Promise<ILearnDocument | null> {
        return Learn.findByIdAndDelete(query);
      }

    // Get learn categories by learn_id
    public async getCategoryById({
            _id,
        }: {
            _id: Types.ObjectId;
        }): Promise<ILearnCategoryDocument | null | any> {
            return LearnCategory.findById(_id);
    }

    // Get all learn categories
    public async getCategories(): Promise<ILearnCategoryDocument | null | any> {
        return LearnCategory.find();
    }

    // Get learn categories by category_alias
    public async getOneCategory({
            category_alias,
        }: {
            category_alias: string;
        }): Promise<ILearnCategoryDocument | null | any> {
            return LearnCategory.findOne({ category_alias });
    }

    // Get learn categories by query object parameter provided
    public async findCategory(query: FilterQuery<ILearnCategoryDocument>): Promise<ILearnCategoryDocument[] | null | any> {
        return LearnCategory.find(query);
    }

    // Get default learn by query object parameter provided
    public async findDefault(query: FilterQuery<ILearnDocument>): Promise<ILearnDocument[] | null | any> {
        return Learn.find(query);
    }

    // Get and Update default learn by record object parameter provided
    public async findDefaultAndUpdate(record: any): Promise<ILearnDocument[] | null | any> {
        return Learn.findOneAndUpdate({ "is_default": true }, { ...record }, { new: true });
    }

    // Get all learns
    // This function is used to get all investments from the database
    public async findLearnAdmin(req: ExpressRequest): Promise<ILearnDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        let period = String(query.period) || '30days'; // Set the period
        const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Get the Learn and total documents from the database
        const [learn] = await Promise.all([
            Learn.find(timeFilter)
            .lean(true)
            .sort({ createdAt: -1 })
            .limit(perpage)
            .skip(page * perpage - perpage)
        ]);

        const total = await this.countDocs(timeFilter);
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination information
        return { learn, pagination };
    }

    public async countDocs(query: any): Promise<ILearnDocument | null | any> {
        return Learn.countDocuments({ ...query });
      }

    public async findLearnNoPagination(req: ExpressRequest): Promise<ILearnDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        let period = String(query.period) || 'all'; // Set the period
        const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });


        // Get the FAQs and total documents from the database
        const [learn] = await Promise.all([
            Learn.find(timeFilter)
            .lean(true)
            .sort({ createdAt: -1 })
        ]);

        // Return Learn data
        return learn ;
    }

    // Get all learn documents
    public async findLearnLandingPage(): Promise<ILearnDocument[] | null | any> {
        return Learn.find().lean(true).sort({ createdAt: -1 });
    }

    // Get learn documents by Categories
    public async getLearnByCategory({
            category_id,
        }: {
            category_id: Types.ObjectId;
        }): Promise<ILearnDocument | null | any> {
            return Learn.find({ category_id: category_id }).sort({ createdAt: -1 });
    }

    // Get learn documents by learn_id
    public async getOne(
        query: FilterQuery<ILearnDocument>,
        populate: string = ""
      ): Promise<ILearnDocument | null> {
          return Learn.findOne(query).populate(populate).lean(true);
      }
    }

    // Export LearnRepository
    export default new LearnRepository();
