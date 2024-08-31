import { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { PersonalizeMessage } from '../models';
import { ExpressRequest } from '../server';
import { repoPagination, repoSearch, repoTime } from '../util';
import { IPersonalizeMessageDocument } from '../interfaces/personalize-message.interface';

class PersonalizeMessageRepository {
  // Create Personalize Message
  public async create({
    morning_message,
    afternoon_message,
    evening_message,
    created_by,
  }: {
    morning_message: string;
    afternoon_message: string;
    evening_message: string;
    created_by: Types.ObjectId;
  }): Promise<IPersonalizeMessageDocument | null | any> {
    const data = {
      morning_message,
      afternoon_message,
      evening_message,
      created_by,
    };

    return await PersonalizeMessage.create(data);
  }

  // Get personalize message based on query object parameters passed
  public async getOne(
    query: FilterQuery<IPersonalizeMessageDocument>,
    populate: string = ""
  ): Promise<IPersonalizeMessageDocument | null> {
      return PersonalizeMessage.findOne(query).populate(populate).lean(true);
  }

  // Update personalize message based on _id passed
  public async atomicUpdate(
    query: FilterQuery<IPersonalizeMessageDocument>,
    record: UpdateQuery<IPersonalizeMessageDocument>,
    ): Promise<IPersonalizeMessageDocument | null> {
    return PersonalizeMessage.findOneAndUpdate(
      query, record, {
        new: true,
    });
  }

  // Update all personalize messages based on query and record object parameters passed
  public async batchUpdate(
    query: FilterQuery<IPersonalizeMessageDocument>,
    record: UpdateQuery<IPersonalizeMessageDocument>,
    ): Promise<IPersonalizeMessageDocument | null | any> {
    return PersonalizeMessage.updateMany({ ...query }, { ...record }, { new: true });
  }

  // Delete personalize message based on _id passed
  public async delete(query: FilterQuery<IPersonalizeMessageDocument>): Promise<IPersonalizeMessageDocument | null> {
    return PersonalizeMessage.findByIdAndDelete(query);
  }

  // Get Personalize Message
  public async findPersonalizeMessageAdmin(
    req: ExpressRequest
  ): Promise<IPersonalizeMessageDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search); // Set the string for searching
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    let period = String(query.period) || 'all'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: [
        'morning_message', 'afternoon_message', 'evening_message',
      ],
    });

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, filterQuery to the filter object
    const filter = { ...timeFilter, ...searching };

    // Get the messages data and total from the database
    const [messages] = await Promise.all([
      PersonalizeMessage.find(filter)
        .lean(true)
        .sort({ createdAt: -1 })
        .limit(perpage)
        .skip(page * perpage - perpage),
    ]);

    const total = await this.countDocs(filter);
    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return { messages, pagination };
  }

  public async countDocs(query: FilterQuery<IPersonalizeMessageDocument>): Promise<IPersonalizeMessageDocument | null | any> {
    return PersonalizeMessage.countDocuments(query);
  }

  // This function finds an aggregate of a given query
  // and returns an array of IPersonalizeMessageDocument objects or null
  public async findAggregate(query: any): Promise<IPersonalizeMessageDocument[] | null> {
    // Use the PersonalizeMessage model to aggregate the given query
    return PersonalizeMessage.aggregate(query);
  }

  // Get Personalize Messages Document - no pagination
  public async findMessagesNoPagination({
    req,
  }: {
    req: ExpressRequest;
  }): Promise<IPersonalizeMessageDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search); // Set the string for searching
    let period = String(query.period) || 'all'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: [
        'morning_message', 'afternoon_message', 'evening_message',
      ],
    });

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, filterQuery to the filter object
    const filter = { ...timeFilter, ...searching };

    // Create pipeline for aggregate query
    const message_pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          morning_message: 1,
          afternoon_message: 1,
          evening_message: 1,
          is_default: 1,
          created_date: {
            $dateToString: {
              format: "%Y-%m-%d", // Format string based on your requirements
              date: "$createdAt" // Replace 'dateField' with your actual field name containing the date
            }
          },
          created_time: {
            $dateToString: {
              format: "%H:%M:%S", // Format string based on your requirements
              date: "$createdAt" // Replace 'dateField' with your actual field name containing the date
            }
          },
        },
      },
    ];

    const messages = await this.findAggregate(message_pipeline);

    // Return personalize messages information
    return messages;
  }
}

// Export PersonalizeMessageRepository
export default new PersonalizeMessageRepository();
