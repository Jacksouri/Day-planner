import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RemindersPanel } from './RemindersPanel'
import { createTask } from '../lib/tasks'
import type { Reminders } from '../lib/useReminders'
import type { Task } from '../lib/types'

function reminders(overrides: Partial<Reminders> = {}): Reminders {
  return {
    permission: 'default',
    upcoming: [],
    request: vi.fn(async () => 'granted' as const),
    ...overrides,
  }
}

const scheduled: Task = {
  ...createTask({ title: 'Standup', due: '2025-08-07', time: '09:15', reminderLead: 10 }),
}

describe('RemindersPanel', () => {
  it('asks for permission and reports the outcome', async () => {
    const request = vi.fn(async () => 'granted' as const)
    render(<RemindersPanel tasks={[]} reminders={reminders({ request })} />)

    await userEvent.click(screen.getByRole('button', { name: /Enable notifications/ }))

    expect(request).toHaveBeenCalledOnce()
    expect(await screen.findByText(/Notifications on/)).toBeInTheDocument()
  })

  it('explains a blocked permission', async () => {
    const request = vi.fn(async () => 'denied' as const)
    render(<RemindersPanel tasks={[]} reminders={reminders({ request })} />)

    await userEvent.click(screen.getByRole('button', { name: /Enable notifications/ }))
    expect(await screen.findByText(/blocked/)).toBeInTheDocument()
  })

  it('disables the button where notifications do not exist', () => {
    render(<RemindersPanel tasks={[]} reminders={reminders({ permission: 'unsupported' })} />)
    expect(screen.getByRole('button', { name: /Enable notifications/ })).toBeDisabled()
  })

  it('hides the prompt once permission is granted', () => {
    render(<RemindersPanel tasks={[]} reminders={reminders({ permission: 'granted' })} />)
    expect(screen.queryByRole('button', { name: /Enable notifications/ })).not.toBeInTheDocument()
    expect(screen.getByText('Notifications enabled')).toBeInTheDocument()
  })

  it('downloads a calendar file of the scheduled tasks', async () => {
    const createObjectURL = vi.fn(() => 'blob:calendar')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<RemindersPanel tasks={[scheduled]} reminders={reminders()} />)
    await userEvent.click(screen.getByRole('button', { name: /Add to phone calendar/ }))

    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:calendar')
    expect(screen.getByText(/Calendar file created/)).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('lists the next reminders', () => {
    render(
      <RemindersPanel
        tasks={[scheduled]}
        reminders={reminders({
          upcoming: [{ id: scheduled.id, title: 'Standup', at: new Date(2025, 7, 7, 9, 5) }],
        })}
      />,
    )
    expect(screen.getByText('Standup')).toBeInTheDocument()
    expect(screen.queryByText('No reminders set yet.')).not.toBeInTheDocument()
  })

  it('says so when nothing is scheduled', () => {
    render(<RemindersPanel tasks={[]} reminders={reminders()} />)
    expect(screen.getByText('No reminders set yet.')).toBeInTheDocument()
  })
})
