// Importing the necessary modules from mongoose
import { Types, Document } from 'mongoose';

// Defining the interface for Role object
export interface IRole {
  role_name: string; // Name of the role
  role_description?: string; // Optional description of the role
  permissions: Array<Types.ObjectId>; // List of permission Ids associated with the role
  status?: boolean; // Denotes active or inactive state of the role
  hierarchy: number; // Used to define order of the roles
}

// Defining the interface of the Role document in MongoDB collection
export interface IRoleDocument extends Document, IRole {}
