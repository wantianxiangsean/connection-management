import { expect, test } from '@playwright/test'

test('owner can sign in and review a relationship profile', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByPlaceholder('187手机')).toBeVisible()
  await expect(page.getByPlaceholder('leeds')).toBeVisible()

  await page.getByPlaceholder('187手机').fill('13800138000')
  await page.getByPlaceholder('leeds').fill('preview')
  await page.getByRole('button', { name: '登录' }).click()

  await expect(page.getByRole('heading', { name: '人脉归档' })).toBeVisible()
  await page.getByRole('link', { name: '林知秋' }).click()
  await expect(
    page.getByRole('main', { name: '林知秋的全息档案' }),
  ).toBeVisible()
  await expect(page.getByText('小满最近在学画猫', { exact: false })).toBeVisible()
})

