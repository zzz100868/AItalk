# API 总览

**状态**：按控制器校准（2026-07-12）
**HTTP 实现**：`server/src/`
**WebSocket 实现**：`server/voice-gateway/`
**字段对齐**：[前后端字段对齐表](../architecture/前后端字段对齐表.md)

## 1. 地址与鉴权

```text
开发 HTTP:      http://localhost:3000/api
开发 WebSocket: ws://localhost:3001/ws/voice
生产地址:       尚未配置
```

除以下接口外，当前 HTTP 路由都要求 `Authorization: Bearer <token>`：

- `GET /api/health`
- `POST /api/auth/wx-login`
- `POST /api/pay/wx-callback`

语音网关支持 `?token=<JWT>`，也支持 `Authorization` header；小程序当前使用 query 参数。JWT 默认有效期 7 天，暂无 refresh token。

## 2. 当前 HTTP 路由

| 模块 | Method | Path | 说明 |
|---|---|---|---|
| Health | GET | `/api/health` | 进程健康检查，不检查数据库就绪 |
| Auth | POST | `/api/auth/wx-login` | 当前用 code 生成 mock openid |
| Profile | GET/PUT | `/api/me` | 当前用户资料 |
| Profile | GET/POST | `/api/me/photos` | 照片 URL 列表与新增 |
| Profile | DELETE | `/api/me/photos/:id` | 删除照片记录 |
| Profile | GET | `/api/users/:author/home` | `author` 当前按 user id 查询 |
| Memory | GET/POST | `/api/memory/chat` | 历史与发送消息 |
| Memory | GET | `/api/memory/insights` | 洞察列表 |
| Memory | PUT/DELETE | `/api/memory/insights/:id` | 编辑/删除洞察 |
| Memory | GET | `/api/memory/archive` | 人格档案 |
| Match | GET | `/api/match/current` | 当前周结果与开放状态 |
| Match | POST | `/api/match/do` | 读取预生成结果，不即时计算 |
| Match | POST | `/api/match/:id/feedback` | 写匹配反馈 |
| Notifications | GET/DELETE | `/api/notifications` | 列表/清空 |
| Notifications | PUT | `/api/notifications/read-all` | 全部已读 |
| Notifications | POST | `/api/notifications/subscribe` | 当前只回显授权意图，不持久化 |
| Payment | POST | `/api/pay/create-order` | 创建解锁订单 |
| Payment | POST | `/api/pay/wx-callback` | 微信支付回调 |

模块细节见 [Auth](auth.md)、[Profile](profile.md)、[Memory](memory.md)、[Match](match.md)、[Notifications](notifications.md)、[Payment](payment.md)、[Voice](voice.md)。

## 3. 当前通用行为

- 主服务启用 CORS，并设置全局前缀 `/api`。
- 全局 `ValidationPipe` 开启 `whitelist` 和 `transform`，但控制器多数使用内联 TypeScript 类型而非带装饰器 DTO，因此运行时字段校验并不完整。
- 业务异常常返回 `{code, message}`，NestJS 默认校验/运行时错误可能返回 `{statusCode, message, error}`；当前没有统一异常过滤器。
- Memory 和 Notifications 使用游标分页，但没有统一分页工具或统一最大 `limit`。
- 时间字段由各模块分别格式化；数据库存储使用 `DateTime`。
- 当前没有 rate limit，所以 `RATE_LIMITED` 不是已实现的通用错误。

## 4. 文件上传

仓库当前没有 multipart 上传控制器或对象存储 adapter。`POST /api/me/photos` 接收 JSON：

```json
{ "url": "https://example.com/photo.jpg" }
```

文件如何上传、URL 由谁生成仍待前后端和部署方案确认。

## 5. 规划但未实现的接口

- `GET /api/voice/sessions`、`GET /api/voice/sessions/:id`
- `GET/PUT /api/me/settings`
- `GET /api/me/security`
- `PUT /api/me/phone|email|password`
- `POST /api/match/:id/unlock`（当前解锁通过 Payment 模块）

规划接口不得作为当前功能完成证据。

## 6. 待定契约

| 契约 | 当前情况 | 待确认 |
|---|---|---|
| 用户主页标识 | 前端传 `author`，后端按 user id 查询 | 统一为 `userId` 或增加 handle 查询 |
| 照片 | 后端接受 URL，前端保存本地文件 | 上传服务和权威数据源 |
| 洞察写操作 | 后端接口存在，前端仍本地修改 | 以后端成功为准的失败语义 |
| 环境地址 | `utils/api.js` 硬编码开发 host | 开发/体验/生产配置方式 |
| 订阅授权 | 后端不持久化 | 授权记录、消费和重试模型 |
