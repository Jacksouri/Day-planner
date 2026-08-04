import { describe, expect, it } from 'vitest'
import { InvalidBackupError } from './merge'
import { emptyData } from './storage'
import { backupFileName, createFileHandleAdapter, createMemoryAdapter, readBackupFile, serializeBackup, syncWith } from './sync'
import { createTask } from './tasks'
import type { PlannerData, Task } from './types'

function withTasks(tasks: Task[], deviceId = 'device-a'): PlannerData {
  return { ...emptyData(deviceId), tasks }
}

describe('syncWith', () => {
  it('writes local data when the remote snapshot is empty', async () => {
    const adapter = createMemoryAdapter(null)
    const local = withTasks([createTask({ title: 'Only local' })])

    const result = await syncWith(adapter, local)

    expect(result.pulled).toBe(false)
    expect(adapter.snapshot?.tasks.map((t) => t.title)).toEqual(['Only local'])
  })

  it('merges both sides and pushes the result back', async () => {
    const remoteTask = createTask({ title: 'From phone' })
    const adapter = createMemoryAdapter(withTasks([remoteTask], 'device-b'))
    const local = withTasks([createTask({ title: 'From laptop' })])

    const result = await syncWith(adapter, local)

    expect(result.pulled).toBe(true)
    expect(result.data.tasks.map((t) => t.title).sort()).toEqual(['From laptop', 'From phone'])
    expect(adapter.snapshot?.tasks).toHaveLength(2)
    expect(result.data.deviceId).toBe('device-a')
  })

  it('converges when two devices sync through the same snapshot in turn', async () => {
    const adapter = createMemoryAdapter(null)
    const laptop = withTasks([createTask({ title: 'Laptop task' })], 'laptop')
    const phone = withTasks([createTask({ title: 'Phone task' })], 'phone')

    const afterLaptop = await syncWith(adapter, laptop)
    const afterPhone = await syncWith(adapter, phone)
    const laptopAgain = await syncWith(adapter, afterLaptop.data)

    const titles = (data: PlannerData) => data.tasks.map((t) => t.title).sort()
    expect(titles(afterPhone.data)).toEqual(['Laptop task', 'Phone task'])
    expect(titles(laptopAgain.data)).toEqual(titles(afterPhone.data))
  })
})

describe('file transport', () => {
  it('serializes and reads back a snapshot', async () => {
    const data = withTasks([createTask({ title: 'Round trip' })])
    const parsed = await readBackupFile(new Blob([serializeBackup(data)], { type: 'application/json' }))
    expect(parsed.tasks[0].title).toBe('Round trip')
  })

  it('rejects a file that is not a snapshot', async () => {
    await expect(readBackupFile(new Blob(['nope']))).rejects.toThrow(InvalidBackupError)
  })

  it('names backups with a filesystem-safe timestamp', () => {
    expect(backupFileName(new Date('2025-08-07T09:05:00.000Z'))).toBe('day-planner-2025-08-07-09-05-00.json')
  })
})

describe('createFileHandleAdapter', () => {
  function fakeHandle(initial: string) {
    let contents = initial
    return {
      get contents() {
        return contents
      },
      async getFile() {
        return new Blob([contents])
      },
      async createWritable() {
        let buffer = ''
        return {
          async write(chunk: string) {
            buffer += chunk
          },
          async close() {
            contents = buffer
          },
        }
      },
    }
  }

  it('treats an empty file as no snapshot and then writes into it', async () => {
    const handle = fakeHandle('')
    const adapter = createFileHandleAdapter(handle)

    expect(await adapter.pull()).toBeNull()
    await syncWith(adapter, withTasks([createTask({ title: 'Seeded' })]))

    expect(JSON.parse(handle.contents).tasks[0].title).toBe('Seeded')
    expect((await adapter.pull())?.tasks).toHaveLength(1)
  })
})
