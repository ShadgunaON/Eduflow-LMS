const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const S3_BUCKET =
  process.env.S3_BUCKET_NAME || "eduflow-lms-storage-use1-siddhi-2026";

/**
 * Generate a presigned URL for an S3 object.
 * Handles both raw S3 keys and full S3 URLs (extracts the key).
 * Mirrors the exact behavior from lib/aws/s3.ts getPresignedUrl.
 */
const getPresignedUrl = async (s3UrlOrKey, expiresIn = 3600) => {
  if (!s3UrlOrKey) return null;

  // Local paths — return as-is
  if (s3UrlOrKey.startsWith("/")) return s3UrlOrKey;

  // Not an S3 URL — return as-is
  if (!s3UrlOrKey.includes(".s3.") && s3UrlOrKey.startsWith("http")) {
    return s3UrlOrKey;
  }

  let key = s3UrlOrKey;

  // Extract key from full S3 URL
  if (s3UrlOrKey.startsWith("http")) {
    try {
      const url = new URL(s3UrlOrKey);
      key = decodeURIComponent(url.pathname.substring(1));
    } catch {
      return s3UrlOrKey;
    }
  }

  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  try {
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return s3UrlOrKey;
  }
};

module.exports = { s3Client, S3_BUCKET, getPresignedUrl };
