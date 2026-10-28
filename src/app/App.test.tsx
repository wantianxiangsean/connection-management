import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptySnapshot } from '../domain/workspace'
import { App } from './App'
import { queryClient } from './WorkspaceContext'
import { LocalRepository } from '../data/local-repository'
import { createSampleSnapshot } from '../data/sample-data'

describe('archive application flow', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
    window.location.hash = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens the local archive directly and switches relationship tiers', async () => {
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


    expect(
      await screen.findByRole('heading', { name: '155人脉管理' }),
    ).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('187手机')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('leeds')).not.toBeInTheDocument()
    expect(screen.queryByText('你的私人关系档案')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        '确定目标：我想要做什么？我为谁而做？他们需要什么？因为我，他们有什么改变？',
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
    expect(
      screen.getByText('消费品牌 · 品牌策略顾问'),
    ).toBeInTheDocument()
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

  it('places settings beside add person instead of in a primary header', async () => {
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

    await screen.findByRole('heading', { name: '155人脉管理' })

    const addButton = screen.getByRole('button', { name: '新增人员' })
    const settingsLink = screen.getByRole('link', { name: '设置' })
    expect(settingsLink.parentElement).toBe(addButton.parentElement)
    expect(
      screen.queryByRole('link', { name: '备份' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('banner', { name: '账户操作' }),
    ).not.toBeInTheDocument()

    await user.click(settingsLink)
    await screen.findByRole('heading', { name: '设置' })
    expect(
      screen.queryByRole('banner', { name: '账户操作' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '人脉' })).toHaveAttribute(
      'href',
      '#/',
    )
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

    await screen.findByRole('heading', { name: '155人脉管理' })

    await user.type(
      screen.getByPlaceholderText(
        '搜索姓名、姓名首字母、职务或某个细节',
      ),
      '燕麦',
    )
    const result = await screen.findByRole('link', { name: '林知秋' })
    await user.click(result)

    const card = await screen.findByRole('main', { name: '林知秋的全息档案' })
    expect(within(card).getByText('燕麦拿铁', { exact: false })).toBeInTheDocument()
    expect(within(card).getByText('小满生日')).toBeInTheDocument()
  })

  it('opens the new contact after saving from the archive', async () => {
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('button', { name: '新增人员' }))

    const dialog = screen.getByRole('dialog', { name: '先记下他是谁' })
    await user.type(within(dialog).getByLabelText('姓名'), '韩知')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    expect(
      await screen.findByRole('main', { name: '韩知的全息档案' }),
    ).toBeInTheDocument()
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    await user.click(screen.getByRole('button', { name: '编辑基本资料' }))
    const profileDialog = screen.getByRole('dialog', { name: '编辑基本资料' })
    const roleInput = within(profileDialog).getByLabelText('角色')
    await user.clear(roleInput)
    await user.type(roleInput, '人生搭档')
    const influenceNoteInput =
      within(profileDialog).getByLabelText('影响力备注')
    expect(influenceNoteInput).toHaveValue('总能把复杂问题说得很清楚')
    await user.clear(influenceNoteInput)
    await user.type(influenceNoteInput, '判断一直很准')
    await user.click(within(profileDialog).getByRole('button', { name: '保存' }))
    expect(await screen.findByText('人生搭档')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '编辑基本资料' }))
    expect(
      within(screen.getByRole('dialog', { name: '编辑基本资料' })).getByLabelText(
        '影响力备注',
      ),
    ).toHaveValue('判断一直很准')
    await user.click(
      within(screen.getByRole('dialog', { name: '编辑基本资料' })).getByRole(
        'button',
        { name: '取消' },
      ),
    )

    const detailSection = screen
      .getByRole('heading', { name: '谈过的细节' })
      .closest('section')!
    await user.click(
      within(detailSection).getByRole('button', { name: '新增' }),
    )
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

    const connectionSection = screen
      .getByRole('heading', { name: '共同认识的人' })
      .closest('section')!
    await user.click(
      within(connectionSection).getByRole('button', { name: '新增' }),
    )
    const connectionDialog = screen.getByRole('dialog', { name: '添加共同认识' })
    await user.type(
      within(connectionDialog).getByLabelText('选择档案中的人'),
      'sh',
    )
    await user.click(
      await within(connectionDialog).findByRole('option', {
        name: /沈禾/,
      }),
    )
    await user.click(
      within(connectionDialog).getByRole('button', { name: '建立连接' }),
    )
    expect(await screen.findByRole('link', { name: '沈禾' })).toBeInTheDocument()
  })

  it('keeps unsynced edits when the workspace is fetched again', async () => {
    class RefetchRaceRepository extends LocalRepository {
      private loads = 0

      override async load() {
        this.loads += 1
        return this.loads === 1 ? super.load() : emptySnapshot()
      }
    }

    const user = userEvent.setup()
    render(
      <App
        repository={
          new RefetchRaceRepository({
            storage: localStorage,
            key: 'refetch-race-test',
            seed: true,
          })
        }
      />,
    )
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))
    await user.click(screen.getByRole('button', { name: '编辑基本资料' }))
    const dialog = screen.getByRole('dialog', { name: '编辑基本资料' })
    await user.clear(within(dialog).getByLabelText('角色'))
    await user.type(
      within(dialog).getByLabelText('角色'),
      '本地待同步角色',
    )
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    expect(
      screen.getByText('已保存到本机'),
    ).toBeInTheDocument()
    await queryClient.refetchQueries({
      queryKey: ['workspace', 'local', 'archive-owner'],
      exact: true,
    })

    expect(
      await screen.findByRole('main', { name: '林知秋的全息档案' }),
    ).toBeInTheDocument()
    expect(screen.getByText('本地待同步角色')).toBeInTheDocument()
  })

  it('orders profile sections and replaces custom dimensions with first meeting', async () => {
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)
    expect(headings.slice(0, 8)).toEqual([
      '互动记录',
      '谈过的细节',
      '家庭概况',
      '职业概况',
      '重要日期',
      '共同认识的人',
      '第一次认识 / 见面',
      '备注',
    ])
    expect(
      screen.queryByRole('heading', { name: '家庭与重要日期' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '职业与目标' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '补充维度' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('添加目标')).not.toBeInTheDocument()

    const career = screen
      .getByRole('heading', { name: '职业概况' })
      .closest('section')!
    const dates = screen.getByRole('heading', { name: '重要日期' }).closest('section')!
    const mutual = screen
      .getByRole('heading', { name: '共同认识的人' })
      .closest('section')!
    const notes = screen.getByRole('heading', { name: '备注' }).closest('section')!
    expect(
      within(career).getByRole('button', { name: '编辑' }),
    ).toBeInTheDocument()
    expect(within(dates).getByRole('button', { name: '新增' })).toBeInTheDocument()
    expect(within(mutual).getByRole('button', { name: '新增' })).toBeInTheDocument()
    expect(within(notes).getByRole('button', { name: '编辑' })).toBeInTheDocument()
  })

  it('captures school and major from the basic profile form', async () => {
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    await user.click(
      screen.getByRole('button', { name: '编辑基本资料' }),
    )
    const dialog = screen.getByRole('dialog', { name: '编辑基本资料' })
    await user.type(within(dialog).getByLabelText('毕业院校'), '清华大学')
    await user.type(within(dialog).getByLabelText('专业'), '计算机科学')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    expect(await screen.findByText('清华大学 · 计算机科学')).toBeInTheDocument()
  })

  it('edits family and career summaries from the profile page', async () => {
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    const familySection = screen
      .getByRole('heading', { name: '家庭概况' })
      .closest('section')!
    await user.click(within(familySection).getByRole('button', { name: '编辑' }))
    const familyDialog = screen.getByRole('dialog', { name: '编辑家庭概况' })
    const familyField = within(familyDialog).getByLabelText('家庭概况')
    await user.clear(familyField)
    await user.type(familyField, '父母住在杭州')
    await user.click(within(familyDialog).getByRole('button', { name: '保存' }))
    expect(await screen.findByText('父母住在杭州')).toBeInTheDocument()

    const careerSection = screen
      .getByRole('heading', { name: '职业概况' })
      .closest('section')!
    await user.click(
      within(careerSection).getByRole('button', { name: '编辑' }),
    )
    const careerDialog = screen.getByRole('dialog', { name: '编辑职业概况' })
    await user.type(within(careerDialog).getByLabelText('公司'), '澄野科技')
    const occupationField = within(careerDialog).getByLabelText('职务')
    await user.clear(occupationField)
    await user.type(occupationField, '产品顾问')
    const careerField = within(careerDialog).getByLabelText('职业概况')
    await user.clear(careerField)
    await user.type(careerField, '专注独立产品顾问')
    await user.click(within(careerDialog).getByRole('button', { name: '保存' }))
    expect(await screen.findByText('专注独立产品顾问')).toBeInTheDocument()
    expect(screen.getByText('澄野科技 · 产品顾问')).toBeInTheDocument()
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('tab', { name: /好友/ }))
    await user.click(screen.getByRole('link', { name: '周原' }))
    await user.click(screen.getByRole('link', { name: '返回155人脉管理' }))

    expect(
      await screen.findByRole('tab', { name: /好友/ }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('filters relationship coaching by today, this week and this month', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-10-22T09:00:00') })
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('tab', { name: /好友/ }))

    const table = screen.getByRole('table')
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((header) => header.textContent),
    ).toEqual(['S', 'Z'])
  })

  it('collapses and expands details on every relationship tier', async () => {
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

    await screen.findByRole('heading', { name: '155人脉管理' })

    await user.click(screen.getByRole('button', { name: '收起资料' }))
    expect(
      screen.queryByRole('columnheader', { name: '角色' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '显示更多资料' }))
    expect(screen.getByRole('columnheader', { name: '角色' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /密友/ }))
    expect(screen.getByRole('button', { name: '收起资料' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /好友/ }))
    expect(screen.getByRole('button', { name: '收起资料' })).toBeInTheDocument()
  })

  it('resizes table columns by dragging their boundary', async () => {
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

    await screen.findByRole('heading', { name: '155人脉管理' })

    await user.click(screen.getByRole('button', { name: '表格格式' }))
    const handle = screen.getByRole('separator', {
      name: '调整姓名与角色列宽',
    })
    fireEvent.pointerDown(handle, { clientX: 220, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 280, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 280, pointerId: 1 })

    const table = screen.getByRole('table')
    const columns = table.querySelectorAll('col')
    expect(columns[0]).toHaveStyle({ width: '280px' })
    expect(columns[1]).toHaveStyle({ width: '100px' })
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    const interactionHeading = screen.getByRole('heading', {
      name: '互动记录',
    })
    const interactionSection = interactionHeading.closest('section')!
    await user.click(
      within(interactionSection).getByRole('button', { name: '新增' }),
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    const editButton = screen.getByRole('button', {
      name: '编辑基本资料',
    })
    expect(editButton).toHaveTextContent('编辑基本资料')
    expect(editButton.closest('aside')).toBeNull()
  })

  it('keeps settings off the profile and removes redundant summary blocks', async () => {
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    const editButton = screen.getByRole('button', { name: '编辑基本资料' })
    expect(editButton.closest('header')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: '设置' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('banner', { name: '账户操作' }),
    ).not.toBeInTheDocument()

    const identityCard = screen.getByRole('complementary')
    expect(within(identityCard).queryByText('第一次见面')).not.toBeInTheDocument()
    expect(
      within(identityCard).queryByRole('button', { name: '记录互动' }),
    ).not.toBeInTheDocument()
    expect(
      within(identityCard).queryByRole('button', { name: '稍后 7 天' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '关系速写' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('见面前，先看这里')).not.toBeInTheDocument()
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))

    expect(screen.getByRole('heading', { name: '备注' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '附件' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('上传附件')).not.toBeInTheDocument()

    const notesSection = screen
      .getByRole('heading', { name: '备注' })
      .closest('section')!
    await user.click(
      within(notesSection).getByRole('button', { name: '编辑' }),
    )
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))
    const detailSection = screen
      .getByRole('heading', { name: '谈过的细节' })
      .closest('section')!
    await user.click(
      within(detailSection).getByRole('button', { name: '新增' }),
    )

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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))
    const detailSection = screen
      .getByRole('heading', { name: '谈过的细节' })
      .closest('section')!
    await user.click(
      within(detailSection).getByRole('button', { name: '新增' }),
    )

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
    expect(
      within(detailSection).getByText('第一次互动内容'),
    ).toBeInTheDocument()
    expect(
      within(detailSection).getByText('第二次互动内容'),
    ).toBeInTheDocument()
    expect(
      within(interactionSection).getAllByText(/关联细节 · 近况/),
    ).toHaveLength(2)
  })

  it('keeps a chosen text color on a detail entry', async () => {
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

    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '林知秋' }))
    const detailSection = screen
      .getByRole('heading', { name: '谈过的细节' })
      .closest('section')!
    await user.click(
      within(detailSection).getByRole('button', { name: '新增' }),
    )

    const dialog = screen.getByRole('dialog', { name: '添加细节' })
    await user.type(within(dialog).getByLabelText('类别'), '重点')
    const editor = within(dialog).getByLabelText('内容')
    await user.type(editor, '需要标红的细节')

    const textNode = Array.from(editor.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE,
    ) as Text | undefined
    const range = document.createRange()
    range.setStart(textNode!, 2)
    range.setEnd(textNode!, 4)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    fireEvent(document, new Event('selectionchange'))

    await user.click(within(dialog).getByRole('button', { name: '红' }))
    await user.click(
      within(dialog).getByRole('button', { name: '保存细节' }),
    )

    const paragraph = await waitFor(() => {
      const found = Array.from(
        detailSection.querySelectorAll('.timeline-content p'),
      ).find((item) => item.textContent === '需要标红的细节')
      expect(found).toBeTruthy()
      return found as HTMLElement
    })
    const colored = Array.from(paragraph.querySelectorAll('span')).find(
      (item) => item.textContent === '标红',
    )
    expect(colored).toHaveStyle({ color: '#E8481F' })
    expect(paragraph.textContent).toBe('需要标红的细节')
  })
})
