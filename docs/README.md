# 赛博聊机 · 文档索引

本目录是项目所有书面资料的统一入口。新增文档请放入对应子目录，并回到本文件登记一条索引。

## 目录结构

```
docs/
├── README.md              # 本文件，全局索引
├── DEVELOPMENT.md         # 开发环境搭建、启动命令、API 路由速查
├── TESTING.md             # 后端验证基线、手动验收与测试缺口
├── DEV_PROGRESS.md        # 分阶段开发路线表及进度
├── CODE_AUDIT.md          # 代码通读审计记录、已知问题与修复入口
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

### architecture/
- [后端架构与交接](architecture/后端架构.md) — 当前后端/语音网关实现、模块边界、风险和接手顺序
- [技术方案设计 v0.2](architecture/技术方案设计.md) — 总体架构、域模型、关键模块、API 清单、风险与排期
- [对话编排设计](architecture/对话编排设计.md) — 会话状态机、双 LLM 架构、维度采样优先级、安全边界
- [匹配算法设计](architecture/匹配算法设计.md) — 打分公式、配对算法、文案生成、冷启动策略、反馈闭环
- [前后端字段对齐表](architecture/前后端字段对齐表.md) — 前端所有页面 data 字段 → 后端 API 响应的完整映射

### api/
- [API 总览](api/README.md) — 鉴权、错误码、分页、时间格式、文件上传等通用约定
- [Auth](api/auth.md) — 微信登录（P0）+ 实名认证（微信实名）
- [Profile](api/profile.md) — 用户资料、照片墙、他人主页（P0）+ 设置/帐号安全（P1）
- [Voice](api/voice.md) — 实时语音 WebSocket 协议（P0）+ 会话历史（P1）
- [Memory](api/memory.md) — 文字聊天、记忆洞察、人格档案（P0）
- [Match](api/match.md) — 每周匹配（P0）+ 反馈（P1）+ 解锁（P2）
- [Notifications](api/notifications.md) — 通知列表（P1）
- [Payment](api/payment.md) — 微信支付 + 权益解锁（P2）

### decisions/
- [ADR-0001 单体架构](decisions/0001-单体架构.md) — MVP 单体 + 独立语音网关
- [ADR-0002 真人认证选型](decisions/0002-真人认证选型.md) — 采用微信实名认证
- [ADR-0003 语音链路选型](decisions/0003-语音链路选型.md) — ASR/TTS/LLM 统一火山引擎
- [ADR-0004 数据库选型](decisions/0004-数据库选型.md) — PostgreSQL + pgvector 一库承载
- [ADR-0005 后端技术栈](decisions/0005-后端技术栈.md) — NestJS + TypeScript + Prisma + Bull

### Doubao/
- [大模型流式语音识别API](Doubao/大模型流式语音识别API.md) — 火山引擎 ASR WebSocket 协议参考
- [语音合成大模型API](Doubao/语音合成大模型API.md) — 火山引擎 TTS WebSocket 协议参考

### 开发 & 运维
- [开发指南](DEVELOPMENT.md) — 前后端开发环境搭建、启动命令、API 路由速查表
- [测试与验收](TESTING.md) — 后端主服务、语音网关、数据库迁移、支付/通知的验证基线
- [开发进度路线表](DEV_PROGRESS.md) — Phase 1–7 分阶段开发计划及当前进度
- [代码通读审计记录](CODE_AUDIT.md) — 2026-06-11 代码通读发现的问题、风险和建议修复入口
- [上线申请清单](上线申请清单.md) — 小程序上线需要申请的全部事项（含流程、费用、时间预估）

## 维护约定

- 同一主题只保留一份权威文档；过期内容删除或文末标注 `已废弃`。
- 涉及"为什么选 A 不选 B"的判断写成 ADR，避免散落在正文。
- 文档标题用 `# 主标题`，正文从 `##` 起步。
