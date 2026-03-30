---
id: tinygrad/tinygrad
title: tinygrad Analysis
source_type: github
upstream_url: "https://github.com/tinygrad/tinygrad"
generated_by: github-researcher
created_at: "2026-03-18T10:30:00Z"
updated_at: "2026-03-18T10:30:00Z"
tags: [deep-learning, framework, python, minimal, george-hotz]
language: zh
---
# tinygrad

> George Hotz 的极简深度学习框架

[![GitHub stars](https:///stars/tinyimg.shields.io/githubgrad/tinygrad)](https://github.com/tinygrad/tinygrad)
[![License](https://img.shields.io/github/license/tinygrad/tinygrad)](https://github.com/tinygrad/tinygrad)

## 概述

tinygrad 是由 George Hotz（geohot）创建的端到端深度学习框架，旨在成为介于 PyTorch 和 micrograd 之间的「极简但强大」的深度学习库。它的设计理念是保持代码简洁小巧（tiny）同时具备强大的深度学习能力。

tinygrad 受到 PyTorch（人体工程学）、JAX（函数式变换和基于 IR 的自动微分）和 TVM（调度和代码生成）的启发，但保持极简和可 hack 的特性。tiny corp 已获得融资，正在推动深度学习硬件的普及。

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | Python (64%), C (25%), CUDA (6%), C++ (2%), Metal (2%), Rust (1%) |
| 框架 | 自研 Tensor 库 + IR 编译器 |
| 构建工具 | pip, setuptools |
| 测试 | pytest, unittest |
| 后端 | CUDA, OpenCL, Metal, AMD, CPU, WebGPU |

## 项目结构

```
tinygrad/
├── tinygrad/                 # 核心框架
│   ├── runtime/              # 后端运行时 (CPU/CUDA/Metal/OpenCL)
│   ├── ops.py               # 算子定义
│   ├── tensor.py            # Tensor 类
│   ├── nn/                  # 神经网络模块
│   └── optim/               # 优化器
├── examples/                 # 示例代码
├── test/                     # 测试套件
├── docs/                     # 文档
└── README.md                 # 项目说明
```

## 核心特性

1. **极简 Tensor 库**: 带 autograd 的完整张量库，API 设计类似 PyTorch
2. **IR 编译器**: 中间表示层，支持算子融合和内核降级
3. **JIT 执行**: TinyJit 支持函数级即时编译和内核捕获重放
4. **多后端支持**: 支持 CUDA、OpenCL、Metal、AMD、CPU、WebGPU 等多种硬件加速器
5. **Lazy 执行**: 惰性求值机制，自动融合算子

## 架构设计

tinygrad 采用三层架构设计：

```
┌─────────────────────────────────────┐
│  nn / optim / datasets (高层 API)   │
├─────────────────────────────────────┤
│  Tensor + Autograd (核心 API)       │
├─────────────────────────────────────┤
│  IR + Compiler (编译层)              │
├─────────────────────────────────────┤
│  Runtime (GPU/CPU/Metal 后端)       │
└─────────────────────────────────────┘
```

**核心设计理念**：
- 所有复杂网络都可分解为 3 种 OpTypes：
  - **ElementwiseOps**: 逐元素操作 (SQRT, LOG2, ADD, MUL, WHERE)
  - **ReduceOps**: 归约操作 (SUM, MAX)
  - **MovementOps**: 数据移动操作 (RESHAPE, PERMUTE, EXPAND)
- 仅需 ~25 个底层算子即可支持新硬件后端

## 快速开始

### 安装

```bash
git clone https://github.com/tinygrad/tinygrad.git
cd tinygrad
python3 -m pip install -e .
```

### 基本使用

```python
from tinygrad import Tensor

x = Tensor.eye(3, requires_grad=True)
y = Tensor([[2.0, 0, -2.0]], requires_grad=True)
z = y.matmul(x).sum()
z.backward()

print(x.grad.tolist())  # dz/dx
print(y.grad.tolist())  # dz/dy
```

### 神经网络训练

```python
from tinygrad import Tensor, nn

class LinearNet:
  def __init__(self):
    self.l1 = Tensor.kaiming_uniform(784, 128)
    self.l2 = Tensor.kaiming_uniform(128, 10)
  
  def __call__(self, x: Tensor) -> Tensor:
    return x.flatten(1).dot(self.l1).relu().dot(self.l2)

model = LinearNet()
optim = nn.optim.Adam([model.l1, model.l2], lr=0.001)

x, y = Tensor.rand(4, 1, 28, 28), Tensor([2, 4, 3, 7])

with Tensor.train():
  for i in range(10):
    optim.zero_grad()
    loss = model(x).sparse_categorical_crossentropy(y).backward()
    optim.step()
    print(i, loss.item())
```

### 查看 Lazy 融合

```sh
DEBUG=3 python3 -c "from tinygrad import Tensor;
N = 1024; a, b = Tensor.empty(N, N), Tensor.empty(N, N);
(a.reshape(N, 1, N) * b.T.reshape(1, N, N)).sum(axis=2).realize()"
```

## 学习价值

- 理解深度学习框架的核心组件（Tensor、Autograd、Compiler、Runtime）
- 学习如何构建一个极简但完整的深度学习框架
- 掌握 GPU 编程基础和算子融合技术
- 理解 JIT 编译和惰性执行机制

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [karpathy/micrograd](https://github.com/karpathy/micrograd) | 微型自动微分库 | High |
| [pytorch/pytorch](https://github.com/pytorch/pytorch) | 深度学习框架 | High |
| [google/jax](https://github.com/google/jax) | 函数式深度学习 | Medium |
| [apache/tvm](https://github.com/apache/tvm) | 深度学习编译器 | Medium |

## 参考资料

- [GitHub Repository](https://github.com/tinygrad/tinygrad)
- [官方网站](https://tinygrad.org/)
- [文档](https://docs.tinygrad.org/)
- [Discord 社区](https://discord.gg/ZjZadyC7PK)

---

*Generated: 2026-03-18*
