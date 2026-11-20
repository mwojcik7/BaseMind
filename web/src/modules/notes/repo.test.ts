import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, LocalDatabase, SCHEMA_VERSIONS } from '@/db/db'
import { useAuth, type Account } from '@/lib/auth'
import { noteFolders, notes } from '@/modules/notes/repo'

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'T', email: 't@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

describe('notes', () => {
  beforeEach(() => useAuth.setState({ status: 'authenticated', account: ACCOUNT }))

  it('queue changes under the names the server expects', async () => {
    const folder = await noteFolders.create({ name: 'Dom' })
    const note = await notes.create({
      folder_id: folder.id,
      title: null,
      content: '# Pomysły',
      pinned: false,
      archived: false,
    })
    await notes.update(note.id, { pinned: true })

    const queued = await db.outbox.orderBy('seq').toArray()

    expect(queued.map((entry) => [entry.entity, entry.op])).toEqual([
      ['note_folders', 'create'],
      ['notes', 'create'],
      ['notes', 'update'],
    ])
    expect(queued[2].payload).toEqual({ pinned: true })
  })

  it('find the notes in a folder', async () => {
    const fields = { title: null, content: null, pinned: false, archived: false }
    await notes.create({ ...fields, folder_id: 'f' })
    await notes.create({ ...fields, folder_id: null })

    expect(await db.table('notes').where('folder_id').equals('f').count()).toBe(1)
  })

  describe('upgrading a device from the schema before notes', () => {
    afterEach(() => Dexie.delete('upgrade-test'))

    it('keeps its events and gains the note tables', async () => {
      const before = new LocalDatabase('upgrade-test', SCHEMA_VERSIONS.slice(0, -1))
      await before.table('events').put({ id: 'e', start_date: '2026-11-20' })
      before.close()

      const after = new LocalDatabase('upgrade-test', SCHEMA_VERSIONS)
      await after.open()

      expect(await after.table('events').get('e')).toEqual({ id: 'e', start_date: '2026-11-20' })
      expect(after.tables.map((table) => table.name)).toEqual(
        expect.arrayContaining(['notes', 'note_folders']),
      )
      after.close()
    })
  })
})
