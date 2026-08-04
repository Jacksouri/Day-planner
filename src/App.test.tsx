import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './lib/storage'
import { THEME_COLORS } from './lib/useOwnerTheme'

beforeEach(() => {
  localStorage.clear()
})

async function addTask(text: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Add a task'), text)
  await user.click(screen.getByRole('button', { name: 'Add' }))
  return user
}

describe('App', () => {
  it('adds a task to the current day and persists it', async () => {
    render(<App />)
    await addTask('Water the plants')

    expect(screen.getByText('Water the plants')).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Water the plants')
  })

  it('schedules shorthand onto the day it names', async () => {
    render(<App />)
    const user = await addTask('Email advisor tomorrow 9am #school !high')

    // Parsed onto tomorrow, so today stays empty and the tag becomes a filter.
    expect(screen.getByText(/Nothing scheduled/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '#school' })).toBeInTheDocument()

    await user.click(screen.getByLabelText('Next day'))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Tomorrow')
    expect(screen.getByText('Email advisor')).toBeInTheDocument()
    expect(screen.getByText(/9:00/)).toBeInTheDocument()
  })

  it('hides a completed task until "Show done" is checked', async () => {
    render(<App />)
    const user = await addTask('Take out trash')

    await user.click(screen.getByLabelText('Mark "Take out trash" done'))
    expect(screen.queryByText('Take out trash')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Show done'))
    expect(screen.getByText('Take out trash')).toBeInTheDocument()
  })

  it('edits a task through its detail panel', async () => {
    render(<App />)
    const user = await addTask('Draft essay')

    await user.click(screen.getByRole('button', { name: /Draft essay/ }))
    const notes = screen.getByLabelText('Notes')
    await user.type(notes, 'three pages')
    expect(notes).toHaveValue('three pages')
    expect(localStorage.getItem(STORAGE_KEY)).toContain('three pages')
  })

  it('adds and completes a step on a task', async () => {
    render(<App />)
    const user = await addTask('Pack for trip')

    await user.click(screen.getByRole('button', { name: /Pack for trip/ }))
    await user.type(screen.getByLabelText('Add a step'), 'Chargers')
    await user.click(screen.getByRole('button', { name: 'Add step' }))

    const step = screen.getByRole('checkbox', { name: 'Chargers' })
    await user.click(step)
    expect(step).toBeChecked()
    expect(screen.getByText('1/1')).toBeInTheDocument()
  })

  it('deletes a task', async () => {
    render(<App />)
    const user = await addTask('Mistake')

    await user.click(screen.getByRole('button', { name: /Mistake/ }))
    await user.click(screen.getByRole('button', { name: 'Delete task' }))

    expect(screen.queryByText('Mistake')).not.toBeInTheDocument()
  })

  it('filters with the search box', async () => {
    render(<App />)
    const user = await addTask('Call dentist')
    await addTask('Read chapter 4')

    await user.type(screen.getByLabelText('Search tasks'), 'dentist')
    expect(screen.getByText('Call dentist')).toBeInTheDocument()
    expect(screen.queryByText('Read chapter 4')).not.toBeInTheDocument()
  })

  it('shows the week view with seven days', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Week' }))

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent(/Week of/)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(7)
  })

  it('keeps unscheduled tasks in a someday list', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'All' }))
    await addTask('Learn guitar')
    await user.click(screen.getByRole('button', { name: 'Day' }))

    const someday = screen.getByRole('heading', { name: /Someday/ }).parentElement as HTMLElement
    expect(within(someday).getByText('Learn guitar')).toBeInTheDocument()
  })

  it('marks quick-added priority with exclamation marks', async () => {
    render(<App />)
    await addTask('File taxes !!!')

    expect(screen.getByLabelText('Priority 3 of 3')).toHaveTextContent('!!!')
  })

  it("keeps each person's tab separate and shares the shared ones", async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Jack' }))
    await addTask('Lift weights')
    await user.click(screen.getByRole('button', { name: 'Parmiss' }))
    await addTask('Book flights')
    expect(screen.queryByText('Lift weights')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Both' }))
    await addTask('Pay rent +both')
    expect(screen.getByText('Lift weights')).toBeInTheDocument()
    expect(screen.getByText('Book flights')).toBeInTheDocument()

    // A shared task belongs to both lists.
    await user.click(screen.getByRole('button', { name: 'Jack' }))
    expect(screen.getByText('Pay rent')).toBeInTheDocument()
    expect(screen.queryByText('Book flights')).not.toBeInTheDocument()
  })

  it('sweeps the new colour across the screen and recolours the page', async () => {
    render(<App />)
    const user = userEvent.setup()
    expect(document.documentElement.dataset.owner).toBe('both')
    expect(screen.queryByTestId('color-sweep')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Parmiss' }))

    const sweep = screen.getByTestId('color-sweep')
    expect(sweep).toHaveClass('sweep-parmiss')
    expect(document.documentElement.dataset.owner).toBe('parmiss')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      THEME_COLORS.parmiss,
    )

    // The overlay is temporary; tapping the tab you are already in does not re-run it.
    fireEvent.animationEnd(sweep)
    expect(screen.queryByTestId('color-sweep')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Parmiss' }))
    expect(screen.queryByTestId('color-sweep')).not.toBeInTheDocument()
  })

  it('remembers the person tab across reloads', async () => {
    const { unmount } = render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Parmiss' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Parmiss's day")
    unmount()

    render(<App />)
    expect(screen.getByRole('button', { name: 'Parmiss' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reassigns a task to the other person from its details', async () => {
    render(<App />)
    const user = await addTask('Water plants')

    await user.click(screen.getByRole('button', { name: /Water plants/ }))
    await user.selectOptions(screen.getByLabelText('Whose'), 'parmiss')

    await user.click(screen.getByRole('button', { name: 'Jack' }))
    expect(screen.queryByText('Water plants')).not.toBeInTheDocument()
  })

  it('opens the reminders panel with its calendar escape hatch', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reminders' }))

    expect(screen.getByRole('heading', { name: 'Reminders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add to phone calendar/ })).toBeInTheDocument()
  })

  it('exposes sync and backup controls', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Sync' }))

    expect(screen.getByRole('heading', { name: /Sync/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export snapshot/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Import/ })).toBeInTheDocument()
  })
})
