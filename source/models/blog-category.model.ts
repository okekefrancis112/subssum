// Importing the Mongoose Schema module
import { Schema } from 'mongoose';

// Creating a Mongoose Schema for the Blog Category Object
export const BlogCategorySchema: Schema = new Schema(
  {
    category_name: {
      // Field to store the name of the Blog category
      type: String,
    },
    category_description: {
      // Field to store the description of the Blog category
      type: String,
    },
    category_alias: {
      // Field to store the alias for the Blog category
      type: String,
    },
  },
  { timestamps: true } // Set timestamp property to true to enable time tracking
);
