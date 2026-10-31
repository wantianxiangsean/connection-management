import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { clearSettingsFromStartUrl } from './app/start-route'
import { GitHubRepository } from './data/github-repository'
import type { WorkspaceRepository } from './data/repository'
import './styles.css'

async function createRepository(): Promise<WorkspaceRepository> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (url && key && !url.includes('your-project')) {
    const { SupabaseRepository } = await import('./data/supabase-repository')
    return new SupabaseRepository(url, key)
  }
  return new GitHubRepository()
}

clearSettingsFromStartUrl()

void createRepository().then((repository) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App repository={repository} />
    </StrictMode>,
  )
})
