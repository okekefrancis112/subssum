// Importing the Mongoose Schema module
import { Schema } from 'mongoose';

// Creating a Mongoose Schema for the FAQ Category Object
export const FaqCategorySchema: Schema = new Schema(
  {
    category_name: {
      // Field to store the name of the FAQ category
      type: String,
    },
    category_description: {
      // Field to store the description of the FAQ category
      type: String,
    },
    category_alias: {
      // Field to store the alias for the FAQ category
      type: String,
    },
  },
  { timestamps: true } // Set timestamp property to true to enable time tracking
);
