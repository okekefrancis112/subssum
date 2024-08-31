//importing the Schema model from mongoose
import { Schema } from 'mongoose';

//Creating a schema for LearnCategory as an instance of Schema
export const LearnCategorySchema: Schema = new Schema(
  {
    //Declaring properties required in this Schema
    category_name: {
      type: String,
    },

    category_description: {
      type: String,
    },

    category_alias: {
      type: String,
    },

  },
  //Creating timestamps for records created or updated
  { timestamps: true }
);
