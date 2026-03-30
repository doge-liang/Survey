---
id: kiranpalsingh1806/awesome-leetcode
title: Awesome Leetcode Analysis
source_type: github
upstream_url: "https://github.com/kiranpalsingh1806/awesome-leetcode"
generated_by: github-researcher
created_at: "2026-03-18T00:00:00Z"
updated_at: "2026-03-18T00:00:00Z"
tags: [algorithm, data-structures, leetcode, interview-preparation, dsa, competitive-programming, cpp]
language: zh
---
# Awesome Leetcode

> 一个精心整理的 LeetCode 题目、算法与数据结构合集。

[![GitHub stars](https://img.shields.io/github/stars/kiranpalsingh1806/awesome-leetcode)](https://github.com/kiranpalsingh1806/awesome-leetcode)
[![License](https://img.shields.io/github/license/kiranpalsingh1806/awesome-leetcode)](https://github.com/kiranpalsingh1806/awesome-leetcode)
[![Visitors](https://visitor-badge.laobi.icu/badge?page_id=kiranpalsingh1806.awesome-leetcode)](https://github.com/kiranpalsingh1806/awesome-leetcode)

## 概述

Awesome Leetcode 是由印度 Lovely Professional University 的全栈开发者 Kiranpal Singh 维护的一个精选算法学习资源库。该项目创建于 2022 年 2 月，旨在为程序员提供一份系统化、结构化的 LeetCode 题目分类索引与参考题解。

与大多数单纯的题解仓库不同，Awesome Leetcode 采用**按算法思维分类**的组织方式，将 LeetCode 题目归类为 41 个算法主题（如回溯、动态规划、图论、高级数据结构等），每个主题下列出题目编号、名称、难度等级和解题思路摘要，便于学习者按模块系统性地攻克算法知识。

项目采用 Markdown 作为文档格式，题解代码以 C++ 实现为主，代码以可折叠的 Markdown 代码块（`<details>`/`<summary>`）嵌入，便于阅读者先独立思考再看答案。

## 技术栈

| 类别     | 技术                          |
| -------- | ----------------------------- |
| 文档格式  | Markdown                      |
| 题解语言  | C++（C++17 标准）              |
| 标准库   | `vector`, `priority_queue`, `unordered_set`, `unordered_map`, `string` |
| 托管平台  | GitHub                        |
| 构建工具  | 无（静态文档仓库）              |
| 测试框架  | 无                            |

### 代码语言特征

项目中的 C++ 题解呈现出高度一致的代码风格：

```cpp
class Solution {
public:
    int someFunction(vector<int>& params) {
        // 清晰的变量命名
        // 标准库优先
        // 注释稀缺，依靠代码自解释
    }
};
```

- 使用 `vector<int>` 作为主要容器
- 优先利用 `sort`、`min`、`max` 等 STL 算法
- 优先队列使用 `priority_queue<int, vector<int>, greater<>>` 实现最小堆
- 动态规划以一维/二维 `vector<int>` DP 数组为主

## 项目结构

```
kiranpalsingh1806/awesome-leetcode/
├── README.md                     # 主索引文档（41 个算法主题目录）
├── solutions/                    # 题解文件（按算法类别组织）
│   ├── dp.md                     # 动态规划（10+ 题）
│   ├── binary-trees.md           # 二叉树（15 题）
│   ├── bit-manipulation.md       # 位运算（17 题）
│   ├── design.md                 # 设计实现（10 题）
│   ├── dfs.md                    # 深度优先搜索（13 题）
│   ├── dijksta.md                # Dijkstra 算法（11 题）
│   ├── dp.md                     # 动态规划
│   ├── euler-circuit.md          # 欧拉回路
│   ├── fenwick-tree.md           # 树状数组
│   ├── heaps/                    # 堆相关
│   │   └── kth-largest-element-in-array.md
│   ├── line-sweep.md             # 扫描线
│   ├── rolling-hash/             # 滚动哈希
│   │   └── shortest-palindrome.md
│   ├── segment-tree.md           # 线段树
│   ├── trie.md                   # 前缀树
│   └── [其他 30+ 主题文件]
├── markdown/                     # Markdown 格式辅助文档
└── random/                       # 其他辅助资源
```

### 目录组织逻辑

项目以**算法主题**而非题目编号为主线组织，这是其与大多数 LeetCode 题解仓库的根本区别。用户可以：

1. **按主题学习**：选定一个算法类别，系统性刷该分类下的所有题目
2. **按难度筛选**：每个主题下题目按 Easy → Medium → Hard 排列
3. **快速查阅**：通过 README 的目录导航快速定位到目标题目

## 核心特性

### 1. 41 个算法主题全覆盖

项目覆盖了 LeetCode 中最核心的算法思维类别：

| 分类编号 | 主题名称             | 典型题目数量 |
| -------- | ------------------- | ----------- |
| 1        | 回溯（Backtracking） | 15+         |
| 2        | 基础转换（Base Conversion）| 1      |
| 3        | Bellman Ford        | 2           |
| 4        | BFS（广度优先搜索）  | 2+          |
| 5        | 二分查找（Binary Search）| 3+      |
| 6        | 二叉树（Binary Trees）| 15          |
| 7        | 位运算（Bit Manipulation）| 17      |
| 8        | 位掩码（Bitmasks）   | 2           |
| 9        | 数组配对计数         | 2           |
| 10       | 自定义比较器         | 3           |
| 11       | 设计实现             | 10          |
| 12       | DFS（深度优先搜索）  | 13          |
| 13       | Dijkstra 算法        | 11          |
| 14       | **动态规划（DP）**   | 10          |
| 15       | 欧拉回路             | 3           |
| 16       | 树状数组             | 4           |
| 17       | 贪心调度             | 3+          |
| 18       | 堆（Heaps）          | 1+          |
| 19       | 区间（Intervals）    | 4+          |
| 20       | 扫描线（Line Sweep）  | 1+          |
| 21       | 链表（Linked List）   | 5+          |
| 22       | LIS（最长递增子序列） | 3+          |
| 23       | Manacher 算法        | 2+          |
| 24       | 矩阵（Matrix）        | 3+          |
| 25       | 归并排序             | 2+          |
| 26       | 最小生成树           | 2+          |
| 27       | 前缀状态映射         | 2+          |
| 28       | 查询（Queries）       | 3+          |
| 29       | 滚动哈希             | 1+          |
| 30       | **线段树（Segment Tree）**| 5+      |
| 31       | 集合（Sets）          | 2+          |
| 32       | 埃拉托斯特尼筛法     | 2+          |
| 33       | **滑动窗口**          | 4+          |
| 34       | 栈（Stack）          | 5+          |
| 35       | 字符串流             | 1           |
| 36       | 前 N 个自然数之和    | 1           |
| 37       | 拓扑排序             | 3+          |
| 38       | **前缀树（Trie）**    | 4+          |
| 39       | 二维平面             | 3+          |
| 40       | **双指针**            | 5+          |
| 41       | **并查集（Union Find）**| 4+        |

### 2. 可折叠代码块（`<details>`/`<summary>`）

所有题解均使用 Markdown 的 `<details>` 标签包裹代码：

```html
<details>
<summary>View Code</summary>

```cpp
// C++ 代码
```

</details>
```

这种设计鼓励学习者先独立思考，在需要时才展开查看答案，是非常好的异步学习交互设计。

### 3. 题目元数据标注

每个题目条目包含：

- **题目编号**：LeetCode 原始编号
- **题目名称**：带超链接的标题
- **难度等级**：Easy / Medium / Hard
- **Solution 链接**：指向具体题解文件

### 4. 高级数据结构专题

项目中包含多个面试高频高级数据结构专题：

- **Trie（前缀树）**：字符串前缀高效检索
- **Segment Tree（线段树）**：区间查询与修改
- **Fenwick Tree（树状数组）**：前缀和的动态维护
- **Union Find（并查集）**：不相交集合的合并与查询
- **LRU Cache**：哈希表 + 双向链表实现

### 5. 图论算法专题

覆盖面试中常见的图论题型：

- **Bellman Ford**：带负权边的最短路
- **Dijkstra**：非负权图最短路
- **BFS/DFS**：图的遍历
- **Euler Circuit**：Hierholzer 算法
- **Topological Sort**：DAG 排序

## 架构设计

Awesome Leetcode 采用**索引驱动的知识库架构**，整体设计简洁高效：

### 核心设计理念

```
LeetCode 题目群  →  按算法思维分类  →  Markdown 索引  →  可折叠题解
```

1. **主题分类层（README.md）**：作为全局索引，按 41 个主题分类，提供题目目录导航
2. **题解内容层（solutions/*.md）**：每个主题对应一个 Markdown 文件，内含该分类下所有题目的详细题解
3. **代码呈现层**：使用 `<details>` 标签实现交互式代码折叠

### 数据模型

题解文件采用统一的 Markdown 结构：

```md
## 题目名称

<details>
<summary>View Code</summary>

```cpp
// C++ 实现
class Solution { ... };
```

</details>
```

### 无后端架构

这是一个纯静态文档仓库，不需要：
- 构建系统（no `npm`/`make`/`cargo`）
- 测试框架
- CI/CD 流程
- 依赖管理

所有内容通过 GitHub 原生渲染即可阅读。

## 快速开始

### 使用方式一：按主题学习

1. 打开 [README.md](https://github.com/kiranpalsingh1806/awesome-leetcode)，浏览 41 个算法主题目录
2. 选择感兴趣的主题（如"14. 动态规划"）
3. 找到对应题目，点击 Solution 链接
4. 先尝试独立解决，再展开代码对照

### 使用方式二：刷题顺序推荐

对于准备技术面试的学习者，建议按以下顺序攻克：

**第一阶段 — 基础算法思维（2-3 周）**
- 二分查找 → 双指针 → 滑动窗口
- 链表操作（反转、检测环）
- 二叉树遍历（前/中/后序）

**第二阶段 — 核心算法（2-3 周）**
- 动态规划（状态机、子数组/子序列模型）
- 回溯（组合、排列、子集）
- BFS / DFS 图搜索

**第三阶段 — 高级数据结构（1-2 周）**
- 堆（Top-K、中位数）
- 并查集
- 线段树 / 树状数组
- Trie 前缀树

**第四阶段 — 图论与专项（1-2 周）**
- Dijkstra / Bellman Ford
- 拓扑排序
- 欧拉回路
- 贪心调度

### 使用方式三：本地阅读

```bash
# 克隆仓库
git clone https://github.com/kiranpalsingh1806/awesome-leetcode.git
cd awesome-leetcode

# 直接在本地用 Markdown 阅读器打开 README.md
# 推荐 VS Code + Markdown All in One 插件
```

## 学习价值

 Awesome Leetcode 项目的核心价值在于其**分类体系设计**，而非单纯的题解代码本身。

### 可学习的知识点

- **算法思维的分类方法**：理解为何将"滑动窗口"和"双指针"作为独立类别，以及它们之间的联系与区别
- **C++ 标准库的熟练运用**：`vector`、`priority_queue`、`unordered_map` 等 STL 容器的工程级用法
- **动态规划的状态建模**：如何将实际问题抽象为 DP 状态方程（以一维/二维数组为载体）
- **高级数据结构的原理**：
  - 线段树的区间懒传播
  - Trie 的字符路径压缩
  - 并查集的路径压缩 + 秩合并
- **面试中高频出现的模式识别**：同一算法类别下的题目往往共享相似的解题框架

### 代码风格特点

项目代码展示了简洁、实用的 C++ 风格：

- **优先 STL**：不重复造轮子，充分利用 `sort`、`min`、`max` 等标准库
- **避免复杂模板**：使用基础 `vector<int>` 而非复杂模板元编程，降低理解门槛
- **空间换时间**：常用辅助数组/哈希表优化时间复杂度

### 局限性

- 题解**缺少文字分析**：大多数题目只有代码，没有算法思路、时间/空间复杂度的文字说明
- **部分 Solution 链接指向外部仓库**（`awesome-dsa`），存在链接失效风险
- 题目数量有限（总计约 200+ 题），不足以覆盖 LeetCode 全部高频题
- 没有测试用例，无法验证代码正确性

## 相关项目

| 项目                              | 描述                                                      | 相似度 |
| -------------------------------- | --------------------------------------------------------- | ------ |
| [ashishps1/awesome-leetcode-resources](https://github.com/ashishps1/awesome-leetcode-resources) | 含 16000+ Stars 的 LeetCode 学习资源集，含算法模式和面试指南 | 高     |
| [AnasImloul/Leetcode-Solutions](https://github.com/AnasImloul/Leetcode-Solutions) | 覆盖 1800+ 题、7000+ 解的多语言题解仓库                    | 高     |
| [tangweikun/awesome-leetcode](https://github.com/tangweikun/awesome-leetcode) | 多语言（JS/Java/C++/Python/Go/Rust）LeetCode 题解合集     | 高     |
| [kiranpalsingh1806/DSA-Code-Snippets](https://github.com/kiranpalsingh1806/DSA-Code-Snippets) | 同一作者维护的 DSA 代码片段库                              | 高     |
| [yanglr/awesome-leetcode](https://github.com/yanglr/awesome-leetcode) | LeetCode 开源项目与资源的精选列表                          | 中     |
| [thectogeneral/leetcode-master](https://github.com/thectogeneral/leetcode-master) | 精选高质量 LeetCode 题解集合                               | 中     |
| [LeetCode 官方](https://leetcode.com) | LeetCode 题目平台，包含所有原题、讨论区和官方题解            | 基准   |

## 参考资料

- [GitHub 仓库](https://github.com/kiranpalsingh1806/awesome-leetcode)
- [LeetCode 题目平台](https://leetcode.com)
- [awesome-dsa（同作者配套仓库）](https://github.com/kiranpalsingh1806/awesome-dsa)
- [Kiranpal Singh 的 GitHub 个人主页](https://github.com/kiranpalsingh1806)

---

*Generated: 2026-03-18*
*研究工具: github-researcher skill*
