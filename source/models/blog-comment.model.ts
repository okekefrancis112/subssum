// Importing the Mongoose Schema module
import mongoose, { Schema } from 'mongoose';

// Creating a Mongoose Schema for the Blog tag Object
export const BlogCommentSchema: Schema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId, //ObjectId type to store the reference of user
      ref: 'Users', //refers to the Users collection
    },
    blog_id: {
      type: mongoose.Schema.Types.ObjectId, //ObjectId type to store the reference of user
      ref: 'Blogs', //refers to the AdminUsers collection
    },
    comment: {
      // Field to store the name of the Blog tag
      type: String,
      required: true,
    },
    likes: {
      type: mongoose.Schema.Types.ObjectId, //ObjectId type to store the reference of user
      ref: 'Users', //refers to the Users collection
    },
    is_deleted: {
      type: Boolean, //Data Type for Is Deleted
      default: false, //Default value set to false
    },
  },
  { timestamps: true } // Set timestamp property to true to enable time tracking
);
