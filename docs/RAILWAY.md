# Railway 部署 · NestJS

私有源码仓库：`Startust/household-ledger`，分支 `main`。
Railway 项目：`household-ledger`，生产环境与本地演示数据分开。
应用：https://home-ledger.hoshikuzu.io
原 Railway 地址保留：https://web-production-53641.up.railway.app
项目：https://railway.com/project/cb170b23-9d1b-4ecd-8629-16635c4b1909
Environment ID: `65edffcd-17f8-4890-9e90-81d808bb1db3`。
Web: `05cee313-f284-4e71-bcd4-eb9b1fff231a`；Worker: `f117ee3d-8616-468a-9b5a-4426b6ca669d`。
Railway 插件连接过期时使用已登录 CLI；首次上线使用 CLI 5.71.0 和锁定的 IaC SDK 3.16.0。
旧 `railway.json` 配置已被新服务拒绝，改为 `.railway/railway.ts`；变量由 Railway 管理，不写进 IaC。

## 自定义域名

`home-ledger.hoshikuzu.io` 绑定 Web 服务端口 8000，由 Railway 签发和管理 HTTPS 证书。
Cloudflare 中的 `home-ledger` CNAME 指向 `jeoecxg1.up.railway.app`，代理为 DNS only、TTL Auto；
`_railway-verify.home-ledger` TXT 保留 Railway 提供的所有权验证值。
只修改此应用的两条 DNS 记录，不改变主域名或其他子域名。

Web/worker 的 `APP_ORIGIN` 均为 `https://home-ledger.hoshikuzu.io`，
`PLAID_REDIRECT_URI` 为该域名的 `/oauth`，`PLAID_WEBHOOK_URL` 为 `/webhooks/plaid`。
实际启用 Plaid 前仍需在其控制台登记新回调地址。iPhone 请从新域名添加到主屏幕；
旧域名的会话和 PWA 安装不会自动迁移，需要重新登录。

## 服务与变量

同一项目/环境建立 PostgreSQL、Web 和 Worker。代码根目录为 household-ledger。

- Web：根目录 Dockerfile 自动识别，pre-deploy 执行 `npm run db:migrate`，
  镜像同时构建并包含 PWA，`/` 为应用、`/api/docs` 为 Swagger；默认启动 `node dist/src/main.js`，读取 Railway 的 PORT，健康检查 `/health/ready`。
- Worker：同镜像，`node dist/src/worker.js`，一个副本。
  不配置公开域名、HTTP healthcheck 或休眠。
- 首次先完成 Web 迁移，再启动 worker；后续使用兼容旧版本的数据库迁移。

使用 CLI 5.71.0 或更新兼容版本，`npm ci` 安装已锁定的 IaC SDK，然后执行 `railway config plan`。
确认计划仅包含预期服务变更后 `railway config apply`。IaC 变更需要单独 plan/apply。
当前 Railway GitHub 集成无权读取私有仓库，源码通过 CLI 从已提交并推送的 Git 快照上传；
push 本身不会自动上线。后续授权此仓库后可为两个应用服务连接 main 分支，并在 IaC 中加入 GitHub source。
构建监听源码、web、prisma、字体、包锁、Dockerfile 和 TS/Prisma 配置。
数据库服务和卷也在完整 IaC 图中保留，不能从文件中随意移除。

两个应用服务共享：

| 变量 | 值 |
|---|---|
| NODE_ENV | production |
| HOST | 0.0.0.0 |
| APP_ORIGIN | https://<Web 域名>，完整 origin，无路径/尾斜杠 |
| DATABASE_URL | Railway Postgres 内部 URL 引用，选实际服务变量 |
| SESSION_SECRET | 随机至少 48 字符 |
| BANK_TOKEN_KEY | 独立随机 32 字节，base64url 编码；保管备份 |
| PLAID_ENV | 初次 sandbox；生产账本用独立数据库和 production |
| PLAID_CLIENT_ID / PLAID_SECRET | Plaid 控制台中对应环境凭据 |
| PLAID_WEBHOOK_URL | https://<Web 域名>/webhooks/plaid |
| PLAID_REDIRECT_URI | https://<Web 域名>/oauth；需在 Plaid 控制台登记 |

不要将本地 HOST=127.0.0.1、APP_ORIGIN 或 TEST_DATABASE_URL 复制到生产。
本地 POSTGRES_PASSWORD 仅服务于 compose，Railway 使用其数据库凭据。
生产启动拒绝缺失/过短会话密钥、无效银行密钥、非 PostgreSQL 和非 HTTPS origin。
生产仅应放在可信 Railway 代理之后：应用信任一跳代理的 X-Forwarded-Proto / IP。
镜像不含 .env、SQLite、.local、旧 Python 源码或测试代码；构建不需要运行时凭据。

## 初始化

首次上线已建立一个空家庭、7 个默认分类和 `yihui` 账号，无银行连接或示例交易。
初始密码仅存于本机被忽略的 `.local/production-login.txt`，没有上传 GitHub 或部署镜像。
如需增加第二位成员，在连接到生产环境的交互终端执行（不要重复创建家庭）：

```sh
npm run cli -- add-member <household-uuid> spouse_username
```

密码隐藏输入，不能用参数传递。不要运行 seed-demo（生产会拒绝）。
PWA Settings 已提供 Link/选账户/重连，`/oauth` 可恢复当前授权流程。
官方 OAuth 需由账户持有人完成；尚未用真实 BOA 账户验证。

上线检查：ready 正常、匿名账本 403、Secure/HttpOnly cookie、worker 持续运行、
webhook 验签、增量同步去重、银行状态和汇总更新。
健康检查不代表 worker 或银行连接正常。当前通知只是收件箱，不会发送手机推送/邮件。

数据库无公网 TCP 入口；worker 无公开域名。每日卷快照已启用，平台保留 6 天；尚未进行恢复演练。
Web/worker 实际部署使用 ON_FAILURE、最多 10 次重试、不休眠；这些平台默认值在 IaC 中省略以避免重复差异。
BANK_TOKEN_KEY 不能直接替换，
更换密钥需要重新加密已有银行 token。Web/worker 使用同一代码版本和密钥。

官方参考：[NestJS 部署](https://docs.nestjs.com/deployment)、
[Railway IaC 配置](https://docs.railway.com/infrastructure-as-code)、
[Prisma 部署迁移](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)。

## 后续发布

先提交并 push，再将该提交的 `git archive` 解包到临时目录，分别执行：

```sh
railway up <release-directory> --path-as-root --project cb170b23-9d1b-4ecd-8629-16635c4b1909 --environment 65edffcd-17f8-4890-9e90-81d808bb1db3 --service web --detach
railway up <release-directory> --path-as-root --project cb170b23-9d1b-4ecd-8629-16635c4b1909 --environment 65edffcd-17f8-4890-9e90-81d808bb1db3 --service worker --detach
```

首次须等 Web 迁移就绪再启动 worker。发布后检查 deployment status 和 `/health/ready`。
2026-11-05 发布应用提交 `dd50ede7f387d2f7fd8470e83fb9de788864b19e`；随后仅更新运维文档/IaC 默认值。
Plaid 尚未配置凭据，因此目前不能连接真实银行；不要把本地演示账号或数据库迁移到正式环境。
