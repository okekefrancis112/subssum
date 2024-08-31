import { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { ExpressRequest } from '../server';
import { Role } from '../models';
import { IRoleDocument } from '../interfaces/role.interface';
import { repoPagination } from '../util';

class RoleRepository {
  // Create Admin Roles
  public async create({
    role_name,
    role_description,
    permissions,
    status = true,
    hierarchy = 3,
  }: {
    role_name: string;
    role_description?: string;
    permissions?: Array<Types.ObjectId>;
    status?: boolean;
    hierarchy?: number;
  }): Promise<IRoleDocument> {
    const role = {
      role_name,
      role_description,
      permissions,
      status,
      hierarchy,
    };

    return await Role.create(role);
  }

  // Get role by role name
  public async getOne(
    query: FilterQuery<IRoleDocument>,
    populate: string = ""
  ): Promise<IRoleDocument | null> {
      return Role.findOne(query).populate(populate).lean(true);
  }

  // // Get role by role id
  // public async getOneById({
  //   role_id,
  //   populate = '',
  // }: {
  //   role_id: Types.ObjectId;
  //   populate?: string;
  // }): Promise<IRoleDocument | null> {
  //   return Role.findOne({ _id: role_id }).populate(populate);
  // }

  // Update role by id
  public async atomicUpdate(
    query: FilterQuery<IRoleDocument>,
    record: UpdateQuery<IRoleDocument>,
    ): Promise<IRoleDocument | null> {
    return Role.findOneAndUpdate(
      query, record, {
        new: true,
    });
  }
  // public async atomicUpdate(_id: Types.ObjectId, record: any) {
  //   return Role.findOneAndUpdate({ _id: _id }, { ...record }, { new: true });
  // }

  // Delete role by role id
  public async delete(query: FilterQuery<IRoleDocument>): Promise<IRoleDocument | null> {
    return Role.findByIdAndDelete(query);
  }
  // public async deleteOne(role_id: Types.ObjectId) {
  //   return Role.findOneAndDelete({ _id: role_id });
  // }

  // Delete all roles
  public async getAll(req: ExpressRequest): Promise<IRoleDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number

    let filterQuery = {}; // Initialize the filter query object

    // Check if search query is present and has valid length
    if (search !== 'undefined' && Object.keys(search).length > 0) {
      filterQuery = {
        $or: [
          { role_name: new RegExp(search, 'i') },
          { role_description: new RegExp(search, 'i') },
        ],
      };
    }

    // Get admin roles from the database
    const roles = await Role.find(filterQuery)
      .populate({
        path: 'permissions',
        select: 'permission_name',
      })
      .limit(perpage)
      .skip(page * perpage - perpage);

    const total = await this.countDocs(filterQuery);
    const pagination = repoPagination({ page, perpage, total: total! });

    return {
      data: roles,
      pagination,
    };
  }

  public async countDocs(query: FilterQuery<IRoleDocument>): Promise<IRoleDocument | null | any> {
    return Role.countDocuments({ ...query });
  }

}

// Export RoleRepository
export default new RoleRepository();
