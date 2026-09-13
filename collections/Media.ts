import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    mimeTypes: ['image/*'],
    adminThumbnail: 'thumbnail',
    // WebP renditions for game cards. next/image additionally serves AVIF to browsers that accept it
    // (images.formats in next.config.ts). Set MEDIA_BASE_URL to serve these through a CDN.
    imageSizes: [
      {
        name: 'thumbnail',
        width: 480,
        height: 270,
        position: 'centre',
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'full',
        width: 1600,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
    ],
  },
}
