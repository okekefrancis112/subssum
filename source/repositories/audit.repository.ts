import { Request } from 'express';
import { IAuditActivityStatus, IAuditDocument } from '../interfaces/audit.interface';
import { Audit } from '../models';
import { ExpressRequest } from '../server';
import { FilterQuery, Types } from 'mongoose';
import { repoPagination } from '../util';

class AuditRepository {
  // Create audit data
  public async create({
    req,
    title,
    name,
    activity_type,
    activity_status,
    user,
    data,
  }: {
    req: Request;
    title: string;
    name: string;
    activity_type: string;
    activity_status: string;
    user: any;
    data?: any;
  }): Promise<IAuditDocument> {
    const audit = {
      title,
      name: name,
      activity_type,
      activity_status,
      user: user._id,
      headers: req.headers,
      source_ip: req.socket.remoteAddress,
      path: req.originalUrl,
      data,
    };

    return await Audit.create(audit);
  }

  // Get all audits
  public async findAudit(req: ExpressRequest): Promise<IAuditDocument[] | null | any> {
    const { query } = req;
    const search = String(query.search) || '';
    const perpage = Number(query.perpage) || 10;
    const page = Number(query.page) || 1;
    let status = String(query.status) || '';
    let statusFilter: any = {};
    let filterQuery;

    // Check if there is a search string and add it to the filter query object
    if (search !== 'undefined' && Object.keys(search).length > 0) {
      filterQuery = {
        $or: [{ name: new RegExp(search, 'i') }, { title: new RegExp(search, 'i') }],
      };
    }

    // Check the status and add it to the status filter object
    if (status === 'succeeded') {
      statusFilter = {
        activity_status: IAuditActivityStatus.SUCCESS,
      };
    } else if (status === 'failed') {
      statusFilter = {
        activity_status: IAuditActivityStatus.FAILURE,
      };
    }

    // Add timeFilter, filterQuery to the filter object
    const filter = { ...filterQuery, ...statusFilter };

    // Get the audit data and total from the database
    const [audits] = await Promise.all([
      Audit.find(filter)
        .lean(true)
        .sort({ createdAt: -1 })
        .limit(perpage)
        .skip(page * perpage - perpage)
    ]);

    const total = await this.countDocs(filter);
    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return { data: audits, pagination };
  }

  public async countDocs(query: FilterQuery<IAuditDocument>): Promise<IAuditDocument | null | any> {
    return Audit.countDocuments({ ...query });
  }

  // // Get audit but audit_id
  // public async getAuditById({
  //   audit_id,
  // }: {
  //   audit_id: Types.ObjectId;
  // }): Promise<IAuditDocument | null | any> {
  //   return Audit.findById(audit_id);
  // }
  public async getOne(
    query: FilterQuery<IAuditDocument>,
    populate: string = ""
  ): Promise<IAuditDocument | null> {
      return Audit.findOne(query).populate(populate).lean(true);
  }
}

// Export AuditRepository
export default new AuditRepository();
