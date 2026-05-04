# Voice 模块

**模块职责**：实时语音对讲 WebSocket 协议、语音会话管理
**对应前端页面**：pages/index（首页 / AI 语音通话入口）
**数据表**：`voice_sessions`、`dialogue_turns`
**上游文档**：[技术方案设计 §4.1](../architecture/技术方案设计.md) · [对话编排设计](../architecture/对话编排设计.md) · [前后端字段对齐表 §1](../architecture/前后端字段对齐表.md)

## 当前前端状态

- **语音通话**：纯本地 mock。`startCall()` 启动本地计时器，`endCall()` 停止计时并跳转记忆库 archive 子 tab。无 WebSocket 连接、无 ASR/TTS 调用
- **通话控制**：`toggleMute` / `toggleSpeaker` 仅切换本地状态 + toast 提示
- **通话时长**：`callDuration` 由 `setInterval` 每秒计算，格式 "mm:ss"
- **上次通话**：`callDate` 在 `endCall()` 时写本地 "今天 HH:mm"，非持久化
- **AI 信息**：`aiName` = "小雅"，`aiAvatar` 来自 `mockData.AI_USERS.xiaoya`

## 未来后端目标

- 前端 `wx.connectSocket` 建立 WebSocket 连接
- 音频流实时 ASR → 对话编排 → LLM → TTS 回传
- 通话记录持久化到 `voice_sessions` 表

---

## WebSocket 协议 — P0

### 连接

```
WS /ws/voice
Header: Authorization: Bearer <token>
```

连接成功后，服务端发送 `{type: "connected", sessionId: "string"}`。

### 客户端 → 服务端

| type | 字段 | 说明 |
|---|---|---|
| `start` | `sessionId?`, `deviceInfo` | 发起通话 |
| `audio_chunk` | `seq: number`, `pcmBase64: string` | 音频帧，40ms 一帧，PCM 16bit 16kHz |
| `extend` | — | 用户要求"再聊一会儿"，延长 5 分钟 |
| `end` | — | 用户主动挂断 |

### 服务端 → 客户端

| type | 字段 | 说明 |
|---|---|---|
| `connected` | `sessionId` | 连接建立 |
| `asr_partial` | `text: string` | ASR 流式识别中间结果 |
| `asr_final` | `text: string` | ASR 一句话识别完毕 |
| `ai_reply_audio` | `seq: number`, `pcmBase64: string`, `text: string` | AI 回复音频帧 + 对应文本 |
| `ai_turn_end` | — | AI 本轮回复结束 |
| `session_soft_close` | `reason: string` | 到时 / 信息饱和，进入收尾 |
| `session_end` | `duration: number`, `summary: string` | 会话结束，返回时长和摘要 |
| `error` | `code: string`, `message: string` | 错误 |

### 会话状态机（服务端）

```
idle → listening → asr_streaming → dialogue_thinking → tts_streaming → listening ... → closing → ended
```

详见 [对话编排设计](../architecture/对话编排设计.md)。

### 时长约束

- 最低 5 分钟：`duration < 5min` 不触发 CLOSING
- 最长 15 分钟：`duration >= 13min` 强制 CLOSING（留 2 分钟收尾）
- `extend`：延长 +5min，最长 20min

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
