import type { CollectionConfig } from 'payload'

import { invalidateGamesCache } from '../lib/cache-tags'
import { isAdminOrHost } from './access'

export const Games: CollectionConfig = {
  slug: 'games',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: isAdminOrHost,
    delete: isAdminOrHost,
  },
  defaultPopulate: {
    host: true,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'sport',
      type: 'select',
      required: true,
      options: [
        { label: 'Football', value: 'football' },
        { label: 'Basketball', value: 'basketball' },
        { label: 'Tennis', value: 'tennis' },
      ],
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Cover shown on game cards, served as thumbnail and full-size WebP.',
      },
    },
    {
      name: 'image',
      type: 'text',
      admin: {
        description: 'Fallback public image path, used when no cover image is uploaded. Without either, the sport\'s default image is used.',
      },
    },
    {
      name: 'arena',
      type: 'relationship',
      relationTo: 'arenas',
      required: true,
    },
    {
      name: 'level',
      type: 'select',
      required: true,
      options: [
        { label: 'Beginner', value: 'beginner' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
      ],
    },
    {
      name: 'host',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'homeTeam',
      type: 'relationship',
      relationTo: 'teams',
      required: true,
    },
    {
      name: 'awayTeam',
      type: 'relationship',
      relationTo: 'teams',
      required: true,
    },
    {
      name: 'scheduledAt',
      type: 'date',
      required: true,
    },
    {
      name: 'maxPlayers',
      type: 'number',
      min: 1,
      required: true,
    },
    {
      name: 'availablePlayers',
      type: 'number',
      min: 0,
      required: true,
    },
    {
      name: 'homeScore',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'awayScore',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'scheduled',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Live', value: 'live' },
        { label: 'Finished', value: 'finished' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation, req }) => {
        if (operation === 'create' && data && req.user) {
          data.host = req.user.id

          if (data.availablePlayers === undefined && data.maxPlayers !== undefined) {
            data.availablePlayers = data.maxPlayers
          }
        }

        return data
      },
    ],
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
