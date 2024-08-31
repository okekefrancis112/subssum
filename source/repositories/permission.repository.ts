import { Permission } from '../models';
import { IPermissionDocument } from '../interfaces/permission.interface';

class PermissionRepository {
  // Function to create new permission
  public async create({
    permission_name,
    permission_description,
    permission_alias,
    hierarchy,
  }: {
    permission_name: string;
    permission_description?: string;
    permission_alias?: string;
    hierarchy?: number;
  }): Promise<IPermissionDocument> {
    const permission = {
      permission_name,
      permission_description,
      permission_alias,
      hierarchy,
    };

    return await Permission.create(permission);
  }

  // Function to get a permission
  public async getOne({
    permission_alias,
  }: {
    permission_alias: string;
  }): Promise<IPermissionDocument | null> {
    return await Permission.findOne({ permission_alias });
  }

  // Function to get permissions given the query object provided
  public async find(query: any): Promise<IPermissionDocument | null | any> {
    return await Permission.find(query);
  }
}

// Export PermissionRepository
export default new PermissionRepository();
