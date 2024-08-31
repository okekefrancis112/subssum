import { UploadedFile } from 'express-fileupload';
import { Types } from 'mongoose';
import AwsS3Integration from '../integrations/aws-s3-integration';
import { IUserDocument } from '../interfaces/user.interface';
import { IAdminUserDocument } from '../interfaces/admin-user.interface';
import userRepository from '../repositories/user.repository';
import adminUserRepository from '../repositories/admin-user.repository';
import { S3_BUCKET_NAME } from '../config';
import UtilFunctions from '../util';

class ImageService {
  public static async linkImageToUserProfile(
    profile_photo: UploadedFile,
    user_id: Types.ObjectId
  ): Promise<IUserDocument | null> {
    const awsResponse = await AwsS3Integration.uploadToBucket({
      Body: profile_photo.data,
      Bucket: `${S3_BUCKET_NAME}`,
      ContentType: profile_photo.mimetype,
      Key: `user-profile-image-${UtilFunctions.generateRandomString(5)}`,
    });

    const { Location: linkToFile } = awsResponse;

    let user = await userRepository.getById({
      _id: user_id,
      leanVersion: false,
    });

    if (user) {
      user = await userRepository.update({
        user,
        profile_photo: linkToFile,
      });
    }
    return user;
  }


  public static async linkImageToAdminProfile(
    profile_photo: UploadedFile,
    admin_id: Types.ObjectId
  ): Promise<IAdminUserDocument | null> {
    const awsResponse = await AwsS3Integration.uploadToBucket({
      Body: profile_photo.data,
      Bucket: `${S3_BUCKET_NAME}`,
      ContentType: profile_photo.mimetype,
      Key: `admin-profile-image-${UtilFunctions.generateRandomString(5)}`,
    });

    const { Location: linkToFile } = awsResponse;

    let admin = await adminUserRepository.getOne({
      admin_id: admin_id,
      leanVersion: false,
    });

    if (admin) {
      admin = await adminUserRepository.update({
        admin,
        profile_photo: linkToFile,
      });
    }
    return admin;
  }

  public static async uploadImageToS3(name: string, image: any, mimetype: string) {
    const awsResponse = await AwsS3Integration.uploadToBucket({
      // ACL: "public-read",
      Body: image.data,
      Bucket: `${S3_BUCKET_NAME}`,
      ContentType: mimetype,
      Key: name,
    });
    const { Location: link } = awsResponse;
    return link;
  }

  public static async deleteImageFromS3(url: string) {
    const contents: string[] = url.split('/');
    const size: number = contents.length;

    const Key: string = contents[size - 1];

    const response = await AwsS3Integration.deleteFromBucket({
      Bucket: `${S3_BUCKET_NAME}`,
      Key,
    });

    return response;
  }
}

export default ImageService;
