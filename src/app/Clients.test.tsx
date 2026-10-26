import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { queryClient } from './WorkspaceContext'
import { LocalRepository } from '../data/local-repository'
import { createSampleSnapshot } from '../data/sample-data'

describe('clients and partners', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
    window.location.hash = ''
  })

  async function openClients() {
    const user = userEvent.setup()
    render(
      <App
        repository={
          new LocalRepository({
            storage: localStorage,
            key: 'clients-test',
            seed: true,
          })
        }
      />,
    )
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '客户/伙伴' }))
    await screen.findByRole('heading', { name: '客户/伙伴' })
    return user
  }

  it('keeps a settings entry on the clients page', async () => {
    const user = await openClients()

    await user.click(screen.getByRole('link', { name: '设置' }))
    await screen.findByRole('heading', { name: '设置' })

    const back = screen.getByRole('link', { name: '返回客户/伙伴' })
    expect(back).toHaveAttribute('href', '#/clients')
    await user.click(back)
    await screen.findByRole('heading', { name: '客户/伙伴' })
  })

  it('creates a client with a linked and an independent contact', async () => {
    const user = await openClients()

    await user.click(screen.getAllByRole('button', { name: '新增' })[0])
    const dialog = await screen.findByRole('dialog', { name: '新增客户' })
    await user.type(within(dialog).getByLabelText('名称'), '青禾科技')
    await user.click(within(dialog).getByLabelText('伙伴'))
    await user.type(within(dialog).getByLabelText('地址'), '杭州市西湖区')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    await screen.findByRole('heading', { name: '青禾科技' })
    expect(window.location.hash).toMatch(/^#\/clients\/client-/)
    expect(screen.getByText('伙伴')).toBeInTheDocument()
    expect(screen.getByText('杭州市西湖区')).toBeInTheDocument()
    expect(screen.getByText('0 位联系人')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '添加联系人' }))
    const linkDialog = await screen.findByRole('dialog', { name: '添加联系人' })
    await user.type(
      within(linkDialog).getByRole('combobox', { name: '从人脉档案选择' }),
      '林',
    )
    await user.click(
      await within(linkDialog).findByRole('option', { name: /林知秋/ }),
    )
    await user.click(
      within(linkDialog).getByRole('button', { name: '保存' }),
    )

    expect(await screen.findByText('林知秋')).toBeInTheDocument()
    expect(screen.getByText('产品负责人')).toBeInTheDocument()
    expect(screen.getByText('影响力 强')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /查看档案/ })).toHaveAttribute(
      'href',
      '#/people/lin-zhiqiu',
    )

    await user.click(screen.getByRole('button', { name: '添加联系人' }))
    const newDialog = await screen.findByRole('dialog', { name: '添加联系人' })
    await user.type(within(newDialog).getByLabelText(/联系人姓名/), '王经理')
    await user.type(within(newDialog).getByLabelText('职务'), '采购总监')
    await user.selectOptions(
      within(newDialog).getByLabelText('影响力'),
      'medium',
    )
    await user.selectOptions(
      within(newDialog).getByLabelText('态度'),
      'negative',
    )
    await user.type(within(newDialog).getByLabelText('备注'), '对价格敏感')
    await user.click(
      within(newDialog).getByRole('button', { name: '保存' }),
    )

    expect(await screen.findByText('王经理')).toBeInTheDocument()
    expect(screen.getByText('独立联系人')).toBeInTheDocument()
    expect(screen.getByText('采购总监')).toBeInTheDocument()
    expect(screen.getByText('影响力 中')).toBeInTheDocument()
    expect(screen.getByText('负向')).toBeInTheDocument()
    expect(screen.getByText('对价格敏感')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '编辑联系人 王经理' }))
    const editDialog = await screen.findByRole('dialog', {
      name: '编辑联系人',
    })
    const titleInput = within(editDialog).getByLabelText('职务')
    await user.clear(titleInput)
    await user.type(titleInput, '采购负责人')
    await user.selectOptions(
      within(editDialog).getByLabelText('态度'),
      'positive',
    )
    await user.click(within(editDialog).getByRole('button', { name: '保存' }))

    expect(await screen.findByText('采购负责人')).toBeInTheDocument()
    expect(screen.getByText('正向')).toBeInTheDocument()

    const stored = JSON.parse(localStorage.getItem('clients-test') ?? '{}')
    expect(stored.clients).toHaveLength(1)
    expect(stored.clientContacts).toHaveLength(2)
    expect(stored.clientContacts[1]).toMatchObject({
      title: '采购负责人',
      influence: 'medium',
      attitude: 'positive',
      note: '对价格敏感',
    })

    await user.click(
      screen.getByRole('button', { name: '移除 王经理' }),
    )
    const removeDialog = await screen.findByRole('dialog', {
      name: '移除联系人',
    })
    await user.click(
      within(removeDialog).getByRole('button', { name: '移除' }),
    )
    expect(screen.queryByText('王经理')).not.toBeInTheDocument()

    const afterRemove = JSON.parse(
      localStorage.getItem('clients-test') ?? '{}',
    )
    expect(afterRemove.clientContacts).toHaveLength(1)
  })

  it('saves a contact and stays ready for the next one', async () => {
    const user = await openClients()

    await user.click(screen.getAllByRole('button', { name: '新增' })[0])
    const clientDialog = await screen.findByRole('dialog', {
      name: '新增客户',
    })
    await user.type(
      within(clientDialog).getByLabelText('名称'),
      '青禾科技',
    )
    await user.click(within(clientDialog).getByLabelText('客户'))
    await user.click(
      within(clientDialog).getByRole('button', { name: '保存' }),
    )
    await screen.findByRole('heading', { name: '青禾科技' })

    await user.click(screen.getByRole('button', { name: '添加联系人' }))
    const dialog = await screen.findByRole('dialog', { name: '添加联系人' })
    const nameInput = within(dialog).getByLabelText(/联系人姓名/)
    await user.type(nameInput, '王经理')
    await user.click(
      within(dialog).getByRole('button', { name: '保存并新增' }),
    )

    expect(
      screen.getByRole('dialog', { name: '添加联系人' }),
    ).toBeInTheDocument()
    expect(nameInput).toHaveValue('')

    await user.type(nameInput, '李工')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    expect(
      screen.queryByRole('dialog', { name: '添加联系人' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('王经理')).toBeInTheDocument()
    expect(screen.getByText('李工')).toBeInTheDocument()
  })

  it('edits a client and deletes it without touching the person archive', async () => {
    const user = await openClients()

    await user.click(screen.getAllByRole('button', { name: '新增' })[0])
    const dialog = await screen.findByRole('dialog', { name: '新增客户' })
    await user.type(within(dialog).getByLabelText('名称'), '青禾科技')
    await user.click(within(dialog).getByLabelText('客户'))
    await user.click(within(dialog).getByRole('button', { name: '保存' }))
    await screen.findByRole('heading', { name: '青禾科技' })

    await user.click(screen.getByRole('button', { name: '添加联系人' }))
    const contactDialog = await screen.findByRole('dialog', {
      name: '添加联系人',
    })
    await user.type(
      within(contactDialog).getByLabelText(/联系人姓名/),
      '王经理',
    )
    await user.click(
      within(contactDialog).getByRole('button', { name: '保存' }),
    )

    await user.click(screen.getByRole('button', { name: '编辑' }))
    const editDialog = await screen.findByRole('dialog', { name: '编辑客户' })
    const nameInput = within(editDialog).getByLabelText('名称')
    await user.clear(nameInput)
    await user.type(nameInput, '青禾设计')
    await user.click(within(editDialog).getByRole('button', { name: '保存' }))
    await screen.findByRole('heading', { name: '青禾设计' })

    await user.click(screen.getByRole('button', { name: '删除' }))
    const confirm = await screen.findByRole('dialog', { name: '删除客户' })
    await user.click(within(confirm).getByRole('button', { name: '删除' }))

    await screen.findByRole('heading', { name: '客户/伙伴' })
    expect(screen.queryByText('青禾设计')).not.toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem('clients-test') ?? '{}')
    expect(stored.clients).toHaveLength(0)
    expect(stored.clientContacts).toHaveLength(0)
    expect(stored.people.length).toBeGreaterThan(0)
  })

  it('filters clients by category and search', async () => {
    const snapshot = createSampleSnapshot()
    snapshot.clients = [
      {
        id: 'client-1',
        name: '星野设计',
        address: '上海市静安区',
        categories: ['customer', 'partner'],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
      {
        id: 'client-2',
        name: '远山物流',
        address: '苏州市吴中区',
        categories: ['supplier'],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
      {
        id: 'client-3',
        name: '中软国际',
        address: '北京市海淀区',
        categories: ['supplier'],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ]
    snapshot.clientContacts = [
      {
        id: 'contact-1',
        clientId: 'client-2',
        personId: null,
        name: '王大明',
        title: '',
        influence: null,
        attitude: 'neutral',
        note: '',
        position: 0,
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ]
    snapshot.clientArtifacts = [
      {
        id: 'artifact-1',
        clientId: 'client-1',
        kind: 'solution',
        name: '年度方案',
        note: '',
        industry: '智能硬件、家居',
        position: 0,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ]
    localStorage.setItem('clients-filter-test', JSON.stringify(snapshot))

    const user = userEvent.setup()
    render(
      <App
        repository={
          new LocalRepository({
            storage: localStorage,
            key: 'clients-filter-test',
          })
        }
      />,
    )
    await screen.findByRole('heading', { name: '155人脉管理' })
    await user.click(screen.getByRole('link', { name: '客户/伙伴' }))
    await screen.findByRole('heading', { name: '客户/伙伴' })

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((item) => item.textContent),
    ).toEqual(['星野设计', '远山物流', '中软国际'])

    const tabs = screen.getByRole('navigation', { name: '客户类别' })
    const cardNames = () =>
      screen
        .getAllByRole('heading', { level: 2 })
        .map((item) => item.textContent)

    await user.click(within(tabs).getByRole('button', { name: /供应商/ }))
    expect(cardNames()).toEqual(['远山物流', '中软国际'])

    await user.click(within(tabs).getByRole('button', { name: /客户/ }))
    expect(cardNames()).toEqual(['星野设计'])

    await user.click(within(tabs).getByRole('button', { name: /伙伴/ }))
    expect(cardNames()).toEqual(['星野设计'])

    await user.click(within(tabs).getByRole('button', { name: /全部/ }))
    await user.type(screen.getByLabelText('搜索客户'), '静安')
    expect(screen.getByText('星野设计')).toBeInTheDocument()
    expect(screen.queryByText('远山物流')).not.toBeInTheDocument()

    const search = screen.getByLabelText('搜索客户')
    await user.clear(search)
    await user.type(search, '家居')
    expect(screen.getByText('星野设计')).toBeInTheDocument()
    expect(screen.queryByText('远山物流')).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'zr')
    expect(screen.getByText('中软国际')).toBeInTheDocument()
    expect(screen.queryByText('星野设计')).not.toBeInTheDocument()
    expect(screen.queryByText('远山物流')).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'wdm')
    expect(screen.getByText('远山物流')).toBeInTheDocument()
    expect(screen.queryByText('星野设计')).not.toBeInTheDocument()

    await user.clear(search)
    const industryFilter = screen.getByLabelText('按行业筛选')
    await user.selectOptions(industryFilter, '家居')
    expect(screen.getByText('星野设计')).toBeInTheDocument()
    expect(screen.queryByText('远山物流')).not.toBeInTheDocument()
    expect(screen.queryByText('中软国际')).not.toBeInTheDocument()

    await user.selectOptions(industryFilter, '智能硬件')
    expect(screen.getByText('星野设计')).toBeInTheDocument()

    await user.selectOptions(industryFilter, '')
    expect(screen.getByText('中软国际')).toBeInTheDocument()
  })

  it('lets one company carry several identities', async () => {
    const user = await openClients()

    await user.click(screen.getAllByRole('button', { name: '新增' })[0])
    const dialog = await screen.findByRole('dialog', { name: '新增客户' })
    await user.type(within(dialog).getByLabelText('名称'), '青禾科技')
    const save = within(dialog).getByRole('button', { name: '保存' })
    expect(save).toBeDisabled()

    await user.click(within(dialog).getByLabelText('客户'))
    await user.click(within(dialog).getByLabelText('供应商'))
    expect(save).toBeEnabled()
    await user.click(save)

    await screen.findByRole('heading', { name: '青禾科技' })
    await user.click(screen.getByRole('link', { name: '返回客户/伙伴' }))
    await screen.findByRole('heading', { name: '客户/伙伴' })

    const card = await screen.findByRole('link', { name: /青禾科技/ })
    expect(within(card).getByText('客户')).toBeInTheDocument()
    expect(within(card).getByText('供应商')).toBeInTheDocument()

    const tabs = screen.getByRole('navigation', { name: '客户类别' })
    await user.click(within(tabs).getByRole('button', { name: /客户/ }))
    expect(screen.getByText('青禾科技')).toBeInTheDocument()
    await user.click(within(tabs).getByRole('button', { name: /供应商/ }))
    expect(screen.getByText('青禾科技')).toBeInTheDocument()
  })

  it('adds projects and todos under a company', async () => {
    const user = await openClients()

    await user.click(screen.getAllByRole('button', { name: '新增' })[0])
    const dialog = await screen.findByRole('dialog', { name: '新增客户' })
    await user.type(within(dialog).getByLabelText('名称'), '青禾科技')
    await user.click(within(dialog).getByLabelText('客户'))
    await user.click(within(dialog).getByRole('button', { name: '保存' }))
    await screen.findByRole('heading', { name: '青禾科技' })

    await user.click(screen.getByRole('button', { name: '新增项目' }))
    const projectDialog = await screen.findByRole('dialog', {
      name: '新增项目',
    })
    await user.type(
      within(projectDialog).getByLabelText('项目名称'),
      '门店视觉升级',
    )
    await user.type(
      within(projectDialog).getByLabelText('项目说明'),
      '九月上线',
    )
    await user.click(
      within(projectDialog).getByRole('button', { name: '保存' }),
    )

    expect(await screen.findByText('门店视觉升级')).toBeInTheDocument()
    expect(screen.getByText('九月上线')).toBeInTheDocument()

    await user.type(screen.getByLabelText('新增待办'), '寄送样品')
    await user.click(screen.getByRole('button', { name: '添加' }))
    const checkbox = await screen.findByRole('checkbox', { name: '寄送样品' })
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    await user.click(
      screen.getByRole('button', { name: '编辑待办 寄送样品' }),
    )
    const todoInput = screen.getByLabelText('待办内容')
    await user.clear(todoInput)
    await user.type(todoInput, '寄送两套样品')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByText('寄送两套样品')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: '删除待办 寄送两套样品' }),
    )
    expect(screen.queryByText('寄送两套样品')).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: '编辑项目 门店视觉升级' }),
    )
    const editProject = await screen.findByRole('dialog', {
      name: '编辑项目',
    })
    const projectName = within(editProject).getByLabelText('项目名称')
    await user.clear(projectName)
    await user.type(projectName, '门店改版')
    await user.click(
      within(editProject).getByRole('button', { name: '保存' }),
    )
    expect(await screen.findByText('门店改版')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: '删除项目 门店改版' }),
    )
    expect(screen.queryByText('门店改版')).not.toBeInTheDocument()
  })

  it('hangs a product under a solution', async () => {
    const user = await openClients()

    await user.click(screen.getAllByRole('button', { name: '新增' })[0])
    const dialog = await screen.findByRole('dialog', { name: '新增客户' })
    await user.type(within(dialog).getByLabelText('名称'), '青禾科技')
    await user.click(within(dialog).getByLabelText('客户'))
    await user.click(within(dialog).getByRole('button', { name: '保存' }))
    await screen.findByRole('heading', { name: '青禾科技' })

    await user.click(screen.getByRole('button', { name: '新增产品' }))
    const productDialog = await screen.findByRole('dialog', {
      name: '新增产品',
    })
    await user.type(
      within(productDialog).getByLabelText('产品名称'),
      '智能门锁',
    )
    await user.click(
      within(productDialog).getByRole('button', { name: '保存' }),
    )

    await user.click(screen.getByRole('button', { name: '新增方案' }))
    const solutionDialog = await screen.findByRole('dialog', {
      name: '新增方案',
    })
    await user.type(
      within(solutionDialog).getByLabelText('方案名称'),
      '年度方案',
    )
    await user.type(within(solutionDialog).getByLabelText(/行业/), '智能硬件、家居')
    await user.click(
      within(solutionDialog).getByRole('button', { name: '保存' }),
    )

    const solutionRegion = await screen.findByRole('region', { name: '方案' })
    expect(within(solutionRegion).getByText('年度方案')).toBeInTheDocument()
    expect(within(solutionRegion).getByText('智能硬件')).toBeInTheDocument()
    expect(within(solutionRegion).getByText('家居')).toBeInTheDocument()

    await user.click(
      within(solutionRegion).getByRole('button', { name: /挂产品/ }),
    )
    const attachDialog = await screen.findByRole('dialog', { name: '挂产品' })
    await user.click(within(attachDialog).getByLabelText('智能门锁'))
    await user.click(within(attachDialog).getByRole('button', { name: '挂上' }))

    expect(within(solutionRegion).getByText('智能门锁')).toBeInTheDocument()
    const productRegion = screen.getByRole('region', { name: '产品' })
    expect(
      within(productRegion).getByText('已挂在「年度方案」方案'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '新增方案' }))
    const renewalDialog = await screen.findByRole('dialog', {
      name: '新增方案',
    })
    await user.type(
      within(renewalDialog).getByLabelText('方案名称'),
      '续约方案',
    )
    await user.click(
      within(renewalDialog).getByRole('button', { name: '保存' }),
    )

    const renewalRow = within(solutionRegion)
      .getByText('续约方案')
      .closest('li')!
    await user.click(
      within(renewalRow).getByRole('button', { name: /挂产品/ }),
    )
    const secondAttach = await screen.findByRole('dialog', { name: '挂产品' })
    await user.click(within(secondAttach).getByLabelText('智能门锁'))
    await user.click(
      within(secondAttach).getByRole('button', { name: '挂上' }),
    )

    expect(within(renewalRow).getByText('智能门锁')).toBeInTheDocument()
    expect(
      within(productRegion).getByText(/年度方案.*续约方案/),
    ).toBeInTheDocument()

    await user.click(
      within(renewalRow).getByRole('button', {
        name: '从方案移除 智能门锁',
      }),
    )
    expect(
      within(productRegion).queryByText(/续约方案/),
    ).not.toBeInTheDocument()
    expect(
      within(productRegion).getByText('已挂在「年度方案」方案'),
    ).toBeInTheDocument()

    await user.click(
      within(solutionRegion).getByRole('button', {
        name: '从方案移除 智能门锁',
      }),
    )
    expect(
      within(productRegion).queryByText(/已挂在/),
    ).not.toBeInTheDocument()
  })

  it('edits projects, products and solutions after creation', async () => {
    const user = await openClients()

    await user.click(screen.getAllByRole('button', { name: '新增' })[0])
    const dialog = await screen.findByRole('dialog', { name: '新增客户' })
    await user.type(within(dialog).getByLabelText('名称'), '青禾科技')
    await user.click(within(dialog).getByLabelText('客户'))
    await user.click(within(dialog).getByRole('button', { name: '保存' }))
    await screen.findByRole('heading', { name: '青禾科技' })

    await user.click(screen.getByRole('button', { name: '新增项目' }))
    const projectDialog = await screen.findByRole('dialog', {
      name: '新增项目',
    })
    await user.type(
      within(projectDialog).getByLabelText('项目名称'),
      '项目甲',
    )
    await user.click(
      within(projectDialog).getByRole('button', { name: '保存' }),
    )
    await user.click(screen.getByRole('button', { name: '编辑项目 项目甲' }))
    const projectEdit = await screen.findByRole('dialog', { name: '编辑项目' })
    const projectName = within(projectEdit).getByLabelText('项目名称')
    await user.clear(projectName)
    await user.type(projectName, '项目乙')
    await user.click(
      within(projectEdit).getByRole('button', { name: '保存' }),
    )
    expect(await screen.findByText('项目乙')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '新增产品' }))
    const productDialog = await screen.findByRole('dialog', {
      name: '新增产品',
    })
    await user.type(
      within(productDialog).getByLabelText('产品名称'),
      '产品甲',
    )
    await user.click(
      within(productDialog).getByRole('button', { name: '保存' }),
    )
    await user.click(screen.getByRole('button', { name: '编辑产品 产品甲' }))
    const productEdit = await screen.findByRole('dialog', {
      name: '编辑产品',
    })
    const productName = within(productEdit).getByLabelText('产品名称')
    await user.clear(productName)
    await user.type(productName, '产品乙')
    await user.click(
      within(productEdit).getByRole('button', { name: '保存' }),
    )
    expect(await screen.findByText('产品乙')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '新增方案' }))
    const solutionDialog = await screen.findByRole('dialog', {
      name: '新增方案',
    })
    await user.type(
      within(solutionDialog).getByLabelText('方案名称'),
      '方案甲',
    )
    await user.type(within(solutionDialog).getByLabelText(/行业/), '甲行业')
    await user.click(
      within(solutionDialog).getByRole('button', { name: '保存' }),
    )
    await user.click(screen.getByRole('button', { name: '编辑方案 方案甲' }))
    const solutionEdit = await screen.findByRole('dialog', {
      name: '编辑方案',
    })
    const solutionName = within(solutionEdit).getByLabelText('方案名称')
    await user.clear(solutionName)
    await user.type(solutionName, '方案乙')
    const industryInput = within(solutionEdit).getByLabelText(/行业/)
    await user.clear(industryInput)
    await user.type(industryInput, '乙行业、共同行业')
    await user.click(
      within(solutionEdit).getByRole('button', { name: '保存' }),
    )
    expect(await screen.findByText('方案乙')).toBeInTheDocument()
    expect(screen.getByText('乙行业')).toBeInTheDocument()
    expect(screen.getByText('共同行业')).toBeInTheDocument()
  })

  it('records interactions with a company', async () => {
    const user = await openClients()

    await user.click(screen.getAllByRole('button', { name: '新增' })[0])
    const dialog = await screen.findByRole('dialog', { name: '新增客户' })
    await user.type(within(dialog).getByLabelText('名称'), '青禾科技')
    await user.click(within(dialog).getByLabelText('客户'))
    await user.click(within(dialog).getByRole('button', { name: '保存' }))
    await screen.findByRole('heading', { name: '青禾科技' })

    await user.click(screen.getByRole('button', { name: '新增互动' }))
    const interactionDialog = await screen.findByRole('dialog', {
      name: '记一次互动',
    })
    fireEvent.change(
      within(interactionDialog).getByLabelText('日期'),
      { target: { value: '2026-10-20' } },
    )
    await user.selectOptions(
      within(interactionDialog).getByLabelText('方式'),
      'call',
    )
    await user.type(
      within(interactionDialog).getByLabelText('沟通内容'),
      '确认年度框架和报价',
    )
    await user.click(
      within(interactionDialog).getByRole('button', { name: '保存' }),
    )

    expect(
      await screen.findByText('确认年度框架和报价'),
    ).toBeInTheDocument()
    expect(screen.getByText('2026-10-20')).toBeInTheDocument()
    expect(screen.getByText('通话')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: '编辑互动 2026-10-20' }),
    )
    const editInteraction = await screen.findByRole('dialog', {
      name: '编辑互动',
    })
    fireEvent.change(within(editInteraction).getByLabelText('日期'), {
      target: { value: '2026-10-22' },
    })
    const summaryInput = within(editInteraction).getByLabelText('沟通内容')
    await user.clear(summaryInput)
    await user.type(summaryInput, '确认年度框架、报价和排期')
    await user.click(
      within(editInteraction).getByRole('button', { name: '保存' }),
    )
    expect(
      await screen.findByText('确认年度框架、报价和排期'),
    ).toBeInTheDocument()
    expect(screen.getByText('2026-10-22')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: '删除互动 2026-10-22' }),
    )
    expect(
      screen.queryByText('确认年度框架、报价和排期'),
    ).not.toBeInTheDocument()
  })
})
