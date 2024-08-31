// Importing Document interface from mongoose module
import { Document } from 'mongoose';

// Interface IPermission
export interface IPermission {
  // property holding the permission name
  permission_name: string;

  // optional property to store a description of the permission
  permission_description?: string;

  // optional alias of the permission
  permission_alias?: string;

  // optional property indicating the hierarachy of permissions
  hierarchy?: number;
}

// Interface IPermissionDocument extending Document and IPermission

export interface IPermissionDocument extends Document, IPermission {}
