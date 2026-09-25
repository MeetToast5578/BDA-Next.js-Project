// Upload limits shared by the server (payload.config.ts, collections/Media.ts) and the picture picker.

/** Under Vercel's 4.5 MB request limit, with room for the multipart envelope. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/** Raster images only: an SVG is a document that can carry script, and would be served from our origin. */
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
