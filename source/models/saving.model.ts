// Importing mongoose and Schema from mongoose
import mongoose, { Schema } from 'mongoose';
// Importing interfaces for type/occurrence list for SavingsSchema
import { ISavingsTypeList, ISavingsOccurrenceList } from '../interfaces/saving.interface';

// Creating Savings Schema with various properties of different types (references, Decimal128, String, Number, Date)
export const SavingsSchema: Schema = new Schema(
  {
    // Reference to Users collection
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
    },
    // Reference to Plans collection
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plans',
    },

    // Reference to Challenges Collection
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenges',
    },

    // Amount in Decimal128 format
    amount: {
      type: 'Decimal128',
      default: '0.00',
    },

    // Type enums as defined in interface
    savings_type: {
      type: String,
      enum: ISavingsTypeList,
    },

    // Occurrence enums as defined in interface
    savings_occurrence: {
      type: String,
      enum: ISavingsOccurrenceList,
    },

    // Duration as a number
    duration: {
      type: Number,
    },

    // Date field
    end_date: {
      type: Date,
    },
  },
  // Adding timestamps for record keeping
  { timestamps: true }
);
