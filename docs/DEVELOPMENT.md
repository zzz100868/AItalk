# 赛博聊机 · 开发指南

## 前端（微信小程序）

| 项目 | 说明 |
|---|---|
| 框架 | 微信小程序原生（无 npm/node） |
| IDE | 微信开发者工具（微信开发者工具）— 导入项目根目录，appid 见 `project.config.json` |
| 构建 | 无构建步骤，DevTools 直接编译 |
| 测试 | 无单元测试框架 |
| Lint | 无 eslint/prettier 配置 |

### 启动方式

1. 打开微信开发者工具
2. 导入项目根目录（`D:\Code\AITalk\AItalk` 或你的本地路径）
3. 确认 appid 已在 `project.config.json` 中配置
4. 点击编译即可预览

---

## 后端（server/）

NestJS + TypeScript + Prisma + PostgreSQL 后端。

当前后端接手入口见 [后端架构与交接](architecture/后端架构.md)，验证基线见 [测试与验收](TESTING.md)。

### 快速启动

```bash
cd server
npm install                    # 或 npm ci
cp .env.example .env        # 编辑 DATABASE_URL 等配置
npx prisma generate         # 生成 Prisma Client
npx prisma migrate dev      # 建表（需要 PostgreSQL 运行中）
npm run start:dev           # 开发模式，热重载，http://localhost:3000
```

无 PostgreSQL 时，服务以 mock-only 模式启动（DB 操作会失败，但 `/health` 可用）。

### 常用命令

| 命令 | 用途 |
|---|---|
| `npm run start:dev` | 开发服务器（watch 模式） |
| `npm run start:voice` | 语音网关独立进程（ws://localhost:3001） |
| `npm run build` | 编译到 dist/ |
| `npm run build:voice` | 编译语音网关到 dist-voice/ |
| `npm run smoke:tts` | TTS 配置存在时验证语音合成链路 |
| `npx prisma generate` | 生成 Prisma Client |
| `npx prisma studio` | 可视化数据库浏览器 |
| `npx prisma migrate dev --name <name>` | 创建数据库迁移 |

### 环境变量

参见 `server/.env.example`，关键配置项：

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `JWT_SECRET` | JWT 签名密钥 |
| `VOLC_API_KEY` | 火山引擎 API Key（豆包 LLM） |
| `VOLC_LLM_MODEL` | 豆包模型接入点 ID |
| `VOLC_ASR_APPID` / `VOLC_ASR_TOKEN` | 火山引擎 ASR 配置 |
| `VOLC_TTS_APPID` / `VOLC_TTS_TOKEN` / `VOLC_TTS_VOICE_TYPE` | 火山引擎 TTS 配置 |
| `WX_MCH_ID` / `WX_MCH_API_KEY_V3` / `WX_MCH_SERIAL_NO` | 微信支付 V3 配置 |
| `WX_SUBSCRIBE_TMPL_ID` | 微信订阅消息模板 ID |
| `VOICE_GATEWAY_PORT` | 语音网关端口，默认 3001 |

### API 路由（当前）

所有路由前缀 `/api`。带 Auth 的接口需要 `Authorization: Bearer <token>` 请求头。

| Method | Path | Auth | 说明 |
|---|---|---|---|
| GET | /health | No | 健康检查 `{status, timestamp}` |
| POST | /auth/wx-login | No | Mock 登录，生成用户 + JWT |
| GET | /me | Yes | 获取用户资料 |
| PUT | /me | Yes | 更新用户资料 |
| GET | /me/photos | Yes | 照片列表 |
| POST | /me/photos | Yes | 添加照片 |
| DELETE | /me/photos/:id | Yes | 删除照片 |
| GET | /users/:author/home | Yes | 用户主页 |
| GET | /memory/chat | Yes | 聊天历史 |
| POST | /memory/chat | Yes | 发送消息（LLM 回复 / mock 回落） |
| GET | /memory/insights | Yes | 洞察列表 |
| PUT | /memory/insights/:id | Yes | 编辑洞察 |
| DELETE | /memory/insights/:id | Yes | 删除洞察 |
| GET | /memory/archive | Yes | 人格档案 |
| GET | /match/current | Yes | 匹配状态 |
| POST | /match/do | Yes | 触发匹配 |
| POST | /match/:id/feedback | Yes | 提交反馈 |
| GET | /notifications | Yes | 通知列表 |
| PUT | /notifications/read-all | Yes | 全部已读 |
| POST | /notifications/subscribe | Yes | 保存订阅消息授权意图 |
| DELETE | /notifications | Yes | 清除全部 |
| POST | /pay/create-order | Yes | 创建解锁订单 |
| POST | /pay/wx-callback | No | 微信支付回调 |

详细接口规范见 [API 文档](api/README.md)。

### 后端验证基线

后端代码变更至少运行：

```bash
cd server
npm run build
npm run build:voice
```

涉及 Prisma schema 或 migration 时追加：

```bash
npx prisma generate
npx prisma migrate dev
```

根目录 `npm test` 当前是占位失败脚本，不作为后端完成标准。

---

## 语音网关（server/voice-gateway/）

独立 WebSocket 进程，处理实时语音通话。

| 项目 | 说明 |
|---|---|
| 端口 | ws://localhost:3001/ws/voice |
| 启动 | `npm run start:voice` |
| 鉴权 | query param `?token=` 或 Authorization header |
| 协议 | audio_chunk ↔ asr_partial ↔ ai_reply_audio ↔ ai_turn_end |

详细协议设计见 [语音链路选型 ADR](decisions/0003-语音链路选型.md) 和 [技术方案设计 §4.1](architecture/技术方案设计.md)。

当前实际消息类型以 `server/voice-gateway/types.ts` 为准；状态机风险和后续治理顺序见 [后端架构与交接 §4](architecture/后端架构.md)。
