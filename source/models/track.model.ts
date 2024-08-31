//Import mongoose Schema module for creating the TrackSchema
import mongoose, { Schema } from 'mongoose';

//Create TrackSchema with its schema and fields
export const TrackSchema: Schema = new Schema(
  {
    asset_acquired: {
      type: String,
    },

    countries: {
      type: String,
    },

    disbursed_dividends: {
      type: String,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId, //ObjectId type to store the reference of user
      ref: 'AdminUsers', //refers to the AdminUsers collection
    },
  },
  { timestamps: true } // To record timestamps when creating/updating data
);
