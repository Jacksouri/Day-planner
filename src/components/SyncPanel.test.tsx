import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncPanel } from './SyncPanel'
import { emptyData } from '../lib/storage'
import { serializeBackup } from '../lib/sync'
import { createTask } from '../lib/tasks'
import { isEnvelope } from '../lib/vault'
import type { PlannerData } from '../lib/types'

function local(): PlannerData {
  return { ...emptyData('device-a'), tasks: [createTask({ title: 'Laptop task' })] }
}

function snapshotFile(data: PlannerData, name = 'snapshot.json'): File {
  return new File([serializeBackup(data)], name, { type: 'application/json' })
}

/** jsdom's Blob has no `text()`, so read it the way older Safari has to. */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('SyncPanel', () => {
  it('exports a snapshot as a downloadable file', async () => {
    const createObjectURL = vi.fn(() => 'blob:snapshot')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<SyncPanel data={local()} vaultPassphrase={null} onMerge={vi.fn()} onReplace={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Export snapshot/ }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:snapshot')
    expect(screen.getByText(/Saved a snapshot/)).toBeInTheDocument()
  })

  it('encrypts the exported snapshot when the planner is locked', async () => {
    let exported: Blob | null = null
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn((blob: Blob) => {
        exported = blob
        return 'blob:snapshot'
      }),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<SyncPanel data={local()} vaultPassphrase="ours" onMerge={vi.fn()} onReplace={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Export snapshot/ }))

    expect(await screen.findByText(/Saved an encrypted snapshot/)).toBeInTheDocument()
    const body = await readBlob(exported as unknown as Blob)
    expect(body).not.toContain('Laptop task')
    expect(isEnvelope(JSON.parse(body))).toBe(true)
  })

  it('merges an imported snapshot and reports the new total', async () => {
    const remote = { ...emptyData('device-b'), tasks: [createTask({ title: 'Phone task' })] }
    const onMerge = vi.fn((incoming: PlannerData) => ({
      ...incoming,
      tasks: [...local().tasks, ...incoming.tasks],
    }))
    const { container } = render(<SyncPanel data={local()} vaultPassphrase={null} onMerge={onMerge} onReplace={vi.fn()} />)

    await userEvent.upload(fileInput(container), snapshotFile(remote))

    expect(onMerge).toHaveBeenCalledOnce()
    expect(onMerge.mock.calls[0][0].tasks[0].title).toBe('Phone task')
    expect(await screen.findByText('Merged — 2 tasks total.')).toBeInTheDocument()
  })

  it('explains why a bad file was rejected instead of merging it', async () => {
    const onMerge = vi.fn()
    const { container } = render(<SyncPanel data={local()} vaultPassphrase={null} onMerge={onMerge} onReplace={vi.fn()} />)

    await userEvent.upload(fileInput(container), new File(['not a snapshot'], 'oops.json'))

    expect(await screen.findByText(/not valid JSON/)).toBeInTheDocument()
    expect(onMerge).not.toHaveBeenCalled()
  })

  it('shows the device id and record count', () => {
    render(<SyncPanel data={local()} vaultPassphrase={null} onMerge={vi.fn()} onReplace={vi.fn()} />)
    expect(screen.getByText(/1 stored records/)).toBeInTheDocument()
  })
})
