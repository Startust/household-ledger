# Railway 部署准备 · NestJS

本轮验证本地生产容器，没有创建 Railway 项目或远程部署。
已有连接器需重新认证，正式部署时再连接。

## 服务与变量

同一项目/环境建立 PostgreSQL、Web 和 Worker。代码根目录为 household-ledger。

- Web 用 `railway.json`：Dockerfile 构建，pre-deploy 执行 `npm run db:migrate`，
  镜像同时构建并包含 PWA，`/` 为应用、`/api/docs` 为 Swagger；默认启动 `node dist/src/main.js`，读取 Railway 的 PORT，健康检查 `/health/ready`。
- Worker 用 `railway.worker.json`：同镜像，`node dist/src/worker.js`，一个副本。
  不配置公开域名、HTTP healthcheck 或休眠。
- 首次先完成 Web 迁移，再启动 worker；后续使用兼容旧版本的数据库迁移。

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

在连接到生产环境的交互终端执行：

```sh
npm run cli -- create-household your_username
npm run cli -- add-member <household-uuid> spouse_username
```

密码隐藏输入，不能用参数传递。不要运行 seed-demo（生产会拒绝）。
PWA Settings 已提供 Link/选账户/重连，`/oauth` 可恢复当前授权流程。
官方 OAuth 需由账户持有人完成；尚未用真实 BOA 账户验证。

上线检查：ready 正常、匿名账本 403、Secure/HttpOnly cookie、worker 持续运行、
webhook 验签、增量同步去重、银行状态和汇总更新。
健康检查不代表 worker 或银行连接正常。当前通知只是收件箱，不会发送手机推送/邮件。

数据库私网连接、备份与恢复需在部署时配置。BANK_TOKEN_KEY 不能直接替换，
更换密钥需要重新加密已有银行 token。Web/worker 使用同一代码版本和密钥。

官方参考：[NestJS 部署](https://docs.nestjs.com/deployment)、
[Railway 配置](https://docs.railway.com/config-as-code/reference)、
[Prisma 部署迁移](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)。
