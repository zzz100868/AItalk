# 开发进度路线表

## 使用规则

1. **每次只执行一个 Phase。**
2. **执行 Phase 前，先阅读本文件。**
3. **执行完成后，必须更新该 Phase 的状态、测试结果、需要我手动做的事、next_prompt。**
4. **如果没有完成，也必须写清楚 blocked 原因。**
5. **不要擅自扩展到下一个 Phase。**

---

## Phase 1 — 后端骨架 + 前端对接

**做什么**：搭建 NestJS 后端 MVP 骨架，数据库建表，前端各页面对接 API（带 mock 回落）

**状态**：`done`

**推荐模型**：


| 环节  | 模型                               |
| --- | -------------------------------- |
| 设计  | Opus（整体架构、数据模型）                  |
| 编码  | Sonnet（NestJS CRUD 脚手架、前端 API 层） |
| 测试  | Haiku（curl 验证接口）                 |


**完成标准**：

- server/ 目录：NestJS + Prisma + PostgreSQL
- Prisma schema 定义全部核心表
- `npx prisma migrate dev` 建表成功
- 20 个 API 路由全部注册（GET /health 可访问）
- Auth: wx-login mock 登录 → 返回 JWT
- Profile: GET/PUT /me, photos CRUD, user home
- Memory: chat history, send message (mock AI reply), insights CRUD, archive
- Match: current status, do match (mock candidates), feedback
- Notifications: list, read-all, clear
- 前端 utils/api.js 封装
- app.js 启动时 wx.login → 后端换 token
- profile/editProfile/userHome 页面对接 API
- memory 页面对接 API（chat/insights/archive）
- match 页面对接 API

**测试结果**：

- `curl /api/health` → `{"status":"ok"}`
- `POST /api/auth/wx-login` → 返回 JWT + user 对象
- 所有带 Auth 的接口返回正确结构
- 无数据库时服务降级为 mock-only 模式可启动

**需要你手动做的**：

- Docker Desktop 启动 PostgreSQL 容器（已完成）
- 微信开发者工具中验证前端页面 → API 调用是否走通

**next_prompt**：执行 Phase 2

---

## Phase 2 — Memory Chat 接入 LLM + 画像写入

**做什么**：将 memory chat 的 mock 回复替换为火山引擎豆包 LLM 真实对话；对话后异步抽取画像；archive 页展示真实画像数据

**状态**：`done`

**推荐模型**：


| 环节  | 模型                               |
| --- | -------------------------------- |
| 设计  | Opus（LLM prompt 设计、画像抽取逻辑、上下文管理） |
| 编码  | Opus（API 调用封装、Service 实现、异步抽取）   |
| 测试  | Haiku（验证 LLM 返回格式、画像字段写入）        |


**完成标准**：

- 火山引擎 SDK 集成（豆包 pro API 调用封装）→ `server/src/llm/llm.service.ts`
- POST /api/memory/chat 调用 LLM 替代 mock 回复
- LLM 上下文：拼接用户画像 + 最近 20 条消息 + system prompt + 编排指令
- 对话后异步画像抽取（profile_documents 写入）→ `server/src/memory/profile-extractor.service.ts`
- GET /api/memory/archive 从 profile_documents 读取真实数据（已有，Phase 1 实现）
- memory insights 由后端对话异步生成（setTimeout Worker，每 5 轮触发）
- .env 新增 VOLC_* 配置项

**实现细节**：

- **简化双 LLM**：生成用豆包 pro（chat），抽取用豆包 pro（JSON mode），异步分离
- **编排指令**：free_chat / gentle_probe / comfort 三种模式，根据画像覆盖度和情绪自动切换
- **降级策略**：LLM 不可用时自动回退 MOCK_REPLIES（与 Phase 1 行为一致）
- **异步抽取**：每 5 轮用户消息后 setTimeout 1s 触发，不阻塞响应

**测试结果**：

- TypeScript 编译零错误
- `npm run build` 成功
- LLM 未配置时降级为 mock 回复（不崩溃）
- 待填入 API Key 后验证真实 LLM 返回（已完成）

**需要你手动做的**：

- 注册火山引擎账号 → [https://console.volcengine.com/ark](https://console.volcengine.com/ark)
- 创建推理接入点（模型选豆包 pro-32k 或 pro-128k）
- 获取 API Key（访问密钥管理）
- 在 `server/.env` 填入：
  ```
  VOLC_API_KEY=your_api_key_here
  VOLC_LLM_MODEL=ep-xxxxxxxx  (接入点 ID)
  ```

**next_prompt**：

```
执行 Phase 3。先阅读 docs/DEV_PROGRESS.md。
目标：实现 WebSocket 语音网关 + ASR + TTS + 对话编排。
这是最复杂的模块，全程用 Opus。
先设计 WebSocket 协议和状态机（参考 docs/architecture/技术方案设计.md §4.1 和 docs/architecture/对话编排设计.md）。
然后实现语音网关独立进程。
完成后更新 DEV_PROGRESS.md。
```

---

## Phase 3 — 实时语音通话（ASR + TTS + 对话编排）

**做什么**：实现 WebSocket 语音网关，对接豆包 ASR 流式识别 + seed-tts-2.0 语音合成，接入对话编排状态机（66 题隐式采样）

**状态**：`done`

**推荐模型**：


| 环节  | 模型                                             |
| --- | ---------------------------------------------- |
| 设计  | **Opus**（WebSocket 协议、状态机设计、VAD/打断逻辑、66 题采样策略） |
| 编码  | Opus + Sonnet（语音网关核心用 Opus，周边工具代码用 Sonnet）     |
| 测试  | Sonnet（集成测试脚本、延迟测量）                            |


**完成标准**：

- ✅ 独立 WebSocket 语音网关进程 (`server/voice-gateway/`)
- ✅ 协议实现：audio_chunk ↔ asr_partial ↔ ai_reply_audio ↔ ai_turn_end
- ✅ ASR 真实协议实现：火山引擎二进制帧协议（`wss://openspeech.bytedance.com/api/v3/sauc/bigmodel`），header+payload 帧封装，Gzip 解压，JSON 响应解析
- ✅ TTS 真实协议实现：火山引擎双向流式协议（`wss://openspeech.bytedance.com/api/v3/tts/bidirection`），Event 驱动（StartConnection → StartSession → FinishSession → FinishConnection），音频帧流式下发
- ✅ 对话编排状态机：OPENING → LISTENING → ASR_STREAMING → THINKING → TTS_STREAMING → LISTENING → CLOSING → ENDED
- ✅ 维度采样：复用 Phase 2 的 PROBE_HINTS + orchestration directive（free_chat / gentle_probe / comfort）
- ✅ 打断机制（barge-in）：用户说话时停掉正在下发的 TTS
- ✅ 时长控制：5 分钟最低、13 分钟 soft close、15 分钟强制收尾、extend +5min
- ✅ 通话结束后异步画像抽取（复用 LLM JSON extraction）
- ✅ 前端 index 页面 WebSocket 连接 + 录音 + 音频帧发送

**实现细节**：

- **独立进程**：`npm run start:voice` 启动，监听 3001 端口
- **JWT 验证**：query param `?token=` 或 Authorization header
- **小雅人设**：语音用小雅角色（区别于文字聊天的 Stitch）
- **ASR 二进制协议**：
  - WebSocket 连接携带 `X-Api-App-Key` / `X-Api-Access-Key` / `X-Api-Resource-Id` 鉴权头
  - 首帧：Full client request（JSON config: audio.format=pcm, rate=16000, model_name=bigmodel）
  - 后续帧：Audio-only request（原始 PCM 数据）
  - 响应解析：Header(4B) + Sequence(4B) + PayloadSize(4B) + JSON Payload → `result.text`
- **TTS Event 协议**：
  - WebSocket 连接携带鉴权头
  - 建连帧：StartConnection(1) → ConnectionStarted(50)
  - 会话帧：StartSession(100, 含 text+speaker+audio_params) → SessionStarted(150) → FinishSession(102)
  - 音频帧：TTSResponse(352) 事件携带 PCM base64 音频数据
  - 结束帧：SessionFinished(152) → FinishConnection(2) → ConnectionFinished(52) → done
- **降级策略**：
  - ASR 未配置（APPID 为空）→ mock VAD + 随机文本
  - TTS 未配置（VOICE_TYPE 为空）→ 跳过音频，300ms 后 emit done
  - LLM 未配置 → MOCK_REPLIES 随机回复
- **数据持久化**：voice_sessions + dialogue_turns 写入 PostgreSQL
- **画像抽取**：每 5 轮语音对话后 + 通话结束时异步触发（LLM JSON extraction）

**测试结果**：

- ✅ TypeScript 编译零错误（主服务 `npm run build` + 语音网关 `tsc -p voice-gateway/tsconfig.json`）
- ✅ 语音网关启动正常，监听 ws://localhost:3001/ws/voice
- ✅ Mock 模式下 ASR/TTS 降级正常
- ⏳ 待开通 ASR/TTS 后验证真实语音流
- ⏳ 待微信开发者工具验证前端 WebSocket 连接

**需要你手动做的**：

- 火山引擎控制台开通 Doubao-流式语音识别 + Doubao-语音合成-2.0
- 在 `server/.env` 填入：
  ```
  VOLC_ASR_APPID=your_appid
  VOLC_ASR_TOKEN=your_token
  VOLC_ASR_CLUSTER=your_cluster
  VOLC_TTS_APPID=your_appid
  VOLC_TTS_TOKEN=your_token
  VOLC_TTS_CLUSTER=your_cluster
  VOLC_TTS_VOICE_TYPE=your_voice_type
  ```
- 微信开发者工具测试 `wx.connectSocket` 连接到 `ws://localhost:3001/ws/voice`
- 确认录音权限 + PCM 格式输出

**next_prompt**：

```
Phase 3 代码框架已完成。现在需要：
1. 开通火山引擎 ASR/TTS 服务
2. 填入 .env 配置
3. 根据实际 API 文档完善 asr.service.ts 和 tts.service.ts 的真实实现
4. 在微信开发者工具中验证完整语音通话流程
```

---

## Phase 4 — 真实匹配算法 + 每周定时 Job

**做什么**：实现匹配打分公式、配对算法、LLM 文案生成、每周二定时触发

**状态**：`done`

**推荐模型**：


| 环节  | 模型                                     |
| --- | -------------------------------------- |
| 设计  | **Opus**（匹配公式权重、Gale-Shapley 算法、冷启动策略） |
| 编码  | Sonnet（打分函数、定时 Job、候选人过滤）         |
| 测试  | Haiku（验证分数计算、配对结果、文案格式）                |


**完成标准**：

- ✅ 用户池过滤逻辑（7天活跃 + 维度置信度门槛 + ProfileDocument 存在）
- ✅ 硬条件过滤（性别×性取向兼容矩阵、同城、年龄差≤5、4周去重）
- ✅ 打分公式：complementary_score(0.40) + interest_overlap(0.25) + stage_fit(0.25) + activity_bonus(0.10)
- ✅ 配对算法：MVP 贪心（按分数降序配对）
- ✅ LLM 文案生成：匹配理由 + 破冰话题 + insight（`LlmService.chatWithJson`）
- ✅ `@nestjs/schedule` Cron Job：每周二 00:00 触发（`@Cron('0 0 * * 2')`）
- ✅ 冷启动策略（用户 < 50 时：放宽年龄差至8、忽略同城、置信度门槛降至0.2、保底配对）
- ✅ POST /api/match/do 返回本周预计算的真实结果
- ✅ 匹配反馈闭环：feedback 写入 → 异步画像维度 confidence 微调

**实现细节**：

- **文件结构**：`match.types.ts`（类型）+ `matching.engine.ts`（纯函数引擎）+ `match.scheduler.ts`（Cron）+ 重写 `match.service.ts`
- **打分引擎**：纯函数，无 DI 依赖。10维度按 similar/complementary/mixed 模式计算，归一化后加权
- **维度配置**：D1-D10 各维度权重+模式在 `DIMENSION_CONFIGS` 常量中定义
- **兴趣重合**：D8 evidence 标签做 Jaccard 相似度
- **活跃度**：voice_sessions(7d) × 0.5 + chat_messages(7d) × 0.5，归一化到 [0,1]
- **LLM 降级**：LLM 不可用时使用模板文案（"你们在 N 个维度上有共鸣"）
- **反馈闭环**：负面反馈 + 原因 → 映射到具体维度 → confidence - 0.05

**测试结果**：

- ✅ TypeScript 编译零错误（`npm run build` + `tsc --noEmit`）
- ✅ ScheduleModule 注册成功
- ⏳ 待创建测试用户验证完整匹配流程
- ⏳ 待 LLM API Key 配置后验证文案生成

**需要你手动做的**：

- 创建测试用户画像数据（至少 10 个用户 + ProfileDocument）
- 验证 LLM 文案生成（需要 VOLC_API_KEY 已配置 — 已完成）
- 手动触发 `executeMatchRound()` 验证完整流程

**next_prompt**：

```
执行 Phase 5。先阅读 docs/DEV_PROGRESS.md。
目标：接入微信支付和微信实名认证。
设计阶段用 Opus（安全验签、权益模型）。
编码阶段用 Sonnet。
完成后更新 DEV_PROGRESS.md。
```

---

## Phase 5 — 微信支付 + 微信实名认证

**做什么**：接入微信支付统一下单、实现权益解锁；接入微信实名认证（微信已实名用户直接授权，无需第三方人脸核身）

**状态**：`todo`

**推荐模型**：


| 环节  | 模型                               |
| --- | -------------------------------- |
| 设计  | Opus（支付安全、回调验签、权益模型）             |
| 编码  | Sonnet（微信支付 SDK 调用、订单状态机、实名认证接口） |
| 测试  | Haiku（沙箱支付测试、回调模拟）               |


**完成标准**：

- POST /api/pay/create-order → 调用微信统一下单 → 返回 wxPayParams
- POST /api/pay/wx-callback → 验签 → 更新订单 → 写入 entitlements
- 前端 confirmPay() 调用 wx.requestPayment
- 微信实名认证：通过微信 openid 查询用户实名状态，已实名用户直接标记 verified
- 前端 accountSecurity 页展示实名状态

**要跑的测试**：

- 微信支付沙箱环境下单 → 支付 → 回调成功
- 重复支付拦截（PAY_ALREADY_DONE）
- 实名认证状态查询与写入

**需要你手动做的**：

- 微信支付商户号申请 + API 密钥配置
- 支付回调地址配置（需要公网域名）
- 微信小程序后台配置支付能力

**next_prompt**：

```
执行 Phase 5。先阅读 docs/DEV_PROGRESS.md。
目标：接入微信支付和微信实名认证。
设计阶段用 Opus（安全验签、权益模型）。
编码阶段用 Sonnet。
完成后更新 DEV_PROGRESS.md。
```

---

## Phase 6 — 通知系统 + 推送

**做什么**：实现事件驱动通知（匹配结果推送、系统公告）；对接微信订阅消息

**状态**：`todo`

**推荐模型**：


| 环节  | 模型                            |
| --- | ----------------------------- |
| 设计  | Sonnet（事件源枚举、推送模板）            |
| 编码  | Sonnet（通知 Service、微信订阅消息 API） |
| 测试  | Haiku（事件触发 → 通知写入 → 推送到达）     |


**完成标准**：

- 匹配完成时自动写入 match 类型通知
- 微信订阅消息推送（周二匹配结果揭晓）
- notifications 页面展示真实数据
- 未读计数 badge

**要跑的测试**：

- 匹配 Job 完成后 → 通知表新增记录
- GET /api/notifications → 返回真实通知
- 订阅消息推送到微信（需真机测试）

**需要你手动做的**：

- 微信小程序后台配置订阅消息模板
- 真机测试推送到达

**next_prompt**：

```
执行 Phase 6。先阅读 docs/DEV_PROGRESS.md。
目标：实现通知系统。编码用 Sonnet。
完成后更新 DEV_PROGRESS.md。
```

---

## Phase 7 — 生产部署 + 压测 + 上线

**做什么**：服务器部署、域名 HTTPS、小程序审核、性能压测

**状态**：`todo`

**推荐模型**：


| 环节  | 模型                                |
| --- | --------------------------------- |
| 设计  | Opus（部署架构、监控方案）                   |
| 编码  | Sonnet（Dockerfile、CI/CD、Nginx 配置） |
| 测试  | Haiku（压测脚本、监控告警验证）                |


**完成标准**：

- Docker Compose 或 K8s 部署方案
- HTTPS 证书 + 域名配置
- 微信小程序域名白名单配置
- API 限流（Redis rate limiter）
- 语音并发压测（目标：100 同时通话）
- 错误监控（Sentry 或类似）
- 小程序审核提交

**需要你手动做的**：

- 购买服务器 / 云服务
- 域名备案
- 微信小程序审核提交
- 生产环境密钥配置

**next_prompt**：

```
执行 Phase 7。先阅读 docs/DEV_PROGRESS.md。
目标：生产部署。设计用 Opus，编码用 Sonnet。
完成后更新 DEV_PROGRESS.md。
```

---

## 进度概览


| Phase | 内容                        | 状态     | 核心模型                |
| ----- | ------------------------- | ------ | ------------------- |
| 1     | 后端骨架 + 前端对接               | `done` | Sonnet              |
| 2     | Memory Chat 接入 LLM + 画像写入 | `done` | Opus 全程             |
| 3     | 实时语音通话（ASR + TTS + 对话编排）  | `done` | **Opus 全程**         |
| 4     | 真实匹配算法 + 定时 Job           | `done` | Opus 设计 + Sonnet 编码 |
| 5     | 微信支付 + 微信实名认证               | `todo` | Opus 设计 + Sonnet 编码 |
| 6     | 通知系统 + 推送                 | `todo` | Sonnet              |
| 7     | 生产部署 + 压测 + 上线            | `todo` | Opus 设计 + Sonnet 编码 |


