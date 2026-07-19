# Match 模块

**实现**：`server/src/match/`
**前端页面**：`pages/match`
**数据表**：`match_rounds`、`match_results`、`match_feedback`
**字段契约**：[前后端字段对齐表](../architecture/前后端字段对齐表.md)

## 当前状态

后端已实现候选过滤、打分、贪心配对、LLM/规则文案、结果写入和每周 Cron。Cron 调用 `executeMatchRound()` 预生成结果；`POST /api/match/do` 只读取本周已有结果，不会现场运行算法。

前端优先调用后端，失败时回落到本地 mock 候选人。真实流程尚未使用至少两个有效画像用户完成数据库集成验收。

## 当前接口

### GET /api/match/current

如果本周已有结果，无论当天是否周二都会返回结果：

```json
{
  "isOpen": true,
  "hasResult": true,
  "match": {
    "id": "cuid",
    "avatar": "string",
    "name": "string",
    "bio": "string",
    "compatibility": 88,
    "tags": ["string"],
    "icebreakers": ["string"],
    "insight": "string",
    "unlocked": false
  },
  "nextOpenAt": null
}
```

没有结果且不是周二时，返回 `isOpen: false` 和下周二时间；周二无结果时返回开放但无结果。

### POST /api/match/do

有本周结果时返回 `{success: true, match}`；否则返回：

```json
{
  "success": false,
  "match": null,
  "message": "本周匹配尚未生成，请等待周二匹配开放"
}
```

当前不会返回旧文档中列出的 `MATCH_NOT_OPEN`、`PROFILE_INCOMPLETE` 等异常码。

### POST /api/match/:id/feedback

```json
{
  "sentiment": "positive | negative | skip",
  "skipReason": "string",
  "comments": "string"
}
```

成功返回 204。负反馈且有 `skipReason` 时，服务会用进程内 `setTimeout` 异步调整画像；当前没有 DTO 枚举校验和持久任务队列，前端也没有反馈入口。

## 定时匹配

`MatchScheduler` 每周二触发匹配轮次，候选要求近期活跃且有画像。匹配结果和双方站内通知逐条写入，目前不在单一事务中。微信订阅消息随后 best-effort 发送。

详细算法见 [匹配算法设计](../architecture/匹配算法设计.md)。

## 解锁

当前没有 `POST /api/match/:id/unlock`。解锁流程由 `POST /api/pay/create-order` 和微信支付回调完成，见 [Payment](payment.md)。
