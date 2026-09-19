import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const mediaBaseUrl = process.env.MEDIA_BASE_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  images: {
    // AVIF where the browser accepts it, WebP otherwise.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Google profile pictures saved at Google sign-in (users.avatarUrl).
      new URL("https://lh3.googleusercontent.com/**"),
      ...(mediaBaseUrl ? [new URL(`${mediaBaseUrl}/**`)] : []),
    ],
  },
};

export default withPayload(nextConfig);
