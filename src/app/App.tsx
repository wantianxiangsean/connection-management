import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import type {
  SessionUser,
  WorkspaceRepository,
} from '../data/repository'
import { ArchivePage } from '../features/archive/ArchivePage'
import { AppLayout } from './AppLayout'
import { queryClient, WorkspaceProvider } from './WorkspaceContext'

const PersonPage = lazy(() =>
  import('../features/person/PersonPage').then((module) => ({
    default: module.PersonPage,
  })),
)
const ClientsPage = lazy(() =>
  import('../features/clients/ClientsPage').then((module) => ({
    default: module.ClientsPage,
  })),
)
const ClientDetailPage = lazy(() =>
  import('../features/clients/ClientDetailPage').then((module) => ({
    default: module.ClientDetailPage,
  })),
)
const SettingsPage = lazy(() =>
  import('./SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)

const archiveUser: SessionUser = { id: 'archive-owner', phone: '' }

export function App({ repository }: { repository: WorkspaceRepository }) {
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
              <Route path="clients" element={<ClientsPage />} />
              <Route path="clients/:clientId" element={<ClientDetailPage />} />
              <Route path="settings/*" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </WorkspaceProvider>
    </QueryClientProvider>
  )
}
