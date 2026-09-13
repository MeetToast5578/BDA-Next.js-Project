import type { CollectionConfig } from 'payload'

export const Games: CollectionConfig = {
  slug: 'games',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
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
      name: 'image',
      type: 'text',
      admin: {
        description: 'Public image path used on the game cards.',
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
  },
}