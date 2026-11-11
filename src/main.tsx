import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { clearSettingsFromStartUrl } from './app/start-route'
import type { WorkspaceRepository } from './data/repository'
import './styles.css'

async function detectRepository(): Promise<WorkspaceRepository> {
  try {
    const response = await fetch('/api/health', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    const contentType = response.headers.get('content-type') ?? ''
    if (response.ok && contentType.includes('application/json')) {
      const body = (await response.json()) as { ok?: boolean }
      if (body.ok) {
        const { CloudflareRepository } = await import(
          './data/cloudflare-repository'
        )
        return new CloudflareRepository()
      }
    }
  } catch {
    // No backend (vite dev or static hosting); fall back to local storage.
  }
  const { LocalRepository } = await import('./data/local-repository')
  return new LocalRepository()
}

clearSettingsFromStartUrl()

void detectRepository().then((repository) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App repository={repository} />
    </StrictMode>,
  )
})
