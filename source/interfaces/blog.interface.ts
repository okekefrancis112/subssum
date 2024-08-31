import { Types, Document } from "mongoose";

// Enum of blog statuses
export enum IBlogStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
  }

export interface IBlog {
    category_id: Types.ObjectId;
    title: string;
    content: string;
    status?: IBlogStatus;
    image?: string;
    slug: string;
    author?: string;
    views?: Array<Types.ObjectId>;
    likes?: Array<Types.ObjectId>;
    tags?: Array<Types.ObjectId>;
    is_deleted?: boolean;
    created_by: Types.ObjectId;
}

export interface IBlogDocument extends Document, IBlog {}
