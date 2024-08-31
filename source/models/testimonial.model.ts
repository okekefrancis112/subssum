// import mongoose and Schema from the mongoose library
import mongoose, { Schema } from 'mongoose';

// import IStatus interface from testinomial.interface
import { IStatus } from '../interfaces/testimonial.interface';

// declare TestimonialSchema as a new Schema
export const TestimonialSchema: Schema = new Schema(
  {
    // defining name field with type string
    name: {
      type: String,
    },

    // defining slug field with type string
    slug: {
      type: String,
    },

    // defining job_role field with type string
    job_role: {
      type: String,
    },

    // defining content field with type string
    content: {
      type: String,
    },

    // defining image field with type string
    image: {
      type: String,
    },

    // defining status field with type string, default value as IStatus.PUBLISHED, enum for object values of IStatus
    status: {
      type: String,
      default: IStatus.PUBLISHED,
      enum: Object.values(IStatus),
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
