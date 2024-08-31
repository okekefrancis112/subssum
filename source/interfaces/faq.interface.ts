// Import mongoose module Document & Types
import { Document, Types } from 'mongoose';

// Status enumeration with two values
export enum IStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
}

// Interface for FAQs
export interface IFaq {
  // Question string
  question: string;
  // Category of the FAQ
  category: Types.ObjectId;
  // Answer of the FAQ
  answer: string;
  // Optional status of the FAQ
  status?: IStatus;
  // ID of the user who created this FAQ
  created_by: Types.ObjectId;
}

// Sub-interface of IFaq with Document type

export interface IFaqDocument extends Document, IFaq {}
