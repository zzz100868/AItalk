# Payment 模块

**实现**：`server/src/pay/`
**前端页面**：`pages/match`
**数据表**：`orders`、`entitlements`
**字段契约**：[前后端字段对齐表](../architecture/前后端字段对齐表.md)

## 当前状态

后端已实现微信支付 V3 JSAPI 下单、回调 header 验签、AES-GCM 资源解密、订单更新、权益创建、匹配解锁和站内通知。前端已调用 `wx.requestPayment`。

真实链路尚未使用商户号、平台证书和公网回调验收。未配置 `WX_MCH_ID` 时，后端仍创建 pending 订单并返回 `wxPayParams: null`；前端会在本地显示“已解锁”，但数据库没有 paid entitlement。

## POST /api/pay/create-order

需要 JWT。

请求：

```json
{
  "sku": "unlock_wechat",
  "targetMatchId": "match-result-id"
}
```

真实配置成功响应：

```json
{
  "success": true,
  "orderId": "cuid",
  "wxPayParams": {
    "timeStamp": "string",
    "nonceStr": "string",
    "package": "prepay_id=...",
    "signType": "RSA",
    "paySign": "string"
  }
}
```

未配置商户号时：

```json
{ "success": true, "orderId": "cuid", "wxPayParams": null }
```

当前金额在代码中固定为 699 分。匹配不存在返回 `MATCH_NOT_FOUND`，已有 paid 订单返回 `ALREADY_PAID`。

## POST /api/pay/wx-callback

无需 JWT，由微信服务器调用。配置商户号后流程为：验签、解密、查订单、更新 paid、创建 entitlement、更新匹配解锁位、写通知。

当前风险：

- 回调多步写入不在 Prisma transaction 中。
- 除 `entitlements.order_id` 外，订单号和业务幂等约束不足。
- 回调验签使用 `JSON.stringify(body)`，需要确认生产框架保留的 body 与微信签名原文完全一致。
- 未配置商户号时回调直接返回 SUCCESS，只适合开发环境。

## 上线前验收

按 [测试与验收](../TESTING.md) 完成真实下单、前端支付、回调验签/解密、重复回调和故障注入，再把该模块标记为生产完成。
