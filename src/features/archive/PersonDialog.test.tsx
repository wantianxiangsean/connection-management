import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PersonDialog } from './PersonDialog'

describe('new person defaults', () => {
  it('defaults to friend when influence is not weak and intimacy is not distant', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <PersonDialog
        open
        initialTier="soul"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('姓名'), '韩知')
    await user.selectOptions(screen.getByLabelText('影响力'), 'medium')
    await user.selectOptions(screen.getByLabelText('亲密度'), 'medium')

    expect(screen.getByRole('radio', { name: '好友' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: '韩知',
        tier: 'friend',
        influence: 'medium',
        intimacy: 'medium',
      }),
      false,
    )
  })

  it('lets the owner override the suggested friend tier', async () => {
    const user = userEvent.setup()
    render(
      <PersonDialog
        open
        initialTier="soul"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    await user.selectOptions(screen.getByLabelText('影响力'), 'strong')
    await user.selectOptions(screen.getByLabelText('亲密度'), 'close')
    await user.click(screen.getByRole('radio', { name: '密友' }))

    expect(screen.getByRole('radio', { name: '密友' })).toBeChecked()
  })

  it('captures the complete basic profile when creating a person', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <PersonDialog
        open
        initialTier="friend"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('姓名'), '许南')
    await user.type(screen.getByLabelText('角色'), '独立开发者')
    await user.type(screen.getByLabelText('职业'), '软件工程师')
    await user.type(screen.getByLabelText('地区'), '北京')
    await user.type(screen.getByLabelText('行业'), '软件')
    await user.selectOptions(screen.getByLabelText('影响力'), 'medium')
    await user.selectOptions(screen.getByLabelText('亲密度'), 'close')
    await user.type(screen.getByLabelText('影响力备注'), '做产品很克制')
    await user.type(screen.getByLabelText('亲密度备注'), '聊天很坦诚')
    await user.type(screen.getByLabelText('联系周期（天）'), '45')
    await user.type(screen.getByLabelText('家庭概况'), '和伴侣住在朝阳')
    await user.type(screen.getByLabelText('职业概况'), '正在做独立工具')
    await user.type(screen.getByLabelText('第一次见面日期'), '2026-09-18')
    await user.type(screen.getByLabelText('第一次见面地点'), '北京望京')
    await user.type(screen.getByLabelText('第一次见面的故事'), '朋友组织的小型聚会')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: '许南',
        role: '独立开发者',
        occupation: '软件工程师',
        region: '北京',
        industry: '软件',
        influenceNote: '做产品很克制',
        intimacyNote: '聊天很坦诚',
        cadenceDays: 45,
        familySummary: '和伴侣住在朝阳',
        careerSummary: '正在做独立工具',
        firstMetOn: '2026-09-18',
        firstMetPlace: '北京望京',
        firstMetStory: '朋友组织的小型聚会',
      }),
      false,
    )
  }, 10_000)

  it('saves the current person and keeps the form ready for another', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <PersonDialog
        open
        initialTier="friend"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('姓名'), '韩知')
    await user.click(screen.getByRole('button', { name: '保存并新建' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: '韩知', tier: 'friend' }),
      true,
    )
    expect(screen.getByLabelText('姓名')).toHaveValue('')
  })
})
