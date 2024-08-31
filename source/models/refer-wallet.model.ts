// Import mongoose and Schema from the mongoose library
import mongoose, { Schema } from 'mongoose';

// Create ReferWalletSchema object with the respective Schema object
export const ReferWalletSchema: Schema = new Schema(
  {
    // Reference the Users collection in the database
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
    },

    user: {
      first_name: String,
      last_name: String,
      email: String,
    },
    // Set a Decimal128 data type of 0.00 as the default value for balance
    balance: {
      type: 'Decimal128',
      default: '0.00',
    },

    // Set a Decimal128 data type of 0.00 as the default value for balance_before
    balance_before: {
      type: 'Decimal128',
      default: '0.00',
    },

    // Set a Decimal128 data type of 0.00 as the default value for balance_after
    balance_after: {
      type: 'Decimal128',
      default: '0.00',
    },

    // Set a Decimal128 data type of 0.00 as the default value for last_debit_amount
    last_debit_amount: {
      type: 'Decimal128',
      default: '0.00',
    },

    // Set a Decimal128 data type of 0.00 as the default value for last_deposit_amount
    last_deposit_amount: {
      type: 'Decimal128',
      default: '0.00',
    },

    // Set a Date datatype to store last debit date
    last_debit_date: {
      type: Date,
    },

    // Set a Date datatype to store last deposit date
    last_deposit_date: {
      type: Date,
    },
  },
  // Enable the timestamps feature to log the time of create and update operations on documents
  { timestamps: true }
);
