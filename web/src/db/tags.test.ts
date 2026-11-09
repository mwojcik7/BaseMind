import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, LocalDatabase, SCHEMA_VERSIONS } from '@/db/db'
import { entityLinks, entityTags, tags } from '@/db/tags'
import { useAuth, type Account } from '@/lib/auth'

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'T', email: 't@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

describe('tags and links', () => {
  beforeEach(() => useAuth.setState({ status: 'authenticated', account: ACCOUNT }))

  it('queue changes under the names the server expects', async () => {
    const tag = await tags.create({ name: 'Dom', color: null })
    await entityTags.create({ entity_type: 'notes', entity_id: 'n', tag_id: tag.id })
    await entityLinks.create({
      source_type: 'notes',
      source_id: 'n',
      target_type: 'contacts',
      target_id: 'c',
      origin: 'parsed',
    })

    const queued = await db.outbox.orderBy('seq').toArray()

    expect(queued.map((entry) => entry.entity)).toEqual(['tags', 'entity_tags', 'entity_links'])
  })

  it('find the tags of a record, and links in both directions', async () => {
    await entityTags.create({ entity_type: 'notes', entity_id: 'n', tag_id: 't' })
    await entityLinks.create({
      source_type: 'notes',
      source_id: 'n',
      target_type: 'contacts',
      target_id: 'c',
      origin: 'manual',
    })

    const ofNote = await db
      .table('entity_tags')
      .where('[entity_type+entity_id]')
      .equals(['notes', 'n'])
      .count()
    const outgoing = await db
      .table('entity_links')
      .where('[source_type+source_id]')
      .equals(['notes', 'n'])
      .count()
    const backlinks = await db
      .table('entity_links')
      .where('[target_type+target_id]')
      .equals(['contacts', 'c'])
      .count()

    expect([ofNote, outgoing, backlinks]).toEqual([1, 1, 1])
  })

  describe('upgrading a device from the first schema', () => {
    afterEach(() => Dexie.delete('upgrade-test'))

    it('keeps its data and gains the new tables', async () => {
      const before = new LocalDatabase('upgrade-test', SCHEMA_VERSIONS.slice(0, 1))
      await before.meta.put({ key: 'account', value: ACCOUNT })
      before.close()

      const after = new LocalDatabase('upgrade-test', SCHEMA_VERSIONS)
      await after.open()

      expect((await after.meta.get('account'))?.value).toEqual(ACCOUNT)
      expect(after.tables.map((table) => table.name)).toEqual(
        expect.arrayContaining(['tags', 'entity_tags', 'entity_links']),
      )
      after.close()
    })
  })
})
