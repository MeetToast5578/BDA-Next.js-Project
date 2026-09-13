import type { CollectionConfig } from 'payload'

import { invalidateGamesCache } from '../lib/cache-tags'
import { isAdmin } from './access'

/** One row per player who joined a game. Written by POST /api/games/[id]/join (lib/join-game.ts). */
export const GameParticipants: CollectionConfig = {
  slug: 'game-participants',
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    defaultColumns: ['game', 'user', 'createdAt'],
    description: 'Players who joined a game. Created by the join endpoint, which also decrements the game\'s available spots.',
  },
  // Also the ON CONFLICT target in lib/join-game.ts: a user can hold at most one spot per game.
  indexes: [{ fields: ['game', 'user'], unique: true }],
  fields: [
    {
      name: 'game',
      type: 'relationship',
      relationTo: 'games',
      required: true,
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
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
