# Notifications 模块

**模块职责**：通知列表、已读管理、清空
**对应前端页面**：pages/notifications
**数据表**：`notifications`
**上游文档**：[技术方案设计 §3.5](../architecture/技术方案设计.md) · [前后端字段对齐表 §9](../architecture/前后端字段对齐表.md)

## 当前前端状态

- **数据来源**：全部 mock 硬编码，2 条 `follow` 类型通知（"陈默 关注了你"、"周晚 关注了你"）
- **操作**：进入页面自动标记已读、下拉刷新（mock 延迟）、清空全部
- **筛选**：`activeFilter` 支持按 type 过滤，当前只有 `follow` 类型
- **点击行为**：`follow` 类型点击跳转 `userHome?author=xxx`
- **无后端调用**：无 HTTP 请求

## 当前通知类型分析

| 类型 | 当前状态 | MVP 建议 |
|---|---|---|
| `follow` | mock 数据中仅有的类型 | **Deprecated** — 关注/粉丝功能已从前端移除，无事件来源 |
| `match` | 不存在 | **P0** — 每周匹配结果揭晓通知 |
| `system` | 不存在 | **P1** — 系统公告、安全提醒等 |

## 未来后端目标

- 通知由后端事件驱动写入（匹配完成、系统公告等）
- `follow` 类型待广场/社交功能恢复后再启用
- MVP 优先实现 `match` + `system` 类型

---

## API 列表

### GET /api/notifications — P1

通知列表。

**参数**：`cursor`, `limit`（默认 20），`type`（可选，`match | system`）

**响应**：

```json
{
  "data": [
    {
      "id": 1,
      "type": "match",
      "author": "系统",
      "avatar": "string — URL",
      "content": "你的本周缘分已揭晓",
      "time": "2小时前",
      "read": false
    }
  ],
  "hasMore": false,
  "cursor": null,
  "unreadCount": 1
}
```

**前端字段映射**：

| 前端 | 后端 |
|---|---|
| `notifications[].id` | `id` |
| `notifications[].type` | `type` |
| `notifications[].author` | `author`（通知来源名称） |
| `notifications[].avatar` | `avatar` |
| `notifications[].content` | `content` |
| `notifications[].time` | `time`（相对时间） |
| `notifications[].read` | `read` |

**前端对接**：替代 notifications 页 mock 硬编码数据。

---

### PUT /api/notifications/read-all — P1

标记全部已读。

**响应**：`204 No Content`

**前端对接**：当前 `onShow` 中 `notifications.map(n => ({...n, read: true}))` 替换为此接口。

---

### DELETE /api/notifications — P1

清空所有通知。

**响应**：`204 No Content`

**前端对接**：替代 `clearAll()` 中的本地 `setData({ notifications: [] })`。

---

## 错误码

| code | 说明 |
|---|---|
| `NOTIFICATION_NOT_FOUND` | 通知不存在 |

## 优先级说明

| 接口 | 优先级 | 理由 |
|---|---|---|
| `GET /api/notifications` | P1 | 前端页面完整但全 mock，可暂用本地数据 |
| `PUT /api/notifications/read-all` | P1 | 同上 |
| `DELETE /api/notifications` | P1 | 同上 |

**整个模块为 P1**：通知页有完整 UI 但无真实事件源。MVP 阶段匹配结果可先用 toast / 弹窗通知，后续再接入通知系统。
