# Memory 模块

**模块职责**：文字聊天（chat）、记忆洞察（insights）、人格档案（archive）
**对应前端页面**：pages/memory（3 个子 tab：chat / memory / archive）
**数据表**：`memory_chat_messages`、`memory_insights`、`profile_documents`、`long_term_memories`
**上游文档**：[技术方案设计 §4.3](../architecture/技术方案设计.md) · [对话编排设计](../architecture/对话编排设计.md) · [前后端字段对齐表 §3](../architecture/前后端字段对齐表.md)

## 当前前端状态

- **chat 子 tab**：用户输入 → 从 `mockData.MEMORY_REPLIES`（8 条固定回复）随机取一条 → 逐字打字效果。消息列表 `messages[]` 存内存，不持久化。AI 角色 = "Stitch AI"
- **memory 子 tab**：`insights[]` 初始从 `mockData.MEMORY_DATA.insights`（7 条）加载，持久化到 `wx.Storage('memoryInsights')`。支持按 category 过滤、长按编辑/删除
- **archive 子 tab**：`aboutMe` / `personalities[]` / `traits[]` 全部来自 `mockData.MEMORY_DATA`，不持久化，纯展示
- **聊天统计**：`chatDays: '12天'`、`chatMood: '平静'`、`chatTopics: 8` 全部硬编码

## 未来后端目标

- chat 接入 LLM（复用双 LLM 架构，跳过 ASR/TTS）
- insights 由后端对话后异步生成
- archive 由后端画像引擎生成并持续更新

---

## API 列表

### GET /api/memory/chat — P0

获取聊天历史。

**参数**：`cursor`, `limit`（默认 50）

**响应**：

```json
{
  "data": [
    {
      "id": "string",
      "sender": "user | ai",
      "content": "string",
      "createdAt": "ISO8601"
    }
  ],
  "hasMore": false,
  "cursor": null,
  "meta": {
    "chatDays": "12天",
    "chatMood": "平静",
    "chatTopics": 8
  }
}
```

**前端字段映射**：

| 前端 | 后端 |
|---|---|
| `messages[].id` | `id` |
| `messages[].sender` | `sender`（`"user"` / `"ai"`） |
| `messages[].content` | `content` |
| `chatDays` | `meta.chatDays` |
| `chatMood` | `meta.chatMood` |
| `chatTopics` | `meta.chatTopics` |

**前端对接**：memory 页 `onLoad` 时调用，替代 `mockData.getMemoryData().messages`。

---

### POST /api/memory/chat — P0

发送消息 + 获取 AI 回复。

**请求**：

```json
{
  "content": "string"
}
```

**响应**：

```json
{
  "reply": {
    "id": "string",
    "sender": "ai",
    "content": "string",
    "createdAt": "ISO8601"
  }
}
```

**后端行为**：
1. 用户消息写入 `memory_chat_messages`
2. 调用双 LLM 架构（LLM #1 抽取 + 规则引擎 + LLM #2 生成）
3. 共享该用户的 `long_term_memories` 和 `profile_documents`
4. AI 回复写入 `memory_chat_messages`

**前端对接**：替代 `sendMessage()` 中的 `mockReplies[random]` 逻辑。前端保持逐字打字效果，将 `reply.content` 逐字渲染。

---

### GET /api/memory/insights — P0

获取洞察列表。

**参数**：`category`（可选，`life | emotion | hobby | growth`，不传返回全部）

**响应**：

```json
{
  "data": [
    {
      "id": 1,
      "date": "2024.01.15",
      "title": "string",
      "content": "string",
      "tag": "生活",
      "tagColor": "secondary",
      "category": "life"
    }
  ]
}
```

**前端字段映射**：

| 前端 | 后端 |
|---|---|
| `insights[].id` | `id` |
| `insights[].date` | `date`（后端格式化 `created_at` 为 "YYYY.MM.DD"） |
| `insights[].title` | `title` |
| `insights[].content` | `content` |
| `insights[].tag` | `tag`（中文："生活"/"情绪"/"兴趣"/"成长"） |
| `insights[].tagColor` | `tagColor`（`secondary`/`tertiary`/`primary`） |
| `insights[].category` | `category`（`life`/`emotion`/`hobby`/`growth`） |

**tagColor 映射规则**：
- `life` → `secondary`
- `emotion` → `tertiary`
- `hobby` → `primary`
- `growth` → `primary`

**前端对接**：替代 `storage.get('memoryInsights')` 和 `mockData.MEMORY_DATA.insights`。

---

### PUT /api/memory/insights/:id — P0

编辑洞察。

**请求**：

```json
{
  "title": "string",
  "content": "string"
}
```

**响应**：更新后的完整 insight 对象。

**前端对接**：替代 `saveEdit()` 中的 `storage.set('memoryInsights', ...)`。

---

### DELETE /api/memory/insights/:id — P0

删除洞察。

**响应**：`204 No Content`

**前端对接**：替代 `deleteInsight()` 中的 `storage.set('memoryInsights', ...)`。

---

### GET /api/memory/archive — P0

获取人格档案。

**响应**：

```json
{
  "aboutMe": "你是一个在安静中寻找力量的人...",
  "personalities": [
    {
      "name": "内向而敏感",
      "desc": "你喜欢独处，对周围的情绪变化很敏锐..."
    }
  ],
  "traits": [
    {
      "name": "深度思考者",
      "color": "warm"
    }
  ]
}
```

**前端字段映射**：

| 前端 | 后端 |
|---|---|
| `aboutMe` | `aboutMe` |
| `personalities[].name` | `name` |
| `personalities[].desc` | `desc` |
| `traits[].name` | `name` |
| `traits[].color` | `color`（`warm`/`sun`/`night`/`mint`/`bloom`/`sky`） |

**后端来源**：从 `profile_documents`（JSONB）聚合生成，通话结束后由异步 worker 更新。

**前端对接**：替代 `mockData.getMemoryData()` 的 `aboutMe` / `personalities` / `traits`。

---

## 错误码

| code | 说明 |
|---|---|
| `INSIGHT_NOT_FOUND` | 洞察不存在 |
| `CHAT_RATE_LIMITED` | 聊天频率超限 |
| `LLM_ERROR` | LLM 服务异常（chat 接口） |

## 优先级说明

| 接口 | 优先级 | 理由 |
|---|---|---|
| `GET /api/memory/chat` | P0 | chat 子 tab 消息列表 |
| `POST /api/memory/chat` | P0 | chat 子 tab 发消息，替代 mock 回复 |
| `GET /api/memory/insights` | P0 | memory 子 tab 洞察列表 |
| `PUT /api/memory/insights/:id` | P0 | 用户编辑洞察 |
| `DELETE /api/memory/insights/:id` | P0 | 用户删除洞察 |
| `GET /api/memory/archive` | P0 | archive 子 tab 人格档案 |
