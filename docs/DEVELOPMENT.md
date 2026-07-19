# 赛博聊机 · 开发指南

**状态**：按当前代码校准（2026-07-12）
**适用范围**：微信小程序、NestJS 主服务、语音网关、Prisma 数据库
**相关文档**：[后端架构](architecture/后端架构.md) · [API 总览](api/README.md) · [测试与验收](TESTING.md) · [开发进度](DEV_PROGRESS.md)

## 1. 项目与技术栈

仓库包含三个运行单元：微信小程序前端、NestJS HTTP 主服务和独立 WebSocket 语音网关。主服务与语音网关共享 PostgreSQL 和 JWT 身份语义，前端通过 `utils/api.js` 访问后端，部分失败路径会回落到 `data/mockData.js`。

| 运行单元 | 主要技术 | 入口 |
|---|---|---|
| 微信小程序 | 原生 JS/WXML/WXSS、微信开发者工具、自研 Store | `app.js`、`app.json` |
| HTTP 主服务 | NestJS 10、TypeScript、JWT、Prisma | `server/src/main.ts` |
| 语音网关 | Node.js、TypeScript、`ws`、火山引擎 ASR/TTS/LLM | `server/voice-gateway/index.ts` |
| 数据层 | PostgreSQL、Prisma、JSONB | `server/prisma/schema.prisma` |

当前代码没有 Redis、Bull、Docker、Nginx 或 GitHub Actions 实现；这些只能视为目标态或待开发项。当前 Prisma schema 也没有 pgvector 字段或扩展依赖。

## 2. 目录结构

```text
pages/、pkg-settings/、pkg-social/   小程序页面与分包
components/、custom-tab-bar/        公共组件与导航
stores/、utils/、data/              状态、API 工具、mock 回落数据
server/src/                         NestJS 模块
server/voice-gateway/               WebSocket 语音链路与画像编排
server/prisma/                      Schema 与 SQL 迁移
docs/api/                           当前与规划接口契约
docs/architecture/                  当前架构和设计说明
docs/decisions/                     ADR 决策记录
```

文档唯一入口是 `docs/README.md`。不要恢复已删除的 `data/docs/`。

## 3. 环境要求

- Node.js 18 或更高版本；建议固定团队使用的主版本。
- npm；后端必须使用 `server/package-lock.json` 安装。
- PostgreSQL；执行数据库相关功能和集成验收时必须可连接。
- 微信开发者工具；前端预览、授权、支付和真机行为依赖它。
- 可选：火山引擎、微信小程序和微信商户平台的有效配置。

根目录只有 TypeScript 开发依赖和占位 `npm test`。当前主要可执行工具链位于 `server/`。

## 4. 环境配置

```bash
cd server
cp .env.example .env
```

`server/.env` 已被 Git 忽略，不得提交密钥。配置分组如下：

| 分组 | 变量 | 是否为核心运行所需 |
|---|---|---|
| 数据库 | `DATABASE_URL` | 业务 API 和语音持久化需要 |
| JWT | `JWT_SECRET`、`JWT_EXPIRES_IN` | HTTP 与语音网关必须保持一致 |
| 微信登录 | `WX_APPID`、`WX_SECRET` | 当前真实登录尚未接入 |
| LLM | `VOLC_API_KEY`、`VOLC_LLM_ENDPOINT`、`VOLC_LLM_MODEL` | 未配置时文字/语音回复降级 |
| ASR | `VOLC_SPEECH_AUTH_MODE`、`VOLC_ASR_*` | 未配置时语音网关使用 mock ASR |
| TTS | `VOLC_TTS_*` | 未配置时只返回文本事件 |
| 微信支付 | `WX_MCH_*`、`WX_PAY_NOTIFY_URL` | 真实下单和回调验签需要 |
| 订阅消息 | `WX_SUBSCRIBE_TMPL_ID` | 推送需要；前端模板 ID 目前也需单独配置 |
| 端口 | `PORT`、`VOICE_GATEWAY_PORT` | 默认 3000、3001 |

生产环境不得使用代码中的 `dev-secret` 回落值。启动时尚无集中式环境变量校验，因此部署前需要人工核对完整配置。

## 5. 安装与启动

### 5.1 后端依赖与数据库

```bash
cd server
npm ci
npx prisma generate
npx prisma migrate dev
```

`prisma migrate dev` 会修改目标数据库，只应对明确的本地开发库执行。生产部署应使用 `npx prisma migrate deploy`，但仓库当前还没有自动化部署流程。

### 5.2 HTTP 主服务

```bash
cd server
npm run start:dev
```

默认地址：`http://localhost:3000/api`。健康检查：`GET /api/health`。

数据库不可用时 NestJS 进程可能仍能启动且 `/health` 可响应，但依赖 Prisma 的业务接口会失败；这不是完整的“mock-only 后端”。

### 5.3 语音网关

```bash
cd server
npm run start:voice
```

默认地址：`ws://localhost:3001/ws/voice?token=<JWT>`。语音网关直接连接数据库，并与主服务共享 `JWT_SECRET`。

### 5.4 微信小程序

1. 用微信开发者工具导入仓库根目录。
2. 确认 `project.config.json` 的 appid 与当前账号一致。
3. 按开发环境修改 `utils/api.js` 中的 HTTP/WS host；模拟器通常可用 `localhost`，真机需使用可访问的局域网地址或 HTTPS/WSS 域名。
4. 编译并打开调试器检查登录、API 和 WebSocket 请求。

前端没有独立构建脚本，上传包由微信开发者工具生成。`project.config.json` 已排除 `server/`、`docs/` 等非小程序目录。

## 6. 核心架构与模块

请求链路：

```text
微信小程序 -> utils/api.js -> NestJS Controller -> Service -> Prisma -> PostgreSQL
微信小程序 -> WebSocket -> VoiceSession -> ASR/Dialogue/TTS -> Prisma/火山引擎
```

NestJS 当前模块：`health`、`auth`、`profile`、`memory`、`match`、`notifications`、`pay`、`llm`、`prisma`。语音网关不是 NestJS Module，而是独立进程；详细职责见 [后端架构与交接](architecture/后端架构.md)。

实际 HTTP 路由以控制器和 [API 总览](api/README.md) 为准。规划接口必须明确标记“未实现”，不能混入当前路由表。

## 7. 常用命令

在 `server/` 执行：

| 命令 | 用途 |
|---|---|
| `npm run start:dev` | 启动 NestJS watch 模式 |
| `npm run start:voice` | 启动语音网关 |
| `npm run build` | 编译主服务到 `server/dist/` |
| `npm run build:voice` | 编译语音网关到 `server/dist-voice/` |
| `npm run test:voice` | 构建并运行 coverage/probe_card 与 VoiceSession 生命周期测试 |
| `npm run smoke:tts` | 使用真实配置执行 TTS smoke test |
| `npm run prisma:generate` | 生成 Prisma Client |
| `npm run prisma:migrate` | 对本地开发库执行迁移 |
| `npx prisma validate` | 校验 Prisma schema |

## 8. 开发规范

- 以代码和可执行验证为事实来源；只有编译通过不能写成“真实链路已验收”。
- 新增或修改 API 时同步更新 `docs/api/`；字段命名遵循 [前后端字段对齐表](architecture/前后端字段对齐表.md)。
- Prisma schema 变更必须附迁移，并在进度文档中区分“迁移文件已生成”和“数据库已执行”。
- `data/mockData.js` 是受保护的前端兼容契约，未经明确授权不要修改。
- 前端 fallback 只用于开发/离线降级，不应吞掉需要用户感知的写操作失败。
- 跨表写入（支付、权益、匹配、通知）优先使用事务和幂等约束。
- 新文档必须登记到 `docs/README.md`；进度只在 `docs/DEV_PROGRESS.md` 维护。
- ADR 正文保留决策历史，当前实现变化通过状态注释校准。

## 9. 测试方式

完整基线见 [测试与验收](TESTING.md)。普通后端变更至少执行：

```bash
cd server
npm run build
npm run test:voice
npx prisma validate
```

涉及数据库、外部服务或前端交互时，必须追加相应集成/真机验收，不能以 mock 路径代替。

## 10. 构建与部署

本地生产构建：

```bash
cd server
npm ci
npx prisma generate
npm run build
npm run build:voice
```

产物启动命令：

```bash
npm run start:prod
npm run start:voice:prod
```

当前仓库没有 Dockerfile、Compose、Nginx、CI/CD、限流、集中日志或监控配置。生产部署还需要：

1. HTTPS/WSS 域名、证书和微信服务器域名白名单。
2. 独立启动并守护 HTTP 主服务与语音网关。
3. `prisma migrate deploy` 和数据库备份方案。
4. 生产密钥管理、健康检查、日志、告警、限流和回滚方案。
5. 真实支付回调公网地址和微信订阅消息模板。

## 11. 常见问题

### 服务启动了，但业务接口报数据库错误

`PrismaService` 会捕获初始连接失败，因此进程可能继续运行。检查 `DATABASE_URL` 和 PostgreSQL 状态；只有 `/health` 成功不能证明业务可用。

### 小程序请求不到本地后端

检查 `utils/api.js` 中的 host、开发者工具的“不校验合法域名”设置以及手机和电脑是否在同一网络。真机不能使用电脑的 `localhost`。

### 语音只有文字没有声音

检查 `VOLC_TTS_APPID`、`VOLC_TTS_TOKEN`、`VOLC_TTS_VOICE_TYPE`。未配置时网关按设计只发送文本并快速结束 TTS 回合。

### 为什么根目录 `npm test` 失败

根脚本是占位命令。当前自动化测试只有 `server` 下的 `npm run test:voice`。根 TypeScript 检查也尚未配置到可通过状态。

### 为什么支付显示“配置中”但页面变成已解锁

未配置微信商户号时，后端返回 `wxPayParams: null`，前端仅在本地进入 mock 解锁状态；这不会创建已支付权益，不能视为真实支付成功。

### 能否无后端运行前端

部分读取和展示路径有 mock fallback，但登录失败、写操作一致性和真实语音/支付能力仍依赖后端。不要把 fallback 当成完整离线模式。
