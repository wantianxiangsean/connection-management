import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalRepository } from '../data/local-repository'
import type { SessionUser } from '../data/repository'
import { WorkspaceProvider, useWorkspace } from './WorkspaceContext'

const user: SessionUser = { id: 'flush-owner', phone: '' }

function Editor() {
  const { update, pending } = useWorkspace()
  return (
    <div>
      <span>{pending ? '待同步' : '已同步'}</span>
      <button
        type="button"
        onClick={() =>
          update((current) => ({ ...current, clients: [...current.clients] }))
        }
      >
        修改
      </button>
    </div>
  )
}

function renderProvider(repository: LocalRepository) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <WorkspaceProvider repository={repository} user={user}>
        <Editor />
      </WorkspaceProvider>
    </QueryClientProvider>,
  )
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
}

describe('workspace save on page hide', () => {
  beforeEach(() => {
    localStorage.clear()
    setVisibility('visible')
  })

  it('flushes pending changes when the page becomes hidden', async () => {
    const userEventInstance = userEvent.setup()
    const repository = new LocalRepository({
      storage: localStorage,
      key: 'flush-visibility',
    })
    const save = vi.spyOn(repository, 'save')
    renderProvider(repository)

    await userEventInstance.click(
      await screen.findByRole('button', { name: '修改' }),
    )
    save.mockClear()
    expect(screen.getByText('待同步')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    setVisibility('visible')
  })

  it('flushes pending changes when the page is unloaded', async () => {
    const userEventInstance = userEvent.setup()
    const repository = new LocalRepository({
      storage: localStorage,
      key: 'flush-pagehide',
    })
    const save = vi.spyOn(repository, 'save')
    renderProvider(repository)

    await userEventInstance.click(
      await screen.findByRole('button', { name: '修改' }),
    )
    save.mockClear()
    window.dispatchEvent(new Event('pagehide'))

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  })
})
