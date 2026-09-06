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
