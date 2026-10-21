import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { GitHubRepository } from '../data/github-repository'
import {
  isSupabaseConfigured,
  SupabaseRepository,
} from '../data/supabase-repository'
import type {
  SessionUser,
  WorkspaceRepository,
} from '../data/repository'
import { ArchivePage } from '../features/archive/ArchivePage'
import { PersonPage } from '../features/person/PersonPage'
import { AppLayout } from './AppLayout'
import { SettingsPage } from './SettingsPage'
import { queryClient, WorkspaceProvider } from './WorkspaceContext'

function createDefaultRepository(): WorkspaceRepository {
  if (isSupabaseConfigured()) {
    return new SupabaseRepository(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
  }
  return new GitHubRepository()
}

const defaultRepository = createDefaultRepository()
const archiveUser: SessionUser = { id: 'archive-owner', phone: '' }

export function App({
  repository = defaultRepository,
}: {
  repository?: WorkspaceRepository
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider repository={repository} user={archiveUser}>
        <HashRouter>
          <Routes>
            <Route
              element={
                <AppLayout />
              }
            >
              <Route index element={<ArchivePage />} />
              <Route path="people/:personId" element={<PersonPage />} />
              <Route path="settings/*" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </WorkspaceProvider>
    </QueryClientProvider>
  )
}
