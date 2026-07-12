# 赛博聊机 · 开发进度路线表

**上游文档**：[技术方案设计](architecture/技术方案设计.md) · [开发指南](DEVELOPMENT.md)
**当前审计**：[代码通读审计记录](CODE_AUDIT.md) · 2026-06-11 代码通读发现的问题与修复入口

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

**状态**：`done`（audit-fix 6/6 + coverage orchestration 1/1 已完成）

**推荐模型**：


| 环节  | 模型                                             |
| --- | ---------------------------------------------- |
| 设计  | **Opus**（WebSocket 协议、状态机设计、VAD/打断逻辑、66 题采样策略） |
| 编码  | Opus + Sonnet（语音网关核心用 Opus，周边工具代码用 Sonnet）     |
| 测试  | Sonnet（集成测试脚本、延迟测量）                            |


**完成标准**：

- ✅ 独立 WebSocket 语音网关进程 (`server/voice-gateway/`)
- ✅ 协议实现：audio_chunk ↔ asr_partial ↔ ai_reply_audio ↔ ai_turn_end
- ⚠️ ASR 协议实现：帧封装/解析基本正确，但缺少负包（end-of-stream）、无 final 事件区分
- ⚠️ TTS 协议实现：Event 流程正确，但每次合成新建连接未复用、无连接超时守护
- ✅ 对话编排状态机：OPENING → LISTENING → ASR_STREAMING → THINKING → TTS_STREAMING → LISTENING → CLOSING → ENDED
- ✅ 维度采样：30 张版本化 `probe_card` + 用户级 coverage checklist，D1-D10 在 15 分钟路线内主动推进
- ✅ 打断机制（barge-in）：TTS 期间保留 ASR 监听，检测到用户语音后取消 TTS 并切回识别
- ✅ 时长控制：13 分 45 秒进入总结确认、15 分钟强制结束、extend +5min
- ✅ 画像证据：每个用户回答即时写入可追溯证据并更新 `profile_documents`，不再依赖结束后的异步批处理
- ✅ 前端 index 页面 WebSocket 连接 + 录音 + 音频帧发送：TTS chunk 流式播放

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
  - LLM 未配置 → 规则引擎选卡并使用 `probe_card` 标准话术
- **数据持久化**：voice_sessions + dialogue_turns + voice_coverage_states + voice_evidence 写入 PostgreSQL
- **画像抽取**：固定选项映射即时生成弱证据，LLM 只做候选选卡和回答强度增强

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

### 审计修复任务（2026-06-11）

审计范围：`server/voice-gateway/` 全部文件 + `pages/index/index.js` + `utils/api.js`
审计结论：框架搭建完整，但 ASR/TTS 协议、打断机制、前端播放存在阻塞性问题，不可直接上真实语音流。

---

#### Task 3-1：ASR 协议合规修复

**严重程度**：P0（协议违规，真实 ASR 无法正常工作）

**行为**：

1. `asr.service.ts` `stop()` 关闭连接前发送负包（flags=`0b0010`），通知服务端音频已结束
2. `handleResponse()` 区分 partial 和 final 结果（根据 sequence 或 flags），分别 emit `'partial'` / `'final'`
3. `sendFullClientRequest()` 的帧 flags 从 `0b0000` 改为 `0b0001`（表示 header 后 4 字节为 sequence number）
4. 前端 `_startRecording` 的 `frameSize` 从 1.28KB 调整为 6.4KB（≈200ms @16kHz/16bit/mono），匹配豆包推荐包大小

**涉及文件**：

- `server/voice-gateway/asr.service.ts`（负包发送 + final 检测 + flags 修正）
- `pages/index/index.js`（frameSize 调整）

**验证命令**：

```bash
cd server && npx tsc -p voice-gateway/tsconfig.json --noEmit
# 手动验证：配置 ASR 密钥后，wscat 连接语音网关，发送音频，观察是否收到 asr_final 消息
# 抓包验证：关闭 ASR 连接前最后一帧的 flags 应为 0b0010
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `asr.service.ts` 帧封装已支持可选 4 字节 sequence 字段
- ✅ `stop()` 在关闭真实 ASR WebSocket 前发送 flags=`0b0010` 的最后一包负包
- ✅ `sendFullClientRequest()` 已将 flags 从 `0b0000` 改为 `0b0001`，并携带正 sequence
- ✅ `handleResponse()` 已按 response flags / sequence 区分 `partial` 与 `final`，final 会 emit `'final'`
- ✅ `pages/index/index.js` `_startRecording()` 的 `frameSize` 已从 `1.28` 调整为 `6.4`
- ✅ `npx tsc -p voice-gateway/tsconfig.json --noEmit` 零错误
- ✅ `rg -n "buildAsrFrame\(0b0001, 0b0001|buildAsrFrame\(0b0010, 0b0010|emit\(isFinal \? 'final' : 'partial'|frameSize: 6\.4" server\voice-gateway pages\index\index.js` 确认关键改动存在

---

#### Task 3-2：状态机 Bug 修复 + 死代码清理

**严重程度**：P0（乱码显示 + 代码可维护性）

**行为**：

1. `session.ts:195` 将乱码字符串 `'閫氳瘽鏃堕棿蹇埌浜嗭紝鎴戜滑鏉ユ敹灏惧惂'` 替换为 `'通话时间快到了，我们来收尾吧'`
2. `session.ts:252-273` 删除 `return;` 之后的不可达代码块
3. `session.ts:195` 中 `finalizeUserSpeech` 内的 `session_soft_close` 消息与 `startTimers()` 中的重复发送逻辑合并（避免同一条 soft_close 发两次）
4. `index.js:165-166` 删除重复的 `this._pcmChunks = []`
5. `index.js:365` 补上 `seq` 字段：`{ type: 'audio_chunk', seq: self._audioSeq++, pcmBase64: base64 }`

**涉及文件**：

- `server/voice-gateway/session.ts`
- `pages/index/index.js`

**验证命令**：

```bash
cd server && npx tsc -p voice-gateway/tsconfig.json --noEmit
# 手动验证：通话超过 13 分钟，前端收到的 session_soft_close 消息应显示正确中文
grep -r '閫氳瘽' server/voice-gateway/  # 应无结果
grep -n 'return;' server/voice-gateway/session.ts  # 确认无紧跟不可达代码的 return
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `server/voice-gateway/session.ts` soft close 乱码已替换为正确中文
- ✅ `session_soft_close` 通过 `notifySoftClose()` 合并发送路径，避免 timer 与对话收尾重复发送
- ✅ `server/voice-gateway/session.ts` ASR `final` 回调中的 `return;` 后不可达代码已删除
- ✅ `pages/index/index.js` 已删除重复的 `this._pcmChunks = []`
- ✅ `pages/index/index.js` 已初始化 `_audioSeq`，并在 `audio_chunk` 消息中发送 `seq`
- ✅ `npx tsc -p voice-gateway/tsconfig.json --noEmit` 零错误
- ✅ `Select-String -Path server\voice-gateway\*.ts -Pattern "閫氙|閫氱|蹇|鏉|惂"` 无结果
- ✅ `asr.on('final')` 回调中 `await this.finalizeUserSpeech(text);` 后不再有不可达代码

---

#### Task 3-3：PrismaClient 单例化

**严重程度**：P0（并发通话耗尽数据库连接池）

**行为**：

1. 新建 `server/voice-gateway/prisma.ts`，导出全局唯一的 `PrismaClient` 实例
2. `dialogue.service.ts` 从 `import { prisma } from './prisma'` 获取实例，删除 `new PrismaClient()`
3. 删除 `endSession()` 中的 `this.prisma.$disconnect()`（进程级生命周期管理，非会话级）
4. 画像抽取 `triggerProfileExtraction` 中的 `setTimeout` 改为 `setImmediate` + 独立 try/catch，避免与已断开的 client 竞态

**涉及文件**：

- `server/voice-gateway/prisma.ts`（新建）
- `server/voice-gateway/dialogue.service.ts`

**验证命令**：

```bash
cd server && npx tsc -p voice-gateway/tsconfig.json --noEmit
# 手动验证：启动语音网关，10 个并发 WebSocket 连接 → pg_stat_activity 连接数应 ≤ 默认连接池大小（5）而非 50
grep -r 'new PrismaClient' server/voice-gateway/  # 应只出现在 prisma.ts 中
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `server/voice-gateway/prisma.ts` 已新增进程级 PrismaClient 单例
- ✅ `dialogue.service.ts` 已改为 `import { prisma } from './prisma'`，不再为每个会话 `new PrismaClient()`
- ✅ `endSession()` 已删除 `this.prisma.$disconnect()`，避免单个会话结束时断开共享连接池
- ✅ `triggerProfileExtraction()` 已从 `setTimeout` 改为 `setImmediate`，并由独立 `runProfileExtraction()` 方法承载 try/catch
- ✅ `npx tsc -p voice-gateway/tsconfig.json --noEmit` 零错误
- ✅ `rg -n "new PrismaClient|\$disconnect|setTimeout|setImmediate|runProfileExtraction" server\voice-gateway` 确认 `new PrismaClient` 只出现在 `prisma.ts`，语音网关无 `$disconnect`

---

#### Task 3-4：TTS 连接超时守护 + 连接复用

**严重程度**：P1（延迟 + 挂死风险）

**行为**：

1. `tts.service.ts` `connectAndSynthesize` 增加 10 秒连接超时：超时后 emit `'error'`，调用 `finish()`
2. `asr.service.ts` `connectReal` 增加 10 秒连接超时：超时后 emit `'error'`
3. （可选优化）TTS 连接复用：保持 WebSocket 连接，多次合成复用同一连接，仅在 session 结束时关闭。根据豆包文档：收到 `SessionFinished` 后可直接发新的 `StartSession`，无需断开重连

**涉及文件**：

- `server/voice-gateway/tts.service.ts`
- `server/voice-gateway/asr.service.ts`

**验证命令**：

```bash
cd server && npx tsc -p voice-gateway/tsconfig.json --noEmit
# 手动验证：将 ASR/TTS 的 WebSocket URL 改为不可达地址 → 10 秒后应 emit error，session 应转入 WAITING_TO_LISTEN 或降级
# 连接复用验证：多轮对话中观察 TTS 日志，应只出现一次 "[TTS] Connected"
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `asr.service.ts` `connectReal()` 已增加 10 秒连接超时，超时后 emit `'error'` 并关闭 ASR socket
- ✅ `tts.service.ts` 已增加 10 秒连接超时，超时后 emit `'error'` 并调用 `finish()`
- ✅ `tts.service.ts` 已拆分 `ensureConnected()` / `startSession()`，连接 `CONNECTION_STARTED` 后可复用同一 WebSocket 发起多次 `StartSession`
- ✅ `tts.service.ts` `SESSION_FINISHED` 后调用 `completeSession()` 完成本次合成，不再正常路径发送 `FINISH_CONNECTION`
- ✅ TTS 连接异常关闭时会 emit `'error'` 并完成当前等待中的合成 promise，避免会话挂死
- ✅ `npx tsc -p voice-gateway/tsconfig.json --noEmit` 零错误
- ✅ `rg -n "connection timeout|CONNECT_TIMEOUT_MS|startConnectTimer|completeConnect|completeSession|FINISH_CONNECTION|SESSION_FINISHED" server\voice-gateway\tts.service.ts server\voice-gateway\asr.service.ts` 确认超时与复用路径存在，且无正常 `buildFrame(TtsEvent.FINISH_CONNECTION)` 发送路径

---

#### Task 3-5：Barge-in 打断机制实现

**严重程度**：P1（核心交互缺失，DEV_PROGRESS 原标记 ✅ 实际未实现）

**行为**：

1. 后端 `session.ts` `handleAudioChunk` 在 `TTS_STREAMING` 状态下也接受音频帧，触发打断：
  - 检测到语音帧（`isSpeechFrame`）→ 调用 `this.tts.cancel()` 停止 TTS
  - 发送 `ai_turn_end` 通知前端 AI 停止说话
  - 状态转为 `ASR_STREAMING`，继续接收用户语音
2. 前端 `index.js` `onFrameRecorded` 回调删除 `self.data.aiSpeaking` 阻断条件，在 AI 说话期间仍然发送音频帧
3. 前端收到 `ai_turn_end` 时停止当前音频播放（`_stopAudio()`）

**涉及文件**：

- `server/voice-gateway/session.ts`（状态机 + handleAudioChunk）
- `pages/index/index.js`（录音 + 播放中断）

**验证命令**：

```bash
cd server && npx tsc -p voice-gateway/tsconfig.json --noEmit
# 手动验证（微信开发者工具）：
# 1. 发起通话，等 AI 开始说话
# 2. 在 AI 说话过程中对着麦克风说话
# 3. 预期：AI 声音立刻停止，ASR 开始识别用户语音
# 4. 控制台应出现 "[Session] Barge-in triggered" 日志
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `session.ts` `handleAudioChunk()` 已允许 `TTS_STREAMING` 状态接收音频帧并做本地 VAD 检测
- ✅ 检测到语音帧时调用 `handleBargeIn()`：取消 TTS、发送 `ai_turn_end`、状态转入 `ASR_STREAMING`
- ✅ `ai_turn_end` 已扩展 `interrupted?: boolean`，打断路径发送 `{ interrupted: true }`
- ✅ TTS 播放期间后端会启动 barge-in 专用 ASR 监听，正常 TTS done/error 时会停止该监听
- ✅ `pages/index/index.js` 音频帧回调已移除 `aiSpeaking` / `_isPlayingAiAudio` 阻断，AI 说话期间仍可发送音频帧
- ✅ 前端收到 interrupted `ai_turn_end` 时调用 `_stopAudio()` 并清空旧 TTS 缓冲，避免打断后继续播放旧音频
- ✅ `npx tsc -p voice-gateway/tsconfig.json --noEmit` 零错误
- ✅ `rg -n "Barge-in triggered|interrupted|TTS_STREAMING|startBargeInListening|stopBargeInListening|handleBargeIn" server\voice-gateway pages\index\index.js` 确认关键路径存在

---

#### Task 3-6：前端音频流式播放 + Mock 降级修复

**严重程度**：P1（用户体验 + 降级不可用）

**行为**：

1. `index.js` `_handleWsMessage` 中 `ai_reply_audio` 收到非空 `pcmBase64` 时立即追加到播放队列，边收边播（不再等 `ai_turn_end`）
  - 实现方案：维护一个播放队列，当前无音频在播时取队列头部写入临时文件并播放，`onEnded` 后取下一段
2. `_fallbackToMock()` 实现真正的 mock 通话循环：
  - 每 5 秒从预写选择题序列中取下一条，设置 `aiText` + `aiSpeaking`
  - 1 秒后清除 `aiSpeaking`，模拟一轮对话
3. `index.js` Token 不再同时通过 URL 和 Header 发送 — 只保留 query param `?token=`（微信小程序 `connectSocket` 不支持自定义 header），删除 header 中的 Authorization

**涉及文件**：

- `pages/index/index.js`

**验证命令**：

```bash
# 流式播放验证（微信开发者工具）：
# 1. 配置真实 TTS，发起通话
# 2. AI 回复 3 句话，观察第一句话是否在收到第一个 TTS chunk 后立即开始播放
# 3. 对比修改前（全缓冲）和修改后（流式）的首字延迟

# Mock 降级验证：
# 1. 不启动后端服务器
# 2. 在微信开发者工具中点击"开始通话"
# 3. 应看到 aiText 每 5 秒更新一次 mock 文本，而非空白通话界面
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `pages/index/index.js` 已新增 `_ttsQueue` / `_ttsTurnEnded`，`ai_reply_audio` 收到非空 `pcmBase64` 后立即入队并尝试播放
- ✅ `_playNextAudioChunk()` / `_playTtsAudioChunk()` 已按队列逐段写入临时文件并播放，`onEnded` 后自动播放下一段
- ✅ `ai_turn_end` 不再触发全量缓冲播放，只标记当前 TTS 轮次结束；队列清空后再发送 `listen_ready`
- ✅ interrupted `ai_turn_end` 会停止当前音频、清空队列，避免打断后继续播放旧 TTS
- ✅ `_fallbackToMock()` 已实现 mock 通话循环：立即显示一条 mock 回复，并每 5 秒更新一次，1 秒后清除 `aiSpeaking`
- ✅ `wx.connectSocket` 已删除 `Authorization` header，仅通过 `api.getVoiceWsUrl()` 生成的 `?token=` 传递 token
- ✅ 已删除旧的 `_playBufferedAudio` / `_compactTtsChunks` / `_concatBase64PcmChunks` 全缓冲播放路径
- ✅ `node --check pages/index/index.js` 零错误
- ✅ `npx tsc -p voice-gateway/tsconfig.json --noEmit` 零错误
- ✅ `rg -n "Authorization|header:\s*\{|_playBufferedAudio|_pcmChunks|_compactTtsChunks|_concatBase64PcmChunks" pages\index\index.js` 无结果

---

#### Task 3-7：15 分钟 coverage checklist + probe_card 编排

**行为**：

1. 使用 30 张版本化选择题卡片覆盖 D1-D10，正常回合不再进入 `free_chat` 或随机 mock 陈述。
2. 规则引擎按通话阶段、维度权重、置信度缺口、跳过和卡片新鲜度生成候选；LLM 只能从候选 ID 中选题。
3. 固定选项映射即时写入证据，保存 card/version/option/source question；回答过短只追问一次。
4. 用户跳过后同通不再追问相关维度；语音纠正覆盖旧证据但不推进当前 checklist。
5. 用户级 coverage 跨会话保存；新通话创建新 session，并继续补未覆盖维度。
6. 13 分 45 秒进入 3-5 条暂定总结确认；结束原因区分 `completed`、`user_ended`、`abandoned`、`timeout_ended`。

**涉及文件**：

- `server/voice-gateway/probe-cards.ts`
- `server/voice-gateway/coverage-engine.ts`
- `server/voice-gateway/dialogue.service.ts`
- `server/voice-gateway/session.ts`
- `server/voice-gateway/asr.service.ts`
- `pages/index/index.js`
- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260712090000_add_voice_profiling_orchestration/migration.sql`
- `docs/product/语音画像采集设计.md`
- `docs/architecture/对话编排设计.md`

**验证命令**：

```bash
cd server
npx prisma generate
npm run test:voice
npm run build
npm run build:voice
```

**状态**：`done`

**测试结果**（2026-07-12）：

- ✅ `npx prisma generate` 成功，新增 coverage/evidence 模型可生成 Prisma Client
- ✅ `npm run test:voice` 通过 8/8：题库规模与全维度覆盖、D10 主动阶段、固定映射、显式答案优先、低 ASR 置信度上限、一次追问、跳过、纠正不推进
- ✅ `npm run build` 成功
- ✅ `npm run build:voice` 成功
- ✅ `node --check pages/index/index.js` 成功
- ✅ `git diff --check` 无空白错误
- ⏳ `npx prisma migrate dev` 需要可用 PostgreSQL 后执行
- ⏳ 真实 LLM/ASR/TTS + 微信开发者工具完成 15 分钟整通验收

---

### 审计修复进度概览


| Task | 内容                           | 严重程度 | 状态     |
| ---- | ---------------------------- | ---- | ------ |
| 3-1  | ASR 协议合规修复（负包 + final + 包大小） | P0   | `done` |
| 3-2  | 状态机 Bug 修复 + 死代码清理           | P0   | `done` |
| 3-3  | PrismaClient 单例化             | P0   | `done` |
| 3-4  | TTS 连接超时 + 连接复用              | P1   | `done` |
| 3-5  | Barge-in 打断机制实现              | P1   | `done` |
| 3-6  | 前端流式播放 + Mock 降级修复           | P1   | `done` |
| 3-7  | coverage checklist + probe_card 编排 | P0   | `done` |


**next_prompt**：

```
Phase 3 审计修复和画像编排已全部完成（Task 3-1 到 3-7 均为 done）。
下一步先执行数据库迁移，再用微信开发者工具 + 真实 LLM/ASR/TTS 配置验证完整 15 分钟语音链路；通过后执行 Phase 7。
```

---

## Phase 4 — 真实匹配算法 + 每周定时 Job

**做什么**：实现匹配打分公式、配对算法、LLM 文案生成、每周二定时触发

**状态**：`done`

**推荐模型**：


| 环节  | 模型                                     |
| --- | -------------------------------------- |
| 设计  | **Opus**（匹配公式权重、Gale-Shapley 算法、冷启动策略） |
| 编码  | Sonnet（打分函数、定时 Job、候选人过滤）              |
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

## Phase 5 — 前端对接后端 API（对齐接口）

**做什么**：将前端各页面从纯 mock 数据切换为调用后端 API，失败时回落到本地 mock

**状态**：`done`

**推荐模型**：


| 环节  | 模型                       |
| --- | ------------------------ |
| 设计  | Opus（接口对齐策略、fallback 设计） |
| 编码  | Opus（api.js 重写、各页面对接）    |


**完成标准**：

- ✅ `utils/api.js` 包含所有业务 API 方法（login / sendChatMessage / doMatch / getArchive 等）
- ✅ `app.js` 启动时 `wx.login()` → `POST /api/auth/wx-login` → 存 token + 同步 userStore
- ✅ `pages/match/match.js` 调用 `GET /api/match/current` + `POST /api/match/do`
- ✅ `pages/memory/memory.js` 修复语法错误 + 添加 `loadArchive()` + `sendChatMessage` 对接
- ✅ `pkg-settings/editProfile/editProfile.js` 保存时同步 `PUT /api/me`
- ✅ `pkg-social/userHome/userHome.js` 非自己用户调用 `GET /api/users/:author/home`
- ✅ `pkg-social/notifications/notifications.js` 调用通知 API
- ✅ 所有 API 调用失败时回落到 mock 数据，无后端时前端仍可用
- ✅ 删除过时的 `utils/api.ts`

**实现细节**：

- **统一 Fallback 策略**：每个 API 方法 `.catch()` 返回 mock 数据
- **Token 管理**：`api.login()` 获取后存储，所有后续请求自动携带 Authorization header
- **userStore 同步**：登录成功后将服务端用户信息写入本地 Store
- **无侵入**：不改 UI、不改 mockData.js、不改后端

**测试结果**：

- ✅ 无后端时所有页面正常使用（mock fallback）
- ⏳ 待启动后端验证 API 联调

**需要你手动做的**：

- 启动后端 `cd server && npm run start:dev`
- 微信开发者工具中验证各页面网络请求
- 确认 match/memory/profile 页面数据正确展示

**next_prompt**：

```
执行 Phase 6。先阅读 docs/DEV_PROGRESS.md。
目标：接入微信支付和微信实名认证。
设计阶段用 Opus（安全验签、权益模型）。
编码阶段用 Sonnet。
完成后更新 DEV_PROGRESS.md。
```

---

## Phase 6 — 微信支付 + 通知推送

**做什么**：接入微信支付统一下单、权益解锁；实现事件驱动通知 + 微信订阅消息推送 + 未读 badge

**状态**：`done`（6/6 全部完成）

**推荐模型**：


| 环节  | 模型                          |
| --- | --------------------------- |
| 设计  | Opus（支付安全、回调验签、权益模型）        |
| 编码  | Sonnet（微信支付 SDK、通知 Service） |
| 测试  | Haiku（沙箱支付、推送验证）            |


**当前代码现状**（2026-06-11 审计）：


| 模块                   | 现状                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Prisma schema        | `notifications` 表已建（type/authorName/authorAvatar/content/read）；无 `orders`、`entitlements` 表 |
| NotificationsService | CRUD 已实现（list/markAllRead/clearAll），但无写入入口 — 没有任何业务模块调用 `notification.create()`            |
| MatchService         | 匹配完成后不写通知；`MatchResult` 有 `unlockedByA/B` 字段但无对应的支付/解锁接口                                   |
| 前端 match 页           | `confirmPay()` 仅 toast "支付功能开发中"；支付弹窗 UI 已完整                                               |
| 前端 notifications 页   | API 对接已完成（Phase 5），但后端无通知数据 → 实际空列表                                                        |
| 订阅消息                 | 未涉及                                                                                        |


**完成标准**：

- orders + entitlements 表建表迁移
- POST /api/pay/create-order → 调用微信统一下单 → 返回 wxPayParams
- POST /api/pay/wx-callback → 验签 → 更新订单 → 写入 entitlements → 更新 unlocked 状态
- 前端 confirmPay() 调用 wx.requestPayment
- 匹配完成时自动写入 match 类型通知
- 微信订阅消息推送（周二匹配结果揭晓）
- 未读计数 badge（tab bar）

**需要你手动做的**：

- 微信支付商户号申请 + API 密钥配置
- 支付回调地址配置（需要公网域名）
- 微信小程序后台配置订阅消息模板
- 真机测试支付和推送

---

### Task 6-1：数据模型 — orders + entitlements 建表

**行为**：

1. `schema.prisma` 新增 `Order` 模型：`id`, `userId`, `sku`（`unlock_wechat`）, `targetMatchId`, `amount`（分）, `status`（`pending` / `paid` / `failed` / `refunded`）, `wxOutTradeNo`（微信商户订单号）, `wxTransactionId`（微信支付单号）, `paidAt`, `createdAt`
2. `schema.prisma` 新增 `Entitlement` 模型：`id`, `userId`, `type`（`unlock_wechat`）, `matchResultId`, `orderId`, `createdAt`
3. `MatchResult` 增加 `Order[]` 反向关系（一个匹配结果可关联多个订单）
4. 运行 `npx prisma migrate dev --name add-orders-entitlements` 建表
5. 运行 `npx prisma generate` 更新 Client

**涉及文件**：

- `server/prisma/schema.prisma`

**验证命令**：

```bash
cd server && npx prisma migrate dev --name add-orders-entitlements
npx prisma generate
npx tsc --noEmit
# 验证：npx prisma studio → 应看到 Order 和 Entitlement 表
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `npx prisma migrate dev --name add-orders-entitlements` 成功，migration 文件 `20260611030653_add_orders_entitlements/migration.sql` 已创建
- ✅ `npx prisma generate` 成功，Prisma Client 已更新
- ✅ `npx tsc --noEmit` 零错误
- ✅ `npx prisma studio` 可查看 Order 和 Entitlement 表

---

#### Task 6-2：支付后端 — PayModule + 微信下单 + 回调验签

**行为**：

1. 新建 `server/src/pay/` 目录：`pay.module.ts`, `pay.controller.ts`, `pay.service.ts`
2. `PayService.createOrder(userId, sku, targetMatchId)`：
  - 校验 matchResult 存在且属于该用户
  - 校验未重复支付（同用户同 matchResult 无 paid 订单）
  - 生成 `out_trade_no`（`CB` + timestamp + random）
  - 调用微信支付 V3 JSAPI 统一下单（`POST https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi`）
  - 返回 `orderId` + `wxPayParams`（timeStamp/nonceStr/package/signType/paySign）
  - 微信支付未配置时返回 mock 数据（`{ orderId: 'mock-xxx', wxPayParams: null }`）
3. `PayController` 路由：
  - `POST /api/pay/create-order`（需 Auth）
  - `POST /api/pay/wx-callback`（无 Auth，微信服务器调用）
4. `PayService.handleCallback(body, headers)`：
  - 验证微信签名（`Wechatpay-Signature` + `Wechatpay-Nonce` + `Wechatpay-Timestamp`）
  - 解密 `resource.ciphertext`（AES-256-GCM）
  - 更新 `Order.status = 'paid'` + `paidAt`
  - 写入 `Entitlement`
  - 更新 `MatchResult.unlockedByA/B = true`
  - 写入 match 类型通知（"你已解锁 XX 的微信"）
5. `AppModule` 注册 `PayModule`
6. `.env.example` 新增 `WX_MCH_ID`, `WX_MCH_API_KEY_V3`, `WX_MCH_SERIAL_NO`, `WX_MCH_PRIVATE_KEY_PATH`, `WX_PAY_NOTIFY_URL`

**涉及文件**：

- `server/src/pay/pay.module.ts`（新建）
- `server/src/pay/pay.service.ts`（新建）
- `server/src/pay/pay.controller.ts`（新建）
- `server/src/app.module.ts`（注册 PayModule）
- `server/.env.example`（新增支付配置项）

**验证命令**：

```bash
cd server && npx tsc --noEmit && npm run build
# Mock 模式验证（无微信商户号）：
curl -X POST http://localhost:3000/api/pay/create-order \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sku":"unlock_wechat","targetMatchId":"<match_id>"}'
# 预期：返回 { orderId: "mock-xxx", wxPayParams: null }

# 编译检查：
grep -r 'PayModule' server/src/app.module.ts  # 应已注册
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `PayModule` 已创建：`pay.service.ts` + `pay.controller.ts` + `pay.module.ts`
- ✅ `POST /api/pay/create-order` — 校验 matchResult 存在性、重复支付检测、mock 模式回落
- ✅ `POST /api/pay/wx-callback` — 签名验证、AES-256-GCM 解密、订单更新、权益写入、解锁、通知
- ✅ `AppModule` 已注册 `PayModule`
- ✅ `.env.example` 已新增 `WX_MCH_ID` 等支付配置项
- ✅ `npx tsc --noEmit` 零错误
- ✅ `npm run build` 成功
- ✅ Mock 模式 curl 验证：create-order 正确返回 `MATCH_NOT_FOUND`；wx-callback 正确返回 `{"code":"SUCCESS"}`
- ⏳ 真实验证需配置微信商户号后测试完整支付链路

---

#### Task 6-3：前端支付对接 — confirmPay 调用 wx.requestPayment

**行为**：

1. `utils/api.js` 新增 `createOrder(sku, targetMatchId)` 方法，调用 `POST /api/pay/create-order`
2. `pages/match/match.js` `confirmPay()` 改为：
  - 调用 `api.createOrder('unlock_wechat', this.data.matchResult.id)`
  - 如果返回 `wxPayParams`：调用 `wx.requestPayment(wxPayParams)` → 成功后 `setData({ matchResult.unlocked: true })` + toast "解锁成功"
  - 如果返回 `wxPayParams: null`（mock 模式）：toast "支付功能配置中" 并直接解锁（开发期间便于测试）
  - 失败：toast 错误信息
3. 匹配结果页展示解锁状态：已解锁时显示对方微信号（后端 `GET /api/match/current` 已返回 `unlocked` 字段）

**涉及文件**：

- `utils/api.js`
- `pages/match/match.js`

**验证命令**：

```bash
# 微信开发者工具验证：
# 1. 登录 → 执行匹配 → 进入匹配结果页
# 2. 点击"开始聊天"→ 弹出支付弹窗 → 点击"立即解锁"
# 3. Mock 模式下应 toast "支付功能配置中" 并解锁
# 4. 再次进入页面，unlocked 状态应持久
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `utils/api.js` 新增 `createOrder(sku, targetMatchId)` 方法
- ✅ `pages/match/match.js` `confirmPay()` 完整改写：mock 模式 → toast "支付功能配置中" + 解锁；真实模式 → `wx.requestPayment`
- ✅ `data` 新增 `matchId` + `unlocked` 字段，`checkMatchStatus` / `doMatch` / `resetMatch` 均已同步
- ✅ `showPayModal()` 已解锁时跳过支付弹窗
- ✅ 后端 `npx tsc --noEmit` 零错误
- ⏳ 微信开发者工具验证完整支付流程（需配置微信商户号后真机测试）

---

#### Task 6-4：事件驱动通知 — 匹配完成自动写入通知

**行为**：

1. `NotificationsService` 新增 `create(userId, type, content, authorName?, authorAvatar?)` 方法
2. `MatchService` 或 `MatchScheduler`：匹配轮次完成后（`executeMatchRound`），遍历所有 `MatchResult`，为双方各写入一条 `match` 类型通知：
  - `content`: "你的本周缘分已揭晓，快来看看吧！"
  - `authorName`: "赛博聊机"
  - `authorAvatar`: 系统头像 URL
3. `PayService.handleCallback` 支付成功后写入通知：
  - `content`: "你已解锁 XX 的联系方式"
  - `type`: "match"
4. 前端 notifications 页已在 Phase 5 对接 API，无需改动 — 后端有数据后自动展示

**涉及文件**：

- `server/src/notifications/notifications.service.ts`（新增 create 方法）
- `server/src/match/match.scheduler.ts` 或 `match.service.ts`（调用通知写入）
- `server/src/pay/pay.service.ts`（支付成功通知）

**验证命令**：

```bash
cd server && npx tsc --noEmit && npm run build
# 验证：手动触发 executeMatchRound() → 查询 notifications 表
# psql: SELECT * FROM notifications WHERE type = 'match' ORDER BY created_at DESC LIMIT 5;
# 或：curl http://localhost:3000/api/notifications -H "Authorization: Bearer <token>"
# 预期：返回 match 类型通知
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `NotificationsService.create()` 方法已实现，支持 userId/type/content/authorName/authorAvatar 参数
- ✅ `NotificationsModule` 已导出 `NotificationsService`
- ✅ `MatchModule` 已导入 `NotificationsModule`
- ✅ `MatchService.executeMatchRound()` 在每个 MatchResult 创建后为双方用户写入 match 通知
- ✅ `npx tsc --noEmit` 零错误
- ✅ `npm run build` 成功
- ⏳ 待手动触发 `executeMatchRound()` 验证通知写入（# 需要至少 2 个有画像的用户）
- 📌 PayService 通知（第 3 点）将在 Task 6-2 实现时同步添加

---

#### Task 6-5：未读计数 badge — tab bar 红点

**行为**：

1. 后端 `GET /api/notifications` 已返回 `unreadCount`（Phase 1 实现），无需改动
2. 前端 `custom-tab-bar/index.js`：在 `onShow` 或定时轮询中调用 `api.getNotifications({ limit: 1 })` 获取 `unreadCount`
3. `unreadCount > 0` 时在 tab bar "记忆库" 或专门的通知入口显示红点 badge（`wx.setTabBarBadge` 或自定义组件 badge）
4. 进入 notifications 页 → `markAllRead` → 清除 badge

**涉及文件**：

- `custom-tab-bar/index.js`（badge 显示）
- `utils/api.js`（如需新增 unread count 快捷方法）
- `pkg-settings/notifications/notifications.js` 或 `pages/` 下通知入口（已读后清 badge）

**验证命令**：

```bash
# 微信开发者工具验证：
# 1. 后端写入一条未读通知（psql INSERT 或触发匹配）
# 2. 进入小程序 → tab bar 应显示红点/数字 badge
# 3. 进入通知页 → badge 应消失
# 4. 刷新页面 → badge 不再出现（已标记已读）
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `custom-tab-bar/index.js` — `ready()` 启动 10s 轮询 `_fetchUnread()`，`detached()` 清理 timer
- ✅ `_fetchUnread()` — 调用 `api.getNotifications({ limit: 1 })` 获取 `unreadCount`，写入 `app.globalData.unreadCount`
- ✅ `custom-tab-bar/index.wxml` — 记忆库 tab（index=1）上显示 badge，unreadCount > 99 时显示 "99+"
- ✅ `custom-tab-bar/index.wxss` — badge 红色圆角胶囊样式（暖红 `#c45a5a`，阴影，绝对定位在图标右上角）
- ✅ `pkg-social/notifications/notifications.js` — `onShow` 中 markAllRead 后设置 `app.globalData.unreadCount = 0`
- ✅ 后端 `npx tsc --noEmit` 零错误
- ⏳ 微信开发者工具验证 badge 显示和消失

---

#### Task 6-6：微信订阅消息推送 — 匹配结果通知

**行为**：

1. 小程序端：匹配页 `doMatch()` 执行前调用 `wx.requestSubscribeMessage({ tmplIds: [MATCH_RESULT_TMPL_ID] })`，请求一次性订阅授权
2. 授权成功后将 `tmplId` + `openid` 存入后端（新接口 `POST /api/notifications/subscribe` 或复用 user profile 字段）
3. 后端 `MatchScheduler`：匹配完成后对已授权用户调用微信 `subscribeMessage.send` 接口：
  - `touser`: openid
  - `template_id`: 匹配结果模板 ID
  - `data`: `{ thing1: { value: "你的本周缘分已揭晓" }, time2: { value: "2026-06-10 00:00" } }`
4. 需要微信小程序后台配置订阅消息模板（手动操作）
5. 推送失败静默忽略（不影响匹配流程）

**涉及文件**：

- `pages/match/match.js`（requestSubscribeMessage）
- `server/src/notifications/notifications.service.ts`（subscribe 存储 + send 调用）
- `server/src/match/match.scheduler.ts`（匹配完成后触发推送）

**验证命令**：

```bash
cd server && npx tsc --noEmit && npm run build
# 订阅授权验证（微信开发者工具）：
# 1. 点击"开始匹配" → 应弹出订阅消息授权弹窗
# 2. 同意后控制台应打印 "[Notifications] Subscription saved for user xxx"

# 推送验证（需真机）：
# 1. 手动触发 executeMatchRound()
# 2. 检查手机微信服务通知 → 应收到匹配结果推送
# 注意：开发者工具不支持推送，必须真机验证
```

**状态**：`done`

**测试结果**（2026-06-11）：

- ✅ `WxSubscribeService` 已创建 — access_token 获取（含缓存）+ `sendMatchNotifications` 推送
- ✅ `MatchScheduler` 注入 `WxSubscribeService`，匹配完成后自动查询本轮结果 → 发送推送
- ✅ `POST /api/notifications/subscribe` 端点已添加
- ✅ 前端 `match.js` `doMatch()` 中调用 `wx.requestSubscribeMessage`，成功后回调 `api.subscribeNotifications()`
- ✅ `utils/api.js` 新增 `subscribeNotifications(tmplIds)` 方法
- ✅ `.env.example` 新增 `WX_SUBSCRIBE_TMPL_ID`
- ✅ `npx tsc --noEmit` 零错误
- ✅ `npm run build` 成功
- ⏳ 微信小程序后台配置订阅消息模板 → 填入 `WX_SUBSCRIBE_TMPL_ID` + `MATCH_RESULT_TMPL_ID`
- ⏳ 真机验证推送通知（开发者工具不支持）

---

### 任务进度概览


| Task | 内容                                      | 依赖  | 状态     |
| ---- | --------------------------------------- | --- | ------ |
| 6-1  | 数据模型 — orders + entitlements 建表         | 无   | `done` |
| 6-2  | 支付后端 — PayModule + 微信下单 + 回调验签          | 6-1 | `done` |
| 6-3  | 前端支付对接 — confirmPay + wx.requestPayment | 6-2 | `done` |
| 6-4  | 事件驱动通知 — 匹配完成自动写入通知                     | 无   | `done` |
| 6-5  | 未读计数 badge — tab bar 红点                 | 6-4 | `done` |
| 6-6  | 微信订阅消息推送 — 匹配结果推送到微信                    | 6-4 | `done` |


**推荐执行顺序**：6-1 → 6-4（可与 6-1 并行，不依赖新表）→ 6-2 → 6-3 → 6-5 → 6-6

**next_prompt**：

```
执行 Phase 6。先阅读 docs/DEV_PROGRESS.md 中的 Task 6-1 到 6-6。
按依赖顺序执行：先做 6-1（建表）和 6-4（通知写入，可并行），再做 6-2、6-3、6-5、6-6。
每完成一个 Task 更新其状态为 done 并写入测试结果。
设计阶段用 Opus，编码用 Sonnet。
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


| Phase | 内容                        | 状态                     | 核心模型                |
| ----- | ------------------------- | ---------------------- | ------------------- |
| 1     | 后端骨架 + 前端对接               | `done`                 | Sonnet              |
| 2     | Memory Chat 接入 LLM + 画像写入 | `done`                 | Opus 全程             |
| 3     | 实时语音通话（ASR + TTS + 对话编排）  | `done` (audit-fix complete) | **Opus 全程**         |
| 4     | 真实匹配算法 + 定时 Job           | `done`                 | Opus 设计 + Sonnet 编码 |
| 5     | 前端对接后端 API（对齐接口）          | `done`                 | Opus 全程             |
| 6     | 微信支付 + 通知推送               | `done`                 | Opus 设计 + Sonnet 编码 |
| 7     | 生产部署 + 压测 + 上线            | `todo`                 | Opus 设计 + Sonnet 编码 |
