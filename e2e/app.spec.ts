import { expect, test } from '@playwright/test'

test('owner can open and review a relationship profile without a login page', async ({ page }) => {
  await page.goto('/')
  const heading = page.getByRole('heading', { name: '155人脉管理' })
  await expect(heading).toBeVisible()
  await expect(page.getByPlaceholder('187手机')).toHaveCount(0)
  await expect(page.getByPlaceholder('leeds')).toHaveCount(0)
  await page
    .getByPlaceholder(/搜索姓名/)
    .fill('lzq')
  await page.getByRole('link', { name: '林知秋' }).click()
  await expect(
    page.getByRole('main', { name: '林知秋的全息档案' }),
  ).toBeVisible()
  await expect(page.getByText('小满最近在学画猫', { exact: false })).toBeVisible()
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
