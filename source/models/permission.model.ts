// Importing the mongoose Schema module
import { Schema } from 'mongoose';

// Creating PermissionSchema with mongoose schema instance
export const PermissionSchema: Schema = new Schema(
  {
    //Initializing fields and their types
    permission_name: {
      type: String,
    },
    permission_description: {
      type: String,
    },
    permission_alias: {
      type: String,
    },

    hierarchy: {
      type: Number,
    },
  },
  // Enable timestamps for data changes tracking
  { timestamps: true }
);
