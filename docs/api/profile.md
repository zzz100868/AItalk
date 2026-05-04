# Profile 模块

**模块职责**：用户基础资料 CRUD、照片墙管理、他人主页查看
**对应前端页面**：pages/profile、pages/editProfile、pages/userHome、pages/settings、pages/accountSecurity
**数据表**：`users`、`user_photos`、`user_settings`
**上游文档**：[前后端字段对齐表 §4–8](../architecture/前后端字段对齐表.md)

## 当前前端状态

- **用户资料**：`stores/userStore.js` 读写 `wx.Storage('userProfile')`，字段仅 avatar / nickName / bio
- **照片墙**：`wx.Storage('profilePhotos')`，本地路径数组，最多 8 张
- **他人主页**：通过 URL 参数 `author` 判断，非自己时用 dicebear 生成头像，无后端调用
- **设置页**：纯本地（缓存大小、清除缓存、版本号）
- **帐号安全**：全 mock（手机号 138****8888、设备列表、登录历史硬编码）

## 未来后端目标

- 用户资料持久化到 `users` 表
- 照片上传到 OSS，URL 存入 `user_photos` 表
- 他人主页从 `users` 表查询

---

## API 列表

### GET /api/me — P0

获取当前用户资料。

**响应**：

```json
{
  "id": "string — 如 LX_9527",
  "nickname": "string",
  "avatar": "string — URL",
  "bio": "string",
  "realNameVerified": false
}
```

**前端字段映射**：

| 前端 | 后端 |
|---|---|
| `userInfo.nickName` | `nickname` |
| `userInfo.avatar` | `avatar` |
| `userInfo.id` | `id` |
| `userInfo.bio` | `bio` |

**前端对接**：profile 页 `onShow` 调用，替代当前 `userStore.getProfile()` 读 localStorage。

---

### PUT /api/me — P0

更新当前用户资料。editProfile 页提交。

**请求**：

```json
{
  "avatar": "string — 先上传 OSS 拿 URL",
  "nickname": "string — 必填，不能为空",
  "bio": "string — 可选"
}
```

**响应**：同 `GET /api/me`。

**前端对接**：替代当前 `userStore.updateProfile(profile)` 写 localStorage。

---

### GET /api/me/photos — P0

获取当前用户照片墙。

**响应**：

```json
{
  "photos": [
    { "id": "string", "url": "string", "sortOrder": 0 }
  ]
}
```

**前端对接**：替代 `storage.get('profilePhotos', [])`。前端取 `photos.map(p => p.url)` 渲染。

---

### POST /api/me/photos — P0

上传照片。`multipart/form-data`。

**请求**：`file` 字段，单文件，jpg/png/webp，上限 5MB。

**响应**：

```json
{
  "id": "string",
  "url": "string",
  "sortOrder": 0
}
```

**约束**：总数不超过 8 张，超出返回 `PHOTO_LIMIT_EXCEEDED`。

---

### DELETE /api/me/photos/:id — P0

删除一张照片。

**响应**：`204 No Content`

---

### GET /api/users/:author/home — P0

查看他人主页。

**响应**：

```json
{
  "name": "string",
  "handle": "string — 如 @chenmo",
  "avatar": "string — URL",
  "bio": "string",
  "isMe": false
}
```

**前端字段映射**：

| 前端 | 后端 |
|---|---|
| `userInfo.name` | `name` |
| `userInfo.handle` | `handle` |
| `userInfo.avatar` | `avatar` |
| `userInfo.bio` | `bio` |
| `isMe` | `isMe` |

**前端对接**：替代 userHome 页中 `isMe` 判断 + dicebear 生成逻辑。

---

### GET /api/me/settings — P1

获取用户设置。

**响应**：

```json
{
  "notifyWeeklyMatch": true,
  "privacyLevel": "normal"
}
```

---

### PUT /api/me/settings — P1

更新用户设置。

**请求**：同响应结构，部分字段可选。

---

### GET /api/me/security — P1

帐号安全信息。

**响应**：

```json
{
  "phone": "string — 脱敏，如 138****8888",
  "email": "string",
  "passwordSet": true,
  "wechatBound": true,
  "devices": [
    { "name": "string", "location": "string", "time": "string", "isCurrent": true }
  ],
  "loginHistory": [
    { "date": "string", "time": "string", "location": "string", "device": "string", "type": "string" }
  ]
}
```

**前端对接**：替代 accountSecurity 页全部 mock 数据。

---

### PUT /api/me/phone — P1

更换手机号。当前前端 `changePhone()` 显示 toast "开发中"。

---

### PUT /api/me/email — P1

更换邮箱。当前前端 `changeEmail()` 显示 toast "开发中"。

---

### PUT /api/me/password — P1

修改密码。当前前端 `changePassword()` 显示 toast "开发中"。

---

## 优先级说明

| 接口 | 优先级 | 理由 |
|---|---|---|
| `GET/PUT /api/me` | P0 | profile / editProfile 页核心数据 |
| `GET/POST/DELETE /api/me/photos` | P0 | 照片墙 CRUD |
| `GET /api/users/:author/home` | P0 | userHome 页 |
| `GET/PUT /api/me/settings` | P1 | settings 页当前纯本地，可后置 |
| `GET /api/me/security` | P1 | accountSecurity 页全 mock |
| `PUT phone/email/password` | P1 | 前端均为 toast 占位 |
