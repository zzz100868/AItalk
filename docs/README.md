# 赛博聊机 · 文档索引

本目录是项目所有书面资料的唯一入口。文档中的“当前实现”必须以代码和可执行证据为准；目标态、规划接口和外部待验收能力必须明确标注。

## 目录结构

```
docs/
├── README.md              # 本文件，全局索引
├── DEVELOPMENT.md         # 开发环境搭建、启动命令、API 路由速查
├── TESTING.md             # 后端验证基线、手动验收与测试缺口
├── DEV_PROGRESS.md        # 当前真实进度、问题与下一步计划
├── CODE_AUDIT.md          # 当前代码风险、证据与治理入口
├── 上线申请清单.md          # 小程序上线申请事项、费用、时间线
├── product/               # 产品概念、需求、原始资料
├── architecture/          # 技术架构、模块方案、系统设计
├── api/                   # 后端接口文档（按模块拆文件）
├── decisions/             # ADR 架构决策记录（NNNN-标题.md）
└── Doubao/                # 火山引擎（豆包）API 参考文档
```

## 当前文档

### product/
- [产品概念文档](product/产品概念文档.md) — 产品定位、MVP 边界、核心玩法、66 题隐式融入机制
- [66题.xlsx](product/66题.xlsx) — 人格测试题原始题库
- [66题维度映射](product/66题维度映射.md) — 66 题拆成 10 个人格维度、题目归并、自然聊天话术、采样策略
- [语音画像采集设计](product/语音画像采集设计.md) — 15 分钟目标、probe_card 规范、coverage checklist、证据置信度、中断续采与降级策略

### architecture/
- [后端架构与交接](architecture/后端架构.md) — 当前后端/语音网关实现、模块边界、风险和接手顺序
- [前端架构](architecture/前端架构.md) — 小程序数据流、页面数据源、状态、fallback 与质量门禁
- [技术方案设计 v0.3](architecture/技术方案设计.md) — 当前运行形态、领域模块、数据模型、外部依赖与部署边界
- [对话编排设计](architecture/对话编排设计.md) — probe_card 驱动的会话状态机、coverage 引擎、证据追溯、跨会话续采与失败降级
- [匹配算法设计](architecture/匹配算法设计.md) — 打分公式、配对算法、文案生成、冷启动策略、反馈闭环
- [前后端字段对齐表](architecture/前后端字段对齐表.md) — 前端所有页面 data 字段 → 后端 API 响应的完整映射

### api/
- [API 总览](api/README.md) — 当前路由、鉴权、通用行为、规划接口与待定契约
- [Auth](api/auth.md) — 当前 mock 身份链路与真实微信登录待办
- [Profile](api/profile.md) — 基础资料、照片 URL 记录、用户主页与规划接口
- [Voice](api/voice.md) — 实时语音 WebSocket 协议与规划中的会话历史 API
- [Memory](api/memory.md) — 文字聊天、画像抽取、记忆洞察、人格档案
- [Match](api/match.md) — 预生成匹配结果、反馈和定时任务
- [Notifications](api/notifications.md) — 站内通知与未完成的订阅授权闭环
- [Payment](api/payment.md) — 微信支付代码、mock 行为和真实验收边界

### decisions/
- [ADR-0001 单体架构](decisions/0001-单体架构.md) — MVP 单体 + 独立语音网关
- [ADR-0002 真人认证选型](decisions/0002-真人认证选型.md) — 采用微信实名认证
- [ADR-0003 语音链路选型](decisions/0003-语音链路选型.md) — ASR/TTS/LLM 统一火山引擎
- [ADR-0004 数据库选型](decisions/0004-数据库选型.md) — PostgreSQL 已采用；pgvector 仍是目标态
- [ADR-0005 后端技术栈](decisions/0005-后端技术栈.md) — NestJS + TypeScript + Prisma；Redis/Bull/容器/CI 尚未落地

### Doubao/
- [大模型流式语音识别API](Doubao/大模型流式语音识别API.md) — 火山引擎 ASR WebSocket 协议参考
- [语音合成大模型API](Doubao/语音合成大模型API.md) — 火山引擎 TTS WebSocket 协议参考

### 开发 & 运维
- [开发指南](DEVELOPMENT.md) — 前后端开发环境搭建、启动命令、API 路由速查表
- [测试与验收](TESTING.md) — 后端主服务、语音网关、数据库迁移、支付/通知的验证基线
- [当前开发进度](DEV_PROGRESS.md) — 已完成、进行中、待开发、已知问题和下一步计划
- [代码审计记录](CODE_AUDIT.md) — 2026-07-12 代码、配置、Git 和验证证据审计
- [上线申请清单](上线申请清单.md) — 历史外部办理参考；政策、费用与时间需按实际申请日核验

## 维护约定

- 同一主题只保留一份权威文档；过期内容删除或文末标注 `已废弃`。
- 涉及"为什么选 A 不选 B"的判断写成 ADR，避免散落在正文。
- 文档标题用 `# 主标题`，正文从 `##` 起步。
- 进度只在 `DEV_PROGRESS.md` 维护；`CODE_AUDIT.md` 只记录问题和证据。
- 接口文档同时出现当前与规划内容时，必须分别列出，不能把未实现路由写成当前能力。
