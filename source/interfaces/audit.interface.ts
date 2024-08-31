// The first two lines import the necessary items from mongoose
import { Document, Types } from 'mongoose';

// An enum that lists all of the different audit activity types
export enum IAuditActivityType {
  ACCESS = 'ACCESS',
  AUDIT = 'AUDIT',
  DOWNLOAD = 'DOWNLOAD',
}

// An enum that lists all of the different statuses for an audited activity
export enum IAuditActivityStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

// An interface that outlines the information that will be used to track audit data
export interface IAudit {
  title: string;
  name: string;
  activity_type: IAuditActivityType;
  activity_status: IAuditActivityStatus;
  user: Types.ObjectId;
  headers: Record<string, any>;
  data?: Record<string, any>;
  source_ip: string;
  path: string;
}

// Combining the IAudit interface with the Document object from Mongoose
export interface IAuditDocument extends Document, IAudit {}
