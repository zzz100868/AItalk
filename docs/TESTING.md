# 赛博聊机 · 测试与验收

**状态**：当前验证基线（2026-07-19）
**范围**：后端主服务、语音网关、Prisma、前端静态检查和外部集成
**上游文档**：[开发指南](DEVELOPMENT.md) · [后端架构](architecture/后端架构.md)

项目当前有语音 coverage 纯逻辑测试、VoiceSession 进程内生命周期测试和专用 PostgreSQL 持久化测试，没有 HTTP/WebSocket 协议集成测试、端到端测试或 CI。完成状态必须区分“静态检查通过”“进程内测试通过”“本地集成通过”和“真实外部链路通过”。

## 1. 自动化与静态检查

在 `server/` 执行：

| 命令 | 覆盖范围 | 当前状态 |
|---|---|---|
| `npm run build` | NestJS 主服务 TypeScript 编译 | 可执行 |
| `npm run build:voice` | 语音网关 TypeScript 编译 | 可执行 |
| `npm run test:voice` | coverage/probe_card 规则与 VoiceSession 生命周期 | 17 个测试 |
| `npm run test:voice:persistence` | Voice 回合事务、回滚、纠正和结束持久化 | 5 个 PostgreSQL 测试；要求 `VOICE_TEST_DATABASE_URL` |
| `npx prisma validate` | Prisma schema 结构 | 可执行 |
| `npx prisma generate` | Prisma Client 生成 | 可执行 |
| `node --check <file.js>` | 小程序 JavaScript 语法 | 可执行 |

根目录 `npm test` 是固定失败的占位脚本。根 `tsconfig.json` 当前不能通过类型检查，详见 [代码审计](CODE_AUDIT.md)。

## 2. 本次审计证据

2026-07-19 在 `backend` 分支、V-001 实现提交 `cda751d` 上执行验收；其余项目沿用 2026-07-12 文档审计基线：

- `npm run build`：通过。
- `npm run test:voice`：通过，17/17（coverage 8 项、VoiceSession 生命周期 9 项）。
- `npm run build:voice && node --test dist-voice/session.test.js`：通过，V-001 专项 9/9。
- `prisma migrate deploy`：在隔离的 `aitalk_voice_test` 数据库通过，三组迁移无待应用项。
- `npm run test:voice:persistence`：通过，V-002 专项 5/5；未使用项目 `.env` 指向的数据库。
- `npx prisma validate`：通过。
- 对仓库 23 个前端 `.js` 文件执行 `node --check`：通过。
- 使用后端 TypeScript 编译器检查根 `tsconfig.json`：失败，存在微信全局类型缺失和实际类型错误。
- 未执行 `prisma migrate dev/deploy`：本次审计没有被授权修改数据库，也没有确认目标数据库。
- 未执行真实 LLM/ASR/TTS、微信支付或订阅消息验收：需要有效外部凭据、微信开发者工具/真机和公网回调。

## 3. 后端变更最低门槛

```bash
cd server
npm run build
npm run test:voice
npx prisma validate
```

涉及 Prisma schema 或 migration 时追加：

```bash
npx prisma generate
# 仅对明确的本地开发库
npx prisma migrate dev
```

涉及 HTTP API 时，启动主服务后至少验证：

```bash
curl http://localhost:3000/api/health
```

鉴权接口先调用 `POST /api/auth/wx-login` 获取 token。注意当前登录生成 mock openid，因此只能证明本地鉴权链路，不代表真实微信身份已通过。

## 4. 模块验收矩阵

| 模块 | 可在仓库内验证 | 仍需集成/外部验证 |
|---|---|---|
| Auth | 编译、JWT guard、空 code 错误 | `jscode2session`、openid/unionid、实名口径 |
| Profile | Controller/Service 编译 | DB CRUD、照片上传方案、前端数据权威来源 |
| Memory | LLM fallback 代码路径 | DB 历史分页、画像异步抽取、前端编辑/删除同步 |
| Match | 匹配引擎和定时任务编译 | 至少两个真实画像用户、重复轮次和通知一致性 |
| Notifications | CRUD 代码路径 | 订阅授权持久化、模板和真机推送 |
| Payment | 下单/回调代码编译 | 微信下单、回调原文验签、幂等与事务 |
| Voice | coverage 8 项、生命周期 9 项、PostgreSQL 持久化 5 项、网关编译 | WS 协议集成、目标环境迁移、15 分钟整通、真机 barge-in、真实 ASR/TTS/LLM |

## 5. 语音真实链路验收

满足以下条件后才能把语音状态标为“已验收”：

1. 对目标数据库执行最新迁移，确认 `voice_coverage_states` 和 `voice_evidence` 存在。
2. 使用真实 JWT 连接 `/ws/voice?token=<JWT>`。
3. 验证 `start`、`listen_ready`、`audio_chunk`、`end` 以及所有服务端事件。
4. 验证 TTS chunk 播放、用户插话、ASR 结束判断和错误超时。
5. 完成一通 15 分钟流程，检查 coverage、evidence、session end reason 和画像合并。
6. 中途断线后重连，确认创建新 session 并续采缺失维度。

`npm run test:voice` 覆盖纯规则逻辑和使用 fake provider/可控时钟的进程内生命周期，不包含真实 WebSocket、数据库或外部 provider，不能替代上述验收。

`npm run test:voice:persistence` 会清理专用库中的 Voice 测试数据。入口要求 `VOICE_TEST_DATABASE_URL`，并拒绝数据库名不含 `test` 的地址；执行前仍应人工确认它不是共享开发库或生产库。

## 6. 支付与通知验收

真实支付至少验证：下单参数、`wx.requestPayment`、微信回调签名原文、资源解密、重复回调幂等、订单/权益/匹配解锁/通知的一致性。当前这些写入不在单一事务中。

订阅消息至少验证：前端模板 ID、授权结果、授权消费策略、后端持久化、access token、正式环境 `miniprogram_state` 和真机接收。当前 `POST /api/notifications/subscribe` 只回显成功，不持久化授权。

## 7. 数据库与部署验收

- `prisma migrate deploy` 在空库和已有库都可重复执行。
- HTTP 主服务和语音网关使用同一 schema 与 `JWT_SECRET`。
- 生产环境不使用 `dev-secret`，不提交 `.env`、证书或私钥。
- HTTPS/WSS、域名白名单、健康检查、日志、告警、备份和回滚均有证据。
- CI 能从干净环境执行依赖安装、Prisma 生成、构建和测试。

## 8. 当前测试缺口

- 无 Controller/Service 单元测试。
- 只有 Voice 模块具备专用 PostgreSQL 集成测试；其他模块仍无数据库测试和统一测试数据工厂。
- 无 WebSocket 协议集成测试。
- 无小程序自动化或端到端测试。
- 无支付、订阅消息和火山服务的可重复 sandbox 测试。
- 无 CI 配置。
- 根 TypeScript 工程未达到可检查状态。
