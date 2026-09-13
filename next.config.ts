import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const mediaBaseUrl = process.env.MEDIA_BASE_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  images: {
    // AVIF where the browser accepts it, WebP otherwise.
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaBaseUrl ? [new URL(`${mediaBaseUrl}/**`)] : [],
  },
};

export default withPayload(nextConfig);
