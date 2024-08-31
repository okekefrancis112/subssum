import { Types } from "mongoose";

// This interface defines the properties for a Blog object
export interface IBlogComment {
  //An objectId containing the user
  user_id: Types.ObjectId;
  //An objectId containing the blog
  blog_id: Types.ObjectId;
  // A string containing the tag name
  comment: string;
  // An array containing the ids of users that like the comments
  likes?: Array<Types.ObjectId>;
  // A boolean indicating whether is_deleted is true or false
  is_deleted?: boolean;
}

// This interface extends from Document and Blog interfaces.
export interface IBlogCommentDocument extends Document, IBlogComment {}
