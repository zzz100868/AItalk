# AItalk — 赛博聊机

一个以「安静社交」为理念的微信小程序，主打 AI 陪伴和灵魂匹配。为喜欢独处、深度思考和情绪敏感的人提供一个低压力的数字空间。

---

## 页面结构

### 底部 Tab（3 项）


| Tab     | 页面                      | 功能                    |
| ------- | ----------------------- | --------------------- |
| **匹配**  | `pages/match/match`     | 灵魂匹配系统（当前 Mock 随机匹配）  |
| **记忆库** | `pages/memory/memory`   | AI 对话、记忆洞察、人格档案（三栏结构） |
| **我的**  | `pages/profile/profile` | 个人资料、相册管理、系统设置        |


### 子页面


| 页面                                               | 功能                               |
| ------------------------------------------------ | -------------------------------- |
| **聊天** `pages/index/index`                       | 与 AI「小雅」模拟语音通话（landing/call 双视图） |
| **设置** `pages/settings/settings`                 | 编辑资料、账号安全、缓存清理                   |
| **编辑资料** `pages/editProfile/editProfile`         | 修改头像/昵称/简介                       |
| **用户主页** `pages/userHome/userHome`               | 查看自己和他人主页                        |
| **账号安全** `pages/accountSecurity/accountSecurity` | 安全信息展示（纯 UI，操作 stub）             |
| **通知** `pages/notifications/notifications`       | 通知中心（Mock 2 条）                   |


---

## 技术栈

- **框架**：微信小程序原生开发
- **样式**：CSS 变量 + rpx 响应式布局
- **数据持久化**：`wx.setStorage` / `wx.getStorage`
- **头像生成**：DiceBear API（Notionists / Lorelei 风格）
- **全局状态**：`app.globalData`（userInfo / memoryTargetTab / _cache）

---

## 项目结构

```
├── app.js / app.json / app.wxss     # 入口与全局配置
├── custom-tab-bar/                  # 自定义底部 Tab Bar（3 项）
├── pages/
│   ├── index/          # 聊天（AI 语音通话 Mock）
│   ├── match/          # 匹配（随机匹配 + 动画）
│   ├── memory/         # 记忆库（对话/记忆/档案）
│   ├── profile/        # 我的（资料+相册）
│   ├── settings/       # 设置
│   ├── editProfile/    # 编辑资料
│   ├── userHome/       # 用户主页
│   ├── accountSecurity/ # 账号安全
│   └── notifications/  # 通知中心
├── components/         # 公共组件
├── behaviors/          # 公共行为
├── utils/              # 工具函数
├── stores/             # 状态管理
├── data/               # Mock 数据
└── images/             # Tab Bar 图标
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

| 变量 | 用途 |
|---|---|
| `VOLC_SPEECH_AUTH_MODE` | `"old"` 旧版控制台 / `"new"` 新版 API Key |
| `VOLC_ASR_APPID` / `VOLC_ASR_TOKEN` / `VOLC_ASR_RESOURCE_ID` / `VOLC_ASR_WS_URL` | 火山引擎 ASR |
| `VOLC_TTS_APPID` / `VOLC_TTS_TOKEN` / `VOLC_TTS_RESOURCE_ID` / `VOLC_TTS_VOICE_TYPE` | 火山引擎 TTS |
| `VOLC_API_KEY` / `VOLC_LLM_ENDPOINT` / `VOLC_LLM_MODEL` | 豆包 LLM（对话生成） |

### 3. 微信小程序

1. 使用 **微信开发者工具** 导入项目根目录
2. 在 `utils/api.js` 确认 `BASE_URL` 和 `WS_VOICE_URL` 指向本地服务
3. 填写 `project.config.json` 中的 `appid`
4. 编译预览

### 开发常用命令

| 命令 | 位置 | 作用 |
|---|---|---|
| `npm run start:dev` | `server/` | API 服务热重载 |
| `npm run start:voice` | `server/` | 语音网关热重载 |
| `npm run build` | `server/` | 编译 API 服务 |
| `npm run build:voice` | `server/` | 编译语音网关 |
| `npx prisma studio` | `server/` | 数据库可视化 |
| `npx prisma migrate dev --name <name>` | `server/` | 创建迁移 |

---

## 设计风格

- **低饱和度暖色调**：以 `#faf9f7` 为底
- **CSS 动画系统**：fadeInUp、scaleIn、ringPulse 等统一变量
- **安全区适配**：全局处理 safe-area-inset-top/bottom

---

