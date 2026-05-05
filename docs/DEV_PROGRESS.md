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

**状态**：`todo`

**推荐模型**：


| 环节  | 模型                                             |
| --- | ---------------------------------------------- |
| 设计  | **Opus**（WebSocket 协议、状态机设计、VAD/打断逻辑、66 题采样策略） |
| 编码  | Opus + Sonnet（语音网关核心用 Opus，周边工具代码用 Sonnet）     |
| 测试  | Sonnet（集成测试脚本、延迟测量）                            |


**完成标准**：

- 独立 WebSocket 语音网关进程
- 协议实现：audio_chunk ↔ asr_partial ↔ ai_reply_audio ↔ ai_turn_end
- ASR 集成：豆包 `volc.seedasr.sauc.duration` 流式识别
- TTS 集成：`seed-tts-2.0-standard` 流式合成
- 对话编排状态机：idle → listening → asr_streaming → dialogue_thinking → tts_streaming → listening
- 66 题维度采样：根据 covered_questions 决定下一个探测话题
- 打断机制（barge-in）：用户说话时停掉正在下发的 TTS
- 时长控制：5 分钟最低、15 分钟最长、软收尾
- 通话结束后异步画像抽取
- 前端 index 页面 WebSocket 连接（替代本地计时器）

**要跑的测试**：

- WebSocket 连接建立 → 发送 audio_chunk → 收到 asr_partial
- 完整对话流程模拟（录音文件 → ASR → LLM → TTS → 返回）
- 首字延迟 < 800ms
- 打断后 TTS 停止
- 15 分钟后强制收尾

**需要你手动做的**：

- 火山引擎控制台开通 ASR / TTS 服务
- 在 .env 填入 ASR / TTS 相关 resource_id / token
- 准备测试音频文件（中文普通话 PCM 格式）
- 微信开发者工具测试 `wx.connectSocket` 连接

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

## Phase 4 — 真实匹配算法 + 每周定时 Job

**做什么**：实现匹配打分公式、配对算法、LLM 文案生成、每周二定时触发

**状态**：`todo`

**推荐模型**：


| 环节  | 模型                                     |
| --- | -------------------------------------- |
| 设计  | **Opus**（匹配公式权重、Gale-Shapley 算法、冷启动策略） |
| 编码  | Sonnet（打分函数、Bull 定时 Job、候选人过滤）         |
| 测试  | Haiku（验证分数计算、配对结果、文案格式）                |


**完成标准**：

- 用户池过滤逻辑（活跃度 + 维度置信度 + 未封禁）
- 硬条件过滤（性别×性取向、同城、年龄差、4 周去重）
- 打分公式：complementary_score + interest_overlap + stage_fit + activity_bonus
- 配对算法：MVP 贪心（按分数降序配对）
- LLM 文案生成：匹配理由 + 破冰话题 + insight
- Bull 定时 Job：每周二 00:00 触发
- 冷启动策略（用户 < 50 时放宽条件）
- POST /api/match/do 返回预计算的真实结果
- 匹配反馈闭环：feedback 写入 → 画像调整

**要跑的测试**：

- 创建 10 个测试用户 → 跑匹配 Job → 验证配对结果合理
- 打分公式单元测试（各因子边界值）
- 冷启动模式下至少每人匹配 1 位
- LLM 文案格式正确（JSON: reason + icebreakers + insight）

**需要你手动做的**：

- 确认匹配打分权重（当前 0.4/0.25/0.25/0.10）是否需要调整
- 创建测试用户画像数据（或使用 seed 脚本）
- Redis 服务启动（Bull 队列依赖）

**next_prompt**：

```
执行 Phase 4。先阅读 docs/DEV_PROGRESS.md。
目标：实现真实匹配算法。
设计阶段用 Opus（参考 docs/architecture/匹配算法设计.md）。
编码阶段用 Sonnet（打分函数、定时 Job、文案生成）。
完成后更新 DEV_PROGRESS.md。
```

---

## Phase 5 — 微信支付 + 真人认证

**做什么**：接入微信支付统一下单、实现权益解锁；接入腾讯云人脸核身

**状态**：`todo`

**推荐模型**：


| 环节  | 模型                               |
| --- | -------------------------------- |
| 设计  | Opus（支付安全、回调验签、权益模型）             |
| 编码  | Sonnet（微信支付 SDK 调用、订单状态机、人脸核身接口） |
| 测试  | Haiku（沙箱支付测试、回调模拟）               |


**完成标准**：

- POST /api/pay/create-order → 调用微信统一下单 → 返回 wxPayParams
- POST /api/pay/wx-callback → 验签 → 更新订单 → 写入 entitlements
- 前端 confirmPay() 调用 wx.requestPayment
- POST /api/auth/face-verify/start → 返回 bizToken
- POST /api/auth/face-verify/callback → 写 real_name_verified
- 前端 accountSecurity 页添加认证入口

**要跑的测试**：

- 微信支付沙箱环境下单 → 支付 → 回调成功
- 重复支付拦截（PAY_ALREADY_DONE）
- 人脸核身 bizToken 获取
- 过期 token 报错

**需要你手动做的**：

- 微信支付商户号申请 + API 密钥配置
- 腾讯云人脸核身服务开通 + SecretId/SecretKey
- 支付回调地址配置（需要公网域名）
- 微信小程序后台配置支付能力

**next_prompt**：

```
执行 Phase 5。先阅读 docs/DEV_PROGRESS.md。
目标：接入微信支付和真人认证。
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
| 3     | 实时语音通话（ASR + TTS + 对话编排）  | `todo` | **Opus 全程**         |
| 4     | 真实匹配算法 + 定时 Job           | `todo` | Opus 设计 + Sonnet 编码 |
| 5     | 微信支付 + 真人认证               | `todo` | Opus 设计 + Sonnet 编码 |
| 6     | 通知系统 + 推送                 | `todo` | Sonnet              |
| 7     | 生产部署 + 压测 + 上线            | `todo` | Opus 设计 + Sonnet 编码 |


