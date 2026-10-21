# 见微 · 人脉全息档案

一个单用户、桌面优先、适配手机的人脉档案系统。它把四类关系、人物近况、家庭与职业资料、共同认识的人、重要日期和谈过的细节放在同一张可检索的档案里。

## 本地运行

```bash
pnpm install
pnpm dev
```

开发模式未配置 Supabase 时，应用会自动进入浏览器本地预览模式，并载入一组演示档案。该模式用于查看和测试，不提供多设备同步。

生产构建固定使用 GitHub 私有数据仓库模式。页面可以直接打开，不再经过独立登录页；联系人数据保存在 `wantianxiangsean/connection-management-data` 的私有 `workspace.json` 中。首次进行云端备份或恢复时，在“设置 → 云端备份”验证有 `Contents: Read and write` 权限的 GitHub Token，并可按需勾选“在此浏览器记住”。修改会立即缓存在本机，自动备份每 2 分钟合并写入一次；手动备份可随时立即写入。Token 不会写入公开的 GitHub Pages 代码。

```bash
pnpm test
pnpm build
pnpm test:e2e
```

## Supabase 配置（可选）

开发模式如需使用 Supabase，可执行迁移并配置环境变量：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-key
```

服务端迁移会创建 `connection-attachments` 私有 bucket、全部业务表、行级权限和工作区读取/保存函数。不要在前端或 GitHub 仓库中放入 service-role key。

## GitHub Pages 发布

项目使用 Hash Router 和 `base: './'`，可直接部署到仓库子路径。推送 `main` 后，`.github/workflows/pages.yml` 会测试、构建并发布 `dist/`。

在 GitHub 仓库中完成以下设置：

1. Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
2. 推送 `main`，等待 Pages workflow 完成。

生产构建固定使用 GitHub 私有云模式，不依赖 Supabase 环境变量。

## 数据与行为

- 关系层级：命友、密友、好友、认识的人。
- 命友、密友、好友默认显示完整档案列；认识的人默认只显示姓名。
- 非人脉“引用人物”不会进入归档表，可作为共同认识的人保留，之后可升级为联系人。
- 删除人物进入 30 天回收站；完整备份导出为 JSON + 附件 ZIP。
- 联系周期从未设置。只有用户为某个人填写周期后，才计算“宜联系”状态。
- 重要日期支持公历、农历和闰月；应用按上海本地日期计算提醒，不发送外部通知。

## 目录

- `src/domain`：类型、校验、搜索、关系教练、日期与 CSV 规则。
- `src/data`：本地与 Supabase 仓库、演示数据。
- `src/features`：归档表、人物卡、设置与云端备份工作流。
- `supabase/migrations`：数据库、RLS、Storage 与 RPC。
- `.github/workflows/pages.yml`：GitHub Pages 自动发布。
