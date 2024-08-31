//Import mongoose Schema module for creating the BlogSchema
import mongoose, { Schema } from 'mongoose';
import { IBlogStatus } from '../interfaces/blog.interface';

//Create BlogSchema with its schema and fields
export const BlogSchema: Schema = new Schema(
  {
    // category_id maps each FAQ with its corresponding Category
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },

    title: {
      type: String,
    },

    content: {
      type: String,
    },

    //The status of the blog pulled from the imported Enum with a default value
    status: {
      type: String,
      enum: Object.values(IBlogStatus),
      default: IBlogStatus.DRAFT,
    },

    image: {
      type: String,
    },

    slug: {
      type: String,
    },

    author: {
      type: String,
    },

    views: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
      },
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
      },
    ],

    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
      },
    ],

    is_deleted: {
      type: Boolean, //Data Type for Is Deleted
      default: false, //Default value set to false
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId, //ObjectId type to store the reference of user
      ref: 'AdminUsers', //refers to the AdminUsers collection
    },
  },
  { timestamps: true } // To record timestamps when creating/updating data
);
