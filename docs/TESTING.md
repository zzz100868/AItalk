# 赛博聊机 · 测试与验收

**状态**：当前验证基线（2026-07）
**适用范围**：后端主服务、语音网关、数据库迁移、后端/前端联调契约
**上游文档**：[开发指南](DEVELOPMENT.md) · [后端架构与交接](architecture/后端架构.md)

当前项目没有完整自动化测试体系。本文先定义可执行的后端验证基线，避免把“代码能启动”“文档写了”误当成“功能已完成”。

## 1. 当前可用命令

在 `server/` 下执行：

| 命令 | 类型 | 说明 |
|---|---|---|
| `npm run build` | 编译检查 | NestJS 主服务 TypeScript 编译 |
| `npm run build:voice` | 编译检查 | `server/voice-gateway/` TypeScript 编译 |
| `npx prisma generate` | Prisma | 生成 Prisma Client |
| `npx prisma migrate dev` | DB | 本地开发库建表/迁移 |
| `npm run start:dev` | 本地服务 | HTTP API，默认 `http://localhost:3000/api` |
| `npm run start:voice` | 本地服务 | WebSocket 语音网关，默认 `ws://localhost:3001/ws/voice` |
| `npm run smoke:tts` | 外部服务 smoke | TTS 配置存在时验证语音合成链路 |

不要用仓库根目录的 `npm test` 作为完成标准；它当前是占位失败脚本。

## 2. 后端任务完成门槛

普通后端代码变更至少满足：

```bash
cd server
npm run build
npm run build:voice
```

涉及 Prisma schema 或 migrations 时追加：

```bash
cd server
npx prisma generate
npx prisma migrate dev
```

涉及 HTTP API 时追加最小手动验收：

```bash
curl http://localhost:3000/api/health
```

需要鉴权的接口先通过登录拿 token：

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/wx-login \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"dev-code\"}" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")
```

然后访问目标接口：

```bash
curl http://localhost:3000/api/me -H "Authorization: Bearer $TOKEN"
```

Windows PowerShell 可改用：

```powershell
$login = Invoke-RestMethod -Method Post http://localhost:3000/api/auth/wx-login `
  -ContentType 'application/json' `
  -Body '{"code":"dev-code"}'
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod http://localhost:3000/api/me -Headers $headers
```

## 3. 模块验收重点

| 模块 | 后端验收重点 | 备注 |
|---|---|---|
| Auth | 真实微信 openid/unionid、JWT payload、实名状态口径 | 当前仍是 mock openid |
| Profile | `/me`、`/me/photos`、`/users/:id/home` 字段与前端一致 | 用户主页参数需要和前端定名 |
| Memory | chat 写入、LLM fallback、insights update/delete、archive 来源 | 文字和语音画像逻辑需后续收敛 |
| Match | weekly round、pairing、文案 fallback、feedback 写入 | 需要至少 2 个有画像用户才能完整验收 |
| Notifications | 列表、未读数、read-all、clear、匹配/支付事件写入 | 订阅消息推送是 best-effort |
| Payment | create-order、mock 模式、微信回调验签、权益解锁 | 多步写入应补事务或幂等保护 |
| Voice Gateway | WS 鉴权、start/audio/listen/end 事件、ASR/TTS 错误处理 | 真实 ASR/TTS 需配置火山密钥后验证 |

## 4. 语音网关验收

无 ASR/TTS 配置时：

- `npm run start:voice` 能启动。
- 小程序或 WebSocket 客户端能连接 `/ws/voice?token=<JWT>`。
- `start` 后收到 `connected` 和 mock AI 回复事件。

有 ASR/TTS 配置时：

- ASR：发送 PCM chunk 后应收到 `asr_partial` / `asr_final`。
- TTS：AI 回复应以 `ai_reply_audio` chunk 下发，最后发送 `ai_turn_end`。
- Barge-in：AI 播放时用户说话，应发送 interrupted `ai_turn_end` 并进入用户语音识别。
- 超时：ASR/TTS URL 不可达时，10 秒左右应有错误，不应挂死会话。

## 5. 支付与通知验收

无微信商户号时：

- `POST /api/pay/create-order` 应创建本地订单并返回 `wxPayParams: null`。
- 前端可进入 mock 解锁路径，但这不代表真实支付已通过。

有微信商户号时：

- 下单返回 JSAPI 支付参数。
- 微信回调验签通过。
- 订单状态更新为 `paid`。
- 创建 `Entitlement`。
- 对应 `MatchResult.unlockedByA/B` 更新。
- 写入通知。

以上多步写入后续应放入事务或幂等流程。

## 6. 文档验收

后端文档变更完成前，检查：

- 新增文档已登记到 `docs/README.md`。
- API 字段变更已同步到 `docs/api/<module>.md`。
- 架构边界或风险变更已同步到 `docs/architecture/后端架构.md` 或 ADR。
- 进度状态变更只写入 `docs/DEV_PROGRESS.md`，不要让 `CODE_AUDIT.md` 变成第二份进度表。

## 7. 已知测试缺口

- 无单元测试框架。
- 无端到端测试脚本。
- 无 CI 配置可复现后端验证链。
- 语音真实链路依赖火山 ASR/TTS 配置和微信开发者工具/真机验证。
- 支付和订阅消息依赖微信商户号、小程序后台模板和公网回调地址。
