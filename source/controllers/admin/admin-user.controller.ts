import bcryptjs from 'bcryptjs';
import { Response } from 'express';
import { Types } from 'mongoose';
import { ExpressRequest } from '../../server';
import UtilFunctions, { generateInvitation, throwIfAdminUserUndefined } from '../../util';
import ResponseHandler from '../../util/response-handler';
import adminUserRepository from '../../repositories/admin-user.repository';
import roleRepository from '../../repositories/role.repository';
import auditRepository from '../../repositories/audit.repository';
import { IAuditActivityStatus, IAuditActivityType } from '../../interfaces/audit.interface';
import otpRepository from '../../repositories/otp.repository';
import { ADMIN_INVITATION, APP_CONSTANTS } from '../../constants/app_defaults.constant';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

/****
 *
 *
 * Admin Login
 */

export async function Login(req: ExpressRequest, res: Response): Promise<Response | void> {
  const { email, password } = req.body;

  try {
    const admin_user = await adminUserRepository.getOne({ email: email.toLowerCase() });

    if (!admin_user) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: 'Email address entered does not match any of our records.',
      });
    }

    const result = bcryptjs.compareSync(password, admin_user?.password!);
    if (!result) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: 'Incorrect password. Please try again.',
      });
    }

    if (!admin_user.verified_email) {
      return res.status(401).json({
        success: false,
        code: HTTP_CODES.UNAUTHORIZED,
        message: 'Email is not verified yet',
        data: {
          verified_email: false,
        },
      });
    }

    if (admin_user.is_disabled) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.FORBIDDEN,
        error: 'Sorry, this account has been disabled.',
      });
    }

    const role = admin_user
      ? await roleRepository.getOne({ _id: admin_user.role }, 'permissions' )
      : null;

    if (!role) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: 'Oops! The role assigned to your account does not exist.',
      });
    }

    if (!role.status) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: 'Sorry, the role assigned to this account has been disabled.',
      });
    }

    const token = await UtilFunctions.generateToken({
      _id: admin_user._id,
      first_name: admin_user.first_name,
      last_name: admin_user.last_name,
      email: admin_user.email,
    });

    if (admin_user.first_login) {
      await adminUserRepository.atomicUpdate({_id: admin_user._id}, { $set: { first_login: false } });
    }

    delete admin_user.password;
    delete admin_user?.last_login;

    const data = {
      token,
      ...admin_user,
    };

    await adminUserRepository.atomicUpdate({_id: admin_user._id}, { $set: { last_login: new Date() } });

    // Audit
    await auditRepository.create({
      req,
      title: 'Admin User Login',
      name: `${admin_user.first_name} ${admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Welcome Admin! Login successful.',
      data,
    });
  } catch (error: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Create Admin User
 */

export async function Create(req: ExpressRequest, res: Response): Promise<Response | void> {
  const { email, role } = req.body;

  try {
    const admin_user = await adminUserRepository.getOne({ email: email.toLowerCase() });

    if (admin_user) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: 'An account with this email address already exists.',
      });
    }

    const role_id = new Types.ObjectId(role)
    const check_role = await roleRepository.getOne({ _id: role_id });

    if (!check_role) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: 'Sorry, the role you specified does not exist. Please try again.',
      });
    }

    const new_admin_user = await adminUserRepository.create({
      email: email.toLowerCase(),
      role,
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Admin User Created',
      name: `${new_admin_user.first_name} ${new_admin_user.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: new_admin_user._id,
    });

    const { invitation_token, invitation_expires } = generateInvitation();

    await adminUserRepository.atomicUpdate({_id: new_admin_user._id}, {
      $set: { invitation_token, invitation_expires },
    });

    const link = `${ADMIN_INVITATION}/reset-password?token=${invitation_token}`;

    // Send Email
    await UtilFunctions.sendEmail('admin-invitation.pug', {
      to: email,
      subject: 'Keble Admin Invitation Link',
      props: {
        email,
        link,
      },
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.CREATED,
      message: 'Success! The admin user account has been created.',
      data: new_admin_user,
    });
  } catch (error: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Complete Admin User Registration
 */

export async function CompleteRegistration(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const check_expiry = await adminUserRepository.getExpiry({
      invitation_token: req.params.token,
    });

    if (!check_expiry) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: 'Sorry, the invitation token provided is invalid or has already expired.',
      });
    }

    const { first_name, last_name, password, confirm_password } = req.body;

    if (password !== confirm_password) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: 'Your passwords do not match. Please check and try again.',
      });
    }

    const hashed_password = bcryptjs.hashSync(password, 10);

    await adminUserRepository.atomicUpdate(check_expiry._id, {
      $set: {
        first_name,
        last_name,
        password: hashed_password,
        verified_email: true,
        invitation_token: null,
        invitation_expires: null,
      },
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Registration complete. Please log in to proceed as an admin user.',
      name: `${check_expiry.first_name} ${check_expiry.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: check_expiry._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Admin User Registration Completed successfully. Please login to continue',
      data: {
        verified_email: true,
      },
    });
  } catch (error: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Recover Email
 */

export async function recover(req: ExpressRequest, res: Response): Promise<Response | void> {
  const { email } = req.body;

  try {
    const admin = await adminUserRepository.getOne({ email: email.toLowerCase() });

    if (!admin) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: 'An account with this email address already exists.',
      });
    }

    if (!admin.verified_email) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.UNAUTHORIZED,
        error: 'Email verification pending. Please check your inbox.',
      });
    }

    if (admin.is_disabled) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.FORBIDDEN,
        error: 'Sorry, this admin account has been disabled.',
      });
    }

    // Save OTP
    const otp = await UtilFunctions.generateAdminOtp({ admin_id: admin._id });

    let createdAt = new Date();

    await UtilFunctions.sendEmail('recover.pug', {
      to: email,
      subject: 'Keble Password Recovery',
      props: {
        email,
        otp: otp?.otp,
        name: admin.first_name,
        createdAt,
      },
    });

    // Audit
    await auditRepository.create({
      req,
      title: 'Admin Email Recovery',
      name: `${admin.first_name} ${admin.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Password reset email sent to ' + email + '.',
    });
  } catch (error: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Verify OTP
 */

export async function verifyOtp(req: ExpressRequest, res: Response): Promise<Response | void> {
  const { email, otp } = req.body;

  try {
    const admin = await adminUserRepository.getOne({ email: email.toLowerCase() });

    if (!admin) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: 'An account with this email address already exists.',
      });
    }

    if (!admin.verified_email) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.UNAUTHORIZED,
        error: 'Email verification pending. Please check your inbox.',
      });
    }

    if (admin.is_disabled) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.FORBIDDEN,
        error: 'Sorry, this admin account has been disabled.',
      });
    }

    const verifyOtp = await otpRepository.verifyAdminOtp({ otp, admin_id: admin._id });

    if (!verifyOtp.status) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: verifyOtp.message,
      });
    }

    const token = await UtilFunctions.generateToken({
      _id: admin._id,
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email,
    });

    const data = {
      token,
    };

    // Audit
    await auditRepository.create({
      req,
      title: 'Admin OTP Recovery',
      name: `${admin.first_name} ${admin.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin._id,
    });
    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'OTP validation completed successfully.',
      data,
    });
  } catch (error: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Reset Password
 */

export async function resetPassword(req: ExpressRequest, res: Response): Promise<Response | void> {
  const { token, new_password, confirm_password } = req.body;

  try {
    const verify_token: any = await UtilFunctions.verifyToken(token);

    if (!verify_token.status) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.UNAUTHORIZED,
        error: verify_token.error,
      });
    }

    const admin = await adminUserRepository.getOne({ email: verify_token.decoded.email });

    if (!admin) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: 'An account with this email address already exists.',
      });
    }

    if (!admin.verified_email) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.UNAUTHORIZED,
        error: 'Email verification pending. Please check your inbox.',
      });
    }

    if (admin.is_disabled) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.FORBIDDEN,
        error: 'Sorry, this admin account has been disabled.',
      });
    }

    if (new_password !== confirm_password) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.BAD_REQUEST,
        error: `Your passwords do not match. Please try again.`,
      });
    }

    const hash = bcryptjs.hashSync(new_password, APP_CONSTANTS.GENERAL.SALT_ROUNDS);

    await adminUserRepository.atomicUpdate(admin._id, { $set: { password: hash } });

    // Audit
    await auditRepository.create({
      req,
      title: 'Admin Password Reset',
      name: `${admin.first_name} ${admin.last_name}`,
      activity_type: IAuditActivityType.ACCESS,
      activity_status: IAuditActivityStatus.SUCCESS,
      user: admin._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Password updated successfully.',
    });
  } catch (error: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/********************************
 *
 * Get Admin Details
 *
 *
 */

export async function getAdminUserDetails(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const admin = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');

    const getAdmin = await adminUserRepository.getOne({ admin_id: admin._id });

    if (!getAdmin) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: 'The email you entered is not associated with any admin account.',
      });
    }

    const role = await roleRepository.getOne(
      {role_id: getAdmin.role},
      'permissions',
    );

    const role_name = role?.role_name;
    const permissions = role?.permissions;

    delete getAdmin.password;
    delete getAdmin.invitation_expires;
    delete getAdmin.invitation_token;

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Admin account information fetched successfully.',
      data: { ...getAdmin, role_name, permissions },
    });
  } catch (error: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Get all Admins
 */

export async function getAllAdmins(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const { data } = await adminUserRepository.getAll(req);

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Successfully fetched admin list.',
      data,
    });
  } catch (error: Error | unknown | any) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}
