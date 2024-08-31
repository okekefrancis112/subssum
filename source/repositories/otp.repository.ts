import { Types } from 'mongoose';
import { IOtpDocument } from '../interfaces/otp.interface';
import { Otp } from '../models';
import { CreateOtpDto } from '../dtos/otp.dto';

class OtpRepository {
  // Function to create new OTP
  public async create({
    user_id,
    admin_id,
    otp,
    token,
    expires_in,
  }: CreateOtpDto): Promise<IOtpDocument> {
    let data;

    if (user_id) {
      data = {
        user_id,
        token,
        otp,
        expires_in,
      };
    }

    if (admin_id) {
      data = {
        admin_id,
        otp,
        expires_in,
      };
    }

    return await Otp.create(data);
  }

  // Function to get OTP (User)
  public async getOtpByUser({
    user_id,
  }: {
    user_id: Types.ObjectId;
  }): Promise<IOtpDocument | null> {
    return Otp.findOne({ user_id });
  }

  // Function to get OTP (Admin)
  public async getOtpByAdmin({
    admin_id,
  }: {
    admin_id: Types.ObjectId;
  }): Promise<IOtpDocument | null> {
    return Otp.findOne({ admin_id });
  }

  // Function to update OTP (User)
  public async updateOtp({
    user_id,
    otp,
    token,
    expires_in,
  }: {
    user_id: Types.ObjectId;
    token?: string;
    otp: number;
    expires_in: Date;
  }): Promise<IOtpDocument | null> {
    return await Otp.findOneAndUpdate(
      { user_id: user_id },
      { $set: { otp: otp, token, expires_in: expires_in } },
      { new: true }
    );
  }

  // Function to destroy OTP (User)
  public async destroyOtpToken({ user_id }: { user_id: Types.ObjectId }): Promise<any> {
    return Otp.updateOne({ user_id }, { $set: { token: 'undefined' } }, { new: true });
  }

  // Function to update OTP (Admin)
  public async updateAdminOtp({
    admin_id,
    otp,
    expires_in,
  }: {
    admin_id: Types.ObjectId;
    otp: number;
    expires_in: Date;
  }): Promise<IOtpDocument | null> {
    return await Otp.findOneAndUpdate(
      { admin_id: admin_id },
      { $set: { otp: otp, expires_in: expires_in } },
      { new: true }
    );
  }

  // Function to verify OTP (User)
  public async verifyOtp({ otp, user_id }: { otp: number; user_id: Types.ObjectId }): Promise<any> {
    try {
      const getOtp = await this.getOtpByUser({ user_id });

      if (getOtp?.otp == otp && Number(getOtp?.expires_in) > Date.now()) {
        return { status: true, token: getOtp?.token };
      }

      if (getOtp?.otp !== otp || getOtp?.expires_in! < new Date()) {
        return { status: false, message: 'This OTP is invalid or expired. Try again' };
      }

      return { status: false };
    } catch (err: Error | unknown | any) {
      return { status: false, message: err.message };
    }
  }

  // Function to verify OTP (Admin)
  public async verifyAdminOtp({
    otp,
    admin_id,
  }: {
    otp: number;
    admin_id: Types.ObjectId;
  }): Promise<any> {
    try {
      const getOtp = await this.getOtpByAdmin({ admin_id });

      if (getOtp?.otp == otp && Number(getOtp?.expires_in) > Date.now()) {
        return { status: true };
      }

      if (getOtp?.otp !== otp || getOtp?.expires_in! < new Date()) {
        return {
          status: false,
          message: 'Your OTP is invalid or has timed out. Please generate a new one and try again.',
        };
      }

      return { status: false };
    } catch (err: Error | unknown | any) {
      return { status: false, message: err.message };
    }
  }
}

// Export OtpRepository
export default new OtpRepository();
