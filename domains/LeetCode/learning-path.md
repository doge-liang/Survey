# LeetCode 学习路径

> **适合人群**: 零基础至进阶程序员，目标是通过算法面试或提升编程能力
> **预计时间**: 3-6 个月（根据基础和目标调整）
> **更新日期**: 2026-03-11

## 概述

LeetCode 是全球最流行的在线编程练习平台，拥有 3000+ 道算法题目。它是准备技术面试的必备工具，也是提升算法和数据结构能力的有效途径。本学习路径采用"模式识别"方法论，帮助你从刷题新手成长为算法高手。

## 前置知识

- 至少掌握一门编程语言（推荐 Python、Java 或 C++）
- 了解基本的编程概念：变量、循环、条件判断、函数
- 如完全零基础，建议先完成入门课程

---

## 阶段一：入门基础 (Beginner)

**目标**: 熟悉 LeetCode 平台，掌握基础数据结构和算法模式
**预计时间**: 4-6 周

### 核心概念

1. **平台熟悉** - 题目界面、提交系统、测试用例、讨论区
2. **基础数据结构** - 数组、字符串、链表、栈、队列、哈希表
3. **基础算法模式** - 双指针、滑动窗口、二分查找

### 必读资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [LeetCode 官方新手指南](https://leetcode.com/explore/featured/card/the-leetcode-beginners-guide/) | 教程 | 2h | 官方出品，必读入门 |
| [代码随想录](https://github.com/youngyangyang04/leetcode-master) | 教程 | 持续 | 中文最强刷题攻略，60万字图解 |
| [LeetCode 75 学习计划](https://leetcode.com/studyplan/leetcode-75/) | 题单 | 3-4周 | 75道精选面试题，无 Hard 题 |
| [15 Patterns to Master LeetCode](https://blog.algomaster.io/p/15-leetcode-patterns) | 文章 | 1h | 模式识别方法论入门 |

### Easy 题目推荐 (25 道)

**数组与字符串**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 1 | Two Sum | 哈希表 |
| 26 | Remove Duplicates from Sorted Array | 双指针 |
| 27 | Remove Element | 双指针 |
| 88 | Merge Sorted Array | 双指针 |
| 283 | Move Zeroes | 双指针 |

**链表**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 21 | Merge Two Sorted Lists | 递归/迭代 |
| 83 | Remove Duplicates from Sorted List | 链表遍历 |
| 141 | Linked List Cycle | 快慢指针 |
| 206 | Reverse Linked List | 链表反转 |
| 234 | Palindrome Linked List | 快慢指针+反转 |

**栈与队列**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 20 | Valid Parentheses | 栈 |
| 232 | Implement Queue using Stacks | 栈模拟队列 |
| 225 | Implement Stack using Queues | 队列模拟栈 |

**二叉树基础**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 94 | Binary Tree Inorder Traversal | 递归/迭代 |
| 104 | Maximum Depth of Binary Tree | DFS |
| 226 | Invert Binary Tree | 递归 |
| 144 | Binary Tree Preorder Traversal | 递归/迭代 |

**其他**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 70 | Climbing Stairs | 动态规划入门 |
| 136 | Single Number | 位运算 |

### 刷题方法论

1. **每题限时 30 分钟** - 先独立思考，想不出来看提示或题解
2. **理解优于记忆** - 重点理解解题思路，不要背代码
3. **写题解笔记** - 用自己的话总结每道题的解法
4. **定期复习** - 一周后重做之前做过的题

### 检查点

完成本阶段后，你应该能够:
- [ ] 熟练使用 LeetCode 平台各项功能
- [ ] 独立解决 80% 的 Easy 题目
- [ ] 掌握双指针、滑动窗口的基本应用
- [ ] 理解递归的思想并能写出简单的递归代码

---

## 阶段二：进阶实践 (Intermediate)

**目标**: 掌握核心算法模式，能够解决 Medium 难度题目
**预计时间**: 6-10 周

### 核心技能

1. **进阶数据结构** - 二叉树、二叉搜索树、堆、图的基础
2. **核心算法模式** - DFS/BFS、回溯、动态规划入门、贪心
3. **模式识别能力** - 看到题目能联想到对应的解题模式

### 推荐资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [Blind 75 题单](https://algoark.io/blog/blind-75-leetcode-guide) | 题单 | 6-8周 | FAANG 面试必刷 75 题 |
| [DSA Patterns Master Guide](https://satyamparmar.blog/blog/dsa-patterns-master-guide/) | 教程 | 3h | 模式识别决策树 |
| [灵茶山艾府题单](https://leetcode.cn/discuss/post/RvFUtj/) | 题单 | 持续 | 中文社区高赞刷题路线 |
| [动态规划 7 大模式](https://algoark.io/blog/dynamic-programming-patterns-explained) | 教程 | 2h | DP 入门必读 |

### Medium 题目推荐 (40 道)

**双指针与滑动窗口**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 3 | Longest Substring Without Repeating Characters | 滑动窗口 |
| 15 | 3Sum | 双指针 |
| 11 | Container With Most Water | 双指针 |
| 567 | Permutation in String | 滑动窗口 |
| 438 | Find All Anagrams in a String | 滑动窗口 |

**二叉树**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 102 | Binary Tree Level Order Traversal | BFS |
| 98 | Validate Binary Search Tree | BST 性质 |
| 236 | Lowest Common Ancestor of Binary Tree | 递归 |
| 105 | Construct Binary Tree from Preorder and Inorder | 递归 |
| 199 | Binary Tree Right Side View | BFS |

**回溯算法**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 46 | Permutations | 回溯 |
| 78 | Subsets | 回溯 |
| 39 | Combination Sum | 回溯 |
| 79 | Word Search | 回溯+DFS |
| 17 | Letter Combinations of Phone Number | 回溯 |

**动态规划入门**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 198 | House Robber | 线性 DP |
| 300 | Longest Increasing Subsequence | LIS |
| 1143 | Longest Common Subsequence | 二维 DP |
| 322 | Coin Change | 背包问题 |
| 139 | Word Break | DP + 字符串 |

**图论基础**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 200 | Number of Islands | DFS/BFS |
| 133 | Clone Graph | DFS/BFS |
| 207 | Course Schedule | 拓扑排序 |
| 417 | Pacific Atlantic Water Flow | DFS |
| 130 | Surrounded Regions | DFS/BFS |

**堆与优先队列**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 215 | Kth Largest Element in an Array | 堆 |
| 347 | Top K Frequent Elements | 堆+哈希 |
| 23 | Merge k Sorted Lists | 堆 |

### 专题训练策略

按专题集中刷题，每个专题完成后做总结：

```
专题顺序建议：
1. 双指针专题 (1周)
2. 滑动窗口专题 (1周)
3. 二叉树专题 (2周)
4. 回溯专题 (1.5周)
5. 动态规划专题 (3周) ← 重点
6. 图论专题 (2周)
```

### 检查点

完成本阶段后，你应该能够:
- [ ] 独立解决 60% 的 Medium 题目
- [ ] 识别题目属于哪种算法模式
- [ ] 写出清晰的代码，考虑边界情况
- [ ] 能够分析时间和空间复杂度

---

## 阶段三：深入精通 (Advanced)

**目标**: 掌握高级数据结构和算法，能够解决 Hard 难度题目
**预计时间**: 8-12 周

### 高级主题

1. **高级数据结构** - 并查集、线段树、字典树、单调栈
2. **高级算法** - 高级 DP、图论算法、字符串匹配
3. **竞赛技巧** - 时间优化、空间优化、位运算技巧

### 深度资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [20 Patterns to Master DP](https://blog.algomaster.io/p/20-patterns-to-master-dynamic-programming) | 教程 | 3h | DP 进阶必读 |
| [LeetCode 竞赛](https://leetcode.com/contest/) | 实战 | 每周 | 周赛和双周赛 |
| [Hello Interview 免费课程](https://www.hellointerview.com/learn) | 课程 | 持续 | 可视化算法模式 |
| 《算法竞赛入门经典》 | 书籍 | - | 中文竞赛经典教材 |

### Hard 题目推荐 (25 道)

**动态规划进阶**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 10 | Regular Expression Matching | DP+字符串 |
| 72 | Edit Distance | 二维 DP |
| 124 | Binary Tree Maximum Path Sum | 树形 DP |
| 312 | Burst Balloons | 区间 DP |
| 1235 | Maximum Profit in Job Scheduling | DP+二分 |

**图论进阶**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 332 | Reconstruct Itinerary | 欧拉路径 |
| 743 | Network Delay Time | 最短路径 |
| 787 | Cheapest Flights Within K Stops | Bellman-Ford |
| 847 | Shortest Path Visiting All Nodes | BFS+状态压缩 |

**高级数据结构**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 295 | Find Median from Data Stream | 双堆 |
| 480 | Sliding Window Median | 双堆 |
| 212 | Word Search II | 字典树+DFS |
| 315 | Count of Smaller Numbers After Self | 线段树/树状数组 |

**经典 Hard**
| 题号 | 标题 | 知识点 |
|------|------|--------|
| 4 | Median of Two Sorted Arrays | 二分 |
| 239 | Sliding Window Maximum | 单调队列 |
| 42 | Trapping Rain Water | 单调栈/双指针 |
| 76 | Minimum Window Substring | 滑动窗口 |

### 竞赛技巧

1. **时间优化**
   - 预处理和打表
   - 剪枝优化
   - 位运算替代算术运算

2. **空间优化**
   - 滚动数组
   - 状态压缩
   - 原地修改

3. **调试技巧**
   - 边界测试
   - 极端情况
   - 随机测试

### 研究方向

1. **LeetCode 周赛** - 每周日上午，检验实战能力
2. **系统设计** - 面试 Senior 职位需要
3. **开源贡献** - 为 leetcode-master 等项目贡献题解

---

## 刷题策略和方法论

### 核心原则

1. **模式优于题量** - 掌握 15 个核心模式比刷 500 道题更有价值
2. **理解重于记忆** - 理解为什么这样做，而不是记住答案
3. **螺旋式上升** - 先过一遍基础，再深入每个专题

### 每日刷题流程

```
1. 读题 (5分钟)
   - 理解题目要求
   - 分析输入输出
   - 识别可能的模式

2. 思考 (15-20分钟)
   - 先想暴力解法
   - 再想优化方案
   - 卡住就看题解

3. 编码 (10-15分钟)
   - 写出清晰代码
   - 考虑边界情况
   - 分析复杂度

4. 复盘 (5分钟)
   - 总结解题思路
   - 记录到笔记
   - 标记需要复习的题
```

### 时间规划建议

| 阶段 | 每日时间 | 每周时间 | 建议 |
|------|----------|----------|------|
| 入门 | 1-2小时 | 7-10小时 | 重在坚持 |
| 进阶 | 2-3小时 | 15-20小时 | 专题突破 |
| 高级 | 2-4小时 | 15-25小时 | 参加竞赛 |

### 常见误区

1. **只刷不总结** - 刷完不复习等于白刷
2. **追求题量** - 理解 100 题比机械刷 500 题更有价值
3. **跳过 Easy** - Easy 题是建立信心和理解模式的基础
4. **只看题解** - 独立思考是能力提升的关键

---

## 社区资源

### 中文社区

- [力扣讨论区](https://leetcode.cn/discuss/) - 中文讨论
- [代码随想录](https://github.com/youngyangyang04/leetcode-master) - 50k+ stars 中文题解
- [灵茶山艾府题单](https://leetcode.cn/discuss/post/RvFUtj/) - 社区高赞刷题路线

### 英文社区

- [LeetCode Discuss](https://leetcode.com/discuss/) - 官方讨论区
- [r/leetcode](https://www.reddit.com/r/leetcode/) - Reddit 社区
- [AlgoMaster Newsletter](https://blog.algomaster.io/) - 高质量算法文章

---

## 相关领域

学完本路径后，可以继续探索:
1. **系统设计** - 面试高级职位必备
2. **竞赛编程** - Codeforces、AtCoder
3. **开源项目** - 参与算法库开发

---

*生成日期: 2026-03-11*
*资源数量: 90+ 题目推荐，15+ 核心资源*