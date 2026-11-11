# 见微 · 人脉全息档案

一个单用户、桌面优先、适配手机的人脉档案系统。它把四类关系、人物近况、家庭与职业资料、共同认识的人、重要日期和谈过的细节放在同一张可检索的档案里。

线上地址：https://crm.seanwan.top （Cloudflare Worker + KV，密码门保护）

## 本地运行

```bash
pnpm install
pnpm dev
```

`vite dev` 没有后端，会自动使用浏览器本地存储和演示档案，适合改界面。

要连真实云端数据（含密码登录），用 Worker 本地模式：

```bash
pnpm build
npx wrangler dev
```

本地密码写在 `.dev.vars`（已 gitignore），默认是 `local-dev-password`，可自行修改。数据落在本地模拟的 KV 里，不碰线上。

```bash
pnpm test
pnpm build
pnpm test:e2e
```

## 部署到 Cloudflare

```bash
npx wrangler login
npx wrangler kv namespace create WORKSPACE   # 把返回的 id 填进 wrangler.jsonc
npx wrangler secret put SITE_PASSWORD        # 站点访问密码
npx wrangler secret put AUTH_SECRET          # 登录 Cookie 的签名密钥，随便一串长随机字符
pnpm build && npx wrangler deploy
```

`wrangler.jsonc` 里已经绑定：

- 自定义域名 `crm.seanwan.top`（该域名需在同一个 Cloudflare 账号下）
- 静态资源目录 `dist`，Worker 优先处理所有请求
- KV 命名空间 `WORKSPACE`：整份档案存在 key `workspace`，附件存在 `att:<文件名>`
- `workers_dev = false`，没有不受密码门保护的旁路域名

## 访问与数据

- 所有页面和接口都要求密码；登录状态是 30 天有效的 `HttpOnly` Cookie，由 Worker 用 HMAC 签名
- 同一 IP 连续输错 10 次会锁 10 分钟
- 未登录访问页面会跳转到 `/login`，访问 `/api/*` 返回 401
- 设置页可以"退出登录"（清除 Cookie）
- 数据只存在你自己的 Cloudflare 账户里：档案 JSON 在 KV `workspace`，附件在 KV `att:*`
- 修改先写浏览器本机缓存，再在 2 分钟内自动同步云端；页面隐藏或关闭时也会立即补一次
- 完整备份仍可在设置页导出为 JSON + 附件 ZIP

## 数据与行为

- 关系层级：命友、密友、好友、认识的人、弱连接。
- 命友、密友、好友默认显示完整档案列；认识的人和弱连接默认只显示姓名。
- 非人脉"引用人物"不会进入归档表，可作为共同认识的人保留，之后可升级为联系人。
- 删除人物进入 30 天回收站；完整备份导出为 JSON + 附件 ZIP。
- 联系周期从未设置。只有用户为某个人填写周期后，才计算"宜联系"状态。
- 重要日期支持公历、农历和闰月；应用按上海本地日期计算提醒，不发送外部通知。

## 目录

- `worker/index.js`：密码门、登录页与数据 API。
- `wrangler.jsonc`：Worker、KV、静态资源与域名绑定。
- `src/domain`：类型、校验、搜索、关系教练、日期与 CSV 规则。
- `src/data`：Cloudflare / 本地仓库、演示数据。
- `src/features`：归档表、人物卡、客户模块与设置工作流。
- `.github/workflows/ci.yml`：lint、测试与构建检查。
