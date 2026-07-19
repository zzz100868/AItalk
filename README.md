# AItalk（赛博聊机）

赛博聊机是一个以 AI 陪伴、语音画像和周期匹配为核心的微信小程序。当前仓库同时包含微信小程序前端、NestJS HTTP 主服务和独立 Node.js 语音网关。

当前代码已形成可编译的 MVP 骨架，但尚未达到生产可用：微信登录仍使用 mock openid，最新数据库迁移尚未在本次审计中执行，真实 ASR/TTS/LLM、微信支付、订阅消息和生产部署仍需外部环境验收。准确进度见 [开发进度](docs/DEV_PROGRESS.md)。

## 技术栈

| 层 | 当前实现 |
|---|---|
| 小程序 | 微信小程序原生 JavaScript/WXML/WXSS，自定义 tab bar，自研 Store |
| HTTP 后端 | NestJS 10、TypeScript、JWT、Prisma |
| 语音网关 | Node.js、TypeScript、`ws`、火山引擎 ASR/TTS/LLM |
| 数据库 | PostgreSQL；当前 schema 使用关系表和 JSONB，尚未使用 pgvector |
| 外部能力 | 微信登录、微信支付 V3、微信订阅消息、火山引擎 Ark/语音服务 |

## 目录结构

```text
.
├── app.js / app.json / app.wxss   小程序入口与全局配置
├── pages/                         主包页面：语音、匹配、记忆库、个人资料
├── pkg-settings/                  设置相关分包
├── pkg-social/                    用户主页与通知分包
├── components/                    小程序公共组件
├── custom-tab-bar/                自定义底部导航
├── stores/                        前端状态管理
├── utils/                         API 与通用工具
├── data/mockData.js               受保护的前端回落数据契约
├── server/src/                    NestJS HTTP 主服务
├── server/voice-gateway/          独立 WebSocket 语音网关
├── server/prisma/                 Prisma schema 与迁移
└── docs/                          项目唯一文档目录
```

## 快速启动

环境要求：Node.js 18+、PostgreSQL、微信开发者工具。后端依赖和命令以 `server/package-lock.json`、`server/package.json` 为准。

```bash
cd server
npm ci
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

另开一个终端启动语音网关：

```bash
cd server
npm run start:voice
```

HTTP API 默认位于 `http://localhost:3000/api`，语音 WebSocket 默认位于 `ws://localhost:3001/ws/voice`。小程序由微信开发者工具导入仓库根目录运行；开发机 API 地址目前在 `utils/api.js` 中配置。

完整环境变量、安装、启动、开发规范、构建部署和常见问题见 [开发指南](docs/DEVELOPMENT.md)，测试方式见 [测试与验收](docs/TESTING.md)。所有项目文档统一从 [docs/README.md](docs/README.md) 进入。
