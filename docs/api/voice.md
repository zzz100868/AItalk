# Voice 模块

**模块职责**：实时语音对讲 WebSocket 协议、语音会话管理
**对应前端页面**：pages/index（首页 / AI 语音通话入口）
**数据表**：`voice_sessions`、`dialogue_turns`、`voice_coverage_states`、`voice_evidence`
**上游文档**：[技术方案设计 §4.1](../architecture/技术方案设计.md) · [对话编排设计](../architecture/对话编排设计.md) · [前后端字段对齐表 §1](../architecture/前后端字段对齐表.md)

**当前实现校准（2026-07）**：语音 WebSocket 已由 `server/voice-gateway/` 独立进程实现。当前实际事件集合以 `server/voice-gateway/types.ts` 为准；尚无 NestJS `VoiceModule` 提供 HTTP 会话历史接口。真实 ASR/TTS 需要火山配置后单独验收。

## 当前实现状态

- **语音通话**：`pages/index/index.js` 已通过 `wx.connectSocket` 接入语音网关，并使用 `wx.getRecorderManager` 发送 PCM 帧
- **播放与打断**：TTS chunk 边收边播；AI 播放期间仍发送用户音频，后端检测 barge-in 后取消 TTS
- **降级**：WebSocket 不可用时前端进入 mock 通话；后端 LLM 不可用时按 `probe_card` 标准话术推进
- **通话控制**：`toggleMute` 控制录音；`toggleSpeaker` 当前只切换本地状态和提示
- **通话时长**：`callDuration` 由 `setInterval` 每秒计算，格式 "mm:ss"
- **上次通话**：`callDate` 在 `endCall()` 时写本地 "今天 HH:mm"，非持久化
- **AI 信息**：`aiName` = "小雅"，`aiAvatar` 来自 `mockData.AI_USERS.xiaoya`

语音画像编排使用 30 张版本化选择题卡片和用户级 coverage checklist。原始证据写入 `voice_evidence`，汇总结果继续写入 `profile_documents`。

---

## WebSocket 协议 — P0

### 连接

```
WS /ws/voice?token=<JWT>
```

连接成功后，服务端发送 `{type: "connected", sessionId: "string"}`。

### 客户端 → 服务端

| type | 字段 | 说明 |
|---|---|---|
| `start` | `sessionId?`, `deviceInfo` | 发起通话 |
| `audio_chunk` | `seq: number`, `pcmBase64: string` | 音频帧，40ms 一帧，PCM 16bit 16kHz |
| `listen_ready` | — | 前端已完成上一轮播放，可以开始监听 |
| `extend` | — | 用户要求"再聊一会儿"，延长 5 分钟 |
| `end` | — | 用户主动挂断 |

### 服务端 → 客户端

| type | 字段 | 说明 |
|---|---|---|
| `connected` | `sessionId` | 连接建立 |
| `asr_partial` | `text: string` | ASR 流式识别中间结果 |
| `asr_final` | `text: string` | ASR 一句话识别完毕 |
| `asr_ready` | — | 后端 ASR 已就绪，前端可以发送录音帧 |
| `ai_reply_audio` | `seq: number`, `pcmBase64: string`, `text: string` | AI 回复音频帧 + 对应文本 |
| `ai_turn_end` | `interrupted?: boolean` | AI 本轮回复结束；`interrupted=true` 表示被用户插话打断 |
| `session_soft_close` | `reason: string` | 到时 / 信息饱和，进入收尾 |
| `session_end` | `duration: number`, `summary: string`, `endReason` | 会话结束；原因见下方枚举 |
| `error` | `code: string`, `message: string` | 错误 |

### 会话状态机（服务端）

```
idle → listening → asr_streaming → dialogue_thinking → tts_streaming → listening ... → closing → ended
```

详见 [对话编排设计](../architecture/对话编排设计.md)。

### 时长约束

- 13 分 45 秒：进入 3-5 条暂定画像总结与用户确认
- 最长 15 分钟：到达硬上限后以 `timeout_ended` 保存并结束
- `extend`：延长 +5min，最长 20min

### 结束原因

| endReason | 说明 |
|---|---|
| `completed` | 完成收尾总结和用户确认 |
| `user_ended` | 用户主动点击挂断 |
| `abandoned` | WebSocket 意外断开或进程清理 |
| `timeout_ended` | 达到通话硬上限 |

每种结束路径都会保存 coverage 快照。下次通话创建新 session，只续采缺失维度，不恢复上一通原始语音上下文。

### 前端对接要点

1. `startCall()` → `wx.connectSocket({ url: wssUrl })` → 发送 `{type: "start"}`
2. 使用 `wx.getRecorderManager()` 录音，每 40ms 回调发 `audio_chunk`
3. 收到 `ai_reply_audio` → `wx.createInnerAudioContext()` 播放
4. 收到 `session_end` → 停止录音、关闭连接、设置 `globalData.memoryTargetTab = 'archive'`、跳转记忆库
5. `endCall()` → 发送 `{type: "end"}` → 等待 `session_end` → 关闭连接

---

## HTTP API

### GET /api/voice/sessions — P1

历史通话列表。

**参数**：`cursor`, `limit`（默认 20）

**响应**：

```json
{
  "data": [
    {
      "id": "string",
      "startedAt": "ISO8601",
      "endedAt": "ISO8601",
      "durationSec": 780,
      "status": "ended",
      "endReason": "completed",
      "roundNo": 3
    }
  ],
  "hasMore": false,
  "cursor": null
}
```

**前端对接**：首页 `callDate` 可从 `GET /api/voice/sessions?limit=1` 取最近一次 `endedAt` 格式化为 "今天 HH:mm"。

---

### GET /api/voice/sessions/:id — P1

单次通话详情。

**响应**：

```json
{
  "id": "string",
  "startedAt": "ISO8601",
  "endedAt": "ISO8601",
  "durationSec": 780,
  "status": "ended",
  "endReason": "completed",
  "roundNo": 3,
  "turns": [
    {
      "idx": 0,
      "role": "ai",
      "text": "嗨，今天过得怎么样？",
      "createdAt": "ISO8601"
    }
  ]
}
```

---

## 错误码

| code | 说明 |
|---|---|
| `SESSION_LIMIT` | 并发通话数超限 |
| `SESSION_NOT_FOUND` | 会话不存在 |
| `ASR_ERROR` | ASR 服务异常 |
| `TTS_ERROR` | TTS 服务异常 |
| `LLM_ERROR` | LLM 服务异常 |

## 优先级说明

| 接口 | 优先级 | 理由 |
|---|---|---|
| `WS /ws/voice` | P0 | 产品核心功能，前端已有完整 UI 和交互流程 |
| `GET /api/voice/sessions` | P1 | 首页 callDate 展示，可暂用本地时间 |
| `GET /api/voice/sessions/:id` | P1 | 通话详情回放，前端当前无入口 |
