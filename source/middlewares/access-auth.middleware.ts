// Import ExpressRequest type and NextFunction, Response interfaces from associated files
import { ExpressRequest } from '../server';
import { NextFunction, Response } from 'express';

// Import ResponseHandler class
import ResponseHandler from '../util/response-handler';

// Import adminUserRepository and roleRepository for user and role operations
import adminUserRepository from '../repositories/admin-user.repository';
import roleRepository from '../repositories/role.repository';

// Import throwIfAdminUserUndefined and HTTP_CODES from constants
import { throwIfAdminUserUndefined } from '../util';
import { HTTP_CODES } from '../constants/app_defaults.constant';

// accessAdminAuth function to check if the user have permission to access given resource or not
const accessAdminAuth = function (resource: string) {
  return async (req: ExpressRequest, res: Response, next: NextFunction) => {
    try {
      // Get admin_user
      const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');

      // Check if the user exists or not
      const check_admin = await adminUserRepository.getOne({ admin_id: admin_user._id });

      if (!check_admin) {
        return ResponseHandler.sendErrorResponse({
          res,
          code: HTTP_CODES.UNAUTHORIZED,
          error: 'Admin user does not exist',
        });
      }

      // Get the role of the user
      const role = check_admin.role;

      // Check if there is a role attached to the account
      const check_role = await roleRepository.getOne(
        {role_id: role},
        'permissions',
      );

      if (!check_role) {
        return ResponseHandler.sendErrorResponse({
          res,
          code: HTTP_CODES.UNAUTHORIZED,
          error: 'Role attached to this account does not exist',
        });
      }

      // Check if the role is enabled or disabled
      if (!check_role.status) {
        return ResponseHandler.sendErrorResponse({
          res,
          code: HTTP_CODES.UNAUTHORIZED,
          error: 'Role attached to this account is disabled',
        });
      }

      // Check if user has permission to access given resource
      const permit_element = { permission_alias: resource };

      const check_permit = check_role.permissions?.some(
        (permit: any) => permit?.permission_alias === permit_element.permission_alias
      );

      if (!check_permit) {
        return ResponseHandler.sendErrorResponse({
          res,
          code: HTTP_CODES.UNAUTHORIZED,
          error: 'You do not have permission to access this resource',
        });
      }

      // Return the next() method call
      return next();
    } catch (error) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
        error: `${error}`,
      });
    }
  };
};

// Export the accessAdminAuth method
export default accessAdminAuth;
