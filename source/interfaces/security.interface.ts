// Import Types from Mongoose library
import { Types } from 'mongoose';

// Create an interface to represent Security data structure
export interface ISecurity {
  user_id?: Types.ObjectId;
  type: string;
  entity: string | number;
  generated_by: Types.ObjectId;
  used?: boolean;
  expired?: boolean;
}

// Create an interface which combines Document and IOtp interface
export interface ISecurityDocument extends Document, ISecurity {}
