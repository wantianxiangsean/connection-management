import { expect, test } from '@playwright/test'

test('owner can open and review a relationship profile without a login page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '155人脉管理' })).toBeVisible()
  await expect(page.getByPlaceholder('187手机')).toHaveCount(0)
  await expect(page.getByPlaceholder('leeds')).toHaveCount(0)
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
  const backup = page.getByRole('link', { name: '备份' })
  const settings = page.getByRole('link', { name: '设置' })
  const details = page.getByRole('button', { name: '收起资料' })
  const filters = page.locator('.table-filters')
  const tableFormat = filters.getByRole('button', { name: '表格格式' })
  await expect(addButton).toBeVisible()
  await expect(backup).toBeVisible()
  await expect(settings).toBeVisible()
  await expect(details).toBeVisible()
  await expect(tableFormat).toBeVisible()
  const addBox = await addButton.boundingBox()
  const backupBox = await backup.boundingBox()
  const settingsBox = await settings.boundingBox()
  expect(addBox).not.toBeNull()
  expect(backupBox).not.toBeNull()
  expect(settingsBox).not.toBeNull()
  expect(Math.abs(backupBox!.y - settingsBox!.y)).toBeLessThanOrEqual(1)
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
