# Auth 模块

**实现**：`server/src/auth/`
**前端调用**：`app.js`、`utils/api.js`
**数据表**：`users`
**字段契约**：[前后端字段对齐表](../architecture/前后端字段对齐表.md)

## 当前状态

小程序启动时调用 `wx.login()`，再调用 `POST /api/auth/wx-login` 并保存 JWT。后端目前没有调用微信 `jscode2session`，而是把临时 code 拼成 `mock_openid_${code}`；新用户的 `realNameVerified` 默认是 `false`。

因此当前实现只能用于开发环境的身份闭环，不能证明真实 openid、unionid 或实名认证。

## POST /api/auth/wx-login

无需 JWT。

请求：

```json
{ "code": "wx.login 返回的临时 code" }
```

响应：

```json
{
  "token": "JWT",
  "user": {
    "id": "cuid",
    "openid": "mock_openid_<code>",
    "nickname": "新用户",
    "avatar": "",
    "bio": "",
    "realNameVerified": false
  }
}
```

当前明确错误：`code` 为空时返回 `WX_CODE_INVALID`。文档中的 `WX_API_ERROR` 只有接入真实微信接口后才会成立。

## 待开发

1. 使用 `WX_APPID`、`WX_SECRET` 调用微信接口换取 openid/session key，并处理错误码与超时。
2. 明确 unionid、用户合并和 token 刷新策略。
3. 单独确认实名认证产品口径和可用平台能力，不能直接从当前登录代码推断。
4. 生产启动时禁止 `JWT_SECRET=dev-secret`。
