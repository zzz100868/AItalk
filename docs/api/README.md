# API 通用约定

**适用范围**：赛博聊机后端所有 HTTP / WebSocket 接口
**上游文档**：[技术方案设计](../architecture/技术方案设计.md) · [前后端字段对齐表](../architecture/前后端字段对齐表.md)

## Base URL

```
生产：https://api.example.com/api
开发：http://localhost:3000/api
WebSocket：wss://api.example.com/ws
```

## 鉴权

所有接口（除 `POST /api/auth/wx-login`）需在 Header 携带 JWT：

```
Authorization: Bearer <token>
```

Token 由 `POST /api/auth/wx-login` 返回，有效期 7 天，支持刷新。

## 错误响应

```json
{
  "code": "AUTH_REQUIRED",
  "message": "请先登录"
}
```

通用错误码：

| code | HTTP | 说明 |
|---|---|---|
| `AUTH_REQUIRED` | 401 | 未登录或 token 过期 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 参数校验失败 |
| `RATE_LIMITED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务端异常 |

## 分页

游标分页，参数 `cursor` + `limit`（默认 20）：

```json
{ "data": [...], "hasMore": true, "cursor": "xxx" }
```

## 时间格式

- 后端存储：ISO 8601（UTC）
- 返回给前端的 `time` 字段：格式化为相对时间
- 阈值：< 1h 显示分钟，< 24h 显示小时，< 7d 显示天，>= 7d 显示日期（YYYY.MM.DD）

## 文件上传

照片 / 头像上传走 `multipart/form-data`，后端存储到 OSS/COS 后返回 URL。单文件上限 5MB，仅支持 jpg/png/webp。

## 模块索引

| 模块 | 文档 | 优先级 | 说明 |
|---|---|---|---|
| Auth | [auth.md](auth.md) | P0 / P1 | 微信登录 P0，真人认证 P1 |
| Profile | [profile.md](profile.md) | P0 | 用户资料、照片墙、他人主页 |
| Voice | [voice.md](voice.md) | P0 | 实时语音 WebSocket + 会话管理 |
| Memory | [memory.md](memory.md) | P0 | 文字聊天、记忆洞察、人格档案 |
| Match | [match.md](match.md) | P0 | 每周匹配 |
| Notifications | [notifications.md](notifications.md) | P1 | 通知列表 |
| Payment | [payment.md](payment.md) | P2 | 微信支付 + 权益解锁 |
