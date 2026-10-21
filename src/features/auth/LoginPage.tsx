import { ArrowRight, KeyRound, LockKeyhole, Phone } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { RepositoryMode } from '../../data/repository'

interface LoginPageProps {
  mode: RepositoryMode
  busy: boolean
  error: string | null
  onSignIn: (phone: string, password: string) => Promise<void>
}

export function LoginPage({
  mode,
  busy,
  error,
  onSignIn,
}: LoginPageProps) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSignIn(phone, mode === 'github' ? '' : password)
  }

  return (
    <main className="login-page">
      <div className="login-orbit login-orbit-one" aria-hidden="true" />
      <div className="login-orbit login-orbit-two" aria-hidden="true" />
      <section className="login-intro" aria-label="产品介绍">
        <div className="brand-mark">
          <span className="brand-seal">见</span>
          <span>见微</span>
        </div>
        <p className="login-kicker">私人关系档案</p>
        <h1>把值得记住的人，放在触手可及的地方。</h1>
        <p className="login-copy">
          在见面前，快速想起他最近在意什么。把那些不适合交给记忆的小事，安静地留在这里。
        </p>
        <blockquote>
          “真正的关系，常常藏在孩子的一句近况、早餐的一杯饮料，和一次没有说完的心事里。”
        </blockquote>
      </section>

      <section className="login-card" aria-label="登录">
        <div className="login-card-tab">所有者身份验证</div>
        <div className="login-card-body">
          <p className="section-overline">
            {mode === 'github' ? 'GitHub 私有数据' : mode === 'local' ? '本地预览模式' : '私人档案柜'}
          </p>
          <h2>{mode === 'github' ? '验证私人访问权限' : '继续整理人脉'}</h2>
          <p className="muted">
            {mode === 'github'
              ? '输入可访问私有联系人数据仓库的 GitHub Token。验证成功后，档案会自动保存到私有云端。'
              : mode === 'local'
              ? '当前未连接 Supabase，登录后会使用浏览器内的演示档案。'
              : '使用预设手机号与密码登录。系统不开放注册。'}
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'github' ? (
              <label>
                <span>GitHub Token</span>
                <span className="input-frame">
                  <KeyRound size={17} aria-hidden="true" />
                  <input
                    name="token"
                    type="password"
                    autoComplete="off"
                    placeholder="ghp_ 或 github_pat_"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </span>
              </label>
            ) : (
              <>
                <label>
                  <span>手机号</span>
                  <span className="input-frame">
                    <Phone size={17} aria-hidden="true" />
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="username"
                      placeholder="187手机"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </span>
                </label>
                <label>
                  <span>密码</span>
                  <span className="input-frame">
                    <LockKeyhole size={17} aria-hidden="true" />
                    <input
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="leeds"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </span>
                </label>
              </>
            )}

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="button primary login-submit" disabled={busy}>
              {busy ? '正在验证…' : mode === 'github' ? '验证并打开' : '登录'}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <p className="login-footnote">
            {mode === 'github'
              ? 'Token 只保存在当前浏览器，用于验证身份并访问私有数据仓库，不会写入公开代码。'
              : mode === 'local'
              ? '此模式不验证真实账号，只用于本地查看与演示。'
              : '密码只在服务端校验，网页源码中不保存明文。'}
          </p>
        </div>
      </section>
    </main>
  )
}
