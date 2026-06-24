import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "eduflow-lms-storage-use1-siddhi-2026.s3.us-east-1.amazonaws.com",
      },
    ],
  },
  serverExternalPackages: [
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/lib-dynamodb",
    "@aws-sdk/credential-provider-node",
    "@aws-sdk/client-s3"
  ],
};

export default nextConfig;
