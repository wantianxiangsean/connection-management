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

    expect(
      await screen.findByRole('heading', { name: '155人脉管理' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('你的私人关系档案')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        '我想要做什么？我为谁而做？他们需要什么？因为我，他们有什么改变？',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /命友/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      screen.queryByRole('columnheader', { name: '认识渠道' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: '最自在的相处方式' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /密友/ }))
    expect(
      screen.queryByRole('columnheader', { name: '认识渠道' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: '最自在的相处方式' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /认识的人/ }))
    expect(screen.getByText('顾晓风')).toBeInTheDocument()
    expect(screen.getByText('行业活动认识')).toBeInTheDocument()
    expect(screen.getByText('品牌策略顾问')).toBeInTheDocument()
    const acquaintanceList = screen.getByRole('list', {
      name: '认识的人名单',
    })
    expect(
      within(acquaintanceList)
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label')),
    ).toEqual(['顾晓风', '许南'])

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
    await screen.findByRole('heading', { name: '155人脉管理' })

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
    await screen.findByRole('heading', { name: '155人脉管理' })
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

  it('puts interactions first and manages family and dates separately', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)
    expect(headings.slice(0, 4)).toEqual([
      '互动记录',
      '关系速写',
      '家庭',
      '重要日期',
    ])
    expect(
      screen.queryByRole('heading', { name: '家庭与重要日期' }),
    ).not.toBeInTheDocument()
  })

  it('removes a mutual connection from either side of the relationship', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    await user.click(
      screen.getByRole('button', {
        name: '删除与陈望川的共同认识关系',
      }),
    )

    expect(
      screen.queryByRole('link', { name: '陈望川' }),
    ).not.toBeInTheDocument()
  })

  it('returns to the relationship tier the person was opened from', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('tab', { name: /好友/ }))
    await user.click(screen.getByRole('link', { name: '周原' }))
    await user.click(screen.getByRole('link', { name: '返回155人脉管理' }))

    expect(
      await screen.findByRole('tab', { name: /好友/ }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('filters relationship coaching by today, this week and this month', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    const coach = screen.getByRole('region', { name: '关系教练' })

    expect(within(coach).getByText('今天可以想起谁')).toBeInTheDocument()
    expect(within(coach).queryByText('沈禾')).not.toBeInTheDocument()
    expect(
      within(coach).getByText('这个时间范围内没有重要日期或回访提醒。'),
    ).toBeInTheDocument()
    await user.click(within(coach).getByRole('button', { name: '未来7天' }))
    expect(within(coach).getByText('未来7天可以想起谁')).toBeInTheDocument()
    expect(within(coach).getByText('陈望川')).toBeInTheDocument()
    await user.click(within(coach).getByRole('button', { name: '未来30天' }))
    expect(within(coach).getByText('未来30天可以想起谁')).toBeInTheDocument()
    expect(within(coach).getByText('林知秋')).toBeInTheDocument()
  })

  it('shows pinyin surname letter hints for a relationship table', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('tab', { name: /好友/ }))

    const table = screen.getByRole('table')
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((header) => header.textContent),
    ).toEqual(['S', 'Z'])
  })

  it('adds an attachment while recording an interaction', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    const interactionHeading = screen.getByRole('heading', {
      name: '互动记录',
    })
    const interactionSection = interactionHeading.closest('section')!
    await user.click(
      within(interactionSection).getByRole('button', {
        name: '记录互动',
      }),
    )
    const dialog = screen.getByRole('dialog', { name: '记录互动' })
    await user.upload(
      within(dialog).getByLabelText('添加互动附件'),
      new File(['合影'], '见面合影.txt', { type: 'text/plain' }),
    )
    await user.type(
      within(dialog).getByLabelText('聊了什么'),
      '一起整理了近期计划。',
    )
    await user.click(within(dialog).getByRole('button', { name: '保存互动' }))

    expect(await screen.findByRole('link', { name: /见面合影/ })).toBeInTheDocument()
  })

  it('places a labelled edit button at the top right of the profile page', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    const editButton = screen.getByRole('button', {
      name: '编辑基本资料',
    })
    expect(editButton).toHaveTextContent('编辑基本资料')
    expect(editButton.closest('aside')).toBeNull()
  })

  it('replaces the profile attachment section with editable notes', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    expect(screen.getByRole('heading', { name: '备注' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '附件' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('上传附件')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '编辑备注' }))
    const dialog = screen.getByRole('dialog', { name: '编辑备注' })
    await user.type(
      within(dialog).getByLabelText('备注内容'),
      '下次见面带一本她提过的书。',
    )
    await user.click(within(dialog).getByRole('button', { name: '保存备注' }))

    expect(
      await screen.findByText('下次见面带一本她提过的书。'),
    ).toBeInTheDocument()
  })

  it('does not expose avatar management on the profile card', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    expect(screen.queryByText('更换头像')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: '林知秋的头像' }),
    ).not.toBeInTheDocument()
  })

  it('uses manual detail-category input with example placeholder text', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))
    await user.click(screen.getByRole('button', { name: '添加细节' }))

    const dialog = screen.getByRole('dialog', { name: '添加细节' })
    expect(
      within(dialog).getByPlaceholderText(
        '孩子兴趣、早餐搭配、喜欢的app、朋友圈担忧、某次开心的体验、身体情况、心事儿',
      ),
    ).toHaveValue('')
  })

  it('records multiple dated interaction entries from the detail dialog', async () => {
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
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))
    await user.click(screen.getByRole('button', { name: '添加细节' }))

    const dialog = screen.getByRole('dialog', { name: '添加细节' })
    expect(within(dialog).queryByLabelText('回访日期')).not.toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('类别'), '近况')
    await user.type(within(dialog).getByLabelText('内容'), '记住这次聊天的细节')
    const interactionContents = within(dialog).getAllByLabelText('互动内容')
    await user.type(interactionContents[0], '第一次互动内容')
    await user.click(
      within(dialog).getByRole('button', { name: '新增一条互动' }),
    )
    const nextInteractionContents = within(dialog).getAllByLabelText('互动内容')
    expect(nextInteractionContents).toHaveLength(2)
    await user.type(nextInteractionContents[1], '第二次互动内容')
    await user.click(
      within(dialog).getByRole('button', { name: '保存细节' }),
    )

    const interactionSection = screen
      .getByRole('heading', { name: '互动记录' })
      .closest('section')!
    expect(
      within(interactionSection).getByText('第一次互动内容'),
    ).toBeInTheDocument()
    expect(
      within(interactionSection).getByText('第二次互动内容'),
    ).toBeInTheDocument()
  })
})
