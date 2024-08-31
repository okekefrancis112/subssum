// import types and document from the mongoose library
import { Document, Types } from 'mongoose';

// enum for available IStatus for a testimonial
export enum IStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
}

// interface for Testimonial object properties
export interface ITestimonial {
  name: string;
  slug: string;
  job_role: string;
  content: string;
  image?: string;
  status?: IStatus;
  created_by: Types.ObjectId;
}

// interface combining Document, and ITestimonial interfaces
export interface ITestimonialDocument extends Document, ITestimonial {}
