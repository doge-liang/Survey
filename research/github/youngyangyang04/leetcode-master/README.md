# 代码随想录 · LeetCode-Master

> 《代码随想录》LeetCode 刷题攻略：200道经典题目刷题顺序，共60w字的详细图解，视频难点剖析，50余张思维导图，支持 C++、Java、Python、Go、JavaScript 等多语言版本。

[![GitHub stars](https://img.shields.io/github/stars/youngyangyang04/leetcode-master?style=flat&label=Stars)](https://github.com/youngyangyang04/leetcode-master)
[![GitHub forks](https://img.shields.io/github/forks/youngyangyang04/leetcode-master?style=flat&label=Forks)](https://github.com/youngyangyang04/leetcode-master/network/members)
[![GitHub issues](https://img.shields.io/github/issues/youngyangyang04/leetcode-master?style=flat&label=Issues)](https://github.com/youngyangyang04/leetcode-master/issues)
[![Contributors](https://img.shields.io/github/contributors/youngyangyang04/leetcode-master?style=flat&label=Contributors)](https://github.com/youngyangyang04/leetcode-master/graphs/contributors)

## 概述

**代码随想录**（LeetCode-Master）是由程序员 Carl（youngyangyang04）创建的开源算法刷题指南项目，于2019年12月首次发布，至今已获得超过 **60,000 颗 Stars** 和 **12,000 次 Forks**，是 GitHub 上最受欢迎的算法学习仓库之一。该项目作者为哈工大师兄，曾先后在腾讯、百度从事后端与底层技术研发，后出版了同名著《代码随想录》。

本项目的核心价值在于：帮助刷题者**省去海选题目、寻找优质题解和规划刷题路线**的时间成本。项目按知识脉络与难度排好了顺序，每道题目都配有**图文题解 + 视频讲解**，形成了「理论基础 → 实战题目 → 总结复盘」的全链路学习闭环。

该仓库还配套出版了纸质书籍、B站视频公开课（170+期）、PDF 精讲、知识星球学习社区，以及卡码网（KamaCoder）ACM 模式练习平台，形成了完整的算法学习生态。

## 技术栈

| 类别       | 技术/工具                                                      |
| ---------- | ------------------------------------------------------------- |
| 主要语言   | C++（题解主线）                                               |
| 社区贡献   | Java, Python, Go, JavaScript                                  |
| 内容格式   | Markdown                                                      |
| 可视化     | 思维导图（pics/ 目录下 50+ 张图片）                          |
| 练习平台   | 卡码网（kamacoder.com）ACM 模式                              |
| 学习生态   | B站视频、PDF 精讲、纸质书籍、知识星球                          |
| 协作平台   | GitHub Pull Request（390+ 贡献者）                            |

## 项目结构

```
youngyangyang04/leetcode-master/
├── README.md                    # 主入口，含完整刷题目录
├── .gitignore
├── pics/                       # 思维导图与图解图片
│   ├── damoxing.jpg            # 学习路线图
│   └── ...
└── problems/                   # 核心题解内容（按主题组织）
    ├── 前序/                   # 前置知识：复杂度分析、简历、Git、Vim 等
    ├── 数组理论基础.md
    ├── 0704.二分查找.md
    ├── 0027.移除元素.md
    │   ...（数组模块约9个文件）
    ├── 链表理论基础.md
    ├── 0203.移除链表元素.md
    │   ...（链表模块约9个文件）
    ├── 哈希表理论基础.md
    ├── 0242.有效的字母异位词.md
    │   ...（哈希表模块约11个文件）
    ├── 字符串总结.md
    ├── 0028.实现strStr.md       # KMP 算法详解
    │   ...（字符串模块约9个文件）
    ├── 双指针总结.md
    │   ...（双指针模块约11个文件）
    ├── 栈与队列理论基础.md
    ├── 0232.用栈实现队列.md
    │   ...（栈与队列模块约9个文件）
    ├── 二叉树理论基础.md
    ├── 二叉树的递归遍历.md
    ├── 0102.二叉树的层序遍历.md
    │   ...（二叉树模块约35个文件，含周总结）
    ├── 回溯算法理论基础.md
    ├── 0077.组合.md
    ├── 0051.N皇后.md
    │   ...（回溯模块约22个文件）
    ├── 贪心算法理论基础.md
    ├── 0455.分发饼干.md
    │   ...（贪心模块约24个文件）
    ├── 动态规划理论基础.md
    ├── 0509.斐波那契数.md
    ├── 0070.爬楼梯.md
    ├── 背包理论基础01背包-1.md   # 背包问题系列
    ├── 0416.分割等和子集.md
    ├── 0198.打家劫舍.md          # 打家劫舍系列
    ├── 0121.买卖股票的最佳时机.md  # 股票系列
    ├── 0300.最长上升子序列.md    # 子序列系列
    │   ...（动态规划模块约54个文件）
    ├── 0739.每日温度.md          # 单调栈
    │   ...（单调栈模块约5个文件）
    ├── kamacoder/               # 卡码网 ACM 模式题目
    │   ├── 图论理论基础.md
    │   ├── 图论深搜理论基础.md
    │   ├── 0098.所有可达路径.md
    │   ├── 0099.岛屿的数量深搜.md
    │   ├── 图论并查集理论基础.md
    │   ├── 0053.寻宝-prim.md      # 最小生成树
    │   ├── 0047.参会dijkstra朴素.md
    │   ├── 0094.城市间货物运输I.md # Bellman-Ford
    │   ├── 0097.小明逛公园.md     # Floyd 算法
    │   ├── 0126.骑士的攻击astar.md # A* 算法
    │   ├── 最短路问题总结篇.md
    │   └── 图论总结篇.md
    ├── 周总结/                   # 每周刷题复盘笔记
    └── 算法模板.md               # 各类算法模板汇总
```

## 核心特性

### 1. 科学编排的刷题顺序

项目按知识脉络编排，从「数组 → 链表 → 哈希表 → 字符串 → 栈与队列 → 二叉树 → 回溯 → 贪心 → 动态规划 → 单调栈 → 图论」，由浅入深、循序渐进。新手建议从「数组/链表/哈希/字符串」开始，再逐步进阶。

### 2. 全链路学习闭环

每个模块都遵循「**理论基础 → 实战题目 → 总结复盘**」三步走：
- **理论基础**：讲解核心概念与关键技巧（如 KMP 算法、二叉树遍历方式）
- **实战题目**：每题配有详细图文解析和视频讲解，覆盖高频面试题
- **总结复盘**：模块末尾有「总结篇」和「周总结」，帮助形成知识闭环

### 3. 多语言实现

主线题解以 C++ 编写，同时有社区贡献者提供了 Java、Python、Go、JavaScript 等多语言实现。算法思路是通用的，不同语言的实现让学习者可以用自己熟悉的语言来参考。

### 4. 思维导图与可视化

`pics/` 目录下提供了 50+ 张思维导图，涵盖每个专题的知识结构。动态规划部分还有「背包问题总结大纲」「股票问题总结」「子序列问题总结」等专题图，帮助理清知识点之间的关系。

### 5. ACM 模式实战

除了 LeetCode 平台题目外，还收录了卡码网（kamacoder.com）的 ACM 模式练习题，覆盖图论各类算法（DFS/BFS/并查集/Prim/Kruskal/Dijkstra/Bellman-Ford/Floyd/A*），填补了大多数刷题仓库忽视的「工程化输入输出」训练空白。

### 6. 完整学习生态

该项目不只是一个仓库，而是一个完整的学习生态：
- **纸质书籍**：《代码随想录》已正式出版
- **B站视频**：170+ 期算法公开课
- **PDF 精讲**：可下载的算法精讲 PDF
- **卡码笔记**：最强八股文精华
- **知识星球**：学习打卡、面试技巧、大厂内推

## 架构设计

本项目并非传统意义的软件项目，而是**内容驱动型的知识仓库**，其"架构"体现在内容组织层面：

### 内容分层架构

```
README.md（总览层）
  └── problems/（内容层）
       ├── 前序/（基础层）        → 时间复杂度、递归分析、简历、Git/Vim 工具
       ├── 专题目录/（核心层）    → 每个专题包含：理论 + 题目 + 总结
       ├── kamacoder/（拓展层）   → ACM 模式练习题
       └── 周总结/（复盘层）      → 每周学习复盘笔记
```

### 专题内容组织模式

每个算法专题（如「动态规划」）内部遵循统一模板：

```
1. 理论基础.md        → 概念讲解 + 核心思想
2. 简单题1.md         → 入门题目（图文 + 视频）
3. 简单题2.md
4. 中等题1.md         → 逐步提升
...
N. 总结篇.md          → 知识梳理 + 常见陷阱
```

### 动态规划专题的特殊设计

动态规划模块是项目最详尽的部分，设计了多个子系列：

| 子系列     | 代表题目                                               | 数量  |
| --------- | ----------------------------------------------------- | ----- |
| 基础系列   | 斐波那契数、爬楼梯、最大子序和                          | ~10   |
| 背包系列   | 01背包、完全背包、多重背包、分割等和子集、目标和          | ~15   |
| 打家劫舍   | 打家劫舍 I/II/III                                      | 3     |
| 股票系列   | 买卖股票最佳时机 I/II/III/IV + 冷冻期 + 含手续费          | 6     |
| 子序列系列 | 最长递增子序列、最长公共子序列、编辑距离、回文子串           | ~12   |

## 快速开始

### 方式一：直接阅读 README

1. 打开 [README.md](https://github.com/youngyangyang04/leetcode-master)
2. 从「前序·打基础」开始，按模块顺序一道一道刷
3. 每道题先看题解（图文），再看视频（B站搜索「代码随想录」）

### 方式二：本地阅读

```bash
# 克隆仓库
git clone https://github.com/youngyangyang04/leetcode-master.git
cd leetcode-master

# 推荐使用 Markdown 预览插件阅读
# VS Code: Markdown All in One / Markdown Preview Enhanced
# JetBrains: Markdown plugin
```

### 方式三：使用卡码网练手 ACM 题目

1. 访问 [kamacoder.com](https://kamacoder.com/)
2. 注册账号后，在仓库 `problems/kamacoder/` 下找到对应题目
3. 按照题目要求编写代码，提交到卡码网验证

### 学习路线建议

| 阶段     | 推荐模块                                                       | 目标              |
| -------- | ------------------------------------------------------------- | ----------------- |
| 入门     | 数组 → 链表 → 哈希表 → 字符串                                  | 掌握基础数据结构    |
| 进阶     | 二叉树 → 栈与队列 → 双指针                                      | 树结构与遍历思维    |
| 核心     | 回溯 → 贪心 → 动态规划                                         | 算法思想三板斧      |
| 拓展     | 单调栈 → 图论                                                  | 高级技巧与综合应用  |
| 实战     | kamacoder ACM 模式题                                            | 工程化输入输出      |

## 学习价值

- **系统化学习路径**：不必再为「刷什么题、从哪开始」而迷茫，200道题按知识脉络排好顺序，照着刷即可
- **高频面试题覆盖**：题目均选自 LeetCode 高频面试题，每个知识点都有代表性题目
- **图文并茂的理解**：50+ 思维导图 + 详细图文解析，比纯文字更易于理解复杂算法
- **多语言参考**：C++/Java/Python/Go/JS 多语言实现，适合不同技术背景的读者
- **动态规划体系**：动态规划被公认为算法学习最难部分，本项目的「子系列分解 + 模板化总结」是市面上最系统的讲解之一
- **ACM 模式训练**：图论部分配合卡码网练习，弥补了大多数仓库忽视的工程实践
- **社区互动**：390+ 贡献者持续维护，题解不断迭代优化

## 相关项目

| 项目                                                         | 描述                                                         | 相似度  |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------- |
| [labuladong/fucking-algorithm](https://github.com/labuladong/fucking-algorithm) | 「labuladong 的刷题笔记」，另一套知名算法学习仓库，侧重技巧总结 | High    |
| [kamyu104/LeetCode-Solutions](https://github.com/kamyu104/LeetCode-Solutions) | LeetCode 各题目完整题解，按 difficulty 分类                    | Medium  |
| [halfrost/LeetCode-Go](https://github.com/halfrost/LeetCode-Go) | LeetCode 全部题解的 Go 语言实现                               | Medium  |
| [youngyangyang04/keetcoder](https://github.com/youngyangyang04/keetcoder) | 代码随想录英文版，面向海外学习者                               | High    |
| [youngyangyang04/TechCPP](https://github.com/youngyangyang04/TechCPP) | C++ 面试与学习指南知识点整理                                  | High    |
| [youngyangyang04/kama-DesignPattern](https://github.com/youngyang04/kama-DesignPattern) | 23 种设计模式详解                                             | Medium  |
| [neetcode-io/neetcode](https://github.com/neetcode-io/neetcode) | NeetCode 的算法学习路线，英文版类似项目                        | Medium  |

## 参考资料

- [GitHub 仓库](https://github.com/youngyangyang04/leetcode-master)
- [Gitee 镜像](https://gitee.com/programmercarl/leetcode-master)
- [国内在线阅读](https://programmercarl.com/)
- [B站算法公开课](https://www.bilibili.com/video/BV1fA4y1o715)
- [卡码网练习平台](https://kamacoder.com/)
- [代码随想录知识星球](https://programmercarl.com/other/kstar.html)

---

*Generated: 2026-03-18*
*By: github-researcher skill (Survey Repository)*
