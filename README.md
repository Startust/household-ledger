# Home Ledger · NestJS + PWA

两位家庭成员共用一个 USD Checking/debit 账户：共享交易分类、确认状态、备注、月度统计和每日汇总。英文 PWA 和 NestJS 使用同源部署，可在桌面浏览器查看，也可添加到 iPhone 主屏幕。

线上入口：[Home Ledger](https://home-ledger.hoshikuzu.io/)，源码：[Startust/household-ledger](https://github.com/Startust/household-ledger)（私有）。
本地演示：[Home Ledger](http://127.0.0.1:8765/)，接口文档：[Swagger](http://127.0.0.1:8765/api/docs)。
正式环境使用独立空账本和 `yihui` 账号；本地仍为 6 笔模拟交易。真实 BOA 授权、iPhone 真机安装尚未验证。

Overview 的 **Export** 导出所选月份；Transactions 的 **Export** 导出当前搜索/筛选下的全部交易，包含所有分页。
可选 CSV（Excel/Numbers 可打开）或 PDF（汇总、明细、备注、页码）。Pending 在明细中标识，
PDF 汇总仅计入已入账交易并排除账户转账。单次最多 5,000 笔，超出会提示缩小范围，不会截断。

## 技术栈

- Node.js **24.22.1 LTS**、NestJS **12.3.3**、TypeScript **6.0.3**，原生 ESM。
- React **19.3.1**、Vite **8.3.6**、vite-plugin-pwa **2.0.0**；温暖纸色、英文短标签、无衬线等宽金额。
- Prisma **7.10.1**、PostgreSQL **18.6**；本地和 Railway 使用相同数据库。
- PostgreSQL 存储会话、同步任务及每日汇总；一个 Web 服务和一个 worker，无需 Redis。
- PDFKit **0.20.2** 生成 PDF，内嵌 Noto Sans CJK 子集；字体及 OFL 许可证随容器打包，无需在线字体服务。
- Argon2id 密码、HttpOnly 会话 cookie、CSRF、AES-256-GCM 银行 token 加密。
- 依赖固定具体版本并提交 `package-lock.json`；Node/Postgres 镜像按摘要固定。

版本在 2026-11-05 核查。Prisma 的 latest 标签当时指向 8.0 RC，因此选稳定 7.10.1；
Swagger 的 TypeScript peer 范围为 5/6，因此选 6.0.3。遵循稳定版本及兼容性约束。

## 本地启动

安装 Node.js 24.22.1 和 Docker Desktop。在 Windows PowerShell 执行：

```powershell
cd C:\Users\yihui\Documents\Playground\household-ledger
.\scripts\setup.ps1 -Demo
npm start
```

脚本安装锁定依赖、生成随机密钥、启动本机 PostgreSQL、迁移及编译。
`-Demo` 仅用于首次空数据库，创建 6 笔模拟交易；已有数据时去掉这个参数。
Postgres 仅监听 `127.0.0.1:55441`，数据在持久化 Docker volume 中。
已有本地数据和编译产物时直接 `npm start`。

打开 [Home Ledger](http://127.0.0.1:8765/)，使用 `demo1` 或 `demo2` 登录，密码均为 `LocalDemo!2026`。
这些账号仅用于本地演示。两个成员共享分类、备注和确认状态，汇总已读状态各自独立。
Settings → Change password 可验证旧密码后更改密码，并撤销该账号所有设备的会话。

另一终端运行：

```powershell
npm run worker
# 或只执行一个周期：
npm run worker:once
```

worker 每 30 秒处理同步任务和到点的每日汇总。模拟账户不会请求银行。
本次已启动本地 NestJS Web，PID 在 `.local/server.pid`，日志在 `.local/nestjs-web*.log`。
停止这个 Web 可执行 `scripts/stop-local.ps1`。
常驻 worker 尚未启动，需要手动执行上面的命令；单次运行已验证。重启电脑后需重新启动服务。

macOS/Linux 的等效步骤：

```sh
npm ci
node scripts/init-local.mjs
docker compose up -d --wait postgres
npm run db:migrate
npm run build
npm run seed:demo
npm start
```

修改 TypeScript 后执行 `npm run build` 并重启；开发时可分别运行
`npm run build:watch` 和 `npm run start:dev`。
前端热更新用 `npm run dev:client`，访问 http://localhost:5173；Vite 将 `/api` 代理到本地 NestJS。
完整生产预览仍是 8765。构建后刷新页面，若出现 Update & reopen，保存当前编辑后点击更新。

## 创建真实账本

将 `DATABASE_URL` 指向独立的空数据库，再执行以下命令。
演示账本拒绝绑定真实银行；保留演示库即可，无需删除。

```sh
npm run db:migrate
npm run cli -- create-household your_username
npm run cli -- add-member <household-uuid> spouse_username
npm run cli -- change-password your_username
```

密码在交互终端隐藏输入，不接受密码命令行参数。最多两位成员，无公开注册。
重置密码会撤销该成员全部会话。NestJS 版使用 CLI 运维，没有 Django admin。

## API 和金额规则

完整协议见 [API.md](docs/API.md)，Swagger 的机器可读规范在 `/api/docs-json`。
网页通过同源部署或开发代理访问 `/api`；当前不开放跨域 CORS。

- 金额是整数美分：`1234` 表示扣款 $12.34，`-1234` 表示入账 $12.34。
- `flow` 为 expense / income / transfer / refund；退款冲减消费，转账不计消费。
- 月统计依据银行入账日期，排除 pending 和 removed。银行分类建议与人工分类分开。
- 人工 PATCH 必须带刚读到的 `version`，并发修改返回 409。
- pending 变为 posted 时保留人工分类和备注；金额或名称变化会取消已确认状态。
- 银行 token 使用独立 `BANK_TOKEN_KEY` 加密，接口不暴露 token。
  数据库备份和加密密钥要分别保管；不能直接更换此密钥。

## Plaid 与每日汇总

服务端包含 Link token、public token 交换、选定唯一 USD Checking 账户、重新授权、
签名 webhook、分页增量同步、断连状态和重试。PWA Settings 已实现 Link、账户选择和 `/oauth` 返回页；
真实 BOA 授权需要账户持有人在官方流程完成，不收集银行密码。

Plaid 凭据通过环境变量配置，初次使用 sandbox。
`PLAID_WEBHOOK_URL=https://<domain>/webhooks/plaid`；
`PLAID_REDIRECT_URI` 对应后续客户端的已登记 OAuth 返回页。
选择错误账户后可继续选择，不需再次交换 token。
webhook 校验 ES256、JWK、5 分钟时效和原始请求体 SHA-256。
所有同步页面及 cursor 一起提交；失败回滚，指数退避最多 6 小时，并每 6 小时补拉缓存。

默认按 America/New_York 每晚 21 点生成一次**通知收件箱**，支持时区、小时和开关。
包含上次汇总后新同步的已入账交易、净支出、待确认数量及银行状态。
初始历史导入不作为新提醒；两人有独立已读状态。
worker 离线时无法准时生成，恢复后在当天设定时间之后补跑。当前没有邮件或手机推送。

## 验证与部署

```sh
npm test
npm run format:check
npm run smoke
docker build -t household-ledger:nestjs .
```

`npm test` 使用独立的 `TEST_DATABASE_URL`，数据库名必须以 `_test` 结尾，并在每个用例前清空该测试库中的账本数据。
不要填生产地址。本机默认测试库是 `ledger_nest_test`。
`npm run smoke` 只访问本地 demo，验证双人登录、共享编辑、冲突、统计和 Swagger，并恢复测试修改的备注。

详见 [验证记录](docs/VERIFICATION.md)、[Railway 部署](docs/RAILWAY.md)、
[模块地图](docs/SYSTEM_MAP.md)和 [NestJS 决策](docs/adr/0002-nestjs.md)。

## 旧实现归档

本次替换前，旧数据库仅有一个模拟账户和六笔演示交易，无真实银行连接。
旧代码及一致性 SQLite 快照在忽略目录 `.local/django-v1-backup.zip`、
`.local/django-v1.sqlite3` 和 `.local/django-v1-source/`；原 `db.sqlite3` 保留。
NestJS 使用全新的 PostgreSQL 演示库，不读取旧 SQLite，也没有实现通用历史数据导入。
旧 Python 虚拟环境仅作为本地遗留文件保留，不参与启动或容器构建。

## PWA 与 iPhone

已实现月度概览、待确认筛选、交易编辑和历史、每日汇总、分类与家庭设置、登录/退出/改密码。
离线只缓存应用代码和图标，不缓存账户/交易 API，不支持离线提交。
冷启动断网时显示登录页和重连提示，不显示上次账户的账目。

用 iPhone Safari 打开上面的线上 HTTPS 地址并登录，然后 Share → Add to Home Screen。
若系统显示 Open as Web App，启用后点 Add。应用内 Settings → Install app 也有说明。
本地 127.0.0.1 地址仅属于这台电脑，不能直接在 iPhone 打开。
参考：[Apple 官方安装说明](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios)。

每日汇总目前只在 Updates 内显示；系统推送订阅和发送尚未实现。
Plaid Link 需要配置密钥及 `PLAID_REDIRECT_URI=https://<domain>/oauth`，并在 Plaid 控制台登记。
实际银行授权由账户持有人完成。参考：[Plaid Web Link](https://plaid.com/docs/link/web/)。
