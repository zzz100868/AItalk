# Payment 模块

**模块职责**：微信支付、权益解锁
**对应前端页面**：pages/match（支付弹窗）
**数据表**：`orders`、`entitlements`
**上游文档**：[技术方案设计 §3.6](../architecture/技术方案设计.md)

## 当前前端状态

- **唯一入口**：match 页 `showPayModal` → "解锁 TA 的微信" 弹窗 → `confirmPay()` 仅显示 toast "支付功能开发中"
- **无实际支付调用**：未调用 `wx.requestPayment`
- **无支付参数**：无订单号、金额、SKU
- **付费模式**：产品文档待讨论（按次 / 按阶段 / 会员制）

## 未来后端目标

- 创建订单 → 调用微信支付统一下单 → 前端 `wx.requestPayment` → 微信回调确认
- 支付成功后写入 `entitlements` 表，解锁对应匹配对象微信

---

## API 列表

### POST /api/pay/create-order — P2

创建支付订单。

**请求**：

```json
{
  "sku": "unlock_wechat",
  "targetMatchId": "string — 要解锁的匹配 ID"
}
```

**响应**：

```json
{
  "orderId": "string",
  "wxPayParams": {
    "timeStamp": "string",
    "nonceStr": "string",
    "package": "string",
    "signType": "RSA",
    "paySign": "string"
  }
}
```

**前端对接**：`confirmPay()` 调用此接口 → 拿 `wxPayParams` → `wx.requestPayment(wxPayParams)`。

---

### POST /api/pay/wx-callback — P2

微信支付结果回调（微信服务器 → 后端，非前端调用）。

**行为**：验签 → 更新 `orders.status` → 写 `entitlements`。

---

## 错误码

| code | 说明 |
|---|---|
| `ORDER_CREATE_FAILED` | 订单创建失败 |
| `PAY_ALREADY_DONE` | 已支付 |
| `MATCH_NOT_FOUND` | 匹配不存在 |

## 优先级说明

| 接口 | 优先级 | 理由 |
|---|---|---|
| `POST /api/pay/create-order` | P2 | 前端仅 toast 占位，付费模式待确认 |
| `POST /api/pay/wx-callback` | P2 | 同上 |

**整个模块为 P2**：付费模式尚未收敛（产品概念文档 §7.2 列出三种方案待讨论），前端无实际支付逻辑。后端需预留 `orders` / `entitlements` 表结构，但实现优先级最低。
