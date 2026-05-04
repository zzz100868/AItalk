# Match 模块

**模块职责**：每周匹配状态查询、触发匹配、解锁微信、匹配反馈
**对应前端页面**：pages/match（Tab 0）
**数据表**：`match_rounds`、`match_results`、`match_feedback`
**上游文档**：[技术方案设计 §4.4](../architecture/技术方案设计.md) · [匹配算法设计](../architecture/匹配算法设计.md) · [前后端字段对齐表 §2](../architecture/前后端字段对齐表.md)

## 当前前端状态

- **开放时间**：`getDay() === 2`（每周二），有 `TEST_MODE = true` 开关始终开放
- **匹配逻辑**：`doMatch()` 从 `mockData.MATCH_CANDIDATES`（6 位硬编码候选人）随机抽 1 位，避免连续匹配同一人
- **动画流程**：shake(900ms) → glow(1700ms) → reveal(3000ms) → 显示结果
- **结果字段**：avatar, name, bio, compatibility, tags, icebreakers, matchInsight
- **付费入口**：`showPayModal` 弹窗 → `confirmPay()` 显示 toast "支付功能开发中"
- **倒计时**：非开放时段显示到下个周二 00:00 的倒计时
- **数据源**：全部来自 `mockData.getMatchCandidates()`，无后端调用

## 未来后端目标

- 替换 mock 随机为真实匹配算法（维度互补 + 兴趣重合 + 阶段适配 + 活跃度）
- 每周二定时 Job 预计算匹配结果
- 用户点击"开始匹配"时返回预计算结果

---

## API 列表

### GET /api/match/current — P0

当前匹配状态。

**响应（开放且有结果）**：

```json
{
  "isOpen": true,
  "hasResult": true,
  "match": {
    "id": "string",
    "avatar": "string — URL",
    "name": "string",
    "bio": "string",
    "compatibility": 98,
    "tags": ["手冲咖啡", "深夜阅读", "安静"],
    "icebreakers": ["string", "string"],
    "insight": "string",
    "unlocked": false
  },
  "nextOpenAt": null
}
```

**响应（未开放）**：

```json
{
  "isOpen": false,
  "hasResult": false,
  "match": null,
  "nextOpenAt": "ISO8601 — 下个周二 00:00"
}
```

**前端字段映射**：

| 前端 | 后端 |
|---|---|
| `isMatchOpen` | `isOpen` |
| `isMatched` | `hasResult` |
| `matchAvatar` | `match.avatar` |
| `matchName` | `match.name` |
| `matchBio` | `match.bio` |
| `compatibility` | `match.compatibility` |
| `tags` | `match.tags` |
| `icebreakers` | `match.icebreakers` |
| `matchInsight` | `match.insight` |
| `countdownText` | 前端根据 `nextOpenAt` 本地计算倒计时 |

**前端对接**：match 页 `onShow` / `checkMatchStatus()` 调用，替代本地 `getDay()` 判断和 mock candidates。

---

### POST /api/match/do — P0

触发匹配（仅开放时段可调用）。

**响应**：

```json
{
  "success": true,
  "match": {
    "id": "string",
    "avatar": "string",
    "name": "string",
    "bio": "string",
    "compatibility": 98,
    "tags": ["手冲咖啡", "深夜阅读", "安静"],
    "icebreakers": ["string", "string"],
    "insight": "string",
    "unlocked": false
  }
}
```

**后端行为**：
1. 检查当前周是否在开放时段
2. 检查用户本周是否已匹配（每人每周 1 次）
3. 返回预计算的匹配结果（来自 `match_results` 表）

**错误码**：

| code | 说明 |
|---|---|
| `MATCH_NOT_OPEN` | 非开放时段 |
| `MATCH_ALREADY_DONE` | 本周已匹配 |
| `MATCH_NO_CANDIDATE` | 无可匹配用户 |
| `PROFILE_INCOMPLETE` | 画像维度不足，需先完成 AI 语音对话 |

**前端对接**：替代 `doMatch()` 中的 mock 随机抽取逻辑。前端保持动画流程不变。

---

### POST /api/match/:id/unlock — P2

解锁匹配对象微信（付费）。

**请求**：

```json
{
  "paymentMethod": "wechat"
}
```

**响应**：

```json
{
  "unlocked": true,
  "wechatId": "string"
}
```

**当前状态**：前端 `confirmPay()` 为 toast 占位，无实际支付流程。依赖 payment 模块。

---

### POST /api/match/:id/feedback — P1

匹配反馈。

**请求**：

```json
{
  "sentiment": "positive | negative | skip",
  "skipReason": "string — 可选",
  "comments": "string — 可选"
}
```

**响应**：`204 No Content`

**后端行为**：写入 `match_feedback`，反哺画像（详见[匹配算法设计 · 反馈闭环](../architecture/匹配算法设计.md)）。

**当前状态**：前端无反馈入口 UI，后续可在匹配结果页添加。

---

## 当前 mock vs 未来真实匹配

| 维度 | 当前 mock | 未来真实 |
|---|---|---|
| 候选人来源 | `mockData.MATCH_CANDIDATES`（6 人硬编码） | `match_results` 表（每周二定时 Job 预计算） |
| 匹配算法 | `Math.random()` | 维度互补 40% + 兴趣重合 25% + 阶段适配 25% + 活跃度 10% |
| 文案生成 | 硬编码 insight/icebreakers | LLM 基于双方画像生成 |
| 每周限制 | 无限制 | 每人每周 1 次 |
| 开放时间 | `TEST_MODE = true` 始终开放 | 后端控制，周二开放 |

## 优先级说明

| 接口 | 优先级 | 理由 |
|---|---|---|
| `GET /api/match/current` | P0 | match 页核心状态 |
| `POST /api/match/do` | P0 | 触发匹配 |
| `POST /api/match/:id/feedback` | P1 | 前端无反馈 UI，但后端画像闭环需要 |
| `POST /api/match/:id/unlock` | P2 | 依赖支付模块 |
