import bcrypt from "bcrypt";
import { FilterQuery, Types, UpdateQuery } from "mongoose";
import { ExpressRequest } from "../server";
import { IAdminUserDocument } from "../interfaces/admin-user.interface";
import { APP_CONSTANTS } from "../constants/app_defaults.constant";
import { AdminUser } from "../models";
import { repoPagination } from "../util";

class AdminUserRepository {
    // Create Admin User
    public async create({
        email,
        role,
    }: {
        email: string;
        role: Types.ObjectId;
    }): Promise<IAdminUserDocument> {
        const data: any = {
            email,
            role,
        };

        const admin_user = new AdminUser(data);

        return await admin_user.save();
    }

    // Create Admin User
    public async createFullAdmin({
        first_name,
        last_name,
        password,
        email,
        role,
        verified_email,
        verified_email_at,
    }: {
        first_name?: string;
        last_name?: string;
        password?: string;
        email: string;
        role: Types.ObjectId;
        verified_email?: boolean;
        verified_email_at?: Date;
    }): Promise<IAdminUserDocument> {
        const data: any = {
            first_name,
            last_name,
            password,
            email,
            role,
            verified_email,
            verified_email_at,
        };

        if (password) {
            const salt = await bcrypt.genSalt(parseInt("10"));
            const hash = await bcrypt.hash(password, salt);

            data.password = hash;
        }

        const admin_user = new AdminUser(data);

        return await admin_user.save();
    }

    // // Get Admin Email By Email
    // public async getByEmail({
    //     email,
    //     leanVersion = true,
    // }: {
    //     email: string;
    //     leanVersion?: boolean;
    // }): Promise<IAdminUserDocument | null> {
    //     return AdminUser.findOne({ email }).lean(leanVersion);
    // }

    // public async getById({
    //     admin_id,
    //     leanVersion = true,
    // }: {
    //     admin_id: Types.ObjectId;
    //     leanVersion?: boolean;
    // }): Promise<IAdminUserDocument | null> {
    //     return AdminUser.findOne({ _id: admin_id }).lean(leanVersion);
    // }
    public async getExpiry({
        invitation_token,
    }: {
        invitation_token: string;
    }): Promise<IAdminUserDocument | null> {
        return AdminUser.findOne({
            invitation_token: invitation_token,
            invitation_token_expiry: { $gt: new Date() },
        });
    }

    // Get Admin By Query
    public async getOne(
        query: FilterQuery<IAdminUserDocument>,
        populate: string = ""
      ): Promise<IAdminUserDocument | null> {
          return AdminUser.findOne(query).populate(populate).lean(true);
      }
    // public async getByQuery(
    //     query: any,
    //     select: any = ""
    // ): Promise<IAdminUserDocument | null | any> {
    //     return AdminUser.findOne(query).select(select);
    // }

    // Update Admin User information
    public async update({
        admin,
        first_name,
        last_name,
        password,
        profile_photo,
    }: {
        admin: IAdminUserDocument;
        first_name?: string;
        last_name?: string;
        password?: string;
        profile_photo?: string;
    }): Promise<IAdminUserDocument> {
        if (first_name) admin.first_name = first_name;
        if (last_name) admin.last_name = last_name;
        if (profile_photo) admin.profile_photo = profile_photo;
        if (password) {
            const salt = await bcrypt.genSalt(
                parseInt(`${APP_CONSTANTS.GENERAL.SALT_ROUNDS}`)
            );
            admin.password = await bcrypt.hash(password, salt);
        }

        return admin.save();
    }

    // Update Admin User information by user_id
    public async atomicUpdate(
        query: FilterQuery<IAdminUserDocument>,
        record: UpdateQuery<IAdminUserDocument>,
        ): Promise<IAdminUserDocument | null> {
        return AdminUser.findOneAndUpdate(
          query, record, {
            new: true,
        });
      }

    // Get all Admin Users by the query object passed
    public async getAll(
        req: ExpressRequest
    ): Promise<IAdminUserDocument[] | null | any> {
        const { query } = req;
        const search = String(query.search) || "";
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;

        let filterQuery = {};

        if (search !== "undefined" && Object.keys(search).length > 0) {
            filterQuery = {
                $or: [
                    { first_name: new RegExp(search, "i") },
                    { last_name: new RegExp(search, "i") },
                    { email: new RegExp(search, "i") },
                ],
            };
        }

        const admins = await AdminUser.find(filterQuery)
            .select("-password")
            .populate({
                path: "role",
                select: "role_name",
            })
            .sort({ createdAt: -1 })
            .limit(perpage)
            .skip(page * perpage - perpage);

        const total = await this.countDocs(filterQuery);
        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: admins,
            pagination,
        };
    }

    public async countDocs(
        query: FilterQuery<IAdminUserDocument>
    ): Promise<IAdminUserDocument | null | any> {
        return AdminUser.countDocuments({ ...query });
    }
}

// Export AdminUserRepository
export default new AdminUserRepository();
