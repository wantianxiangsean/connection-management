import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

await mkdir('artifacts', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const failures = []

async function signIn(page) {
  await page.getByPlaceholder('187手机').fill('13800138000')
  await page.getByPlaceholder('leeds').fill('preview')
  await page.getByRole('button', { name: '登录' }).click()
  await page.getByRole('heading', { name: '155人脉管理' }).waitFor()
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
desktop.on('pageerror', (error) => failures.push(error.message))
await desktop.goto('http://127.0.0.1:4174/')
await desktop.screenshot({
  path: 'artifacts/login-desktop.png',
  fullPage: true,
})
await signIn(desktop)
await desktop.screenshot({
  path: 'artifacts/archive-desktop.png',
  fullPage: true,
})
await desktop.getByRole('button', { name: '新增人物' }).click()
await desktop.screenshot({
  path: 'artifacts/new-person-desktop.png',
  fullPage: true,
})
await desktop.getByRole('button', { name: '关闭' }).click()
await desktop.getByRole('tab', { name: /认识的人/ }).click()
await desktop.screenshot({
  path: 'artifacts/acquaintance-desktop.png',
  fullPage: true,
})
await desktop.getByRole('tab', { name: /好友/ }).click()
await desktop.screenshot({
  path: 'artifacts/archive-grouped-desktop.png',
  fullPage: true,
})
await desktop.getByRole('tab', { name: /命友/ }).click()
await desktop.getByRole('link', { name: '林知秋' }).click()
await desktop.getByRole('main', { name: '林知秋的全息档案' }).waitFor()
await desktop.screenshot({
  path: 'artifacts/profile-desktop.png',
  fullPage: true,
})

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})
mobile.on('pageerror', (error) => failures.push(error.message))
await mobile.goto('http://127.0.0.1:4174/')
await signIn(mobile)
await mobile.screenshot({
  path: 'artifacts/archive-mobile.png',
  fullPage: true,
})
await mobile.getByRole('link', { name: '林知秋' }).click()
await mobile.getByRole('main', { name: '林知秋的全息档案' }).waitFor()
await mobile.screenshot({
  path: 'artifacts/profile-mobile.png',
  fullPage: true,
})

await browser.close()

if (failures.length) {
  throw new Error(`Browser errors: ${failures.join(' | ')}`)
}
