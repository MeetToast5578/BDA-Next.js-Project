import type { CollectionConfig } from 'payload'

import { invalidateGamesCache } from '../lib/cache-tags'
import { CITY_OPTIONS, DEFAULT_CITY, parseCoordinates } from '../lib/game-backend'

export const Arena: CollectionConfig = {
  slug: 'arenas',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'district', 'sportTypes'],
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
      name: 'city',
      type: 'select',
      defaultValue: DEFAULT_CITY,
      index: true,
      options: CITY_OPTIONS,
      admin: {
        description: 'Used by the city filter on the /api/v1 sports, games and venues endpoints.',
      },
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
      validate: (value: string | null | undefined) =>
        !value || parseCoordinates(value) !== null || 'Use "latitude,longitude", for example 40.3755,49.8335.',
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
  hooks: {
    afterChange: [({ doc }) => {
      invalidateGamesCache()
      return doc
    }],
    afterDelete: [({ doc }) => {
      invalidateGamesCache()
      return doc
    }],
  },
}
