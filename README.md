# AItalk — 赛博聊机

一个以「安静社交」为理念的微信小程序，主打 AI 陪伴和灵魂匹配。为喜欢独处、深度思考和情绪敏感的人提供一个低压力的数字空间。

**当前阶段**：纯前端 Mock 实现，无后端服务接入。

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

1. 克隆仓库
2. 使用 **微信开发者工具** 导入项目根目录
3. 填写 `appid`（测试号亦可），即可预览

---

## 设计风格

- **低饱和度暖色调**：以 `#faf9f7` 为底
- **CSS 动画系统**：fadeInUp、scaleIn、ringPulse 等统一变量
- **安全区适配**：全局处理 safe-area-inset-top/bottom

---

