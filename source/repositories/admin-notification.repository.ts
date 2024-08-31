import { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { ExpressRequest } from '../server';
import { repoPagination, repoSearch, repoTime } from '../util';
import { IAdminNotificationDocument } from '../interfaces/admin-notification.interface';
import { AdminNotification } from '../models';
import userRepository from './user.repository';

class AdminNotificationRepository {

  // Create Admin Notification
  public async create( {
    category,
    user_id,
    title,
    content,
    action_link,
    user_category,
    created_by,
  }: {
    category: string;
    user_id: Types.ObjectId;
    title: string;
    content?: any;
    action_link?: string;
    user_category?: string;
    created_by: Types.ObjectId;
  }): Promise<IAdminNotificationDocument | null | any> {
    const notification = {
      category,
      user_id,
      title,
      content,
      action_link,
      user_category,
      created_by,
    };

    const data = await AdminNotification.create(notification);

    // Update user notification count
     await userRepository.atomicUpdate(
      user_id,
      { $inc: { notification_count: 1 } },
    );

    return data;
  }

  public async createSession( {
    category,
    user_id,
    title,
    content,
    action_link,
    user_category,
    created_by,
    session,
  }: {
    category: string;
    user_id: Types.ObjectId;
    title: string;
    content?: any;
    action_link?: string;
    user_category?: string;
    created_by: Types.ObjectId;
    session: any;
  }): Promise<IAdminNotificationDocument[] | null | any> {
    const notification = {
      category,
      user_id,
      title,
      content,
      action_link,
      user_category,
      created_by,
    };

    const data = await AdminNotification.create([notification], { session });
    // Update user notification count
    await userRepository.atomicUpdate(
      user_id,
      { $inc: { notification_count: 1 } },
    );

    return data;
  }

  // Update a notification by query
  public async atomicUpdate(
    query: FilterQuery<IAdminNotificationDocument>,
    record: UpdateQuery<IAdminNotificationDocument>,
    ): Promise<IAdminNotificationDocument | null> {
    return AdminNotification.findOneAndUpdate(
      query, record, {
        new: true,
    });
  }

  // Get all notifications (no pagination)
  public async getAllNoPagination({
    query, // Query object to filter the documents
    select, // String containing the fields to be selected from the documents
  }: {
    query: FilterQuery<IAdminNotificationDocument>, // Optional query object
    select?: string; // Optional string for selecting fields
  }): Promise<IAdminNotificationDocument[] | null | any> {
    return AdminNotification.find({ ...query })
      .lean(true) // Return plain JavaScript objects instead of Mongoose documents
      .select(select) // Select the specified fields from the documents
      .sort({ createdAt: -1 }); // Sort the documents
  }

  // Get all notifications for the admin
  public async findNotificationAdmin(req: ExpressRequest): Promise<IAdminNotificationDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search); // Set the string for searching
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    let period = String(query.period) || '30days'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: ['title', 'content'],
    });

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, filterQuery to the filter object
    const filter = { ...timeFilter, ...searching };

    // Get the notifications from the database
    const [notifications, total] = await Promise.all([
      AdminNotification.find(filter)
        .lean(true)
        .sort({ createdAt: -1 })
        .limit(perpage)
        .skip(page * perpage - perpage),
      AdminNotification.aggregate([
        { $match: filter },
        { $count: 'count' },
      ]),
    ]);

    const pagination = repoPagination({ page, perpage, total: total[0]?.count! });

    // Return data and pagination information
    return { data: notifications, pagination };
  }

  // Function to get user notifications
  public async getOne(
    query: FilterQuery<IAdminNotificationDocument>,
    populate: string = ""
  ): Promise<IAdminNotificationDocument | null> {
      return AdminNotification.findOne(query).populate(populate).lean(true);
  }
  public async getRecent(query: FilterQuery<IAdminNotificationDocument>,): Promise<IAdminNotificationDocument[] | null | any> {
    return AdminNotification.find(query).sort({ createdAt: -1 }).limit(10);
  }

  // Get notifications for export - No pagination
  public async findNotificationNoPagination(req: ExpressRequest): Promise<IAdminNotificationDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search); // Set the string for searching
    let period = String(query.period) || 'all'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: ['title', 'content'],
    });

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, filterQuery to the filter object
    const filter = { ...timeFilter, ...searching };

    // Get the notifications from the database
    const [notifications] = await Promise.all([
      AdminNotification.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            category: 1,
            user_category: 1,
            title: 1,
            content: 1,
            status: 1,
            created_date: {
              $dateToString: {
                format: '%Y-%m-%d', // Format string based on your requirements
                date: '$createdAt', // Replace 'dateField' with your actual field name containing the date
              },
            },
            created_time: {
              $dateToString: {
                format: '%H:%M:%S', // Format string based on your requirements
                date: '$createdAt', // Replace 'dateField' with your actual field name containing the date
              },
            },
          },
        },
      ]),
    ]);

    // Return data
    return notifications ;
  }

  // Mark as read all notifications attached to a user
  public async batchUpdate(
    query: FilterQuery<IAdminNotificationDocument>,
    record: UpdateQuery<IAdminNotificationDocument>,
    ): Promise<IAdminNotificationDocument | null | any> {
    return AdminNotification.updateMany({ ...query }, { ...record }, { new: true });
  }

    // Deletes a notification according to the query parameter
    public async delete(query: FilterQuery<IAdminNotificationDocument>): Promise<IAdminNotificationDocument | null> {
      return AdminNotification.findByIdAndDelete(query);
    }

  // Deletes all notifications attached to a user
  public async batchDelete(query: FilterQuery<IAdminNotificationDocument>) {
    return AdminNotification.deleteMany(query);
  }
}

// Export AdminNotificationRepository
export default new AdminNotificationRepository();
