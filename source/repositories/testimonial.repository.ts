import { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { Testimonial } from '../models';
import { ExpressRequest } from '../server';
import { ITestimonialDocument, IStatus } from '../interfaces/testimonial.interface';
import { repoPagination, repoTime } from '../util';


class TestimonialRepository {
  // Function to create testimonial
  public async create({
    name,
    slug,
    job_role,
    content,
    image,
    status = IStatus.PUBLISHED,
    created_by,
  }: {
    name: string;
    slug: string;
    job_role: string;
    content: string;
    image?: string;
    status?: string;
    created_by?: Types.ObjectId;
  }): Promise<ITestimonialDocument | null> {
    const data = { name, slug, job_role, content, image, status, created_by };

    return await Testimonial.create(data);
  }

  // Function to update testimonial by testimonial_id
  public async atomicUpdate(
    query: FilterQuery<ITestimonialDocument>,
    record: UpdateQuery<ITestimonialDocument>,
    ): Promise<ITestimonialDocument | null> {
    return Testimonial.findOneAndUpdate(
      query, record, {
        new: true,
    });
  }

  // Function to delete testimonial by testimonial_id
  public async delete(query: FilterQuery<ITestimonialDocument>): Promise<ITestimonialDocument | null> {
    return Testimonial.findByIdAndDelete(query);
  }

  // Function to get all testimonials (Admin)
  public async findTestimonialAdmin(req: ExpressRequest): Promise<ITestimonialDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    let period = String(query.period) || '90days'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the amountFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the amountTo

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter to the filter object
    const filter = { ...timeFilter };

    // Get the testimonials and total documents from the database
    const [testimonials, total] = await Promise.all([
      Testimonial.find(filter)
        .lean(true)
        .sort({ createdAt: -1 })
        .limit(perpage)
        .skip(page * perpage - perpage),
      Testimonial.aggregate([
        { $match: filter },
        { $count: 'count' },
      ]),
    ]);

    const pagination = repoPagination({ page, perpage, total: total[0]?.count! });

    // Return data and pagination information
    return { data: testimonials, pagination };
  }

  // Get testimonials for landing page
  public async findTestimonialLandingPage(): Promise<ITestimonialDocument[] | null | any> {
    return Testimonial.find().lean(true).sort({ createdAt: -1 });
  }

  // Get testimonials by testimonial_id
  public async getOne(
    query: FilterQuery<ITestimonialDocument>,
    populate: string = ""
  ): Promise<ITestimonialDocument | null> {
      return Testimonial.findOne(query).populate(populate).lean(true);
  }

}

// Export testimonialRepository
export default new TestimonialRepository();
