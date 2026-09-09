import type { CollectionConfig } from 'payload'

export const Arena: CollectionConfig = {
  slug: 'arenas',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'location',
      type: 'text',
      required: true,
    },
    {
      name: 'district',
      type: 'text',
      admin: {
        description: 'City district or neighborhood where the venue is located.',
      },
    },
    {
      name: 'address',
      type: 'text',
    },
    {
      name: 'coordinates',
      type: 'text',
      admin: {
        description: 'Latitude and longitude separated by a comma, for example 40.3755,49.8335.',
      },
    },
    {
      name: 'sportTypes',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Football', value: 'football' },
        { label: 'Basketball', value: 'basketball' },
        { label: 'Tennis', value: 'tennis' },
      ],
    },
    {
      name: 'capacity',
      type: 'number',
      min: 1,
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
}
