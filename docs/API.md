# API v2 · NestJS

全部账本接口使用登录者的 household；客户端不能传 household 切换范围。
USD 整数美分，正数扣款、负数入账。日期 YYYY-MM-DD，时间戳 ISO 8601。
规范及请求 DTO：`/api/docs-json`；交互文档：`/api/docs`。

## 会话登录

1. GET `/api/auth/csrf` 得到 JSON `{csrfToken}`，同时接受 `ledger.sid` cookie。
2. POST `/api/auth/login`，JSON `{"username":"demo1","password":"LocalDemo!2026"}`，
   使用此前 cookie 和 `X-CSRFToken`。成功返回 201、用户基本信息和新的 csrfToken；会话 ID 会轮换。
3. 后续请求携带 cookie。所有写请求使用新的 `X-CSRFToken`。
   token 遗失可再次 GET csrf。浏览器 fetch 使用 `credentials: 'same-origin'`。
4. POST `/api/auth/logout` 撤销当前会话，返回 201。

CSRF token 在 JSON 中，不从旧版 csrftoken cookie 获取。
登录也校验 CSRF。生产 cookie 为 Secure/HttpOnly/SameSite=Lax，期限 7 天。
Swagger 自动完成 CSRF 步骤；仍需手动调用 login。未提供公开注册、Basic Auth 或长期客户端 token。

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/auth/me` | 当前用户 |
| POST | `/api/auth/password` | current_password/new_password；验证旧密码并撤销本人所有会话，200 |
| GET/PATCH | `/api/household` | 家庭名、时区、提醒小时/开关；GET 含成员 |
| GET/POST | `/api/categories` | 查询/创建分类 |
| GET/PATCH | `/api/categories/{id}` | 修改名称或 active，不物理删除 |
| GET | `/api/transactions` | 50 条分页；page/month/search/pending/reviewed/uncategorized |
| GET | `/api/exports/transactions` | format=csv/pdf；month/search/pending/reviewed/uncategorized，不接受 page |
| GET/PATCH | `/api/transactions/{uuid}` | 详情及版本控制的人工编辑 |
| GET | `/api/transactions/{uuid}/history` | 最近 100 条人工编辑 |
| GET | `/api/summary?month=2026-11` | 月度正式入账统计，默认家庭时区本月 |
| GET | `/api/bank` | 脱敏连接与同步状态 |
| POST | `/api/bank/link-token` | 初始或 update mode Link token，200 |
| POST | `/api/bank/exchange` | public_token，可带 account_id，成功 201 |
| GET | `/api/bank/accounts` | 可选的 USD Checking 账户 |
| POST | `/api/bank/select-account` | 选定唯一账户，200 |
| POST | `/api/bank/sync` | 排入同步队列，202 |
| POST | `/api/bank/reauth-complete` | 验证原账户并请求同步，202 |
| GET | `/api/digests`、`/api/digests/{id}` | 分页汇总及本人已读状态 |
| POST | `/api/digests/{id}/read` | 幂等标记本人已读，200 |
| POST | `/webhooks/plaid` | 公开签名回调，无会话/CSRF，必须验 Plaid 签名 |
| GET | `/health/live`、`/health/ready` | 存活/数据库连接，非银行/worker 健康检查 |

列表一般为 `{count,next,previous,results}`；bank/accounts 与 history 返回数组。
pending/reviewed/uncategorized 查询值为字符串 true/false。

## 导出

`GET /api/exports/transactions?format=pdf&month=2026-11` 返回附件；format 默认 csv。
省略 month 表示全部日期，范围与交易列表使用同一个筛选函数；不接受客户端 household 或 page。
查询在 Repeatable Read 快照中获取家庭账户信息和所有匹配交易，最多 5,000 笔，超出返回 422。
没有匹配项时仍返回合法的表头 CSV / 单页空结果 PDF。

CSV 为 UTF-8 BOM、CRLF、标准引号转义；文本公式前缀加单引号，金额为精确十进制美元。
字段含日期、商户、原始描述、支出/入账、类型、分类、入账/确认状态、确认人、备注和交易 ID。
PDF 包含筛选范围、账户尾号、匹配已入账交易汇总、完整明细/备注、生成时间和页码。
Pending 和 transfer 保留在明细，但不计入净支出汇总。PDF 内嵌字体支持中文备注。
异常超长单条内容无法完整容纳一页时返回 422 并提示使用 CSV，不截断备注。
附件只在内存中生成；会话鉴权和 `Cache-Control: no-store` 与其他私有接口一致，不写静态目录。

## 编辑和统计

交易 PATCH 示例：

```json
{"version":1,"category":2,"reviewed":true,"note":"周末家庭采购"}
```

只允许 category（可 null）、flow、reviewed、note。version 必填。
不能改银行金额、日期或账户。分类与确认分开；人工 flow 需符合金额方向。
停用分类保留已有引用，不能再新分配；类别名称不区分大小写去重。

提醒设置示例：

```json
{"timezone":"America/New_York","digest_hour":21,"digest_enabled":true}
```

月度输出含 expense_cents（毛支出）、refund_cents（正值退款额）、net_spend_cents、
income_cents、transfer_count 和 categories 净支出分组。
pending/removed 排除；unreviewed_count 是全部已入账待确认数量，不限该月份。
列表默认含 pending、排除 removed；单条 removed 仍可读，不能编辑。

## 错误和后续客户端

400 输入无效，403 未登录/CSRF/来源拒绝，404 无记录或不属于家庭，
409 版本或唯一性冲突，429 登录尝试过多，503 银行服务不可用/未配置/需重新授权。
webhook 签名不合法返回 401。503 code 是经过限制的供应商错误代码，不返回原始响应和凭据。
登录按用户名 10 次/15 分钟、IP 100 次/15 分钟限制，状态存储在 PostgreSQL。

后续客户端需实现 Plaid Link/OAuth、登录、待确认工作流和通知收件箱。
会话 cookie 可以供受控客户端使用；原生端若需要长期 token/刷新流程需单独增加设计，
不应将服务端密钥交给客户端。

PWA 位于 `/`；OAuth 返回页为 `/oauth`。所有 `/api` 响应带 `Cache-Control: no-store`。
改密码成功返回 `{changed:true,login_required:true}`，需重新登录；新密码须 12–256 字符，不能纯数字或含用户名。
客户端只提交实际修改的交易字段；保留未改变的停用分类时不传 category，允许修改备注/确认。
