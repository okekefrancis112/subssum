import { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { Track } from '../models';
import { ExpressRequest } from '../server';
import { ITrackDocument } from '../interfaces/track.interface';
import { repoPagination, repoSearch, repoTime } from '../util';

class TrackRepository {

  // This function creates tracks
  public async create({
    asset_acquired,
    countries,
    disbursed_dividends,
    created_by,
  }: {
    asset_acquired: string;
    countries: string;
    disbursed_dividends: string;
    created_by?: Types.ObjectId;
  }): Promise<ITrackDocument | null> {
    const data = { asset_acquired, countries, disbursed_dividends, created_by };

    return await Track.create(data);
  }

  // This function updates tracks using track_id
  public async atomicUpdate(
    query: FilterQuery<ITrackDocument>,
    record: UpdateQuery<ITrackDocument>,
    ): Promise<ITrackDocument | null> {
    return Track.findOneAndUpdate(
      query, record, {
        new: true,
    });
  }

  // This function gets all tracks (Admin)
  public async findAdmin(req: ExpressRequest): Promise<ITrackDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    let period = String(query.period) || '90days'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the amountFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the amountTo

    let filterQuery: any = {}; // Initialize the filter query object

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: ['asset_acquired', 'countries', 'disbursed_dividends'],
    });

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter and filterQuery to the filter object
    const filter = { ...filterQuery, ...timeFilter, ...searching };

    // Get the tracks and total documents from the database
    const [tracks, total] = await Promise.all([
      Track.find(filter)
        .lean(true)
        .sort({ createdAt: -1 })
        .limit(perpage)
        .skip(page * perpage - perpage),
      Track.aggregate([
        { $match: filter },
        { $count: 'count' },
      ]),
    ]);

    const pagination = repoPagination({ page, perpage, total: total[0]?.count! });

    return { data: tracks, pagination };
  }

  // This function gets all track documents (Landing page)
  public async findLandingPage(): Promise<ITrackDocument[] | null | any> {
    return Track.find().lean(true).select(
      'asset_acquired countries disbursed_dividends'
    ).sort({ createdAt: -1 });
  }

  // This function delete tracks by track_id
  public async delete(query: FilterQuery<ITrackDocument>): Promise<ITrackDocument | null> {
    return Track.findByIdAndDelete(query);
  }

  // This function gets tracks by track_id
  public async getOne(
    query: FilterQuery<ITrackDocument>,
    populate: string = ""
  ): Promise<ITrackDocument | null> {
      return Track.findOne(query).populate(populate).lean(true);
  }

}

// Export TrackRepository
export default new TrackRepository();
