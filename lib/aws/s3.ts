import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "eduflow-lms-storage-use1-siddhi-2026";

// Force S3 usage instead of mock mode (which crashes in AWS Lambda due to read-only filesystem)
const IS_MOCK_MODE = false;

const s3Client = new S3Client({
  region: AWS_REGION,
});

export const uploadToS3 = async (
  fileStream: any,
  fileName: string,
  contentType: string,
  folder: string = "uploads"
): Promise<string> => {
  const uniqueFileName = `${folder}/${uuidv4()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  if (IS_MOCK_MODE) {
    const publicDir = path.join(process.cwd(), "public");
    const fullPath = path.join(publicDir, uniqueFileName);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(fullPath, fileStream);
    console.log(`[MOCK MODE] Saved file locally to ${fullPath}`);
    return `/${uniqueFileName}`;
  }

  const bucketName = S3_BUCKET_NAME || "eduflow-lms-assets";

  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: uniqueFileName,
        Body: fileStream,
        ContentType: contentType,
      },
    });

    await upload.done();
    // Return the public S3 URL
    return `https://${bucketName}.s3.${AWS_REGION || "us-east-1"}.amazonaws.com/${uniqueFileName}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload file to S3");
  }
};

export const getPresignedUrl = async (s3UrlOrKey: string | null, expiresIn: number = 3600) => {
  if (!s3UrlOrKey) return null;
  
  if (s3UrlOrKey.startsWith("/") || !s3UrlOrKey.includes(".s3.")) return s3UrlOrKey;

  let key = s3UrlOrKey;
  try {
    const url = new URL(s3UrlOrKey);
    key = decodeURIComponent(url.pathname.substring(1));
  } catch {
    return s3UrlOrKey;
  }

  const bucketName = S3_BUCKET_NAME;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return s3UrlOrKey;
  }
};
