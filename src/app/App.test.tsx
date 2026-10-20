import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { LocalRepository } from '../data/local-repository'

describe('archive application flow', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('logs into the local archive and switches relationship tiers', async () => {
    const user = userEvent.setup()
    render(
      <App
        repository={
          new LocalRepository({
            storage: localStorage,
            key: 'app-test',
            seed: true,
          })
        }
      />,
    )

    await user.type(screen.getByPlaceholderText('187手机'), '13800138000')
    await user.type(screen.getByPlaceholderText('leeds'), 'preview')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('heading', { name: '人脉归档' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /命友/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(screen.getByRole('tab', { name: /认识的人/ }))
    expect(screen.getByText('顾晓风')).toBeInTheDocument()
    expect(screen.queryByText('品牌策略顾问')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '显示更多资料' }))
    expect(screen.getByText('品牌策略顾问')).toBeInTheDocument()
  })

  it('searches hidden details and opens the holographic profile card', async () => {
    const user = userEvent.setup()
    render(
      <App
        repository={
          new LocalRepository({
            storage: localStorage,
            key: 'app-test',
            seed: true,
          })
        }
      />,
    )

    await user.type(screen.getByPlaceholderText('187手机'), '13800138000')
    await user.type(screen.getByPlaceholderText('leeds'), 'preview')
    await user.click(screen.getByRole('button', { name: '登录' }))
    await screen.findByRole('heading', { name: '人脉归档' })

    await user.type(
      screen.getByPlaceholderText('搜索姓名、职业或某个细节'),
      '燕麦',
    )
    const result = await screen.findByRole('link', { name: '林知秋' })
    await user.click(result)

    const card = await screen.findByRole('main', { name: '林知秋的全息档案' })
    expect(within(card).getByText('燕麦拿铁', { exact: false })).toBeInTheDocument()
    expect(within(card).getByText('小满生日')).toBeInTheDocument()
  })

  it('edits a profile and appends new relationship context', async () => {
    const user = userEvent.setup()
    render(
      <App
        repository={
          new LocalRepository({
            storage: localStorage,
            key: 'app-test',
            seed: true,
          })
        }
      />,
    )

    await user.type(screen.getByPlaceholderText('187手机'), '13800138000')
    await user.type(screen.getByPlaceholderText('leeds'), 'preview')
    await user.click(screen.getByRole('button', { name: '登录' }))
    await screen.findByRole('heading', { name: '人脉归档' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    await user.click(screen.getByRole('button', { name: '编辑基本资料' }))
    const profileDialog = screen.getByRole('dialog', { name: '编辑基本资料' })
    const roleInput = within(profileDialog).getByLabelText('角色')
    await user.clear(roleInput)
    await user.type(roleInput, '人生搭档')
    await user.click(within(profileDialog).getByRole('button', { name: '保存' }))
    expect(await screen.findByText('人生搭档')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '添加细节' }))
    const detailDialog = screen.getByRole('dialog', { name: '添加细节' })
    await user.type(within(detailDialog).getByLabelText('类别'), '身体情况')
    await user.type(
      within(detailDialog).getByLabelText('内容'),
      '最近开始晨跑，膝盖旧伤需要留意。',
    )
    await user.click(within(detailDialog).getByRole('button', { name: '保存细节' }))
    expect(
      await screen.findByText('最近开始晨跑，膝盖旧伤需要留意。'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '添加共同认识' }))
    const connectionDialog = screen.getByRole('dialog', { name: '添加共同认识' })
    await user.selectOptions(
      within(connectionDialog).getByLabelText('选择档案中的人'),
      'shen-he',
    )
    await user.click(
      within(connectionDialog).getByRole('button', { name: '建立连接' }),
    )
    expect(await screen.findByRole('link', { name: '沈禾' })).toBeInTheDocument()
  })
})
