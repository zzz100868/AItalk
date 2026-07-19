# Memory 模块

**实现**：`server/src/memory/`
**前端页面**：`pages/memory`
**数据表**：`memory_chat_messages`、`memory_insights`、`profile_documents`
**字段契约**：[前后端字段对齐表](../architecture/前后端字段对齐表.md)

## 当前状态

- Chat：前端加载后端历史并调用发送接口；失败时 `utils/api.js` 回落到本地回复。后端会先写用户消息，调用 LLM 或随机 fallback，再写 AI 消息。
- 画像抽取：每个进程内累计 5 条用户消息后异步抽取最近 10 条消息，合并到 `profile_documents.data`，并可能生成 insight。计数保存在内存，进程重启会丢失。
- Insights：前端读取 API；编辑和删除目前只修改本地 storage，未调用已有后端接口。
- Archive：前端读取 API，失败时回落 mock；后端没有画像时返回默认档案。
- 当前 schema 没有 `long_term_memories`，也没有向量检索。

## 当前接口

### GET /api/memory/chat

参数：`cursor`、`limit`，默认 50。

```json
{
  "data": [
    { "id": "cuid", "sender": "user", "content": "string", "createdAt": "ISO8601" }
  ],
  "hasMore": false,
  "cursor": null,
  "meta": { "chatDays": "1天", "chatMood": "平静", "chatTopics": 0 }
}
```

当前实现按 `createdAt` 排序、按 id 比较游标，分页稳定性需要集成测试。

### POST /api/memory/chat

请求：

```json
{ "content": "string" }
```

响应：

```json
{
  "reply": {
    "id": "cuid",
    "sender": "ai",
    "content": "string",
    "createdAt": "ISO8601"
  }
}
```

当前没有 DTO 级非空/长度校验、频率限制或流式 HTTP 响应。LLM 未配置或失败时返回服务端预置回复。

### GET /api/memory/insights

可选参数：`category`。

```json
{
  "data": [
    {
      "id": "cuid",
      "date": "2026.07.12",
      "title": "string",
      "content": "string",
      "tag": "生活",
      "tagColor": "secondary",
      "category": "life"
    }
  ]
}
```

### PUT /api/memory/insights/:id

接受可选 `title`、`content`，返回完整 insight。不存在或不属于当前用户时返回 `INSIGHT_NOT_FOUND`。

### DELETE /api/memory/insights/:id

成功返回 204。前端当前尚未调用。

### GET /api/memory/archive

返回 `aboutMe`、`personalities[]`、`traits[]`。来源是 `profile_documents.data`；没有画像时使用服务端默认值。

## 已知边界

- 文字画像与语音画像使用两套合并逻辑，数据形状可能漂移。
- 异步抽取用 `setTimeout` 和进程内计数，没有队列、重试或任务持久化。
- 文档和代码中的 fallback 只保证有回复，不保证画像抽取成功。
