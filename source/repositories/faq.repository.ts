import { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { IFaqCategoryDocument } from '../interfaces/faq-category.interface';
import { Faq, FaqCategory } from '../models';
import { ExpressRequest } from '../server';
import UtilFunctions, { repoPagination, repoTime } from '../util';
import { IFaqDocument, IStatus } from '../interfaces/faq.interface';
import { IPersonalizeMessageDocument } from '../interfaces/personalize-message.interface';

class FaqRepository {
  // Create a category for FAQ
  public async createCategory({
    _id,
    category_name,
    category_description,
    category_alias,
  }: {
    _id?: Types.ObjectId;
    category_name: string;
    category_description?: string;
    category_alias: string;
  }): Promise<IFaqCategoryDocument | null | any> {
    return await FaqCategory.create({ _id, category_name, category_description, category_alias });
  }

  // Create FAQ
  public async create({
    category_id,
    answer,
    question,
    status = IStatus.PUBLISHED,
    created_by,
  }: {
    category_id: Types.ObjectId;
    answer: string;
    question: string;
    status?: string;
    created_by?: Types.ObjectId;
  }): Promise<IFaqDocument | null | any> {
    const data = { category_id, answer, question, status, created_by };

    return await Faq.create(data);
  }

  // Update FAQ by faq_id
  // public async atomicUpdate(faq_id: Types.ObjectId, record: any) {
  //   return Faq.findOneAndUpdate({ _id: faq_id }, { ...record }, { new: true });
  // }
  public async atomicUpdate(
    query: FilterQuery<IFaqDocument>,
    record: UpdateQuery<IFaqDocument>,
    ): Promise<IPersonalizeMessageDocument | null> {
    return Faq.findOneAndUpdate(
      query, record, {
        new: true,
    });
  }

  // Delete FAQ by faq_id
  public async delete(query: FilterQuery<IFaqCategoryDocument>): Promise<IFaqDocument | null | any> {
    return Faq.findByIdAndDelete(query);
  }

  // Get FAQ categories by _id
  public async getCategoryById({
    _id,
  }: {
    _id: Types.ObjectId;
  }): Promise<IFaqCategoryDocument | null | any> {
    return FaqCategory.findById(_id);
  }

  // Update FAQ categories by faq_id
  public async getCategories(): Promise<IFaqCategoryDocument | null | any> {
    return FaqCategory.find();
  }

  // Update FAQ categories by category_alias
  public async getOneCategory({
    category_alias,
  }: {
    category_alias: string;
  }): Promise<IFaqCategoryDocument | null | any> {
    return FaqCategory.findOne({ category_alias });
  }

  // Get FAQ categories by the query object parameters passed
  public async findCategory(query: any): Promise<IFaqCategoryDocument[] | null | any> {
    return FaqCategory.find(query);
  }

  // Get FAQs - Admin
  public async findFaq(req: ExpressRequest): Promise<IFaqDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the amountFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the amountTo
    let period = String(query.period) || '90days'; // Set the type of transaction

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Get FAQs and total documents from the database
    const [faqs] = await Promise.all([
      Faq.find(timeFilter)
        .lean(true)
        .sort({ createdAt: -1 })
        .limit(perpage)
        .skip(page * perpage - perpage),
    ]);

    const total = await this.countDocs(timeFilter);

    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return { data: faqs, pagination };
  }

  public async countDocs(query: FilterQuery<IFaqDocument>): Promise<IFaqDocument | null | any> {
    return Faq.countDocuments({ ...query });
  }

  // Get FAQs (Landing page)
  public async findFaqLandingPage(req: ExpressRequest): Promise<IFaqDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    let filterQuery: any = {}; // Initialize the filter query object

    // Check if there is a search string and add it to the search query object
    if (search !== 'undefined' && Object.keys(search).length > 0) {
      filterQuery = {
        $or: [{ question: new RegExp(search, 'i') }, { answer: new RegExp(search, 'i') }],
      };
    }

    // Add timeFilter to the filter object
    const filter = { ...filterQuery };

    // Get the FAQs and total documents from the database
    const [faqs] = await Promise.all([
      Faq.find(filter)
        .lean(true)
        .sort({ createdAt: -1 })
        .limit(perpage)
        .skip(page * perpage - perpage),
    ]);

    const total = await this.countDocs(filterQuery);
    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return { data: faqs, pagination };
  }

  // Get FAQs by Categories (category_id)
  public async get(
    query: FilterQuery<IFaqDocument>,
    populate: string = ""
    ): Promise<IFaqDocument[] | null | any> {
    return Faq.find(query).populate(populate).lean(true).sort({ createdAt: -1 });
  }

  // // Get FAQs by faq_id
  // public async getFaqById({
  //   faq_id,
  // }: {
  //   faq_id: Types.ObjectId;
  // }): Promise<IFaqDocument | null | any> {
  //   return Faq.findById(faq_id);
  // }
  public async getOne(
    query: FilterQuery<IFaqDocument>,
    populate: string = ""
  ): Promise<IFaqDocument | null> {
      return Faq.findOne(query).populate(populate).lean(true);
  }
}

// Export FaqRepository
export default new FaqRepository();
