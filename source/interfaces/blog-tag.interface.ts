import { Types } from "mongoose";

// This interface defines the properties for a Blog object
export interface IBlogTag {
  // A string containing the tag name
  tag_name: string;
  // A string containing the tag description
  tag_description: string;
  // 
  created_by: Types.ObjectId;
}

// This interface extends from Document and Blog interfaces.
export interface IBlogTagDocument extends Document, IBlogTag {}
