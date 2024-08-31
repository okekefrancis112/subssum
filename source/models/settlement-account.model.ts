// import mongoose and Schema from the mongoose library
import mongoose, { Schema } from 'mongoose';


// declare SettlementAccountSchema as a new Schema
export const SettlementAccountSchema: Schema = new Schema(
  {
    // defining account_number field with type number
    account_number: {
      type: Number,
    },

    // defining routing_number field with type number
    routing_number: {
      type: Number,
    },

    // defining account_type field with type string
    account_type: {
      type: String,
    },

    // defining swift_code field with type string
    swift_code: {
      type: String,
    },

    // defining recipient_info field with type string
    recipient_info: {
      type: String,
    },

    // defining bank_info field with type string
    bank_info: {
      type: String,
    },

    // defining special_instructions field with type string
    special_instructions: {
      type: String,
    },

    // Define the default status
    is_active: {
      type: Boolean,
      default: false,
    },

    // defining created_by field with type object id, ref to admin users
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUsers',
    },
  },
  // creating timestamp
  { timestamps: true }
);
