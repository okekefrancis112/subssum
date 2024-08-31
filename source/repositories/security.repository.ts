import moment from "moment";
import { Types } from "mongoose";
import { ExpressRequest } from "../server";
import { Security } from "../models";
import { ISecurity, ISecurityDocument } from "../interfaces/security.interface";
class SecurityRepository {
    public async createEntry({
        user_id,
        type,
        entity,
        generated_by,
    }: {
        user_id?: Types.ObjectId;
        type: string;
        entity: string | number;
        generated_by: Types.ObjectId;
    }): Promise<ISecurityDocument | null> {
        const data: ISecurity = {
            user_id,
            type,
            entity,
            generated_by,
        };

        return await Security.create(data);
    }

    public async findAll({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<ISecurityDocument | null | any> {
        const { query } = req;
        const search = String(query.search);
        const type = String(query.type);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        let filterQuery = {};
        let typeQuery = {};

        // Check if search is defined and has length greater than 0
        if (search !== "undefined" && Object.keys(search).length > 0) {
            filterQuery = {
                $or: [{ "user.email": new RegExp(search, "i") }],
            };
        }

        if (type == "all") {
            typeQuery = {};
        } else {
            typeQuery = { type };
        }

        // Create pipeline for aggregate query
        const security_pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },

            {
                $lookup: {
                    from: "adminusers",
                    localField: "generated_by",
                    foreignField: "_id",
                    as: "admin",
                },
            },
            { $unwind: "$admin" },
            // { $match: { ...filterQuery, ...typeQuery } },
            { $skip: skip },
            { $limit: perpage },
            {
                $project: {
                    email: "$user.email",
                    generated_by: "$admin.email",
                    used: 1,
                    expired: 1,
                    createdAt: 1,
                },
            },
        ];

        const security_stats: any = await Security.aggregate(security_pipeline);
        const total = security_stats?.length || 0;

        // Create pagination object
        const pagination = {
            hasPrevious: page > 1,
            prevPage: page - 1,
            hasNext: page < Math.ceil(total / perpage),
            next: page + 1,
            currentPage: Number(page),
            total: total,
            pageSize: perpage,
            lastPage: Math.ceil(total / perpage),
        };

        // Return data and pagination object
        return {
            data: security_stats,
            pagination,
        };
    }
}

export default new SecurityRepository();
