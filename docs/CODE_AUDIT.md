# 赛博聊机 · 代码审计记录

**审计日期**：2026-07-12
**基线**：`backend` @ `ab42e83`
**范围**：代码结构、文档、配置、Git 状态和可执行验证
**说明**：本文件记录代码风险及证据；进度状态只在 [DEV_PROGRESS.md](DEV_PROGRESS.md) 维护。

## 1. 审计结论

仓库已经从纯前端原型发展为“小程序 + NestJS 主服务 + 独立语音网关”的 MVP 代码库。模块边界基本可辨认，主服务和语音网关可编译，语音 coverage 纯逻辑测试通过；当前主要问题不再是“有没有代码”，而是身份、数据库、外部服务、前后端数据权威和生产工程没有形成可重复的验收链。

## 2. 当前问题

| 优先级 | 问题 | 代码证据 | 建议处理 |
|---|---|---|---|
| P0 | 登录仍生成 `mock_openid_${code}` | `server/src/auth/auth.service.ts` | 接微信 code 换取身份，明确 unionid/实名状态 |
| P0 | JWT 未配置时使用 `dev-secret` | `server/src/app.module.ts`、`server/voice-gateway/config.ts` | 生产启动时强制校验 |
| P0 | 最新迁移未在本次审计中执行 | `server/prisma/migrations/20260712090000_*` | 对明确开发库执行并做数据回归 |
| P0 | 支付成功多步写入无事务 | `server/src/pay/pay.service.ts` | 用 Prisma transaction 与唯一约束保证幂等 |
| P1 | 订阅授权接口只回显，不保存 | `server/src/notifications/notifications.controller.ts` | 建模授权/消费状态后再称为推送闭环 |
| P1 | 照片墙仍保存本地文件 | `pages/profile/profile.js` | 确定上传服务并接 `/me/photos` |
| P1 | 洞察编辑/删除不调用现有 API | `pages/memory/memory.js` | 写操作以后端结果为准，失败可见 |
| P1 | 用户主页 `author` 实际按 user id 查询 | `pkg-social/userHome/userHome.js`、`profile.service.ts` | 契约统一为 `userId` 或提供查询映射 |
| P1 | API host 硬编码局域网 IP | `utils/api.js` | 按开发/体验/生产环境配置 |
| P1 | 根 TypeScript 工程不可通过检查 | `stores/store.ts`、`utils/request.ts`、`tsconfig.json` | 补微信类型并修复真实类型错误，加入脚本 |
| P1 | 无 HTTP/DB/WS 集成测试和 CI | `server/package.json`、仓库配置 | 建立最小集成测试和干净环境流水线 |
| P2 | LLM 调用无显式 timeout/retry | `server/src/llm/llm.service.ts` | 增加超时、可观测错误和有限重试 |
| P2 | Controller 使用内联类型，运行时校验有限 | `server/src/*/*.controller.ts` | 对外输入改为带验证装饰器的 DTO |
| P2 | Prisma 初始连接失败仍允许服务启动 | `server/src/prisma/prisma.service.ts` | 区分健康、就绪和降级策略，避免误报可用 |
| P2 | Memory 分页按 `createdAt` 排序却用 id 游标比较 | `server/src/memory/memory.service.ts` | 使用复合/时间游标并补集成测试 |
| P2 | Mock 支付在前端直接显示已解锁 | `pages/match/match.js` | 明确标成开发模拟，禁止进入生产构建 |
| P2 | 根 `package.json` 描述仍包含已移除的“情绪广场”，`npm test` 为占位失败 | `package.json` | 后续配置治理时修正元数据和检查脚本 |

## 3. 架构观察

- NestJS 当前是 `Controller -> Service -> PrismaService`，适合 MVP；支付、匹配等跨表流程已经需要显式事务边界。
- 语音网关直接访问 Prisma 并维护高复杂度会话状态。coverage/probe_card 已抽成纯逻辑模块，这是当前最有测试基础的部分。
- Memory 文字画像与 Voice 语音画像分别合并 `ProfileDocument.data`，规则和数据形状可能继续漂移，应抽取共享画像合并模块。
- `data/mockData.js` 对前端开发有价值，但不同 API 的 fallback 语义不一致；读取回落、写入失败和模拟成功应分开处理。
- 目标态文档曾包含 Redis、Bull、pgvector、Docker 和 CI；当前代码没有这些实现，后续文档必须明确标记为规划。

## 4. 验证结果

| 检查 | 结果 |
|---|---|
| `server: npm run build` | 通过 |
| `server: npm run test:voice` | 通过，8/8 |
| `server: npx prisma validate` | 通过 |
| 23 个前端 JS 文件 `node --check` | 通过 |
| 根 TypeScript `tsc --noEmit` | 失败：微信全局类型缺失及多处类型错误 |
| 数据库迁移 | 未执行 |
| 真实语音/支付/订阅消息 | 未执行，缺外部环境 |

完整完成标准见 [测试与验收](TESTING.md)。

## 5. 已关闭的历史问题

- `data/docs/` 旧文档树已删除，`docs/README.md` 是唯一入口。
- Phase 3 旧审计中的 ASR 结束帧、状态机清理、PrismaClient 单例、TTS 超时/复用、barge-in 和前端 chunk 播放已有对应代码。
- 语音 coverage/probe_card 规则已加入 8 个自动化测试。

这些项目表示对应代码修复已存在，不代表真实 ASR/TTS/LLM 整通已经验收。
