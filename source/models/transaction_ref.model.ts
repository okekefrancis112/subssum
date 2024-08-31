// import mongoose and Schema from 'mongoose'
import mongoose, { Schema } from 'mongoose';

// create TransactionRefSchema using Schema
export const TransactionRefSchema: Schema = new Schema(
  {
    // define amount type of Number
    amount: {
      type: Number,
    },

    // define transaction_hash type of String
    transaction_hash: {
      type: String,
    },

    // define user_id which references the _id fields in 'Users' model
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
    },
  },
  // enable timestamps
  { timestamps: true }
);
