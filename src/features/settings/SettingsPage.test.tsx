import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { LocalRepository } from '../../data/local-repository'

async function signIn() {
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
  await user.type(screen.getByPlaceholderText('187手机'), '13800138000')
  await user.type(screen.getByPlaceholderText('leeds'), 'preview')
  await user.click(screen.getByRole('button', { name: '登录' }))
  await screen.findByRole('heading', { name: '人脉归档' })
  return user
}

describe('settings workflows', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('adds a global custom dimension', async () => {
    const user = await signIn()
    await user.click(screen.getByRole('link', { name: '设置' }))
    await screen.findByRole('heading', { name: '设置' })

    await user.click(screen.getByRole('button', { name: '新增维度' }))
    const dialog = screen.getByRole('dialog', { name: '新增维度' })
    await user.type(within(dialog).getByLabelText('维度名称'), '共同爱好')
    await user.click(within(dialog).getByRole('button', { name: '保存维度' }))

    expect(await screen.findByText('共同爱好')).toBeInTheDocument()
  })

  it('imports validated CSV contacts', async () => {
    const user = await signIn()
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
    const user = await signIn()
    await user.click(screen.getByRole('link', { name: '林知秋' }))
    await user.click(screen.getByRole('button', { name: '编辑基本资料' }))
    const profileDialog = screen.getByRole('dialog', { name: '编辑基本资料' })
    await user.click(
      within(profileDialog).getByRole('button', { name: '移入回收站' }),
    )

    await user.click(screen.getByRole('link', { name: '设置' }))
    await screen.findByRole('heading', { name: '设置' })
    expect(screen.getByText('林知秋')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '恢复林知秋' }))

    await user.click(screen.getByRole('link', { name: '人脉' }))
    expect(await screen.findByRole('link', { name: '林知秋' })).toBeInTheDocument()
  })
})
