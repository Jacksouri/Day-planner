import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './lib/storage'
import { VAULT_KEY } from './lib/vaultStore'

beforeEach(() => {
  localStorage.clear()
  location.hash = ''
})

afterEach(async () => {
  // Vault writes are encrypted in the background, so let them land before wiping storage —
  // otherwise a previous test's blob reappears after the next test has cleared it.
  await new Promise((resolve) => setTimeout(resolve, 50))
  localStorage.clear()
  location.hash = ''
})

async function addTask(text: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Add a task'), text)
  await user.click(screen.getByRole('button', { name: 'Add' }))
  return user
}

async function turnOnLock(passphrase: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Privacy' }))
  await user.type(screen.getByLabelText('Passphrase'), passphrase)
  await user.type(screen.getByLabelText('Repeat it'), passphrase)
  await user.click(screen.getByRole('button', { name: 'Turn on the lock' }))
  await screen.findByRole('button', { name: 'Copy secret link' })
  return user
}

describe('passphrase lock', () => {
  it('encrypts what was already stored and removes the readable copy', async () => {
    const { unmount } = render(<App />)
    await addTask('Meet the lawyer')
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Meet the lawyer')

    await turnOnLock('our secret')

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(VAULT_KEY)).not.toContain('Meet the lawyer')
    expect(screen.getByText('Meet the lawyer')).toBeInTheDocument()
    unmount()

    // Reopening shows the lock screen rather than the tasks.
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Locked' })).toBeInTheDocument()
    expect(screen.queryByText('Meet the lawyer')).not.toBeInTheDocument()
  })

  it('opens with the right passphrase and refuses a wrong one', async () => {
    const first = render(<App />)
    await addTask('Meet the lawyer')
    await turnOnLock('our secret')
    first.unmount()

    render(<App />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Passphrase'), 'guessing')
    await user.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText(/does not match/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Passphrase'))
    await user.type(screen.getByLabelText('Passphrase'), 'our secret')
    await user.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText('Meet the lawyer')).toBeInTheDocument()
  })

  it('unlocks straight away from the secret link', async () => {
    const first = render(<App />)
    await addTask('Meet the lawyer')
    const user = await turnOnLock('our secret')
    await user.click(screen.getByRole('button', { name: 'Show link' }))
    const link = screen.getByText(/#k=/).textContent ?? ''
    first.unmount()

    location.hash = new URL(link).hash
    render(<App />)

    expect(await screen.findByText('Meet the lawyer')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Locked' })).not.toBeInTheDocument()
  })

  it('keeps editing after the lock is on, encrypted', async () => {
    const first = render(<App />)
    await turnOnLock('our secret')
    await addTask('Book the flights')
    first.unmount()

    render(<App />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Passphrase'), 'our secret')
    await user.click(screen.getByRole('button', { name: 'Unlock' }))

    expect(await screen.findByText('Book the flights')).toBeInTheDocument()
    expect(localStorage.getItem(VAULT_KEY)).not.toContain('Book the flights')
  })

  it('refuses to lock on a mismatch or a short passphrase', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Privacy' }))

    await user.type(screen.getByLabelText('Passphrase'), 'short')
    await user.click(screen.getByRole('button', { name: 'Turn on the lock' }))
    expect(screen.getByText('Use at least 6 characters.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Passphrase'), 'er still')
    await user.type(screen.getByLabelText('Repeat it'), 'something else')
    await user.click(screen.getByRole('button', { name: 'Turn on the lock' }))
    expect(screen.getByText('The two passphrases do not match.')).toBeInTheDocument()
    expect(localStorage.getItem(VAULT_KEY)).toBeNull()
  })
})
