// import types and document from the mongoose library
import { Document, Types } from 'mongoose';

// interface for Testimonial object properties
export interface ISettlementAccount {
  account_number: number;
  routing_number: number;
  account_type: string;
  swift_code: string;
  recipient_info: string;
  bank_info: string;
  special_instructions: string;
  // Default account
  is_active?: boolean;
  created_by: Types.ObjectId;
}

// interface combining Document, and ITestimonial interfaces
export interface ISettlementAccountDocument extends Document, ISettlementAccount {}
