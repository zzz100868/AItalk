# Profile 模块

**实现**：`server/src/profile/`
**前端页面**：`pages/profile`、`pkg-settings/editProfile`、`pkg-social/userHome`
**数据表**：`users`、`user_photos`、`user_settings`
**字段契约**：[前后端字段对齐表](../architecture/前后端字段对齐表.md)

## 当前状态

- 基础资料：前端读取 `/api/me`，编辑页调用 `PUT /api/me`，同时保留本地 Store。
- 照片墙：后端 CRUD 已存在，但前端仍保存本地文件，没有调用这些接口。
- 用户主页：前端会调用 `/api/users/:author/home`；后端把 `author` 当作 user id，页面也可能传昵称，契约尚未统一。
- 设置和账号安全：当前仍是本地/UI 数据，没有对应 Controller。

## 当前接口

### GET /api/me

```json
{
  "id": "cuid",
  "nickname": "string",
  "avatar": "string",
  "bio": "string",
  "realNameVerified": false
}
```

### PUT /api/me

请求字段均可选：

```json
{ "avatar": "string", "nickname": "string", "bio": "string" }
```

空白 `nickname` 返回 `VALIDATION_ERROR`。响应与 `GET /api/me` 相同。

### GET /api/me/photos

```json
{
  "photos": [
    { "id": "cuid", "url": "string", "sortOrder": 0 }
  ]
}
```

### POST /api/me/photos

当前不是 multipart 上传，只接收已生成的 URL：

```json
{ "url": "https://example.com/photo.jpg" }
```

每个用户最多 8 条记录，超限返回 `PHOTO_LIMIT_EXCEEDED`。代码尚未校验 URL 格式、文件类型或对象是否真实存在。

### DELETE /api/me/photos/:id

删除属于当前用户的照片记录。当前 Controller 未显式设置 204，运行时返回空的成功响应。

### GET /api/users/:author/home

`author` 当前必须是用户表 `id`：

```json
{
  "name": "string",
  "handle": "@<user-id>",
  "avatar": "string",
  "bio": "string",
  "isMe": false
}
```

## 规划但未实现

- `GET/PUT /api/me/settings`
- `GET /api/me/security`
- `PUT /api/me/phone|email|password`
- 二进制照片上传和对象存储

前端联调前必须先确认 userId/author 和照片权威来源，见 [API 总览](README.md)。
