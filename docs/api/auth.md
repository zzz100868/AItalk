# Auth 模块

**模块职责**：微信登录、Token 管理、真人认证
**对应前端页面**：app.js（登录）、pages/accountSecurity（认证入口预留）
**数据表**：`users`
**上游文档**：[技术方案设计 §5](../architecture/技术方案设计.md) · [ADR-0002 真人认证选型](../decisions/0002-真人认证选型.md)

## 当前前端状态

- **微信登录**：当前无实际登录流程，app.js 启动时直接从 `wx.getStorageSync('userProfile')` 读取本地缓存的 mockData 默认用户
- **真人认证**：前端无任何 `wx.startFacialRecognitionVerify` 调用，accountSecurity 页面仅展示 mock 设备和登录历史数据

## 未来后端目标

- 微信登录闭环：`wx.login()` 拿 code → 后端换 openid → 返回 JWT
- 真人认证：腾讯云人脸核身（见 ADR-0002），匹配前置条件

---

## API 列表

### POST /api/auth/wx-login — P0

微信小程序登录。

**请求**：

```json
{
  "code": "string — wx.login() 返回的临时 code"
}
```

**响应**：

```json
{
  "token": "string — JWT",
  "user": {
    "id": "string — 如 LX_9527",
    "openid": "string",
    "nickname": "string",
    "avatar": "string — URL",
    "bio": "string",
    "realNameVerified": false
  }
}
```

**错误码**：

| code | 说明 |
|---|---|
| `WX_CODE_INVALID` | code 无效或已过期 |
| `WX_API_ERROR` | 微信 API 调用失败 |

**前端对接**：app.js `onLaunch` 调用 `wx.login()` 获取 code，登录成功后将 user 写入 `globalData.userInfo` 和 `wx.setStorageSync('userProfile', ...)`。

---

### POST /api/auth/face-verify/start — P1

发起真人认证，获取 bizToken。

**请求**：

```json
{
  "name": "string — 真实姓名",
  "idCard": "string — 身份证号"
}
```

**响应**：

```json
{
  "bizToken": "string — 传给 wx.startFacialRecognitionVerify"
}
```

**前端对接**：accountSecurity 页面需新增认证入口按钮，调用后使用 `wx.startFacialRecognitionVerify({ certifyId: bizToken })`。

---

### POST /api/auth/face-verify/callback — P1

认证结果回调。前端完成人脸核身后调用。

**请求**：

```json
{
  "bizToken": "string"
}
```

**响应**：

```json
{
  "verified": true,
  "message": "认证成功"
}
```

**错误码**：

| code | 说明 |
|---|---|
| `VERIFY_FAILED` | 人脸核身未通过 |
| `VERIFY_EXPIRED` | bizToken 已过期 |

**副作用**：成功后写 `users.real_name_verified = true`。

---

## 优先级说明

| 接口 | 优先级 | 理由 |
|---|---|---|
| `wx-login` | P0 | 所有接口的鉴权前置 |
| `face-verify/start` | P1 | 产品概念文档列为 MVP Must Have，但前端入口待建 |
| `face-verify/callback` | P1 | 同上 |
