# LeetHub

> 自动将 LeetCode 解题代码同步到 GitHub 的 Chrome 扩展

[![GitHub stars](https://img.shields.io/github/stars/QasimWani/LeetHub)](https://github.com/QasimWani/LeetHub)
[![License](https://img.shields.io/github/license/QasimWani/LeetHub)](https://github.com/QasimWani/LeetHub)

## 概述

**LeetHub** 是一款 Chrome 浏览器扩展，能够在你通过 LeetCode 题目测试后，自动将解题代码推送到指定的 GitHub 仓库。这是 GitHub 上 Top 5 的热门 JavaScript 项目之一，帮助开发者轻松构建算法能力的可视化作品集。

项目的核心理念是：**让算法练习成为你的开源贡献**。通过自动同步机制，省去了手动复制粘贴代码的繁琐步骤，让刷题过程完全自动化。

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 语言     | JavaScript (83.1%), HTML (13.5%), CSS (3.3%) |
| 运行环境 | Chrome Extension API |
| 依赖管理 | npm                 |
| 代码规范 | ESLint, Prettier    |
| 许可证   | MIT                 |

## 项目结构

```
QasimWani/LeetHub/
├── scripts/              # 核心脚本
│   ├── authorize.js      # GitHub OAuth 授权
│   ├── background.js     # 后台服务脚本
│   ├── content.js        # 内容页面脚本
│   ├── leetcode.js       # LeetCode 页面交互
│   └── popup.js          # 扩展弹窗逻辑
├── css/                  # 样式文件
│   ├── bootstrap.min.css
│   └── popup.css
├── welcome.html          # 欢迎页面
├── popup.html            # 扩展弹窗
├── manifest.json         # 扩展配置
├── package.json          # npm 配置
└── assets/               # 图标和静态资源
```

## 核心特性

1. **自动同步**
   - 通过 LeetCode 测试后，代码自动推送到 GitHub
   - 同步速度约 400ms（比手动操作快 530 倍）
   - 支持自动创建仓库和文件目录结构

2. **智能组织**
   - 按题目难度（Easy/Medium/Hard）分类
   - 按题目类型（数组、链表、树等）分组
   - 自动生成 README 统计信息

3. **完整元数据**
   - 记录解题时间
   - 保存题目描述
   - 统计提交次数和通过率

4. **安全可靠**
   - 仅在本地运行，不涉及第三方服务器
   - 仅调用 GitHub API 进行认证和推送
   - 支持私有仓库（默认）

5. **多平台支持**
   - Chrome Web Store 官方扩展
   - Firefox 版本（社区维护）
   - 支持新版 LeetCode UI

## 架构设计

LeetHub 采用典型的 Chrome Extension 架构：

```
┌─────────────────────────────────────────┐
│           LeetCode Website              │
│  ┌─────────────────────────────────┐    │
│  │  content.js (内容脚本)           │    │
│  │  - 监听提交按钮                  │    │
│  │  - 提取代码和元数据               │    │
│  └────────────┬────────────────────┘    │
└───────────────┼─────────────────────────┘
                │ 消息传递
┌───────────────┼─────────────────────────┐
│  Chrome Ext.  │                         │
│  ┌────────────▼────────────────────┐    │
│  │  background.js (后台脚本)        │    │
│  │  - 接收提交事件                  │    │
│  │  - 调用 GitHub API              │    │
│  └────────────┬────────────────────┘    │
│               │                         │
│  ┌────────────▼────────────────────┐    │
│  │  GitHub API                     │    │
│  │  - OAuth 认证                    │    │
│  │  - 仓库操作                      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**工作流程**：
1. 用户安装扩展并授权 GitHub
2. content.js 注入 LeetCode 页面，监听提交事件
3. 检测到通过后，通过消息通道通知 background.js
4. background.js 调用 GitHub API 推送代码
5. 更新统计信息和 README

## 快速开始

### 安装扩展

**方式一：Chrome Web Store（推荐）**
1. 访问 [Chrome Web Store - LeetHub](https://chrome.google.com/webstore/detail/leethub/aciombdipochlnkbpcbgdpjffcfdbggi)
2. 点击「添加至 Chrome」
3. 固定扩展图标到工具栏

**方式二：本地开发版**
```bash
# 克隆仓库
git clone https://github.com/QasimWani/LeetHub.git
cd LeetHub

# 安装依赖
npm install

# 构建扩展
npm run setup

# 在 Chrome 中加载
# 1. 访问 chrome://extensions/
# 2. 开启「开发者模式」
# 3. 点击「加载已解压的扩展程序」
# 4. 选择 LeetHub 文件夹
```

### 配置使用

1. **授权 GitHub**：点击扩展图标 → 「Authorize with GitHub」
2. **选择仓库**：创建新仓库或选择已有仓库（默认私有）
3. **开始刷题**：正常在 LeetCode 解题，通过测试后代码自动同步

### 查看进度

- 点击扩展图标查看统计信息
- 访问 GitHub 仓库查看完整代码库
- README 自动生成解题统计

## 学习价值

1. **Chrome Extension 开发范例**
   - 学习 content scripts 和 background scripts 通信
   - 掌握浏览器扩展的权限系统
   - 理解 OAuth 流程在扩展中的实现

2. **GitHub API 实践**
   - 学习如何程序化操作 GitHub 仓库
   - 了解 REST API 的认证和调用方式
   - 掌握仓库、文件、分支等概念

3. **DOM 操作与事件监听**
   - 学习如何在第三方网站注入脚本
   - 掌握 MutationObserver 监听页面变化
   - 了解跨域通信的安全限制

4. **开源项目运营**
   - 了解如何推广开源工具
   - 学习社区反馈收集和功能迭代
   - 掌握扩展商店的发布流程

5. **产品思维培养**
   - 解决真实痛点（手动同步繁琐）
   - 极致用户体验（400ms自动同步）
   - 病毒式传播（GitHub作品集展示）

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [arunbhardwaj/LeetHub-2.0](https://github.com/arunbhardwaj/LeetHub-2.0) | LeetHub v2，支持新版 LeetCode UI | 高 |
| [QasimWani/LeetHub](https://github.com/QasimWani/LeetHub) | 原版 LeetHub（本仓库） | - |
| [LeetCode](https://leetcode.com) | 算法练习平台 | 中 |
| [youngyangyang04/leetcode-master](https://github.com/youngyangyang04/leetcode-master) | 代码随想录算法学习 | 中 |
| [kiranpalsingh1806/awesome-leetcode](https://github.com/kiranpalsingh1806/awesome-leetcode) | LeetCode 题解汇总 | 中 |

## 参考资料

- [GitHub Repository](https://github.com/QasimWani/LeetHub)
- [Chrome Web Store](https://chrome.google.com/webstore/detail/leethub/aciombdipochlnkbpcbgdpjffcfdbggi)
- [LeetHub v2 (新版)](https://github.com/arunbhardwaj/LeetHub-2.0)
- [LeetHub GitHub Marketplace](https://github.com/marketplace/leet-hub)

---

*Generated: 2026-03-18*
