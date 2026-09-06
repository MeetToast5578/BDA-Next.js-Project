import type { CollectionConfig } from 'payload'
import { jwtVerify } from 'jose'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req }) => (req.user as { role?: string } | undefined)?.role === 'admin',
  },
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    strategies: [
      {
        name: 'google',
        authenticate: async ({ headers, payload }) => {
          const cookieHeader = headers.get('cookie')
          const token = cookieHeader
            ?.split(';')
            .map((cookie) => cookie.trim())
            .find((cookie) => cookie.startsWith('google_session='))
            ?.split('=')[1]

          if (!token || !process.env.PAYLOAD_SECRET) {
            return { user: null }
          }

          try {
            const { payload: claims } = await jwtVerify(
              decodeURIComponent(token),
              new TextEncoder().encode(process.env.PAYLOAD_SECRET),
            )
            const result = await payload.find({
              collection: 'users',
              where: {
                googleId: {
                  equals: claims.sub,
                },
              },
              limit: 1,
            })

            const user = result.docs[0]
            return {
              user: user ? { ...user, collection: 'users' } : null,
            }
          } catch {
            return { user: null }
          }
        },
      },
    ],
  },
  fields: [
    {
      name: 'phoneNumber',
      type: 'text',
      unique: true,
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        update: ({ req }) => (req.user as { role?: string } | undefined)?.role === 'admin',
      },
    },
    {
      name: 'Full Name',
      type: 'text',
      required: true,
    },
    {
      name: 'profilePicture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'googleId',
      type: 'text',
      unique: true,
      admin: {
        hidden: true,
      },
    },
  ]
}
