# Notifications 模块

**实现**：`server/src/notifications/`
**前端页面**：`pkg-social/notifications`、`custom-tab-bar`
**数据表**：`notifications`
**字段契约**：[前后端字段对齐表](../architecture/前后端字段对齐表.md)

## 当前状态

站内通知列表、未读数、全部已读和清空已实现，前端页面和 tab badge 已调用这些接口。接口失败或空列表时，通知页仍可能展示两条本地 `follow` mock 通知；当前后端真实事件主要是 `match` 类型。

匹配轮次会写入站内通知，支付解锁成功也会写入站内通知。微信订阅消息发送代码存在，但授权意图没有持久化，前端模板 ID 默认空，真实推送尚未验收。

## 当前接口

### GET /api/notifications

参数：`cursor`、`limit`（默认 20）、`type`。

```json
{
  "data": [
    {
      "id": "cuid",
      "type": "match",
      "author": "赛博聊机",
      "avatar": "",
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

### PUT /api/notifications/read-all

标记当前用户全部未读通知，成功返回 204。

### DELETE /api/notifications

删除当前用户全部通知，成功返回 204。

### POST /api/notifications/subscribe

请求：

```json
{ "tmplIds": ["template-id"] }
```

当前响应只是 `{success: true, tmplIds}`，没有写数据库、没有绑定一次性授权次数，也没有校验模板 ID。不能把它视为完整的订阅授权保存接口。

## 微信订阅消息待完成

1. 在前端配置真实模板 ID，并区分开发/体验/正式环境。
2. 建模用户授权、模板、可消费次数和消费结果。
3. 只向有可用授权的用户发送，并记录失败原因和重试边界。
4. 将 `miniprogram_state` 从当前硬编码 `developer` 改为环境配置。
5. 在真机验证授权与接收。
