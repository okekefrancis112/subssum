import userRepository from "../repositories/user.repository";
import ResponseHandler from "../util/response-handler";

import { Response } from "express";
import { OAuth2Client, TokenPayload } from "google-auth-library"
import { HTTP_CODES } from "../constants/app_defaults.constant";

class OAuth2ClientService {
  private readonly _google: OAuth2Client;
  private  _userTokenPayload: TokenPayload | undefined;

  constructor() {
    this._google = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.CALLBACK_URL,
    )
  }

  public getTokenInfos = async (id_token: string, res: Response) => {
  try{
    if (!id_token) {
        return res.status(401).json({
            success: false,
            code: HTTP_CODES.UNAUTHORIZED,
            message: "Invalid token",
        });
    }

    const ticket = await this._google.verifyIdToken({
      idToken: id_token,
    })

    this._userTokenPayload = ticket.getPayload()
    if (!this._userTokenPayload || !this._userTokenPayload.email) {
        return res.status(401).json({
            success: false,
            code: HTTP_CODES.UNAUTHORIZED,
            message: "Invalid Login",
        });
    }

    const user = await userRepository.getByEmail({ email: this._userTokenPayload.email });
    if (!user) {
      const newUser = await userRepository.create({
        first_name: this._userTokenPayload.name,
        email: this._userTokenPayload.email,
      });

      await userRepository.atomicUpdate( newUser._id, {
        $set: {
            first_login: true,
            last_login: new Date(),
            verified_email: true,
            verified_email_at: new Date(),
        },
    });

      return user
    } else{
      // Set first_login to false
      if (user.first_login) {
        await userRepository.atomicUpdate(user._id, {
            $set: { first_login: false },
        });
      }

      // Update last_login field in user document
      await userRepository.atomicUpdate(user._id, {
        $set: { last_login: new Date() },
        $inc: { login_count: 1 },
      });

      return user
    }
  } catch (error) {
      return ResponseHandler.sendErrorResponse({
          res,
          code: HTTP_CODES.INTERNAL_SERVER_ERROR,
          error: `${error}`,
      });
    }
  }
}

export default new OAuth2ClientService();
