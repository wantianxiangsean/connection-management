import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { GitHubRepository } from '../../data/github-repository'
import { LocalRepository } from '../../data/local-repository'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function openArchive() {
  const user = userEvent.setup()
  render(
    <App
      repository={
        new LocalRepository({
          storage: localStorage,
          key: 'settings-test',
          seed: true,
        })
      }
    />,
  )
  await screen.findByRole('heading', { name: '155人脉管理' })
  return user
}

describe('settings workflows', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('adds a global custom dimension', async () => {
    const user = await openArchive()
    await user.click(screen.getByRole('link', { name: '设置' }))
    await screen.findByRole('heading', { name: '设置' })

    await user.click(screen.getByRole('button', { name: '新增维度' }))
    const dialog = screen.getByRole('dialog', { name: '新增维度' })
    await user.type(within(dialog).getByLabelText('维度名称'), '共同爱好')
    await user.click(within(dialog).getByRole('button', { name: '保存维度' }))

    expect(await screen.findByText('共同爱好')).toBeInTheDocument()
  })

  it('imports validated CSV contacts', async () => {
    const user = await openArchive()
    await user.click(screen.getByRole('link', { name: '设置' }))
    await screen.findByRole('heading', { name: '设置' })

    const csv = new File(
      ['姓名,关系,职业,地区\n程一,好友,研究员,南京\n韩知,认识的人,编辑,广州'],
      'contacts.csv',
      { type: 'text/csv' },
    )
    await user.upload(screen.getByLabelText('导入 CSV'), csv)

    expect(await screen.findByText('2 行待导入')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '导入 2 人' }))
    expect(await screen.findByText('已导入 2 人')).toBeInTheDocument()
  })

  it('restores a soft-deleted person from the recycle bin', async () => {
    const user = await openArchive()
    await user.click(screen.getByRole('link', { name: '林知秋' }))
    await user.click(screen.getByRole('button', { name: '编辑基本资料' }))
    const profileDialog = screen.getByRole('dialog', { name: '编辑基本资料' })
    await user.click(
      within(profileDialog).getByRole('button', { name: '删除联系人' }),
    )

    await user.click(screen.getByRole('link', { name: '返回155人脉管理' }))
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '设置' }))
    await screen.findByRole('heading', { name: '设置' })
    expect(screen.getByText('林知秋')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '恢复林知秋' }))

    await user.click(screen.getByRole('link', { name: '人脉' }))
    expect(await screen.findByRole('link', { name: '林知秋' })).toBeInTheDocument()
  })

  it('permanently clears the recycle bin after confirmation', async () => {
    const user = await openArchive()
    await user.click(screen.getByRole('link', { name: '林知秋' }))
    await user.click(screen.getByRole('button', { name: '编辑基本资料' }))
    const profileDialog = screen.getByRole('dialog', { name: '编辑基本资料' })
    await user.click(
      within(profileDialog).getByRole('button', { name: '删除联系人' }),
    )

    await user.click(screen.getByRole('link', { name: '返回155人脉管理' }))
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '设置' }))
    await screen.findByRole('heading', { name: '设置' })
    await user.click(screen.getByRole('button', { name: '清空回收站' }))

    const confirmDialog = screen.getByRole('dialog', { name: '清空回收站' })
    expect(within(confirmDialog).getByText('林知秋')).toBeInTheDocument()
    await user.click(
      within(confirmDialog).getByRole('button', { name: '永久删除' }),
    )

    expect(screen.getByText('回收站是空的。')).toBeInTheDocument()
  })

  it('deletes a custom dimension and its saved values', async () => {
    const user = await openArchive()
    await user.click(screen.getByRole('link', { name: '设置' }))
    await screen.findByRole('heading', { name: '设置' })

    await user.click(screen.getByRole('button', { name: '删除认识渠道' }))

    expect(screen.queryByText('认识渠道')).not.toBeInTheDocument()
  })

  it('verifies and remembers the cloud token inside cloud backup', async () => {
    const user = userEvent.setup()
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/user')) {
        return jsonResponse({ login: 'owner' })
      }
      return jsonResponse({
        private: true,
        permissions: { push: true },
      })
    })
    render(
      <App
        repository={
          new GitHubRepository({
            storage: localStorage,
            key: 'cloud-settings-test',
            fetcher,
          })
        }
      />,
    )

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '设置' }))
    await screen.findByRole('heading', { name: '设置' })

    expect(screen.getByText(/自动备份已开启/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /手动备份/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '账户' }),
    ).not.toBeInTheDocument()
    const tokenInput = await screen.findByPlaceholderText('ghp_ 或 github_pat_')
    expect(screen.getByLabelText('在此浏览器记住')).toBeChecked()
    await user.type(tokenInput, 'github_pat_test')
    await user.click(screen.getByRole('button', { name: '验证 Token' }))

    expect(
      await screen.findByText('已连接私有云端 · owner'),
    ).toBeInTheDocument()
    expect(
      localStorage.getItem('cloud-settings-test-github-token'),
    ).toBe('github_pat_test')
  })
})
