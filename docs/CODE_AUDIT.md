# 赛博聊机 · 代码通读审计记录

**日期**：2026-06-11
**范围**：微信小程序前端、`utils/`、`stores/`、NestJS 后端、Prisma schema、`server/voice-gateway/`、`docs/` 索引文档
**说明**：本文件记录代码通读时发现的实现风险、文档漂移和后续修复入口。它不替代 `DEV_PROGRESS.md` 的 Phase 任务状态；执行修复时仍以 `DEV_PROGRESS.md` 为任务推进表。

## 总览

| 优先级 | 问题 | 主要位置 | 建议归属 |
|---|---|---|---|
| P0 | 微信登录仍是 mock openid，实名状态未真正确认 | `server/src/auth/auth.service.ts` | Phase 7 上线前必须修复 |
| P0 | 语音链路仍有审计阻塞项 | `server/voice-gateway/`, `pages/index/index.js` | Phase 3 audit-fix |
| P1 | 用户主页参数与后端查询字段不一致 | `pkg-social/userHome/userHome.js`, `server/src/profile/profile.service.ts` | Phase 5 补丁 |
| P1 | 照片墙前端未真正调用照片 CRUD API | `pages/profile/profile.js`, `utils/api.js` | Phase 5 补丁 |
| P1 | 记忆洞察编辑/删除只改本地 storage，未同步后端 | `pages/memory/memory.js`, `utils/api.js` | Phase 5 补丁 |
| P1 | 前端 API host 写死到局域网 IP | `utils/api.js` | 开发配置治理 |
| P1 | 文档中部分状态已落后于当前代码 | `docs/decisions/0003-语音链路选型.md`, `docs/architecture/*.md` | 文档校准 |
| P2 | 旧文档副本已删除，文档入口收敛到 `docs/README.md` | `docs/` | 文档治理 |
| P2 | `utils/request.ts` 与实际 `utils/api.js` token 约定不一致且疑似未使用 | `utils/request.ts`, `utils/api.js` | 前端工具层整理 |

---

## 1. 微信登录仍是 mock openid

**严重程度**：P0
**位置**：`server/src/auth/auth.service.ts`

当前 `wxLogin(code)` 用 `mock_openid_${code}` 生成 openid，没有调用微信 `code2session`，也没有根据微信链路确认 `realNameVerified`。这与 ADR-0002 中“通过微信登录链路确认实名状态”的目标不一致。

**影响**：

- 生产环境登录身份不可信。
- 同一用户可能因 code 变化被创建为不同用户。
- 匹配真人认证条件无法真正成立。

**建议**：

- 接入微信 `jscode2session`，用真实 `openid/unionid` upsert 用户。
- 明确 `realNameVerified` 的产品口径：如果采用“微信生态实名即可信”，需要在登录成功时写入；如果需要额外微信能力确认，应补接口和失败降级。
- 更新 `docs/api/auth.md` 与 ADR-0002 的当前状态。

---

## 2. 语音链路仍有审计阻塞项

**严重程度**：P0/P1
**位置**：`server/voice-gateway/`, `pages/index/index.js`, `utils/api.js`

`DEV_PROGRESS.md` 已列出 Phase 3 audit-fix 的 6 个任务，代码通读确认这些仍是语音真实上线前的核心风险。

**已知问题入口**：

- ASR 协议合规：负包、final 区分、首帧 flags、前端录音包大小。
- 状态机清理：soft close 乱码、不可达代码、`audio_chunk.seq`、重复 `_pcmChunks`。
- PrismaClient 单例化：避免每个语音 session 新建连接池。
- ASR/TTS 连接超时：避免外部服务卡死时会话挂住。
- Barge-in 打断：目前前端和后端都阻断 AI 播放时的用户语音打断。
- 前端 TTS 播放：当前偏全缓冲播放，mock 降级通话循环也不完整。

**建议**：

- 按 `DEV_PROGRESS.md` 的 Task 3-1 到 3-6 执行，不拆散到 Phase 6/7。
- 修复后同步更新 `docs/decisions/0003-语音链路选型.md`，因为该 ADR 的当前状态仍描述为“前端纯 mock”，已经落后于代码。

---

## 3. 用户主页参数与后端查询字段不一致

**严重程度**：P1
**位置**：

- `pkg-social/userHome/userHome.js`
- `server/src/profile/profile.service.ts`
- `utils/common.js`
- `pages/match/match.js`

前端跳转用户主页时传入的 `author` 多数是昵称或展示名，例如匹配页传 `matchName`，header 也传 `author`。后端 `getUserHome(currentUserId, author)` 却使用 `findUnique({ where: { id: author } })`。

**影响**：

- 查看非自己的用户主页时，后端很容易 404。
- 前端会显示 DiceBear fallback，真实用户资料无法稳定展示。

**建议**：

- 决定用户主页 URL 参数语义：`userId`、`handle` 或 `nickname` 三选一。
- 如果选 `userId`，匹配接口应返回 `match.userId`，前端跳转时传 id。
- 如果选昵称/handle，后端应改为支持对应唯一字段查询，并处理重名问题。
- 同步更新 `docs/architecture/前后端字段对齐表.md` 第 6 节。

---

## 4. 照片墙未真正调用后端 CRUD

**严重程度**：P1
**位置**：`pages/profile/profile.js`, `utils/api.js`, `server/src/profile/*`

后端已有 `GET/POST/DELETE /api/me/photos`，`utils/api.js` 也封装了 `getPhotos/addPhoto/deletePhoto`，但 `pages/profile/profile.js` 当前只把照片写入 `userStore` 和本地文件，没有加载后端照片，也没有在添加/删除时调用 API。

**影响**：

- 换设备后照片墙不可恢复。
- 后端照片表基本闲置。
- Phase 1/5 文档中“photos CRUD 已对接”的表述与代码现状不完全一致。

**建议**：

- `profile.onLoad/onShow` 拉取 `api.getPhotos()` 并合并到本地展示。
- 添加照片后调用 `api.addPhoto(url)`；删除时如果照片有后端 id，调用 `api.deletePhoto(id)`。
- 明确本地临时文件与后端 OSS/COS URL 的过渡方案。

---

## 5. 记忆洞察编辑/删除未同步后端

**严重程度**：P1
**位置**：`pages/memory/memory.js`, `utils/api.js`, `server/src/memory/*`

后端有 `PUT /api/memory/insights/:id` 和 `DELETE /api/memory/insights/:id`，`utils/api.js` 也有 `updateInsight/deleteInsight`，但页面的 `saveEdit()` 和 `deleteInsight()` 只更新本地 `storage('memoryInsights')`。

**影响**：

- 刷新或换设备后，用户编辑/删除的洞察可能被后端旧数据覆盖。
- 后端 CRUD 与前端体验不一致。

**建议**：

- `saveEdit()` 成功改本地后，调用 `api.updateInsight(id, { title, content })`；失败时提示或保留本地 pending 状态。
- `deleteInsight()` 调用 `api.deleteInsight(id)`；若后端失败，至少记录并提示“本地已删除，云端同步失败”。
- 注意 mock insight id 是 number，后端 id 是 cuid string，页面需要兼容两类 id。

---

## 6. 前端 API host 写死局域网 IP

**严重程度**：P1
**位置**：`utils/api.js`

当前配置：

```js
var IS_DEV_DEVICE = true
var DEV_HOST = IS_DEV_DEVICE ? '172.20.10.3' : 'localhost'
```

注释写“模拟器用 localhost，真机用电脑 WiFi IP”，但变量命名和条件含义容易反向理解，而且局域网 IP 会随开发环境变化。

**影响**：

- 新设备或新网络下前端 API 直接不可用。
- 容易把个人开发 IP 提交到共享分支。

**建议**：

- 将 host 配置集中到一个本地配置文件，并加入 `.gitignore`。
- 或在 `project.private.config.json` / 开发说明中维护本机 IP，不在业务代码中硬编码。
- 保留 mock fallback，但不要让 fallback 掩盖开发环境配置错误。

---

## 7. 文档状态存在漂移

**严重程度**：P1
**位置**：`docs/decisions/0003-语音链路选型.md`, `docs/architecture/前端架构.md`, `docs/architecture/技术方案设计.md`

代码已经存在完整的 `server/voice-gateway/`、前端 WebSocket 通话逻辑和 Phase 3 审计任务，但 ADR-0003 当前状态仍写“前端 index 页语音通话为纯 mock”。另外部分架构文档仍保留旧页面路径、旧 `globalData` 数据流或目标态表结构。

**影响**：

- 后续接手者可能误判当前实现阶段。
- Phase 3 修复时容易按旧状态重新设计，而不是在现有网关上修补。

**建议**：

- 更新 ADR-0003 的 `当前状态（YYYY-MM 校准）`，改为“语音网关已实现，处于 audit-fix，真实 ASR/TTS 上线前需完成 Task 3-1 到 3-6”。
- `docs/architecture/前端架构.md` 以 `userStore/connectPage/appStore` 为当前数据流主线，弱化旧 `app.globalData` 叙述。
- 技术方案中目标态表结构继续保留，但标注“当前 Prisma schema 尚未包含 questions/profile_evidence/long_term_memories/pgvector 等目标表”。

---

## 8. 旧文档副本已删除

**严重程度**：P2
**位置**：`docs/`

**当前状态（2026-07 校准）**：已处理。`data/docs/` 未被代码或文档路由引用，旧副本目录已删除；`docs/README.md` 是唯一文档入口。

**影响**：

- 后续新增或修改文档时只更新 `docs/`。
- Agent Harness 文档路由不应纳入旧的 `data/docs/` 路径。

**建议**：

- 后续所有新增文档只登记到 `docs/README.md`。

---

## 9. `utils/request.ts` 与实际 API 层不一致

**严重程度**：P2
**位置**：`utils/request.ts`, `utils/api.js`

`utils/request.ts` 是一个 TypeScript HTTP 实例封装，读取 token key 为 `auth_token`；实际业务 API 全部走 `utils/api.js`，token key 为 `aitalk_token`。

**影响**：

- 后续如果误用 `request.ts`，鉴权会失败。
- 根 `tsconfig.json` 会编译 `utils/**/*.ts`，但运行态小程序主要使用 CommonJS `.js` 文件，工具层存在双轨。

**建议**：

- 确认是否保留 `request.ts`。
- 若保留，统一 token key、错误结构、baseUrl 配置，并让 `api.js` 逐步迁移到同一封装。
- 若不保留，删除或移到归档，避免误用。

---

## 后续处理建议

1. 先完成 Phase 3 audit-fix 的 P0 项：状态机清理、Prisma 单例、ASR 协议合规。
2. 随后补 Phase 5 的接口一致性：用户主页、照片墙、洞察编辑/删除。
3. Phase 6 支付/通知继续做，但不要让支付实现掩盖登录实名、语音链路和资料数据同步问题。
4. 每完成一个问题修复，回到本文件或 `DEV_PROGRESS.md` 标记状态，避免问题列表再次漂移。
