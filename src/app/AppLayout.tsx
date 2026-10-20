import { LogOut, Settings, UsersRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import type { SessionUser, WorkspaceRepository } from '../data/repository'

export function AppLayout({
  user,
  repository,
  onSignedOut,
}: {
  user: SessionUser
  repository: WorkspaceRepository
  onSignedOut: () => void
}) {
  async function signOut() {
    await repository.signOut()
    onSignedOut()
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="app-brand" aria-label="见微首页">
          <span className="brand-seal">见</span>
          <span>
            <strong>见微</strong>
            <small>关系档案</small>
          </span>
        </NavLink>
        <nav aria-label="主导航">
          <NavLink to="/" end>
            <UsersRound size={17} />
            人脉
          </NavLink>
          <NavLink to="/settings">
            <Settings size={17} />
            设置
          </NavLink>
        </nav>
        <div className="owner-menu">
          <span title={user.phone}>{user.phone || '唯一所有者'}</span>
          <button type="button" onClick={signOut} aria-label="退出登录">
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
