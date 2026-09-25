import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import sharp from 'sharp'

import { deleteMyAccount, getMyProfile, updateMyProfile } from '@/lib/profile-queries'

type TestUser = { id: number; role?: string | null; collection: 'users' }

/**
 * Who may change or delete an upload, what may be uploaded, and which uploads a profile may use,
 * against the real database. Every record and file it creates is removed afterwards.
 */
describe.skipIf(!process.env.DATABASE_URL)('media access (Postgres)', () => {
  const suffix = Date.now()
  let payload: Payload
  let png: Buffer
  let owner: TestUser
  let other: TestUser
  let admin: TestUser
  const userIds: number[] = []

  beforeAll(async () => {
    const { getPayload } = await import('payload')
    const config = (await import('@/payload.config')).default
    payload = await getPayload({ config })
    png = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#3525cd' } }).png().toBuffer()

    const makeUser = async (name: string, role: 'user' | 'admin' = 'user'): Promise<TestUser> => {
      const doc = await payload.create({
        collection: 'users',
        overrideAccess: true,
        data: { email: `media-${suffix}-${name}@oyunagel.test`, password: 'media-test-password', fullName: `Media ${name}`, role },
      })
      userIds.push(doc.id)
      return { ...doc, collection: 'users' }
    }
    owner = await makeUser('owner')
    other = await makeUser('other')
    admin = await makeUser('admin', 'admin')
  })

  afterAll(async () => {
    if (!payload) return
    // Deleting through Payload removes the files from ./media as well. Matched on the filename, which a
    // test that fails halfway (an alt changed by a write that should have been refused) can't change.
    await payload.delete({ collection: 'media', where: { filename: { like: `media-${suffix}` } }, overrideAccess: true })
    await payload.delete({ collection: 'users', where: { id: { in: userIds } }, overrideAccess: true })
    await payload.db.destroy?.()
  })

  const file = (name: string, data = png, mimetype = 'image/png') => ({
    data,
    mimetype,
    name: `media-${suffix}-${name}.${mimetype.split('/')[1].replace('svg+xml', 'svg')}`,
    size: data.length,
  })

  /** An upload made through the API as `user`, the way the profile's picture picker makes one. */
  const upload = (user: TestUser, name: string, data: Record<string, unknown> = {}) =>
    payload.create({
      collection: 'media',
      data: { alt: `media-test-${suffix} ${name}`, ...data },
      file: file(name),
      user,
      overrideAccess: false,
    })

  const uploaderOf = async (id: number) => {
    const doc = await payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true, disableErrors: true })
    return doc ? doc.uploadedBy : 'gone'
  }

  it('records who uploaded a file, whoever the request claims', async () => {
    const doc = await upload(owner, 'claimed', { uploadedBy: other.id })
    expect(await uploaderOf(doc.id)).toBe(owner.id)
  })

  it('lets only the uploader or an admin change or delete a file', async () => {
    const doc = await upload(owner, 'guarded')

    // The hole this closes: any signed-in user could overwrite or delete any upload.
    await expect(
      payload.update({ collection: 'media', id: doc.id, data: { alt: 'hijacked' }, user: other, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(payload.delete({ collection: 'media', id: doc.id, user: other, overrideAccess: false })).rejects.toThrow()
    expect(await uploaderOf(doc.id)).toBe(owner.id)

    // Nor can the uploader hand the file to someone else.
    await payload.update({
      collection: 'media',
      id: doc.id,
      data: { alt: `media-test-${suffix} renamed`, uploadedBy: other.id },
      user: owner,
      overrideAccess: false,
    })
    expect(await uploaderOf(doc.id)).toBe(owner.id)

    await payload.delete({ collection: 'media', id: doc.id, user: admin, overrideAccess: false })
    expect(await uploaderOf(doc.id)).toBe('gone')
  })

  it('refuses anything but JPEG, PNG and WebP, SVG included', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>')
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: `media-test-${suffix} svg` },
        file: file('drawing', svg, 'image/svg+xml'),
        user: owner,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const gif = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } }).gif().toBuffer()
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: `media-test-${suffix} gif` },
        file: file('animation', gif, 'image/gif'),
        user: owner,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it("won't make someone else's upload a profile picture", async () => {
    const theirs = await upload(other, 'theirs')
    expect(await updateMyProfile(owner.id, { profilePictureId: theirs.id })).toMatchObject({
      ok: false,
      code: 'MEDIA_NOT_FOUND',
    })
  })

  it('uses an own upload, deletes the picture it replaces, and can remove it again', async () => {
    const first = await upload(owner, 'first')
    const set = await updateMyProfile(owner.id, { profilePictureId: first.id })
    expect(set.ok && set.profile.hasUploadedPicture).toBe(true)
    expect(set.ok && set.profile.avatarUrl).toContain(`media-${suffix}-first`)

    const second = await upload(owner, 'second')
    await updateMyProfile(owner.id, { profilePictureId: second.id })
    // Nothing else can point at an old profile picture, so it doesn't linger in storage.
    expect(await uploaderOf(first.id)).toBe('gone')

    const removed = await updateMyProfile(owner.id, { profilePictureId: null })
    expect(removed.ok && removed.profile.hasUploadedPicture).toBe(false)
    expect(await uploaderOf(second.id)).toBe('gone')
    expect((await getMyProfile(owner.id))?.avatarUrl).toBeNull()
  })

  it('deletes the pictures of a deleted account', async () => {
    const leaving = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { email: `media-${suffix}-leaving@oyunagel.test`, password: 'media-test-password', fullName: 'Media leaving' },
    })
    const picture = await upload({ ...leaving, collection: 'users' }, 'leaving')
    await updateMyProfile(leaving.id, { profilePictureId: picture.id })

    await deleteMyAccount(leaving.id)

    expect(await uploaderOf(picture.id)).toBe('gone')
  })
})
