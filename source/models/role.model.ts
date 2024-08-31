//Import mongoose and schema for creating a Schema
import mongoose, { Schema } from 'mongoose';

//Creating the RoleSchema
export const RoleSchema: Schema = new Schema(
  {
    //Name of the role
    role_name: {
      type: String,
    },
    //Description of the role
    role_description: {
      type: String,
    },

    //Array of permissions associated with the role
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permissions',
      },
    ],

    //Status of the role, defaulted to true when created
    status: {
      type: Boolean,
      default: true,
    },

    //Hierarchy level of the role, defaulted to 3 when created
    hierarchy: {
      type: Number,
      default: 3,
    },
  },
  //Adding timestamps fields to the Schema
  { timestamps: true }
);
