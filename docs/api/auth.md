# Auth 模块

**模块职责**：微信登录、Token 管理、实名认证
**对应前端页面**：app.js（登录）、pages/accountSecurity（认证状态展示）
**数据表**：`users`
**上游文档**：[技术方案设计 §5](../architecture/技术方案设计.md) · [ADR-0002 真人认证选型](../decisions/0002-真人认证选型.md)

## 当前前端状态

- **微信登录**：当前无实际登录流程，app.js 启动时直接从 `wx.getStorageSync('userProfile')` 读取本地缓存的 mockData 默认用户
- **实名认证**：采用微信实名认证方案，通过微信登录链路确认实名状态，accountSecurity 页面展示认证状态

## 未来后端目标

- 微信登录闭环：`wx.login()` 拿 code → 后端换 openid → 返回 JWT
- 实名认证：微信用户已实名，后端通过微信登录链路确认实名状态 → 写 `users.real_name_verified = true`（见 ADR-0002）

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

## 优先级说明

| 接口 | 优先级 | 理由 |
|---|---|---|
| `wx-login` | P0 | 所有接口的鉴权前置 |
