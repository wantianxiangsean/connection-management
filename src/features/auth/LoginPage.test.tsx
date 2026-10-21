import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

describe('login page', () => {
  it('shows the exact owner-provided placeholders', () => {
    render(
      <LoginPage
        mode="local"
        busy={false}
        error={null}
        onSignIn={vi.fn()}
      />,
    )

    expect(screen.getByPlaceholderText('187手机')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('leeds')).toBeInTheDocument()
    expect(screen.queryByText(/微信/)).not.toBeInTheDocument()
    expect(screen.queryByText(/注册账号/)).not.toBeInTheDocument()
  })

  it('uses a GitHub token instead of account credentials in GitHub mode', () => {
    render(
      <LoginPage
        mode="github"
        busy={false}
        error={null}
        onSignIn={vi.fn()}
      />,
    )

    expect(screen.getByPlaceholderText('ghp_ 或 github_pat_')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('187手机')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('leeds')).not.toBeInTheDocument()
  })
})
