// import required modules for authentication
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ResponseHandler from '../util/response-handler';
import { ExpressRequest } from '../server';
import { SERVER_TOKEN_SECRET } from '../config/env.config';
import { HTTP_CODES } from '../constants/app_defaults.constant';

/*
   auth function to verify the user authorization
   req: Express request type
   res: response
   next: a middleware function to call the next process
*/
const auth = (req: ExpressRequest, res: Response, next: NextFunction) => {
  // Get token from header or Authorization
  const token = req.header('x-auth-token') || req.header('Authorization');
  if (!token) {
    // If Token not found, then return error with status code Unauthorized
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.UNAUTHORIZED,
      error: 'Access denied. No token provided',
    });
  }

  try {
    // verify the token using the configs
    jwt.verify(token, `${SERVER_TOKEN_SECRET}`, (error: any, decoded: any) => {
      if (error) {
        // Send error message if token cannot be verified
        return ResponseHandler.sendErrorResponse({
          res,
          code: HTTP_CODES.UNAUTHORIZED,
          error: error.message,
        });
      } else {
        // Set the user data in the Express request object
        req.user = decoded;
        // Call the next process
        next();
      }
    });
  } catch (ex) {
    // Return Bad Request when something went wrong while verifying token
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.BAD_REQUEST,
      error: 'Invalid Token',
    });
  }
};

export default {
  auth,
};
