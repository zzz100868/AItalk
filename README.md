# AItalk — 赛博聊机

一个以「安静社交」为理念的微信小程序，主打 AI 陪伴和灵魂匹配。为喜欢独处、深度思考和情绪敏感的人提供一个低压力的数字空间。

---

## 页面结构

### 核心页面

| 页面 | 功能描述 |
|------|---------|
| **启动页** | 品牌 Landing → 完善资料（年龄/性别/MBTI/状态）→ AI 语音通话模拟 |
| **匹配** | 灵魂匹配，随机推荐契合用户，显示契合度、标签、破冰话术；支持复制话术 |
| **记忆库** | 三栏 Tab：对话（与 AI 文字聊天，支持流式打字机回复）、记忆（对话洞察分类归档，支持编辑/删除）、档案（人格画像与特质标签） |
| **我的** | 个人资料卡、照片墙（最多 8 张）、设置入口 |

| Tab     | 页面                      | 功能                    |
| ------- | ----------------------- | --------------------- |
| **匹配**  | `pages/match/match`     | 灵魂匹配系统（当前 Mock 随机匹配）  |
| **记忆库** | `pages/memory/memory`   | AI 对话、记忆洞察、人格档案（三栏结构） |
| **我的**  | `pages/profile/profile` | 个人资料、相册管理、系统设置        |

- **用户主页**：点击头像可进入个人主页，查看资料与动态
- **编辑资料**：支持更换头像（相册/相机）、修改昵称和个人简介

### 子页面


| 页面                                               | 功能                               |
| ------------------------------------------------ | -------------------------------- |
| **聊天** `pages/index/index`                       | 与 AI「小雅」模拟语音通话（landing/call 双视图） |
| **设置** `pages/settings/settings`                 | 编辑资料、账号安全、缓存清理                   |
| **编辑资料** `pages/editProfile/editProfile`         | 修改头像/昵称/简介                       |
| **用户主页** `pages/userHome/userHome`               | 查看自己和他人主页                        |
| **账号安全** `pages/accountSecurity/accountSecurity` | 安全信息展示（纯 UI，操作 stub）             |
| **通知** `pages/notifications/notifications`       | 通知中心（Mock 2 条）                   |

- **设置中心**：清除缓存、版本检查、用户协议与隐私政策入口
- **账号安全**：入口预留
- **通知中心**：消息通知列表

---

## 技术栈

- **框架**：微信小程序原生开发
- **样式**：CSS 变量 + rpx 响应式布局，自定义 Design System
- **状态管理**：自研 `Store`（基于 Proxy，支持计算属性、批量更新、持久化、订阅机制）
- **数据连接**：`connectPage` / `connectComponent` 通过 Behavior 自动订阅/取消订阅 Store
- **数据持久化**：`wx.setStorage` / `wx.getStorage`
- **头像生成**：DiceBear API（Notionists / Lorelei 风格）
- **当前数据**：Mock 数据驱动（`USE_MOCK = true`），后续可平滑接入后端

---

## 项目结构

```
├── app.js / app.json / app.wxss          # 小程序入口与全局配置
├── custom-tab-bar/                       # 自定义底部 Tab Bar（匹配/记忆库/我的）
├── pages/
│   ├── index/        # 启动页（Landing + 资料表单 + AI 语音通话模拟）
│   ├── match/        # 匹配页（契合度、破冰话术、倒计时）
│   ├── memory/       # 记忆库（对话/记忆/档案三栏）
│   └── profile/      # 我的（个人资料、照片墙、设置入口）
├── pkg-settings/                         # 设置分包
│   ├── settings/     # 设置中心
│   ├── editProfile/  # 编辑资料
│   └── accountSecurity/ # 账号安全
├── pkg-social/                           # 社交分包
│   ├── userHome/     # 用户主页
│   └── notifications/ # 通知中心
├── stores/           # 自研状态管理（Store + connect）
│   ├── store.js      # 核心 Store 类（Proxy + 持久化 + 订阅）
│   ├── connect.js    # connectPage / connectComponent
│   ├── userStore.js  # 用户状态
│   └── appStore.js   # 应用状态
├── utils/
│   ├── request.js    # 请求封装（拦截器、重试、loading 管理）
│   ├── api.js        # 业务 API（当前为 Mock 实现）
│   ├── common.js     # 通用工具（storage、导航、安全操作）
│   └── setDataHelper.js # setData 批处理与智能路径更新
├── data/             # Mock 数据
│   └── mockData.js   # 用户、AI、匹配候选人、记忆洞察、聊天记录、AI 回复库
├── components/       # 公共组件
│   ├── page-header/  # 页面头部
│   ├── edit-modal/   # 编辑弹窗
│   └── skeleton/     # 骨架屏
└── images/           # Tab Bar 图标与头像占位
```

---

## 本地运行

### 环境要求

- Node.js 18+
- PostgreSQL 14+（需要 pgvector 扩展）
- 微信开发者工具（预览前端）

### 1. 后端服务

```bash
cd server
npm install
cp .env.example .env          # 编辑 .env 填入数据库地址和火山引擎密钥
npx prisma generate            # 生成 Prisma 客户端
npx prisma migrate dev         # 创建数据库表（需要 PostgreSQL 已启动）
npm run start:dev              # 启动 API 服务 → http://localhost:3000
```

### 2. 语音网关（WebSocket 服务）

语音通话依赖独立的 WebSocket 服务（ASR/TTS/LLM 实时通信）：

```bash
cd server
npm run start:voice            # 启动语音网关 → ws://localhost:3001
```

启动前确认 `.env` 中已配置以下字段：

- **低饱和度暖色调**：以 `#faf9f7` 为底，避免视觉疲劳
- **CSS 动画系统**：fadeInUp、scaleIn、ringPulse、meshFloat 等统一动画变量
- **自定义图标**：大量使用 CSS 伪元素绘制（心形、评论、箭头、相机等），零图标字体依赖
- **安全区适配**：全局处理 `safe-area-inset-top` / `safe-area-inset-bottom`
- **流式 AI 回复**：逐字输出 + 标点智能停顿，模拟真实打字节奏
- **关键词感知 Mock**：AI 回复根据用户输入关键词匹配话题分类（工作/情绪/关系/睡眠/美食等），后续接入真实 LLM 时只需替换 `api.js` 中的 `sendChatMessage`

---

## 设计风格

- **低饱和度暖色调**：以 `#faf9f7` 为底
- **CSS 动画系统**：fadeInUp、scaleIn、ringPulse 等统一变量
- **安全区适配**：全局处理 safe-area-inset-top/bottom

---

- 修复记忆库 AI 聊天偶发"发送失败"问题，增强 Mock 数据防御性
- 新增关键词感知 AI 回复库（10+ 话题分类，50+ 条回复）
- 流式回复升级为逐字输出 + 标点停顿，更接近真实对话体验
- 状态管理支持批量更新与路径 setData，性能优化
