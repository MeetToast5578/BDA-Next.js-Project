import type { Access, FieldAccess } from 'payload'

type RoleUser = { id: number | string; role?: string } | null | undefined

export const isAdmin: Access = ({ req }) => (req.user as RoleUser)?.role === 'admin'

export const isAdminField: FieldAccess = ({ req }) => (req.user as RoleUser)?.role === 'admin'

/** Admins can touch every account; other signed-in users only their own. */
export const isAdminOrSelf: Access = ({ req }) => {
  const user = req.user as RoleUser
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}

/** Admins can touch every game; other signed-in users only games they host. */
export const isAdminOrHost: Access = ({ req }) => {
  const user = req.user as RoleUser
  if (!user) return false
  if (user.role === 'admin') return true
  return { host: { equals: user.id } }
}
