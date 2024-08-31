//Import mongoose and the Schema interface from the mongoose library
import mongoose, { Schema } from 'mongoose';

// Import IBankCountry interface
import { IBankCountry, IBankType } from '../interfaces/banks.interface';

// Create BanksSchema with Schema
export const BanksSchema: Schema = new Schema(
  {
    // User Id of type ObjectId which has a reference to User model
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    user: {
      first_name: String,
      last_name: String,
      email: String,
    },
    // Country field has values as per IBankCountry enum and also has a default value as IBankCountry.NIGERIA
    country: {
      type: String,
      enum: Object.values(IBankCountry),
      default: IBankCountry.NIGERIA,
    },
    // Bank name of type string
    bank_name: {
      type: String,
    },
    // Bank account of type string
    account_number: {
      type: String,
    },
    // Account name of type string
    account_name: {
      type: String,
    },
    // Primary field of type boolean and has a default value of false
    primary: {
      type: Boolean,
      default: false,
    },

    // ! Foreign account details

    // Country field has values as per IBankCountry enum and also has a default value as IBankCountry.NIGERIA
    account_type: {
      type: String,
      enum: Object.values(IBankType),
      default: IBankType.NGN,
    },

    // IBAN of type string
    iban: {
      type: String,
    },

    // Swift code of type string
    swift_code: {
      type: String,
    },

    // Sort code of type string
    sort_code: {
      type: String,
    },

    // wire routing of type string
    wire_routing: {
      type: String,
    },

     // bank address of type string
     bank_address: {
      type: String,
    },

  },
  // Enable timestamps for this Schema
  { timestamps: true }
);
