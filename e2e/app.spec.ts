import { expect, test } from '@playwright/test'

test('owner can open and review a relationship profile without a login page', async ({ page }) => {
  await page.goto('/')
  const heading = page.getByRole('heading', { name: '155人脉管理' })
  await expect(heading).toBeVisible()
  await expect(heading).toHaveCSS('color', 'rgb(232, 62, 16)')
  await expect(heading).toHaveCSS('font-weight', '700')
  await expect(page.getByPlaceholder('187手机')).toHaveCount(0)
  await expect(page.getByPlaceholder('leeds')).toHaveCount(0)
  await page
    .getByPlaceholder('搜索姓名、姓名首字母、职业或某个细节')
    .fill('lzq')
  await page.getByRole('link', { name: '林知秋' }).click()
  await expect(
    page.getByRole('main', { name: '林知秋的全息档案' }),
  ).toBeVisible()
  await expect(page.getByText('小满最近在学画猫', { exact: false })).toBeVisible()
})

test('archive actions fit and place settings after add person', async ({ page }) => {
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()

  await page.goto('/')
  await expect(page.getByRole('heading', { name: '155人脉管理' })).toBeVisible()

  await expect(
    page.getByRole('banner', { name: '账户操作' }),
  ).toHaveCount(0)
  const addButton = page.getByRole('button', { name: '新增人员' })
  const settings = page.getByRole('link', { name: '设置' })
  const details = page.getByRole('button', { name: '收起资料' })
  const filters = page.locator('.table-filters')
  const tableFormat = filters.getByRole('button', { name: '表格格式' })
  await expect(addButton).toBeVisible()
  await expect(settings).toBeVisible()
  await expect(page.getByRole('link', { name: '备份' })).toHaveCount(0)
  await expect(details).toBeVisible()
  if (viewport!.width > 680) {
    await expect(tableFormat).toBeVisible()
  } else {
    await expect(tableFormat).toHaveCount(0)
  }
  const addBox = await addButton.boundingBox()
  const settingsBox = await settings.boundingBox()
  expect(addBox).not.toBeNull()
  expect(settingsBox).not.toBeNull()
  expect(Math.abs(addBox!.y - settingsBox!.y)).toBeLessThanOrEqual(1)
  expect(addBox!.x + addBox!.width).toBeLessThanOrEqual(settingsBox!.x)
  expect(settingsBox!.x + settingsBox!.width).toBeLessThanOrEqual(
    viewport!.width + 1,
  )
  const horizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )
  expect(horizontalOverflow).toBeLessThanOrEqual(1)
})

test('profile keeps settings off the contact detail page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('heading', { name: '155人脉管理' }).waitFor()
  await page.getByRole('link', { name: '林知秋' }).click()
  await page.getByRole('main', { name: '林知秋的全息档案' }).waitFor()

  await expect(
    page.getByRole('banner', { name: '账户操作' }),
  ).not.toBeVisible()
  const edit = page.getByRole('button', { name: '编辑基本资料' })
  const editBox = await edit.boundingBox()

  expect(editBox).not.toBeNull()
  await expect(page.getByRole('link', { name: '设置' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '关系速写' })).toHaveCount(0)
})

test('collapsed relationship tabs use the compact card grid', async ({ page }) => {
  const viewport = page.viewportSize()!
  await page.goto('/')
  await page.getByRole('heading', { name: '155人脉管理' }).waitFor()
  await page.getByRole('button', { name: '收起资料' }).click()

  const grid = page
    .getByRole('list', { name: '命友名单' })
    .locator('.acquaintance-grid')
    .first()
  await expect(grid).toBeVisible()
  const columnCount = await grid.evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
  )
  const expectedColumns = viewport.width > 900 ? 5 : viewport.width > 680 ? 4 : 2
  expect(columnCount).toBe(expectedColumns)
})

test('opens a newly saved contact profile', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('heading', { name: '155人脉管理' }).waitFor()
  await page.getByRole('button', { name: '新增人员' }).click()
  await page.getByLabel('姓名').fill('韩知')
  await page.getByRole('button', { name: '保存', exact: true }).click()

  await expect(
    page.getByRole('main', { name: '韩知的全息档案' }),
  ).toBeVisible()
})

test('new person actions stay visible above the scroll area', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('heading', { name: '155人脉管理' }).waitFor()
  await page.getByRole('button', { name: '新增人员' }).click()

  const dialog = page.getByRole('dialog', { name: '先记下他是谁' })
  const actions = dialog.locator('form footer')
  const scrollArea = dialog.locator('form')

  await expect(actions).toBeInViewport({ ratio: 1 })
  await scrollArea.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(actions).toBeInViewport({ ratio: 1 })
})

test('finds a mutual contact by pinyin initials', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('heading', { name: '155人脉管理' }).waitFor()
  await page.getByRole('link', { name: '林知秋' }).click()
  await page.getByRole('heading', { name: '共同认识的人' }).waitFor()

  const section = page.locator('section.dossier-section').filter({
    has: page.getByRole('heading', { name: '共同认识的人' }),
  })
  await section.getByRole('button', { name: '新增' }).click()

  const dialog = page.getByRole('dialog', { name: '添加共同认识' })
  const picker = dialog.getByLabel('选择档案中的人')
  await picker.fill('sh')
  await expect(dialog.getByRole('option', { name: /沈禾/ })).toBeVisible()
  await dialog.getByRole('option', { name: /沈禾/ }).click()
  await dialog.getByRole('button', { name: '建立连接' }).click()

  await expect(page.getByRole('link', { name: '沈禾' })).toBeVisible()
})

test('keeps the settings heading compact', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '设置' }).click()
  const heading = page.getByRole('heading', { name: '设置' })
  await expect(heading).toBeVisible()

  const metrics = await heading.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
    }
  })

  expect(metrics.fontSize).toBeLessThanOrEqual(44)
  expect(metrics.lineHeight).toBeLessThanOrEqual(metrics.fontSize)
})

test('resizes table columns by dragging the header boundary', async ({ page }) => {
  const viewport = page.viewportSize()!
  test.skip(viewport.width <= 680, 'Column resizing uses the desktop table layout')

  await page.goto('/')
  await page.getByRole('heading', { name: '155人脉管理' }).waitFor()
  const formatButton = page.getByRole('button', { name: '表格格式' })
  await formatButton.click()
  await expect(formatButton).toHaveAttribute('aria-pressed', 'true')

  const handle = page.getByRole('separator', {
    name: '调整姓名与角色列宽',
  })
  const handleBox = await handle.boundingBox()
  expect(handleBox).not.toBeNull()
  await page.mouse.move(
    handleBox!.x + handleBox!.width / 2,
    handleBox!.y + handleBox!.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    handleBox!.x + handleBox!.width / 2 + 60,
    handleBox!.y + handleBox!.height / 2,
    { steps: 5 },
  )
  await page.mouse.up()

  const columns = page.getByRole('table').locator('col')
  await expect
    .poll(() => columns.nth(0).evaluate((column) => column.style.width))
    .toBe('280px')
  await expect
    .poll(() => columns.nth(1).evaluate((column) => column.style.width))
    .toBe('100px')
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('archive-column-widths-v1')
        return raw ? JSON.parse(raw) : null
      }),
    )
    .toMatchObject({ fullName: 280, role: 100 })
})
