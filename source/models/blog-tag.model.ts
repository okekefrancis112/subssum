// Importing the Mongoose Schema module
import mongoose, { Schema } from 'mongoose';

// Creating a Mongoose Schema for the Blog tag Object
export const BlogTagSchema: Schema = new Schema(
  {
    tag_name: {
      // Field to store the name of the Blog tag
      type: String,
    },
    tag_description: {
      // Field to store the description of the Blog tag
      type: String,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId, //ObjectId type to store the reference of user
      ref: 'AdminUsers', //refers to the AdminUsers collection
    },
  },
  { timestamps: true } // Set timestamp property to true to enable time tracking
);
