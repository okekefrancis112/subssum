import AWS from "aws-sdk";
import { AWS_ID, AWS_SECRET } from "../config";

export interface AwsUploadResponse {
    Etag?: string;
    Location?: string;
    Key?: string;
    Bucket?: string;
}

const s3 = new AWS.S3({
    accessKeyId: AWS_ID,
    secretAccessKey: AWS_SECRET,
});

class AwsS3Integration {
    // Upload to Bucket
    public static uploadToBucket(parameters: {
        Bucket: string;
        Body: any;
        Key: string;
        ACL?: string;
        ContentType?: string;
    }): Promise<AwsUploadResponse> {
        return new Promise((resolve, reject) => {
            s3.upload(parameters, (error: any, data: AwsUploadResponse) => {
                if (error) {
                    return reject(error);
                }
                return resolve(data);
            });
        });
    }

    // Delete from Bucket
    public static deleteFromBucket(parameters: {
        Bucket: string;
        Key: string;
    }): Promise<string> {
        return new Promise((resolve, reject) => {
            s3.deleteObject(parameters, (err: any) => {
                if (err) return reject(err);
                resolve("File deleted");
            });
        });
    }
}

export default AwsS3Integration;
