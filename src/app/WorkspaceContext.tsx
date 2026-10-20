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
  error: string | null
  repository: WorkspaceRepository
  user: SessionUser
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
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

  useEffect(() => {
    if (query.data) setSnapshot(query.data)
  }, [query.data])

  const saveQueue = useRef<SaveQueue<DatabaseSnapshot> | null>(null)
  if (!saveQueue.current) {
    saveQueue.current = new SaveQueue(
      (next) => repository.save(next),
      (cause) => {
        setError(cause instanceof Error ? cause.message : '保存失败，请稍后重试')
        void queryClient.invalidateQueries({
          queryKey: ['workspace', repository.mode, user.id],
        })
      },
      setSaving,
    )
  }

  const value = useMemo<WorkspaceValue | null>(() => {
    if (!snapshot) return null
    return {
      snapshot,
      update: (mutator) => {
        setError(null)
        setSnapshot((current) => {
          if (!current) return current
          const next = mutator(current)
          void saveQueue.current?.enqueue(next)
          return next
        })
      },
      saving,
      error,
      repository,
      user,
    }
  }, [snapshot, saving, error, repository, user])

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
