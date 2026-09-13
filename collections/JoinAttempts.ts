import type { CollectionConfig } from 'payload'

import { isAdmin } from './access'

export const JOIN_OUTCOMES = [
  'JOINED',
  'GAME_FULL',
  'GAME_NOT_JOINABLE',
  'GAME_NOT_FOUND',
  'ALREADY_JOINED',
  'UNAUTHENTICATED',
  'INVALID_REQUEST',
  'ERROR',
] as const

export type JoinOutcome = (typeof JOIN_OUTCOMES)[number]

/** Audit log of every join request, successful or not. Append-only; written by the join endpoint. */
export const JoinAttempts: CollectionConfig = {
  slug: 'join-attempts',
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: isAdmin,
  },
  admin: {
    defaultColumns: ['createdAt', 'outcome', 'gameId', 'user'],
    description: 'Audit log of join requests. Read-only; written by the join endpoint.',
  },
  fields: [
    {
      name: 'outcome',
      type: 'select',
      required: true,
      index: true,
      options: JOIN_OUTCOMES.map((value) => ({ label: value, value })),
    },
    {
      name: 'gameId',
      type: 'number',
      index: true,
      admin: {
        description: 'Requested game ID. Stored as a number so attempts on missing games are logged too.',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'remainingSpots',
      type: 'number',
      admin: {
        description: 'Spots left after a successful join.',
      },
    },
    {
      name: 'ip',
      type: 'text',
    },
  ],
}
