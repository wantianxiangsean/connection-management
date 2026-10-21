# 见微 · 人脉全息档案

一个单用户、桌面优先、适配手机的人脉档案系统。它把四类关系、人物近况、家庭与职业资料、共同认识的人、重要日期和谈过的细节放在同一张可检索的档案里。

## 本地运行

```bash
pnpm install
pnpm dev
```

未配置 Supabase 时，应用会自动进入浏览器本地预览模式，并载入一组演示档案。该模式用于查看和测试，不提供多设备同步。正式使用必须连接 Supabase。

生产构建会使用 GitHub 私有数据仓库模式：访问页面时需输入有权访问 `wantianxiangsean/connection-management-data` 的 GitHub Token。Token 仅保存在当前浏览器中，联系人档案同步到该私有仓库的 `workspace.json`，不会写入公开的 GitHub Pages 代码。开发模式仍使用本地演示仓库，便于测试。

```bash
pnpm test
pnpm build
pnpm test:e2e
```

## Supabase 配置

1. 新建 Supabase 项目，在 SQL Editor 中执行 `supabase/migrations/202610200001_initial_schema.sql`。
2. 在 Authentication 中启用 Phone provider 和手机号加密码登录。
3. 关闭公开注册、Phone signup、短信 OTP 与手机验证；本项目不配置短信服务商。
4. 在 Authentication → Users 中预创建唯一所有者账号。手机号请填写带国家码的格式，例如 `+8613800138000`，并设置密码。密码只由 Supabase 以哈希形式保存。
5. 把项目 URL 和 anon/publishable key 写入 `.env`：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-key
```

服务端迁移会创建 `connection-attachments` 私有 bucket、全部业务表、行级权限和工作区读取/保存函数。不要在前端或 GitHub 仓库中放入 service-role key。

登录框中的“187手机”和“leeds”只是界面占位提示，不是应用凭据。真实手机号和密码只在 Supabase 管理端配置。由于不使用短信，遗忘密码时在 Supabase 管理端重置。

## GitHub Pages 发布

项目使用 Hash Router 和 `base: './'`，可直接部署到仓库子路径。推送 `main` 后，`.github/workflows/pages.yml` 会测试、构建并发布 `dist/`。

在 GitHub 仓库中完成以下设置：

1. Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
2. Settings → Secrets and variables → Actions → Variables 添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. 推送 `main`，等待 Pages workflow 完成。

如果未设置上述变量，页面仍可构建，但会以本地预览模式运行，无法在线同步。

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
- `src/features`：登录、归档表、人物卡、设置工作流。
- `supabase/migrations`：数据库、RLS、Storage 与 RPC。
- `.github/workflows/pages.yml`：GitHub Pages 自动发布。
