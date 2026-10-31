import {
  QueryClient,
  useQuery,
} from '@tanstack/react-query'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { DatabaseSnapshot } from '../domain/types'
import { normalizeSnapshot } from '../domain/workspace'
import type {
  SessionUser,
  WorkspaceRepository,
} from '../data/repository'
import { SaveQueue } from '../data/save-queue'

interface WorkspaceValue {
  snapshot: DatabaseSnapshot
  update: (
    mutator: (current: DatabaseSnapshot) => DatabaseSnapshot,
  ) => void
  saving: boolean
  pending: boolean
  error: string | null
  saveNow: () => Promise<void>
  repository: WorkspaceRepository
  user: SessionUser
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export function WorkspaceProvider({
  repository,
  user,
  children,
}: {
  repository: WorkspaceRepository
  user: SessionUser
  children: ReactNode
}) {
  const query = useQuery({
    queryKey: ['workspace', repository.mode, user.id],
    queryFn: () => repository.load(),
  })
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState(false)
  const snapshotRef = useRef<DatabaseSnapshot | null>(null)
  const pendingRef = useRef(false)
  const savingRef = useRef(false)

  useEffect(() => {
    if (query.data) {
      const data = normalizeSnapshot(query.data)
      const current = snapshotRef.current
      if (
        current &&
        (pendingRef.current ||
          savingRef.current ||
          repository.hasPendingCloud?.())
      ) {
        void saveQueue.current?.enqueue(current)
        return
      }
      snapshotRef.current = data
      setSnapshot(data)
      if (repository.hasPendingCloud?.()) {
        void saveQueue.current?.enqueue(data)
      }
    }
  }, [query.data, repository])

  const saveQueue = useRef<SaveQueue<DatabaseSnapshot> | null>(null)
  if (!saveQueue.current) {
    saveQueue.current = new SaveQueue(
      (next) => repository.save(next),
      (cause) => {
        setError(cause instanceof Error ? cause.message : '保存失败，请稍后重试')
      },
      (value) => {
        savingRef.current = value
        setSaving(value)
      },
      (value) => {
        pendingRef.current = value
        setPending(value)
      },
    )
  }

  useEffect(
    () => () => {
      saveQueue.current?.dispose()
    },
    [],
  )

  useEffect(() => {
    const flushPending = () => {
      const latest = snapshotRef.current
      if (!latest || !pendingRef.current) return
      void saveQueue.current?.flush(latest).catch(() => undefined)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPending()
    }
    window.addEventListener('pagehide', flushPending)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flushPending)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const value = useMemo<WorkspaceValue | null>(() => {
    if (!snapshot) return null
    return {
      snapshot,
      update: (mutator) => {
        setError(null)
        setSnapshot((current) => {
          if (!current) return current
          const next = mutator(current)
          repository.cache?.(next)
          snapshotRef.current = next
          void saveQueue.current?.enqueue(next)
          return next
        })
      },
      saving,
      pending,
      error,
      saveNow: () => {
        setError(null)
        return saveQueue.current?.flush(snapshot) ?? Promise.resolve()
      },
      repository,
      user,
    }
  }, [snapshot, saving, pending, error, repository, user])

  if (query.isError) {
    return (
      <div className="app-loading app-error" role="alert">
        <p>档案暂时无法打开。</p>
        <button type="button" className="button primary" onClick={() => query.refetch()}>
          重新加载
        </button>
      </div>
    )
  }

  if (query.isPending || !value) {
    return (
      <div className="app-loading" role="status">
        <span className="loading-mark" />
        正在打开档案柜
      </div>
    )
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return value
}
