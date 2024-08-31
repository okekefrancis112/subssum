// import mongoose to access its Types interface
import { Document, Types } from 'mongoose';

// Enumeration of the different statuses a Learn object can have
export enum IStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
}

// Interface for ILearn which contains the properties it has and their types
export interface ILearn {
  category: Types.ObjectId;
  video_name: string;
  video_url: string;
  image?: string;
  status?: IStatus;
  is_default?: boolean;
  created_by: Types.ObjectId;
}

// Extend document to include the ILearn interface
export interface ILearnDocument extends Document, ILearn {}
