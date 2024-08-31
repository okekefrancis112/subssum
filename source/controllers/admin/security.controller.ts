import { Response } from 'express';
import { ExpressRequest } from '../../server';
import ResponseHandler from '../../util/response-handler';
import { APP_CONSTANTS, HTTP_CODES } from '../../constants/app_defaults.constant';
import userRepository from '../../repositories/user.repository';
import UtilFunctions, { throwIfAdminUserUndefined } from '../../util';
import { SECURITY_TYPE } from '../../interfaces/otp.interface';
import securityRepository from '../../repositories/security.repository';
import adminUserRepository from '../../repositories/admin-user.repository';

export async function createSecurity(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const getAdmin = await adminUserRepository.getOne({ admin_id: admin_user._id });

    if (!getAdmin) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: 'User not found. Please check your input.',
      });
    }

    // get user email and security type from request body
    const { email, security_type } = req.body;

    // retrieve user data with given email
    const validate_user = await userRepository.getByEmail({ email: email.toLowerCase() });

    // if user is not found in db
    if (!validate_user) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.NOT_FOUND,
        error: 'User not found',
      });
    }

    // if security requested is OTP
    if (security_type == SECURITY_TYPE.OTP) {
      // generate OTP for the user
      const otp = await UtilFunctions.generateOtp({
        user_id: validate_user._id,
        mins: APP_CONSTANTS.OTP.TTL_SECURITY,
      });

      // if no OTP is generated
      if (!otp) {
        return ResponseHandler.sendErrorResponse({
          res,
          code: HTTP_CODES.INTERNAL_SERVER_ERROR,
          error: 'Error generating OTP',
        });
      }

      await securityRepository.createEntry({
        user_id: validate_user._id,
        type: security_type,
        entity: otp?.otp,
        generated_by: getAdmin._id,
      });

      await UtilFunctions.sendEmail2('security.hbs', {
        to: validate_user?.email,
        subject: 'Verification OTP',
        props: {
          otp: otp?.otp,
          security_type: 'one-time-otp',
          name: validate_user.first_name,
        },
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.CREATED,
        message: 'OTP generated and sent to user email',
      });
    }

    // if security requested is one time secret password
    if (security_type == SECURITY_TYPE.SECRET_PASSWORD) {
      // generate one time secret password for user
      const { user, password } = await userRepository.processOneTimeSecretPassword({
        user_id: validate_user._id,
      });

      // If no such password is generated
      if (!user || !password) {
        return ResponseHandler.sendErrorResponse({
          res,
          code: HTTP_CODES.INTERNAL_SERVER_ERROR,
          error: 'Error generating secret password',
        });
      }

      await securityRepository.createEntry({
        user_id: validate_user._id,
        type: security_type,
        entity: password,
        generated_by: getAdmin._id,
      });

      await UtilFunctions.sendEmail2('security-secret-password.hbs', {
        to: validate_user?.email,
        subject: 'Verification OTP',
        props: {
          otp: password,
          security_type: 'one-time-secret-password',
          name: validate_user.first_name,
        },
      });

      return ResponseHandler.sendSuccessResponse({
        res,
        code: HTTP_CODES.CREATED,
        message: 'Secret Password generated and sent to user email',
      });
    }
  } catch (error) {
    // catch any possible errors that may occur during process
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

export async function getAllSecurity(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    // get all security data from db
    const { data, pagination } = await securityRepository.findAll({ req });

    // if no security data is found
    // if (!data) {
    //   return ResponseHandler.sendErrorResponse({
    //     res,
    //     code: HTTP_CODES.NOT_FOUND,
    //     error: 'No security data found',
    //   });
    // }

    // return success response
    return ResponseHandler.sendSuccessResponse({
      res,
      message: 'Security data retrieved',
      data: { data, pagination },
    });
  } catch (error) {
    // catch any possible errors that may occur during process
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}
