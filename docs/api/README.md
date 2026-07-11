# API 通用约定

**适用范围**：赛博聊机后端所有 HTTP / WebSocket 接口
**上游文档**：[技术方案设计](../architecture/技术方案设计.md) · [前后端字段对齐表](../architecture/前后端字段对齐表.md)

**当前实现校准（2026-07）**：HTTP API 由 `server/src/` 的 NestJS 主服务提供；语音 WebSocket 由 `server/voice-gateway/` 独立进程提供。后端接手边界见 [后端架构与交接](../architecture/后端架构.md)，验证基线见 [测试与验收](../TESTING.md)。

## Base URL

```
生产：https://api.example.com/api
开发：http://localhost:3000/api
开发 WebSocket：ws://localhost:3001/ws/voice
生产 WebSocket：wss://api.example.com/ws/voice
```

## 鉴权

所有接口（除 `POST /api/auth/wx-login`）需在 Header 携带 JWT：

```
Authorization: Bearer <token>
```

Token 由 `POST /api/auth/wx-login` 返回，默认有效期 7 天。当前没有 refresh token 接口。

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
| Auth | [auth.md](auth.md) | P0 | 当前 mock openid；生产前必须接微信 `jscode2session` |
| Profile | [profile.md](profile.md) | P0 | 用户资料、照片墙、他人主页 |
| Voice | [voice.md](voice.md) | P0 | 实时语音 WebSocket + 会话管理 |
| Memory | [memory.md](memory.md) | P0 | 文字聊天、记忆洞察、人格档案 |
| Match | [match.md](match.md) | P0 | 每周匹配 |
| Notifications | [notifications.md](notifications.md) | P1 | 通知列表 |
| Payment | [payment.md](payment.md) | P2 | 微信支付 + 权益解锁 |

## 后端/前端契约待定项

这些点需要后端负责人和前端负责人定稿，定稿后同步更新对应模块文档：

| 契约 | 当前实现 | 建议 |
|---|---|---|
| 用户主页参数 | `GET /api/users/:author/home` 后端按 user id 查询 | 将 `author` 定名为 `userId`，或明确支持 handle/nickname |
| 照片墙权威来源 | 后端已有 `/me/photos`，前端可能保留本地缓存 | 后端为权威数据源，本地只做展示缓存 |
| Memory insights | 后端有 update/delete，前端可能本地编辑 | 后端为权威数据源，失败时前端提示同步失败 |
| Mock fallback | 前端有 mock fallback | 真实接口成功时必须以后端响应为准 |
| 语音事件 | `server/voice-gateway/types.ts` 是当前实际事件集合 | 后端维护事件表，前端只消费事件 |
