import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { LocalRepository } from '../data/local-repository'
import {
  isSupabaseConfigured,
  SupabaseRepository,
} from '../data/supabase-repository'
import type {
  SessionUser,
  WorkspaceRepository,
} from '../data/repository'
import { ArchivePage } from '../features/archive/ArchivePage'
import { LoginPage } from '../features/auth/LoginPage'
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
  return new LocalRepository()
}

const defaultRepository = createDefaultRepository()

export function App({
  repository = defaultRepository,
}: {
  repository?: WorkspaceRepository
}) {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void repository.getSession().then(setSession)
    return repository.onAuthStateChange(setSession)
  }, [repository])

  async function signIn(phone: string, password: string) {
    setBusy(true)
    setError(null)
    try {
      const user = await repository.signIn(phone, password)
      setSession(user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登录失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  if (!session) {
    return (
      <LoginPage
        mode={repository.mode}
        busy={busy}
        error={error}
        onSignIn={signIn}
      />
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider repository={repository} user={session}>
        <HashRouter>
          <Routes>
            <Route
              element={
                <AppLayout
                  user={session}
                  repository={repository}
                  onSignedOut={() => setSession(null)}
                />
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

