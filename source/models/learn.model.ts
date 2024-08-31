// Import mongoose and Schema interfaces from 'mongoose' library
import mongoose, { Schema } from 'mongoose';

// Import IStatus interface from learn.interface
import { IStatus } from '../interfaces/learn.interface';

// Create the LearnSchema using mongoose.Schema
export const LearnSchema: Schema = new Schema(
  {
    // Define the category_id property with type objectId and reference to 'Category' collection
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },

    // Define the video_url property with type String
    video_url: {
      type: String,
    },

    // Define the image property with type String
    video_name: {
      type: String,
    },

    image: {
      type: String,
    },

    // Define the default status
    is_default: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      default: IStatus.PUBLISHED,
      enum: Object.values(IStatus),
    },

    // Define the created_by property with type objectId and reference to 'AdminUsers' collection
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUsers',
    },
  },
  // Enable timestamping for the LearnSchema
  { timestamps: true }
);
