# 赛博聊机 · 当前开发进度

**更新时间**：2026-07-12
**事实基线**：`backend` 分支，提交 `ab42e83`；本次文档修改前工作树干净并与 `origin/backend` 同步
**状态口径**：`已完成` 表示代码存在且有仓库内验证；`进行中` 表示主要代码已存在但缺少数据库、外部服务或端到端证据；`待开发` 表示当前代码未实现。

本文件是唯一进度记录。设计目标、历史 ADR 和 mock fallback 不能作为完成证据。

## 1. 当前总览

| 能力 | 状态 | 依据 |
|---|---|---|
| 小程序页面与 API 调用层 | 进行中 | 核心页面已调用后端并保留 fallback；照片、洞察写操作等仍以本地状态为主 |
| NestJS HTTP 主服务 | 已完成（代码基线） | `npm run build` 通过，模块和路由已注册 |
| PostgreSQL/Prisma 模型 | 进行中 | schema 校验通过、迁移文件存在；本次未对数据库执行最新迁移 |
| Memory 文字聊天与画像 | 进行中 | LLM/fallback、历史、画像抽取代码存在；缺数据库集成与真实 LLM 验收 |
| 实时语音与 coverage 编排 | 进行中（`V-001 active`） | 网关编译通过、coverage 单测 8/8；按本文 Voice 收尾任务表推进 |
| 每周匹配 | 进行中 | 匹配引擎、Cron、结果和通知写入存在；缺真实候选池集成验收 |
| 通知中心 | 进行中 | 列表/已读/清空和前端 badge 已实现；订阅授权未持久化、未真机推送 |
| 微信支付 | 进行中 | 下单和回调代码、前端 `wx.requestPayment` 已实现；未完成真实商户链路验收 |
| 生产部署 | 待开发 | 无 Docker、CI/CD、反向代理、监控、限流和部署脚本 |

## 2. 已完成

- 小程序主包、设置分包、社交分包、自定义 tab bar 和基础状态管理已落库。
- 前端已有统一 `utils/api.js`，覆盖登录、资料、记忆、匹配、通知、支付和语音地址。
- NestJS 已包含 Health、Auth、Profile、Memory、Match、Notifications、Pay、LLM、Prisma 模块。
- Prisma 已定义用户、记忆、画像、语音、匹配、支付和通知模型，并包含三组迁移。
- 语音网关已实现 JWT 鉴权、ASR/TTS adapter、barge-in、probe_card、coverage、证据和跨会话状态代码。
- 匹配引擎、每周定时任务、文案 fallback、反馈写入和匹配通知代码已实现。
- 支付 V3 请求、回调验签/解密、权益写入和前端支付调用代码已实现。
- 本次验证：主服务编译通过、语音测试 8/8、Prisma schema 校验通过、23 个前端 JS 文件语法检查通过。
- 文档入口已统一为 `docs/README.md`，旧 `data/docs/` 已删除。

## 3. 进行中

- **真实身份链路**：前端已调用 `wx.login`，后端仍把 code 转为 `mock_openid_${code}`；openid/unionid 和实名状态未接微信接口。
- **数据库落地**：最新语音 coverage/evidence 迁移文件已提交，但本次没有对目标数据库执行或回归。
- **语音验收**：纯逻辑已测，真实 ASR/TTS/LLM、15 分钟收尾、断线续采、barge-in 和持久化未做整通验收。
- **前后端数据权威**：资料基本信息已接 API；照片墙仍本地保存，洞察编辑/删除仍只改本地 storage，用户主页 `author` 与 user id 语义未统一。
- **匹配验收**：需要至少两个具备有效画像和活跃数据的用户验证候选过滤、配对、轮次和通知。
- **支付/通知验收**：需要商户号、平台证书、回调域名、模板 ID 和真机；订阅授权接口当前未持久化。

## 4. Voice 收尾任务表

### 4.1 状态与门控

本表在正式接入 Harness 前承担 Voice 模块的人工状态机职责。允许状态：

- `not_started`：尚未开始。
- `active`：当前唯一允许实施的任务；全表同时最多一个。
- `blocked`：有明确阻塞原因，不能伪装成完成。
- `passing`：所有验证命令退出码为 0，且已登记验收证据。

状态转换规则：

1. `not_started` 或 `blocked` 进入 `active` 前，必须确认没有其他 `active` 项，并满足依赖。
2. `active` 只能在全部验证命令成功后进入 `passing`。
3. 验证失败时保持 `active`；无法继续时改为 `blocked` 并记录原因。
4. 当前尚不存在的测试文件或 npm script 是对应任务必须交付的一部分；在入口补齐并成功执行前，任务不得进入 `passing`。
5. 现有 `npm run test:voice` 的 8/8 只覆盖 coverage 纯逻辑，是共同基线，不替代下列任务的专项证据。

验收证据在接入 Harness 前直接登记在本节，格式为：`日期 · git commit · 命令/退出码 · 结果摘要`。接入后改为 `.harness/evidence/<task-id>/<timestamp>/result.json`。

除非任务另有说明，以下每个 PowerShell 验证块都从仓库根目录独立执行，不依赖前一个代码块留下的工作目录或环境状态。

### 4.2 任务总表

| ID | 任务 | 依赖 | 状态 | 验收证据 |
|---|---|---|---|---|
| V-001 | 会话生命周期与状态机可靠性 | 无 | `active` | 待生成 |
| V-002 | 回合、证据、coverage 与画像持久化一致性 | V-001 | `not_started` | 待生成 |
| V-003 | WebSocket 协议与小程序端收尾 | V-001、V-002 | `not_started` | 待生成 |
| V-004 | ASR/TTS/LLM adapter 契约与故障测试 | V-003 | `not_started` | 待生成 |
| V-005 | 本地 PostgreSQL + mock provider 全链路集成 | V-004 | `not_started` | 待生成 |
| V-006 | 真实火山服务 15 分钟整通验收 | V-005 | `not_started` | 待生成 |

当前 `active` 数量：**1**（V-001）。

### 4.3 V-001 会话生命周期与状态机可靠性

**可观察行为**：重复 `start/end/close/error` 不会创建重复会话或发送重复 `session_end`；会话结束后迟到的 ASR/LLM/TTS 回调不再改变状态；soft close、硬超时、extend 和主动挂断结果确定。

**必须交付**：`server/voice-gateway/session.test.ts`，覆盖正常回合、重复消息、并发结束、迟到回调、ASR/TTS 错误和计时器边界。

**验证命令**：

```powershell
cd server
npm run build:voice
node --test dist-voice/session.test.js
```

**验收证据**：待生成。当前状态为 `active`，未通过前不得启动 V-002。

### 4.4 V-002 持久化一致性

**可观察行为**：每个有效用户回合的 turn、evidence、coverage snapshot 和 profile 合并保持一致；写入失败不会留下“coverage 已推进但证据缺失”；所有结束原因幂等落库。

**必须交付**：`server/voice-gateway/dialogue.persistence.test.ts`，使用可清理的测试数据库覆盖成功、回滚、重复结束、纠正 supersede 和断线结束。

**验证命令**：

```powershell
cd server
npm run build:voice
node --test dist-voice/dialogue.persistence.test.js
```

**验收证据**：待生成。

### 4.5 V-003 WebSocket 协议与小程序端收尾

**可观察行为**：客户端与服务端对 `start/listen_ready/audio_chunk/end` 及全部服务端事件解释一致；收到 `session_end` 不会再次发送 `end`；错误、断线、fallback、TTS 队列排空和 barge-in 都能稳定收尾。

**必须交付**：`server/voice-gateway/ws-protocol.test.ts`，并完成 `pages/index/index.js` 对协议错误与结束路径的处理。

**验证命令**：

```powershell
node --check pages/index/index.js
cd server
npm run build:voice
node --test dist-voice/ws-protocol.test.js
```

**验收证据**：待生成。

### 4.6 V-004 Provider adapter 契约与故障测试

**可观察行为**：ASR/TTS/LLM 在成功、鉴权失败、超时、异常帧、断线和取消时都产生确定结果；任何 provider 故障都不会让会话永久停留在 `THINKING` 或 `TTS_STREAMING`。

**必须交付**：`asr.service.test.ts`、`tts.service.test.ts`、`dialogue.service.test.ts`，测试使用本地 fake WebSocket/HTTP provider，不依赖真实火山凭据。

**验证命令**：

```powershell
cd server
npm run build:voice
node --test dist-voice/asr.service.test.js dist-voice/tts.service.test.js dist-voice/dialogue.service.test.js
```

**验收证据**：待生成。

### 4.7 V-005 本地数据库全链路集成

**可观察行为**：使用测试 PostgreSQL 和 mock provider，从 JWT WebSocket 连接开始完成开场、回答、证据写入、收尾、断线续采和结束原因校验；测试可重复运行并清理数据。

**前置条件**：`VOICE_TEST_DATABASE_URL` 必须指向允许清空数据的专用测试库，严禁指向开发共享库或生产库。

**必须交付**：`server/voice-gateway/voice.integration.test.ts`，测试启动真实 gateway 进程或等价 server fixture。

**验证命令**：

```powershell
cd server
$env:DATABASE_URL = $env:VOICE_TEST_DATABASE_URL
npx prisma migrate deploy
npm run build:voice
node --test dist-voice/voice.integration.test.js
```

**验收证据**：待生成。

### 4.8 V-006 真实火山服务整通验收

**可观察行为**：在本地运行环境中使用真实 ASR/TTS/LLM 完成 15 分钟通话，覆盖正常回答、跳过、纠正、barge-in、soft close、硬超时和中断续采；数据库记录与前端播放结果一致。

**前置条件**：有效的火山测试凭据、V-005 通过、微信开发者工具或真机可连接本地网关。

**必须交付**：新增 `npm run smoke:voice`，以自动化客户端输出事件时序、延迟、结束原因和数据库校验摘要；真机播放结果作为补充人工证据。

**验证命令**：

```powershell
cd server
npm run smoke:tts
npm run smoke:voice
```

**验收证据**：待生成。没有真实凭据或仅 mock 通过时，不得进入 `passing`。

### 4.9 Harness 后续接入

Voice 收尾表稳定后再执行 Harness L1 接入，不在当前文档任务中提前创建。接入时：

1. 将 V-001 至 V-006 迁移到 `docs/FEATURES.json`，保持同一 ID、依赖语义、验证命令和当前状态。
2. 配置 `.harness/config.json` 的 `wip_limit: 1` 和 `completion_requires_verification: true`。
3. 使用 `scripts/harness/task.py` 完成状态转换，禁止手改 `passing`。
4. 将命令输出保存到 `.harness/evidence/`，会话交接写入 `.harness/session/`。
5. 只有迁移完成且 `doctor.py` 检查通过后，本节才降级为摘要并链接 `FEATURES.json`。

## 5. 待开发

- 微信 `jscode2session`、真实用户身份和实名认证状态方案。
- 照片上传/对象存储，以及前端照片墙改为后端权威数据源。
- 洞察编辑/删除的前端失败处理和后端同步闭环。
- 订阅消息授权记录、消费状态和重试策略。
- HTTP/数据库/WebSocket 集成测试、小程序端到端测试和 CI。
- 支付、匹配、通知多表写入的事务与幂等治理。
- 生产环境配置校验、限流、安全响应头、日志、监控、告警、备份和回滚。
- Docker/进程守护、HTTPS/WSS、域名白名单和部署自动化。
- 规划中的语音会话历史 HTTP API、设置/账号安全 API；这些接口当前未实现。

## 6. 已知问题

| 优先级 | 问题 | 影响 |
|---|---|---|
| P0 | Auth 使用 mock openid，JWT 允许回落到 `dev-secret` | 无法用于生产身份和安全边界 |
| P0 | 未执行最新数据库迁移和真实语音整通 | 核心语音能力尚无可运行证据 |
| P0 | 真实支付回调链路无验收，跨表写入不在事务中 | 可能出现订单、权益、解锁状态不一致 |
| P1 | `POST /notifications/subscribe` 不保存授权 | 推送实现无法证明用户授权可消费 |
| P1 | 前端 API host 写死在 `utils/api.js` | 模拟器、真机和生产环境切换容易出错 |
| P1 | 照片墙和洞察写操作仍以本地状态为主 | 后端与前端数据可能漂移 |
| P1 | 根 TypeScript 检查失败且根依赖未安装 | 前端 TS 文件没有稳定质量门禁 |
| P1 | 无 HTTP/DB/WS 集成测试和 CI | 编译通过仍可能存在运行时回归 |
| P2 | LLM 请求无明确 timeout/retry，DTO 校验有限 | 外部故障和非法输入处理不稳定 |
| P2 | 部分 fallback 吞掉写失败或模拟解锁成功 | 调试时可能误判真实功能状态 |

详细证据见 [代码审计](CODE_AUDIT.md)。

## 7. 下一步计划

1. **执行当前唯一 active 项 V-001**：先收敛 VoiceSession 生命周期、并发结束和迟到回调。
2. **按依赖顺序推进 V-002 至 V-005**：完成持久化、协议、provider contract 和本地数据库集成。
3. **具备火山测试凭据后执行 V-006**：完成 15 分钟真实整通并登记证据。
4. **Voice 达到 passing 后再恢复其他业务任务**：真实微信登录、照片/洞察契约、匹配、支付和通知验收。
5. **部署决定继续后置**：域名、Docker、CI、监控、限流和上线工程不阻塞 V-001 至 V-006 的本地开发。

## 8. 仍需项目负责人确认

- 微信实名认证的产品与技术口径，不能仅凭当前 mock 登录推断。
- 解锁价格与 SKU 是否固定为代码中的 `6.99` 元和 `unlock_wechat`。
- 照片存储供应商、生产域名和部署平台。
- 匹配开放规则是否严格为每周二、是否允许测试环境绕过。
- 订阅消息模板字段、正式环境状态和授权消费策略。
- 前端负责人何时配合完成 userId/author、照片墙、洞察和环境配置契约。
