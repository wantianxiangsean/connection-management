import { Suspense } from 'react'
import {
  Cloud,
  CloudAlert,
  LoaderCircle,
} from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { useWorkspace } from './WorkspaceContext'

export function AppLayout() {
  const { error, pending, repository, saving } = useWorkspace()

  return (
    <div className="app-shell">
      <Suspense
        fallback={
          <div className="app-loading" role="status">
            <span className="loading-mark" />
            正在打开页面
          </div>
        }
      >
        <Outlet />
      </Suspense>
      {error ? (
        <aside className="save-toast is-error" role="alert">
          <CloudAlert size={18} aria-hidden="true" />
          <div>
            <strong>保存到云端失败</strong>
            <span>{error}</span>
          </div>
        </aside>
      ) : saving ? (
        <aside className="save-toast" role="status" aria-live="polite">
          <LoaderCircle
            className="save-toast-spinner"
            size={18}
            aria-hidden="true"
          />
          <div>
            <strong>正在同步云端…</strong>
            <span>请稍候，数据已保存在本机。</span>
          </div>
        </aside>
      ) : pending ? (
        <aside className="save-toast" role="status" aria-live="polite">
          <Cloud size={18} aria-hidden="true" />
          <div>
            <strong>已保存到本机</strong>
            <span>
              {repository.mode === 'github'
                ? '云端将在 2 分钟内自动同步。'
                : '本机数据已更新。'}
            </span>
          </div>
        </aside>
      ) : null}
    </div>
  )
}
