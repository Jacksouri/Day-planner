import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, emptyData, loadData, pruneTombstones, saveData } from './storage'
import type { KeyValueStore } from './storage'
import { createTask } from './tasks'

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

let store: ReturnType<typeof memoryStore>

beforeEach(() => {
  store = memoryStore()
})

describe('loadData / saveData', () => {
  it('starts empty on a fresh device', () => {
    const data = loadData(store)
    expect(data.tasks).toEqual([])
    expect(data.deviceId).toBeTruthy()
  })

  it('round-trips saved data', () => {
    const data = { ...emptyData('device-a'), tasks: [createTask({ title: 'Walk dog' })] }
    saveData(store, data)
    expect(loadData(store)).toMatchObject({ deviceId: 'device-a' })
    expect(loadData(store).tasks[0].title).toBe('Walk dog')
  })

  it('quarantines corrupt data instead of throwing', () => {
    store.setItem(STORAGE_KEY, '{ this is not json')
    expect(loadData(store).tasks).toEqual([])
    const quarantined = [...store.map.keys()].filter((key) => key.includes('/corrupt/'))
    expect(quarantined).toHaveLength(1)
  })
})

describe('pruneTombstones', () => {
  const now = new Date('2025-08-07T00:00:00.000Z')

  it('keeps live tasks and recent tombstones', () => {
    const live = createTask({ title: 'live' })
    const recent = { ...createTask({ title: 'recent' }), deletedAt: '2025-08-01T00:00:00.000Z' }
    expect(pruneTombstones([live, recent], 30, now).map((t) => t.title)).toEqual(['live', 'recent'])
  })

  it('drops tombstones past the retention window', () => {
    const old = { ...createTask({ title: 'old' }), deletedAt: '2025-06-01T00:00:00.000Z' }
    expect(pruneTombstones([old], 30, now)).toEqual([])
  })
})
