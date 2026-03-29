---
id: q3-robust-planning
title: "Q3: 多步工具调用容错规划"
category: agent-reasoning
level: advanced
tags: [retry, rollback, replanning, fault-tolerance, agent]
related-questions: [q1, q2, q4]
date: 2026-03-30
---

# Q3: 多步工具调用容错规划

## 1. 概述

### 1.1 问题背景

在大型语言模型（LLM）代理系统中，多步工具调用是实现复杂任务的核心范式。一个典型的任务流程可能涉及多个阶段的工具调用，例如信息检索、数据处理、结果验证等。然而，在实际运行环境中，任何工具调用都可能出现失败：网络延迟导致超时、API 服务不可用、数据格式不匹配、权限错误等。

考虑一个典型的任务场景：

```
任务：调研三篇关于RAG+RL的论文并输出中文总结

Step 1: 搜索论文
  └─ 调用 Semantic Scholar API 搜索 "RAG Reinforcement Learning"
  └─ 可能失败：API 超时、网络中断、API Key 无效

Step 2: 获取论文详情
  └─ 根据搜索结果获取论文摘要
  └─ 可能失败：论文 ID 无效、摘要格式错误

Step 3: 筛选高质量论文
  └─ 根据引用数、发表 venue 等条件筛选
  └─ 可能失败：数据缺失、筛选逻辑错误

Step 4: 生成中文总结
  └─ 调用 LLM 生成总结
  └─ 可能失败：LLM API 超时、内容质量不达标
```

这种多步调用链中，任何一步的失败都可能导致整个任务无法完成。因此，设计一个鲁棒的多步工具调用规划机制至关重要。

### 1.2 容错规划的核心挑战

容错规划机制需要解决以下核心挑战：

1. **不确定性**：LLM 生成的工具调用计划可能基于不完整或不准确的信息，需要在执行过程中动态调整。

2. **部分失败**：复杂任务中的多个子任务可能部分成功部分失败，需要优雅地处理这种状态。

3. **状态管理**：多步任务需要维护全局状态，包括已完成步骤的中间结果、当前执行位置等。

4. **恢复与继续**：当某个步骤失败时，系统需要决定是重试、回滚还是重新规划。

5. **资源限制**：API 调用有速率限制、Token 限制等，需要在容错设计中考虑这些约束。

### 1.3 容错策略分类

本文将容错规划策略分为三大类：

| 策略类型 | 核心思想 | 适用场景 | 代表性工作 |
|---------|---------|---------|-----------|
| 重试策略 | 重复执行失败操作 | 瞬时故障、可恢复错误 | Exponential Backoff, Circuit Breaker |
| 回滚策略 | 恢复到之前稳定状态 | 不可恢复错误、需要重新开始 | Checkpointing, State Rollback |
| 重规划策略 | 动态调整执行计划 | 环境变化、计划不可行 | Reflexion, ReWOO |

### 1.4 章节安排

本章后续内容安排如下：第 2 节详细介绍重试策略及其实现；第 3 节阐述回滚策略的机制；第 4 节讨论重规划策略；第 5 节给出综合容错架构的设计方案；第 6 节提供完整的代码示例；第 7 节总结相关论文和参考文献。

---

## 2. 重试策略 (Retry Strategy)

### 2.1 重试策略概述

重试策略是最基本的容错机制，其核心思想是：当工具调用失败时，在一定条件下重复执行该操作。重试策略假设大多数失败是暂时性的，通过适当的等待后再次尝试可以成功。

重试策略适用于以下场景：
- 网络瞬时中断或超时
- API 服务暂时不可用（服务器过载）
- 资源暂时不可用（如数据库连接池耗尽）
- 乐观锁冲突等并发问题

### 2.2 指数退避重试 (Exponential Backoff)

指数退避是最广泛使用的重试策略，其核心思想是：每次重试失败后，等待时间以指数形式增长。这可以避免在服务恢复时产生惊群效应（Thundering Herd Problem）。

#### 2.2.1 算法原理

设初始等待时间为 $t_0$，退避基数为 $\beta$，最大等待时间为 $t_{max}$，最大重试次数为 $N$。则第 $i$ 次重试的等待时间为：

$$
t_i = \min(t_0 \times \beta^i, t_{max})
$$

常见的参数设置：
- $t_0 = 1s$（初始等待 1 秒）
- $\beta = 2$（退避基数）
- $t_{max} = 60s$（最大等待 1 分钟）
- $N = 5$（最大重试 5 次）

#### 2.2.2 抖动 (Jitter)

纯粹的指数退避在多个客户端同时失败时仍可能导致同步重试（即多个客户端在同一时刻发起重试）。为解决这个问题，引入了随机抖动：

```
t_i = min(t_0 × β^i × random(0.5, 1.5), t_max)  // 添加 jitter
```

抖动分为以下几种类型：
- **Full Jitter**: $t_i = random(0, min(t_0 \times \beta^i, t_{max}))$
- **Equal Jitter**: $t_i = t_0 \times \beta^i / 2 + random(0, t_0 \times \beta^i / 2)$
- **Decorrelated Jitter**: $t_i = random(t_0, prev\_t \times 3)$

#### 2.2.3 代码实现

```typescript
// scripts/lib/retry.ts

interface RetryConfig {
  maxRetries: number;           // 最大重试次数
  baseDelayMs: number;          // 基础延迟（毫秒）
  maxDelayMs: number;           // 最大延迟（毫秒）
  backoffMultiplier: number;     // 退避乘数
  jitter: boolean;              // 是否添加抖动
  retryableErrors?: (error: Error) => boolean;  // 可重试错误判断
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * 生成退避延迟时间
 */
function calculateBackoff(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  if (!config.jitter) {
    return cappedDelay;
  }
  
  // Full Jitter: random(0, cappedDelay)
  return Math.floor(Math.random() * cappedDelay);
}

/**
 * 执行带重试的异步操作
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 判断是否为可重试错误
      if (fullConfig.retryableErrors && !fullConfig.retryableErrors(lastError)) {
        throw lastError;
      }
      
      // 已达到最大重试次数
      if (attempt >= fullConfig.maxRetries) {
        break;
      }
      
      // 计算并等待退避时间
      const delay = calculateBackoff(attempt, fullConfig);
      console.log(`[Retry] Attempt ${attempt + 1} failed, waiting ${delay}ms before retry: ${lastError.message}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Operation failed after ${fullConfig.maxRetries + 1} attempts: ${lastError?.message}`);
}

// 使用示例
async function fetchPaperFromSemanticScholar(paperId: string): Promise<Paper> {
  return withRetry(
    async () => {
      const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=title,abstract,citationCount`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    {
      maxRetries: 5,
      baseDelayMs: 1000,
      retryableErrors: (err) => {
        // 只对网络错误和 5xx 错误进行重试
        return err.message.includes("fetch") || err.message.includes("HTTP 5");
      }
    }
  );
}
```

### 2.3 熔断机制 (Circuit Breaker)

指数退避重试在面对持续性故障时可能效率低下。想象一下，如果一个 API 服务已经完全宕机，盲目重试只会浪费资源并延迟故障检测。熔断机制（Circuit Breaker）就是为了解决这个问题。

#### 2.3.1 算法原理

熔断器模式借鉴了电路保险丝的概念，有三种状态：

1. **Closed（闭合）**：正常状态，所有请求都通过。当失败次数超过阈值时，切换到 Open 状态。

2. **Open（断开）**：快速失败状态，所有请求立即失败，不调用实际服务。经过一定时间后，切换到 Half-Open 状态。

3. **Half-Open（半开）**：探测状态，允许少量请求通过以探测服务是否恢复。如果成功，切换到 Closed；如果失败，切换回 Open。

```
                    ┌─────────────────┐
                    │     Closed      │
                    │  (正常通行)      │
                    └────────┬────────┘
                             │
              失败次数 > 阈值 │
                             │
                             ▼
                    ┌─────────────────┐
                    │      Open       │
                    │  (快速失败)      │
                    └────────┬────────┘
                             │
                    冷却时间到期 │
                             │
                             ▼
                    ┌─────────────────┐
                    │   Half-Open     │
                    │  (探测恢复)     │
                    └────────┬────────┘
                             │
              探测成功      │      探测失败
                             ▼                │
                    ┌────────────┐            │
                    │  Closed    │◄───────────┘
                    └────────────┘
```

#### 2.3.2 代码实现

```typescript
// scripts/lib/circuit-breaker.ts

enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

interface CircuitBreakerConfig {
  failureThreshold: number;      // 触发熔断的失败次数
  successThreshold: number;     // Half-Open 状态下成功次数阈值
  timeout: number;              // 熔断持续时间（毫秒）
  halfOpenMaxCalls: number;     // Half-Open 状态下允许的并发调用数
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  private config: CircuitBreakerConfig;
  private halfOpenCalls = 0;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,  // 1 minute
      halfOpenMaxCalls: 3,
      ...config,
    };
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitState {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() >= this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenCalls = 0;
        console.log("[CircuitBreaker] State transition: OPEN -> HALF_OPEN");
      }
    }
    return this.state;
  }

  /**
   * 判断是否可以执行操作
   */
  canExecute(): boolean {
    const state = this.getState();
    if (state === CircuitState.CLOSED) return true;
    if (state === CircuitState.HALF_OPEN) {
      return this.halfOpenCalls < this.config.halfOpenMaxCalls;
    }
    return false; // OPEN 状态
  }

  /**
   * 记录成功调用
   */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      this.halfOpenCalls--;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        console.log("[CircuitBreaker] State transition: HALF_OPEN -> CLOSED");
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0; // 成功后重置失败计数
    }
  }

  /**
   * 记录失败调用
   */
  recordFailure(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls--;
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      console.log("[CircuitBreaker] State transition: HALF_OPEN -> OPEN");
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount++;
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.nextAttempt = Date.now() + this.config.timeout;
        console.log(`[CircuitBreaker] State transition: CLOSED -> OPEN (failures: ${this.failureCount})`);
      }
    }
  }

  /**
   * 执行带熔断保护的操作
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error(`[CircuitBreaker] Circuit is ${this.state}, rejecting request`);
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}

/**
 * 带熔断和重试的包装器
 */
function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  circuitBreaker: CircuitBreaker,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  return circuitBreaker.execute(() => withRetry(operation, retryConfig));
}
```

### 2.4 重试策略的最佳实践

#### 2.4.1 何时重试，何时放弃

不是所有错误都应该重试。以下是一些指导原则：

| 错误类型 | 是否重试 | 原因 |
|---------|---------|------|
| 网络超时 | 是 | 瞬时网络问题 |
| 429 Rate Limit | 是（带延迟） | 限流，延迟后可恢复 |
| 500 Internal Server Error | 是 | 服务端问题，可能短暂 |
| 400 Bad Request | 否 | 请求本身有问题 |
| 401 Unauthorized | 否 | 认证问题，重试无济于事 |
| 403 Forbidden | 否 | 权限问题 |
| 404 Not Found | 否 | 资源不存在 |
| 500 Network Error | 视情况 | 检查网络连接 |

#### 2.4.2 重试策略的配置建议

1. **初始延迟**：1秒是一个好的起点，太短可能加剧拥塞，太长可能影响用户体验。

2. **退避基数**：2 是标准值，某些高并发场景可考虑 3 或更大。

3. **最大延迟**：设置上限避免过长等待，建议 30s-60s。

4. **最大重试次数**：3-5 次是常见范围，移动端可适当减少。

5. **抖动**：生产环境强烈建议添加抖动以避免惊群效应。

#### 2.4.3 组合使用重试与熔断

在实际系统中，建议将重试策略和熔断机制组合使用：

```typescript
// 组合使用示例
const apiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000,
});

const apiCall = async (paperId: string) => {
  return withCircuitBreaker(
    () => fetchPaperFromSemanticScholar(paperId),
    apiCircuitBreaker,
    {
      maxRetries: 3,
      baseDelayMs: 1000,
    }
  );
};
```

---

## 3. 回滚策略 (Rollback Strategy)

### 3.1 回滚策略概述

回滚策略的核心思想是：当操作失败且无法通过重试恢复时，系统能够恢复到之前的稳定状态。与重试策略不同，回滚策略承认某些错误无法通过简单重试解决，需要主动放弃当前进度并尝试其他路径。

回滚策略适用于以下场景：
- 不可恢复的数据错误（如数据校验失败）
- 外部依赖长时间不可用
- 用户取消操作
- 资源耗尽（如 Token 配额用尽）
- 发现计划本身存在根本性缺陷

### 3.2 检查点机制 (Checkpointing)

检查点是最常用的回滚技术，其核心思想是：在执行关键步骤后，将当前状态保存到持久存储。当需要回滚时，从最近的检查点恢复。

#### 3.2.1 检查点的设计原则

1. **原子性**：检查点保存应该是原子的，要么完全成功，要么完全失败。

2. **幂等性**：保存检查点的操作应该是幂等的，多次保存相同状态不会产生副作用。

3. **最小化**：只保存恢复所必需的最少信息，避免存储爆炸。

4. **一致性**：检查点应该反映一致的系统状态。

#### 3.2.2 检查点接口设计

```typescript
// scripts/lib/checkpoint.ts

import * as fs from "node:fs";
import * as path from "node:path";

interface Checkpoint<T> {
  id: string;                    // 检查点唯一标识
  taskId: string;                // 所属任务 ID
  stepName: string;              // 检查点对应的步骤名
  state: T;                      // 保存的状态
  createdAt: string;             // 创建时间（ISO 8601）
  version: number;               // 检查点版本号
}

interface CheckpointManager<T> {
  /**
   * 保存检查点
   */
  save(checkpoint: Omit<Checkpoint<T>, "id" | "createdAt" | "version">): Promise<Checkpoint<T>>;
  
  /**
   * 加载最新的检查点
   */
  loadLatest(taskId: string): Promise<Checkpoint<T> | null>;
  
  /**
   * 删除检查点
   */
  delete(checkpointId: string): Promise<void>;
  
  /**
   * 获取检查点列表
   */
  list(taskId: string): Promise<Checkpoint<T>[]>;
}

/**
 * 基于文件系统的检查点管理器
 */
class FileSystemCheckpointManager<T> implements CheckpointManager<T> {
  private checkpointDir: string;
  private encoder: (state: T) => string;
  private decoder: (data: string) => T;

  constructor(
    checkpointDir: string,
    encoder: (state: T) => string = JSON.stringify,
    decoder: (data: string) => T = JSON.parse
  ) {
    this.checkpointDir = checkpointDir;
    this.encoder = encoder;
    this.decoder = decoder;
    fs.mkdirSync(checkpointDir, { recursive: true });
  }

  private getCheckpointPath(taskId: string, stepName: string): string {
    return path.join(this.checkpointDir, `${taskId}_${stepName}.json`);
  }

  async save(data: {
    taskId: string;
    stepName: string;
    state: T;
  }): Promise<Checkpoint<T>> {
    const existing = await this.loadLatest(data.taskId);
    const version = existing ? existing.version + 1 : 1;
    
    const checkpoint: Checkpoint<T> = {
      id: `${data.taskId}_${data.stepName}_v${version}`,
      taskId: data.taskId,
      stepName: data.stepName,
      state: data.state,
      createdAt: new Date().toISOString(),
      version,
    };

    const filePath = this.getCheckpointPath(data.taskId, data.stepName);
    
    // 原子写入：先写临时文件，再 rename
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, this.encoder(checkpoint), "utf-8");
    fs.renameSync(tempPath, filePath);

    return checkpoint;
  }

  async loadLatest(taskId: string): Promise<Checkpoint<T> | null> {
    // 查找所有匹配的检查点文件
    const files = fs.readdirSync(this.checkpointDir)
      .filter(f => f.startsWith(`${taskId}_`))
      .filter(f => f.endsWith(".json"));

    if (files.length === 0) return null;

    // 按版本号排序，取最新
    files.sort().reverse();
    const latestFile = files[0];
    const content = fs.readFileSync(
      path.join(this.checkpointDir, latestFile),
      "utf-8"
    );

    return this.decoder(content);
  }

  async delete(checkpointId: string): Promise<void> {
    const [taskId, stepName] = checkpointId.split("_").slice(0, 2);
    const filePath = this.getCheckpointPath(taskId, stepName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async list(taskId: string): Promise<Checkpoint<T>[]> {
    const files = fs.readdirSync(this.checkpointDir)
      .filter(f => f.startsWith(`${taskId}_`))
      .filter(f => f.endsWith(".json"))
      .sort();

    return files.map(f => {
      const content = fs.readFileSync(
        path.join(this.checkpointDir, f),
        "utf-8"
      );
      return this.decoder(content);
    });
  }
}
```

### 3.3 状态回滚

状态回滚是检查点机制的扩展，其核心是维护一个可以回滚的状态机。在多步任务执行过程中，每个步骤执行前保存当前状态，失败时回滚到之前的状态。

#### 3.3.1 状态机的设计

```typescript
// scripts/lib/state-rollback.ts

import { FileSystemCheckpointManager } from "./checkpoint";

type StateTransition<T> = (currentState: T) => T;

interface ExecutionState<T> {
  currentStep: number;
  steps: StepDefinition<T>[];
  context: T;
  status: "pending" | "running" | "completed" | "failed" | "rolled_back";
  error?: Error;
}

interface StepDefinition<T> {
  name: string;
  execute: (context: T) => Promise<T>;
  rollback?: (context: T) => Promise<T>;  // 可选的回滚操作
  checkpoint: boolean;                      // 是否需要在此步骤创建检查点
}

class StatefulExecutor<T> {
  private steps: StepDefinition<T>[];
  private checkpointManager: CheckpointManager<T>;
  private taskId: string;

  constructor(
    taskId: string,
    steps: StepDefinition<T>[],
    checkpointManager: CheckpointManager<T>
  ) {
    this.taskId = taskId;
    this.steps = steps;
    this.checkpointManager = checkpointManager;
  }

  /**
   * 执行状态机
   */
  async execute(initialContext: T): Promise<T> {
    let currentStep = 0;
    let context = initialContext;

    try {
      // 尝试从检查点恢复
      const checkpoint = await this.checkpointManager.loadLatest(this.taskId);
      if (checkpoint) {
        currentStep = this.steps.findIndex(s => s.name === checkpoint.stepName);
        if (currentStep === -1) currentStep = 0;
        context = checkpoint.state;
        console.log(`[StatefulExecutor] Resumed from checkpoint: step=${checkpoint.stepName}`);
      }

      // 执行剩余步骤
      for (let i = currentStep; i < this.steps.length; i++) {
        const step = this.steps[i];
        console.log(`[StatefulExecutor] Executing step ${i + 1}/${this.steps.length}: ${step.name}`);

        // 创建检查点（如果需要）
        if (step.checkpoint) {
          await this.checkpointManager.save({
            taskId: this.taskId,
            stepName: step.name,
            state: context,
          });
        }

        // 执行步骤
        context = await step.execute(context);
      }

      console.log(`[StatefulExecutor] Task completed successfully`);
      return context;

    } catch (error) {
      console.error(`[StatefulExecutor] Step ${currentStep + 1} failed: ${error}`);
      
      // 尝试回滚
      await this.rollback(context, currentStep);
      
      throw error;
    }
  }

  /**
   * 回滚到上一个检查点
   */
  private async rollback(context: T, failedStepIndex: number): Promise<void> {
    console.log(`[StatefulExecutor] Starting rollback from step ${failedStepIndex}`);

    // 逆向执行回滚操作
    for (let i = failedStepIndex - 1; i >= 0; i--) {
      const step = this.steps[i];
      
      if (step.rollback) {
        console.log(`[StatefulExecutor] Rolling back step: ${step.name}`);
        context = await step.rollback(context);
      }
    }

    // 删除失败的检查点
    const checkpoint = await this.checkpointManager.loadLatest(this.taskId);
    if (checkpoint) {
      await this.checkpointManager.delete(checkpoint.id);
    }

    console.log(`[StatefulExecutor] Rollback completed`);
  }
}

// 使用示例
interface ResearchTaskContext {
  topic: string;
  papers: Paper[];
  summaries: string[];
  currentStep: string;
}

const researchWorkflow = new StatefulExecutor<ResearchTaskContext>(
  "research-task-001",
  [
    {
      name: "search_papers",
      checkpoint: true,
      execute: async (ctx) => {
        const papers = await searchPapers(ctx.topic);
        return { ...ctx, papers, currentStep: "search_papers" };
      },
    },
    {
      name: "fetch_paper_details",
      checkpoint: true,
      execute: async (ctx) => {
        const detailedPapers = await Promise.all(
          ctx.papers.map(p => fetchPaperDetails(p.id))
        );
        return { ...ctx, papers: detailedPapers, currentStep: "fetch_paper_details" };
      },
      rollback: async (ctx) => {
        // 回滚：清除详细论文信息
        return { ...ctx, papers: ctx.papers.map(p => ({ id: p.id })) };
      },
    },
    {
      name: "generate_summaries",
      checkpoint: false,
      execute: async (ctx) => {
        const summaries = await Promise.all(
          ctx.papers.map(p => generateSummary(p))
        );
        return { ...ctx, summaries, currentStep: "generate_summaries" };
      },
    },
  ],
  new FileSystemCheckpointManager<ResearchTaskContext>("./data/checkpoints")
);
```

### 3.4 部分结果保存

在某些场景下，即使整个任务失败，我们也希望保存部分有意义的结果。这可以通过"部分成功"模式来实现。

#### 3.4.1 设计模式

```typescript
// scripts/lib/partial-result.ts

interface PartialResult<T> {
  isComplete: boolean;
  completedSteps: string[];
  partialData: T;
  error?: Error;
}

/**
 * 执行任务并保存部分结果
 */
async function executeWithPartialResult<T>(
  steps: Array<{
    name: string;
    execute: () => Promise<T>;
  }>,
  initialData: T,
  onPartialResult: (result: PartialResult<T>) => void
): Promise<PartialResult<T>> {
  const completedSteps: string[] = [];
  let currentData = initialData;

  for (const step of steps) {
    try {
      console.log(`[PartialResult] Executing: ${step.name}`);
      currentData = await step.execute();
      completedSteps.push(step.name);
      
      // 通知部分结果
      onPartialResult({
        isComplete: false,
        completedSteps: [...completedSteps],
        partialData: currentData,
      });

    } catch (error) {
      console.error(`[PartialResult] Step ${step.name} failed: ${error}`);
      
      return {
        isComplete: false,
        completedSteps,
        partialData: currentData,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  return {
    isComplete: true,
    completedSteps,
    partialData: currentData,
  };
}

// 使用示例
async function researchWithPartialSave(topic: string) {
  const result = await executeWithPartialResult(
    [
      {
        name: "search",
        execute: async () => {
          return await searchPapers(topic);
        },
      },
      {
        name: "filter",
        execute: async () => {
          const papers = await searchPapers(topic);
          return papers.filter(p => p.citationCount > 10);
        },
      },
      {
        name: "summarize",
        execute: async () => {
          // 这个步骤可能会失败
          throw new Error("LLM API unavailable");
        },
      },
    ],
    { topic, papers: [], summaries: [] },
    (partial) => {
      // 每次步骤完成后保存部分结果
      console.log(`[Progress] ${partial.completedSteps.length} steps completed`);
      savePartialResult(partial);
    }
  );

  if (!result.isComplete) {
    console.log(`[Final] Task incomplete. Completed: ${result.completedSteps.join(", ")}`);
    console.log(`[Final] Partial data saved for recovery`);
  }

  return result;
}
```

### 3.5 回滚策略的最佳实践

1. **合理设置检查点**：在耗时操作和关键决策点后设置检查点，避免过密（影响性能）或过疏（回滚损失大）。

2. **提供手动回滚接口**：允许用户在必要时手动触发回滚，增加系统的可控性。

3. **考虑回滚的代价**：某些操作（如发送邮件）可能无法回滚，需要在设计时考虑。

4. **版本化管理检查点**：保留历史检查点，允许用户选择恢复到任意历史状态。

5. **清理过期检查点**：定期清理不再需要的检查点，避免存储浪费。

---

## 4. 重规划策略 (Replanning Strategy)

### 4.1 重规划策略概述

重规划策略是最高级的容错机制，其核心思想是：当现有计划无法继续执行时，不仅仅是重试或回滚，而是根据当前状态和失败原因，动态生成新的执行计划。

重规划适用于以下场景：
- 环境发生根本性变化（如 API 不可用，需要切换到备用方案）
- 原有计划基于不准确的前提假设
- 资源约束发生变化（如 Token 配额不足）
- 需要从失败中学习并调整策略

### 4.2 动态重规划条件

并非所有失败都需要重规划。以下是判断是否需要重规划的决策框架：

```typescript
// scripts/lib/replanning.ts

enum ReplanTrigger {
  TOOL_NOT_FOUND = "TOOL_NOT_FOUND",         // 工具不存在
  TOOL_EXECUTION_FAILED = "TOOL_EXECUTION_FAILED",  // 工具执行失败
  ENVIRONMENT_CHANGED = "ENVIRONMENT_CHANGED",       // 环境变化
  CONSTRAINT_VIOLATED = "CONSTRAINT_VIOLATED",       // 约束违反
  USER_FEEDBACK = "USER_FEEDBACK",                   // 用户反馈
  RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED",          // 资源耗尽
}

interface ReplanCondition {
  trigger: ReplanTrigger;
  severity: "low" | "medium" | "high";
  shouldReplan: (error: Error, context: ExecutionContext) => boolean;
  replanStrategy: "full" | "partial" | "abort";
}

const DEFAULT_REPLAN_CONDITIONS: ReplanCondition[] = [
  {
    trigger: ReplanTrigger.TOOL_NOT_FOUND,
    severity: "high",
    shouldReplan: () => true,
    replanStrategy: "full",
  },
  {
    trigger: ReplanTrigger.TOOL_EXECUTION_FAILED,
    severity: "medium",
    shouldReplan: (error, context) => {
      // 如果同一个工具连续失败 3 次，触发重规划
      const recentFailures = context.recentErrors.filter(
        e => e.toolName === context.currentTool && e.count >= 3
      );
      return recentFailures.length > 0;
    },
    replanStrategy: "partial",
  },
  {
    trigger: ReplanTrigger.CONSTRAINT_VIOLATED,
    severity: "high",
    shouldReplan: () => true,
    replanStrategy: "full",
  },
  {
    trigger: ReplanTrigger.RESOURCE_EXHAUSTED,
    severity: "high",
    shouldReplan: () => true,
    replanStrategy: "abort",
  },
];
```

### 4.3 基于失败原因的重规划

不同的失败原因需要不同的重规划策略：

```typescript
// scripts/lib/failure-based-replanning.ts

interface ExecutionContext {
  task: string;
  originalPlan: Plan;
  currentPlan: Plan;
  executedSteps: ExecutedStep[];
  remainingSteps: ExecutedStep[];
  recentErrors: ErrorRecord[];
  availableTools: Tool[];
  resourceUsage: ResourceUsage;
}

interface ErrorAnalysis {
  category: "transient" | "permanent" | "unknown";
  rootCause: string;
  affectedSteps: string[];
  alternativeApproach?: string;
}

/**
 * 分析失败原因并生成重规划建议
 */
function analyzeFailure(
  error: Error,
  context: ExecutionContext
): ErrorAnalysis {
  const errorMessage = error.message.toLowerCase();

  // 网络相关错误
  if (errorMessage.includes("timeout") || errorMessage.includes("network")) {
    return {
      category: "transient",
      rootCause: "网络连接问题",
      affectedSteps: [context.currentStep],
      alternativeApproach: "使用本地缓存数据或切换到离线模式",
    };
  }

  // API 限流错误
  if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
    return {
      category: "transient",
      rootCause: "API 限流",
      affectedSteps: [context.currentStep],
      alternativeApproach: "降低调用频率或使用批量 API",
    };
  }

  // 资源不存在
  if (errorMessage.includes("404") || errorMessage.includes("not found")) {
    return {
      category: "permanent",
      rootCause: "请求的资源不存在",
      affectedSteps: [context.currentStep],
      alternativeApproach: "使用替代数据源或调整搜索策略",
    };
  }

  // 认证错误
  if (errorMessage.includes("401") || errorMessage.includes("403")) {
    return {
      category: "permanent",
      rootCause: "认证或权限问题",
      affectedSteps: [context.currentStep],
      alternativeApproach: "检查 API 密钥配置",
    };
  }

  // 未知错误
  return {
    category: "unknown",
    rootCause: errorMessage,
    affectedSteps: [context.currentStep],
  };
}

/**
 * 根据错误分析生成新计划
 */
async function generateReplan(
  analysis: ErrorAnalysis,
  context: ExecutionContext
): Promise<Plan> {
  if (analysis.category === "transient") {
    // 瞬时错误：尝试等待后重试，或使用缓存
    if (analysis.alternativeApproach?.includes("缓存")) {
      return {
        ...context.currentPlan,
        steps: [
          { type: "use_cache", params: { step: context.currentStep } },
          ...context.remainingSteps,
        ],
      };
    }
    // 否则简单重试
    return context.currentPlan;
  }

  if (analysis.category === "permanent" && analysis.alternativeApproach) {
    // 永久性错误：尝试替代方案
    return {
      ...context.currentPlan,
      steps: [
        { type: "execute", tool: "alternative_search", params: {} },
        ...context.remainingSteps,
      ],
    };
  }

  // 无法恢复的错误
  throw new Error(`Cannot recover from error: ${analysis.rootCause}`);
}
```

### 4.4 Plan-Then-Act 模式下的重规划

Plan-Then-Act 模式是一种经典的两阶段执行范式：
1. **Plan 阶段**：LLM 生成完整的执行计划
2. **Act 阶段**：按照计划逐步执行工具调用

这种模式下，重规划变得更加重要，因为计划本身可能存在缺陷。

```typescript
// scripts/lib/plan-then-act.ts

interface Plan {
  id: string;
  steps: PlanStep[];
  rationale: string;          // 计划 rationale
  confidence: number;         // 计划置信度
  createdAt: string;
}

interface PlanStep {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  expectedOutcome: string;
  rollbackAction?: RollbackAction;
}

interface ExecutionResult {
  stepId: string;
  success: boolean;
  output?: unknown;
  error?: Error;
  executionTime: number;
}

class PlanThenActExecutor {
  private llm: LLMClient;
  private replanner: Replanner;

  /**
   * 执行 Plan-Then-Act 循环
   */
  async execute(task: string, maxIterations: number = 10): Promise<ExecutionResult> {
    // ========== Plan 阶段 ==========
    let plan = await this.createPlan(task);
    let iteration = 0;

    while (iteration < maxIterations) {
      console.log(`[PlanThenAct] Iteration ${iteration + 1}: Executing plan ${plan.id}`);

      // ========== Act 阶段 ==========
      const executionResult = await this.executePlan(plan);

      if (executionResult.success) {
        return executionResult;
      }

      // ========== 重规划阶段 ==========
      console.log(`[PlanThenAct] Plan failed: ${executionResult.error?.message}`);
      
      const shouldReplan = await this.replanner.shouldReplan(
        executionResult.error!,
        plan,
        iteration
      );

      if (!shouldReplan) {
        throw new Error(`Max iterations (${maxIterations}) reached or replanning not recommended`);
      }

      // 生成新计划
      plan = await this.replanner.generateReplan(
        task,
        plan,
        executionResult.error!,
        executionResult.partialResults
      );

      iteration++;
    }

    throw new Error(`Failed to complete task after ${maxIterations} iterations`);
  }

  /**
   * 创建初始计划
   */
  private async createPlan(task: string): Promise<Plan> {
    const prompt = `
Task: ${task}

Generate a step-by-step plan to accomplish this task.
For each step, specify:
1. The tool to use
2. The parameters
3. The expected outcome

Respond in JSON format.
`;

    const response = await this.llm.complete(prompt);
    return this.parsePlanResponse(response);
  }

  /**
   * 执行计划
   */
  private async executePlan(plan: Plan): Promise<ExecutionResult> {
    const results: StepResult[] = [];

    for (const step of plan.steps) {
      try {
        const result = await this.executeStep(step);
        results.push(result);

        // 验证步骤结果是否符合预期
        if (!this.validateStepResult(result, step.expectedOutcome)) {
          return {
            success: false,
            error: new Error(`Step ${step.id} output validation failed`),
            partialResults: results,
          };
        }

      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          partialResults: results,
        };
      }
    }

    return { success: true, results };
  }
}
```

### 4.5 ReWOO: 引用链重规划

ReWOO（Reasoning With-Out Observation）是一种创新的重规划框架，它将工具调用分解为"规划者"（Planner）和"工作者"（Worker）两个角色。规划者生成包含引用的计划，工作者执行计划并返回带有引用的结果。

```typescript
// scripts/lib/rewoo.ts

/**
 * ReWOO 风格的执行器
 * 
 * 核心思想：将 LLM 的推理与工具执行解耦
 * - Planner: 生成包含变量引用的计划
 * - Worker: 执行工具调用，返回结果
 * - Solver: 综合结果进行最终推理
 */

interface ReWOOToken {
  type: "variable" | "tool" | "text";
  value: string;
  reference?: string;  // 引用其他 step 的输出
}

interface ReWOOStep {
  id: string;
  tool: string;
  params: Record<string, ReWOOToken[]>;
  dependsOn: string[];  // 依赖的 previous steps
}

interface ReWOOPlan {
  steps: ReWOOStep[];
  finalAnswer: {
    task: string;
    reasoning: string;
    references: string[];
  };
}

/**
 * ReWOO 执行器
 */
class ReWOOExecutor {
  private toolRegistry: Map<string, Tool>;
  private planner: LLMClient;
  private solver: LLMClient;

  async execute(task: string): Promise<string> {
    // Step 1: Planner 生成计划
    const plan = await this.createPlan(task);

    // Step 2: Worker 执行计划（按依赖顺序）
    const stepOutputs = await this.executeSteps(plan.steps);

    // Step 3: Solver 综合结果
    const answer = await this.solve(task, plan.finalAnswer, stepOutputs);

    return answer;
  }

  /**
   * Planner: 生成包含引用的计划
   */
  private async createPlan(task: string): Promise<ReWOOPlan> {
    const prompt = `
Task: ${task}

Generate a plan to accomplish this task using tools.
For each step, specify:
- step_id: unique identifier
- tool: the tool to use
- params: parameters (can reference previous steps using #step_id format)
- depends_on: list of step_ids this step depends on

Finally, provide the final answer reasoning that synthesizes all step outputs.

Respond in structured format.
`;

    const response = await this.planner.complete(prompt);
    return this.parseReWOOPlan(response);
  }

  /**
   * Worker: 按依赖顺序执行步骤
   */
  private async executeSteps(steps: ReWOOStep[]): Promise<Map<string, unknown>> {
    const outputs = new Map<string, unknown>();
    const completed = new Set<string>();

    // 拓扑排序执行
    while (completed.size < steps.length) {
      for (const step of steps) {
        if (completed.has(step.id)) continue;
        if (!step.dependsOn.every(dep => completed.has(dep))) continue;

        // 解析参数中的引用
        const resolvedParams = this.resolveParams(step.params, outputs);
        
        // 执行工具
        const tool = this.toolRegistry.get(step.tool);
        if (!tool) throw new Error(`Tool not found: ${step.tool}`);

        const output = await tool.execute(resolvedParams);
        outputs.set(step.id, output);
        completed.add(step.id);
      }
    }

    return outputs;
  }

  /**
   * Solver: 综合结果
   */
  private async solve(
    task: string,
    finalAnswer: ReWOOPlan["finalAnswer"],
    stepOutputs: Map<string, unknown>
  ): Promise<string> {
    // 将步骤输出格式化为可读形式
    const context = Array.from(stepOutputs.entries())
      .map(([id, output]) => `[${id}]: ${JSON.stringify(output)}`)
      .join("\n");

    const prompt = `
Task: ${task}

Step outputs:
${context}

Reasoning to answer the task:
${finalAnswer.reasoning}

Based on the step outputs and reasoning above, provide the final answer.
`;

    return this.solver.complete(prompt);
  }
}
```

### 4.6 Reflexion: 从失败中学习

Reflexion 是一种让 LLM 从失败中"反思"并调整策略的框架。与简单重试不同，Reflexion 明确地让 LLM 分析失败原因并生成改进策略。

```typescript
// scripts/lib/reflexion.ts

interface ReflexionExperience {
  task: string;
  trajectory: TrajectoryStep[];
  failureReason?: string;
  reflection?: string;
  improvedStrategy?: string;
}

interface TrajectoryStep {
  action: string;
  observation: string;
  reward: number;
}

class ReflexionAgent {
  private actor: LLMClient;       // 执行动作
  private evaluator: LLMClient;   // 评估结果
  private reflector: LLMClient;   // 反思失败

  /**
   * 带反思的执行循环
   */
  async executeWithReflexion(
    task: string,
    maxRetries: number = 3
  ): Promise<string> {
    let currentTask = task;
    const experiences: ReflexionExperience[] = [];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`[Reflexion] Attempt ${attempt + 1}`);

      // 执行任务
      const trajectory = await this.executeTrajectory(currentTask);
      const reward = await this.evaluator.evaluate(trajectory, task);

      if (reward > 0.8) {
        return this.extractAnswer(trajectory);
      }

      // 失败，生成反思
      const failureReason = await this.evaluator.analyzeFailure(trajectory, task);
      const reflection = await this.reflector.reflect(failureReason, trajectory);
      
      // 生成改进策略
      const improvedStrategy = await this.reflector.generateStrategy(
        reflection,
        experiences
      );

      experiences.push({
        task: currentTask,
        trajectory,
        failureReason,
        reflection,
        improvedStrategy,
      });

      // 根据反思调整任务描述
      currentTask = this.incorporateReflection(task, reflection, improvedStrategy);
    }

    throw new Error(`Failed after ${maxRetries} attempts with reflexion`);
  }

  /**
   * Reflector: 分析失败并生成反思
   */
  private async reflect(failureReason: string, trajectory: TrajectoryStep[]): Promise<string> {
    const prompt = `
Given the following trajectory:

${trajectory.map((t, i) => `${i + 1}. Action: ${t.action}\n   Observation: ${t.observation}`).join("\n")}

Failure reason: ${failureReason}

Reflect on what went wrong. Consider:
1. What assumptions were incorrect?
2. What information was missing or misinterpreted?
3. What would you do differently?

Provide a concise reflection (2-3 sentences).
`;

    return this.reflector.complete(prompt);
  }
}
```

---

## 5. 综合容错架构

### 5.1 架构设计原则

设计一个鲁棒的容错规划机制需要遵循以下原则：

1. **分层防御**：不同层次的容错机制相互配合，形成纵深防御。

2. **故障隔离**：单个组件的故障不应级联到整个系统。

3. **可观测性**：每个容错操作都应该有清晰的日志和监控。

4. **可配置性**：容错策略的参数应该可配置，适应不同场景。

5. **优雅降级**：当核心功能不可用时，提供有限的降级服务。

### 5.2 分层容错架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Controller                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Planner   │  │   Executor  │  │  Monitor    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Recovery Manager                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Retry     │  │   Rollback  │  │   Replan    │             │
│  │  Manager    │  │  Manager    │  │   Manager   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Tool Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Circuit   │  │   Rate     │  │   Health    │             │
│  │  Breaker    │  │  Limiter   │  │   Check     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External APIs                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Semantic   │  │   GitHub    │  │     LLM     │             │
│  │  Scholar    │  │     API     │  │    APIs     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 核心组件设计

#### 5.3.1 Agent Controller

Agent Controller 是整个系统的核心调度器，负责：
- 接收用户任务并解析为可执行计划
- 协调 Planner、Executor、Monitor 的交互
- 处理任务级别的错误和超时
- 管理任务的生命周期

```typescript
// scripts/lib/agent-controller.ts

interface AgentConfig {
  maxIterations: number;
  defaultTimeout: number;
  enableCheckpointing: boolean;
  enableCircuitBreaker: boolean;
  retryConfig: RetryConfig;
  circuitBreakerConfig: CircuitBreakerConfig;
}

class AgentController {
  private planner: Planner;
  private executor: Executor;
  private monitor: Monitor;
  private recoveryManager: RecoveryManager;
  private config: AgentConfig;

  async executeTask(task: Task): Promise<TaskResult> {
    const taskId = this.generateTaskId();
    console.log(`[AgentController] Starting task ${taskId}`);

    let plan = await this.planner.createPlan(task);
    let iteration = 0;

    while (iteration < this.config.maxIterations) {
      try {
        // 创建检查点
        if (this.config.enableCheckpointing) {
          await this.checkpointManager.save({
            taskId,
            stepName: `plan_v${iteration}`,
            state: { plan, iteration },
          });
        }

        // 执行计划
        const result = await this.executor.executeWithTimeout(
          plan,
          this.config.defaultTimeout
        );

        if (result.success) {
          return { taskId, success: true, result: result.output };
        }

        // 执行失败，尝试恢复
        const recovery = await this.recoveryManager.recover(
          result.error!,
          plan,
          iteration
        );

        if (recovery.action === "abort") {
          return {
            taskId,
            success: false,
            error: recovery.reason,
            partialResult: recovery.partialOutput,
          };
        }

        if (recovery.action === "replan") {
          plan = recovery.newPlan!;
        }

        iteration++;

      } catch (error) {
        console.error(`[AgentController] Iteration ${iteration} failed: ${error}`);
        
        // 严重错误，尝试最后一搏
        if (iteration === this.config.maxIterations - 1) {
          return {
            taskId,
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      }
    }

    return {
      taskId,
      success: false,
      error: new Error("Max iterations reached"),
    };
  }
}
```

#### 5.3.2 Recovery Manager

Recovery Manager 统一管理重试、回滚和重规划三种恢复策略：

```typescript
// scripts/lib/recovery-manager.ts

interface RecoveryAction {
  action: "retry" | "rollback" | "replan" | "abort";
  newPlan?: Plan;
  checkpointToRestore?: Checkpoint;
  reason: string;
}

class RecoveryManager {
  private retryManager: RetryManager;
  private rollbackManager: RollbackManager;
  private replanManager: ReplanManager;

  async recover(
    error: Error,
    currentPlan: Plan,
    iteration: number
  ): Promise<RecoveryAction> {
    const errorAnalysis = this.analyzeError(error);

    console.log(`[RecoveryManager] Analyzing error: ${error.message}`);
    console.log(`[RecoveryManager] Error category: ${errorAnalysis.category}`);

    // 根据错误类型选择恢复策略
    switch (errorAnalysis.category) {
      case "transient":
        // 瞬时错误：尝试重试
        if (this.retryManager.shouldRetry(iteration)) {
          return {
            action: "retry",
            reason: `Transient error, retry attempt ${iteration + 1}`,
          };
        }
        // 重试次数用尽，尝试回滚
        return this.tryRollback(currentPlan);

      case "permanent":
        // 永久错误：尝试回滚或重规划
        return this.tryRollback(currentPlan) || this.tryReplan(errorAnalysis, currentPlan);

      case "critical":
        // 严重错误：直接 abort
        return {
          action: "abort",
          reason: `Critical error: ${error.message}`,
        };

      default:
        return {
          action: "abort",
          reason: `Unknown error category: ${error.message}`,
        };
    }
  }

  private tryRollback(plan: Plan): RecoveryAction | null {
    const checkpoint = this.rollbackManager.getLatestCheckpoint(plan.taskId);
    if (checkpoint) {
      return {
        action: "rollback",
        checkpointToRestore: checkpoint,
        reason: "Rolling back to last checkpoint",
      };
    }
    return null;
  }

  private tryReplan(errorAnalysis: ErrorAnalysis, plan: Plan): RecoveryAction {
    const newPlan = this.replanManager.generateReplan(
      plan.task,
      plan,
      errorAnalysis
    );

    return {
      action: "replan",
      newPlan,
      reason: `Replanning due to: ${errorAnalysis.rootCause}`,
    };
  }
}
```

### 5.4 完整执行流程

```
用户任务
    │
    ▼
┌─────────────────┐
│  AgentController │
│   .executeTask()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Planner      │ ◄──────────────────┐
│   .createPlan()  │                    │
└────────┬────────┘                    │
         │                             │
         ▼                             │
┌─────────────────┐                    │
│     Executor    │                    │
│  .executePlan() │                    │
└────────┬────────┘                    │
         │                             │
    ┌────┴────┐                        │
    │  成功?   │                        │
    └────┬────┘                        │
    Yes  │  No                         │
    │    │                             │
    ▼    │    ┌────────────────────┐   │
 返回结果 │    │  RecoveryManager   │   │
    │    ├──►│   .recover()       │   │
    │    │    └────────┬─────────┘   │
    │    │             │             │
    │    │    ┌────────┴────────┐    │
    │    │    │  分析错误类型   │    │
    │    │    └────────┬────────┘    │
    │    │             │             │
    │    │    ┌────────┴────────┐    │
    │    │    │  选择恢复策略   │    │
    │    │    └────────┬────────┘    │
    │    │             │             │
    │    │    ┌────────┴────────┐    │
    │    │    │ retry/rollback/ │────┘
    │    │    │ replan/abort    │
    │    │    └─────────────────┘
    │    │
    │    └────────────────────────────► (重试，回到 Executor)
    │                                     或 (回滚，恢复到检查点)
    │                                     或 (重规划，回到 Planner)
    │                                     或 (放弃，返回错误)
    │
    └────────────────────────────────────────► 返回最终结果
```

### 5.5 架构配置示例

```typescript
// scripts/lib/agent-config.ts

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxIterations: 5,
  defaultTimeout: 30000,  // 30 seconds per step
  enableCheckpointing: true,
  enableCircuitBreaker: true,
  
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: (error) => {
      const message = error.message.toLowerCase();
      return message.includes("timeout") || 
             message.includes("network") ||
             message.includes("429") ||
             message.includes("500");
    },
  },
  
  circuitBreakerConfig: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000,
    halfOpenMaxCalls: 1,
  },
};

// 创建配置实例
function createAgentConfig(overrides: Partial<AgentConfig>): AgentConfig {
  return {
    ...DEFAULT_AGENT_CONFIG,
    ...overrides,
    retryConfig: {
      ...DEFAULT_AGENT_CONFIG.retryConfig,
      ...overrides.retryConfig,
    },
    circuitBreakerConfig: {
      ...DEFAULT_AGENT_CONFIG.circuitBreakerConfig,
      ...overrides.circuitBreakerConfig,
    },
  };
}
```

---

## 6. 代码示例

### 6.1 完整的多步工具调用执行器

以下是一个综合了重试、回滚和重规划的完整实现：

```typescript
// scripts/lib/robust-executor.ts

import { withRetry, RetryConfig } from "./retry";
import { CircuitBreaker } from "./circuit-breaker";
import { FileSystemCheckpointManager, Checkpoint } from "./checkpoint";

/**
 * 工具调用结果
 */
interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: Error;
  executionTime: number;
  attempt: number;
}

/**
 * 执行步骤定义
 */
interface ExecutionStep<T> {
  name: string;
  execute: (context: T) => Promise<unknown>;
  rollback?: (context: T) => Promise<T>;
  retryConfig?: Partial<RetryConfig>;
  timeout?: number;
}

/**
 * 鲁棒执行器配置
 */
interface RobustExecutorConfig {
  taskId: string;
  steps: ExecutionStep<unknown>[];
  checkpointDir: string;
  enableCheckpointing: boolean;
  enableCircuitBreaker: boolean;
  globalRetryConfig: RetryConfig;
  globalCircuitBreakerConfig: CircuitBreakerConfig;
  onStepComplete?: (step: string, output: unknown) => void;
  onStepError?: (step: string, error: Error) => void;
  onRollback?: (step: string) => void;
  onReplan?: (oldPlan: string[], newPlan: string[]) => void;
}

/**
 * 鲁棒的多步工具调用执行器
 * 
 * 综合了：
 * - 指数退避重试
 * - 熔断保护
 * - 检查点回滚
 * - 动态重规划
 */
class RobustExecutor<T extends Record<string, unknown>> {
  private config: RobustExecutorConfig;
  private checkpointManager: CheckpointManager<T>;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private executedSteps: string[] = [];
  private partialContext: T;

  constructor(config: RobustExecutorConfig) {
    this.config = config;
    this.partialContext = {} as T;
    this.checkpointManager = new FileSystemCheckpointManager<T>(
      config.checkpointDir
    );
    this.circuitBreakers = new Map();
    
    // 为每个工具创建熔断器
    for (const step of config.steps) {
      this.circuitBreakers.set(
        step.name,
        new CircuitBreaker(config.globalCircuitBreakerConfig)
      );
    }
  }

  /**
   * 执行完整的工作流
   */
  async execute(initialContext: T): Promise<{
    success: boolean;
    context: T;
    error?: Error;
    executedSteps: string[];
  }> {
    console.log(`[RobustExecutor] Starting task: ${this.config.taskId}`);
    
    let context = initialContext;
    let currentStepIndex = 0;

    // 尝试从检查点恢复
    if (this.config.enableCheckpointing) {
      const checkpoint = await this.checkpointManager.loadLatest(this.config.taskId);
      if (checkpoint) {
        console.log(`[RobustExecutor] Resuming from checkpoint: ${checkpoint.stepName}`);
        context = checkpoint.state;
        currentStepIndex = this.config.steps.findIndex(
          s => s.name === checkpoint.stepName
        );
        if (currentStepIndex === -1) currentStepIndex = 0;
        this.executedSteps = this.config.steps.slice(0, currentStepIndex).map(s => s.name);
      }
    }

    // 执行剩余步骤
    for (let i = currentStepIndex; i < this.config.steps.length; i++) {
      const step = this.config.steps[i];
      console.log(`[RobustExecutor] Executing step ${i + 1}/${this.config.steps.length}: ${step.name}`);

      try {
        // 执行单步（带重试和熔断）
        const result = await this.executeStep(step, context);
        
        if (result.success) {
          context = { ...context, ...(result.output as Record<string, unknown>) } as T;
          this.executedSteps.push(step.name);
          this.config.onStepComplete?.(step.name, result.output);
        } else {
          throw result.error!;
        }

      } catch (error) {
        console.error(`[RobustExecutor] Step ${step.name} failed: ${error}`);
        this.config.onStepError?.(step.name, error as Error);

        // 尝试回滚
        const rollbackSuccess = await this.rollback(i);
        if (!rollbackSuccess) {
          // 回滚失败，尝试重规划
          const replanSuccess = await this.attemptReplan(context);
          if (!replanSuccess) {
            return {
              success: false,
              context,
              error: error as Error,
              executedSteps: this.executedSteps,
            };
          }
        }

        // 回滚成功后，尝试从检查点重试
        const retryResult = await this.executeStep(step, context);
        if (!retryResult.success) {
          return {
            success: false,
            context,
            error: retryResult.error,
            executedSteps: this.executedSteps,
          };
        }
      }

      // 保存检查点
      if (this.config.enableCheckpointing) {
        await this.checkpointManager.save({
          taskId: this.config.taskId,
          stepName: step.name,
          state: context,
        });
      }
    }

    console.log(`[RobustExecutor] Task completed successfully`);
    return {
      success: true,
      context,
      executedSteps: this.executedSteps,
    };
  }

  /**
   * 执行单个步骤（带重试和熔断）
   */
  private async executeStep(
    step: ExecutionStep<T>,
    context: T
  ): Promise<ToolResult> {
    const circuitBreaker = this.circuitBreakers.get(step.name)!;
    const retryConfig = { ...this.config.globalRetryConfig, ...step.retryConfig };
    const timeout = step.timeout ?? this.config.globalRetryConfig.baseDelayMs * 10;

    const startTime = Date.now();
    let attempt = 0;

    const operation = async () => {
      attempt++;
      console.log(`[RobustExecutor] ${step.name} - attempt ${attempt}`);

      const result = await Promise.race([
        step.execute(context),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Step ${step.name} timed out`)), timeout)
        ),
      ]);

      return result;
    };

    try {
      const output = await circuitBreaker.execute(() =>
        withRetry(operation, retryConfig)
      );

      return {
        success: true,
        output,
        executionTime: Date.now() - startTime,
        attempt,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime: Date.now() - startTime,
        attempt,
      };
    }
  }

  /**
   * 回滚到上一个检查点
   */
  private async rollback(failedStepIndex: number): Promise<boolean> {
    console.log(`[RobustExecutor] Attempting rollback from step ${failedStepIndex}`);

    // 执行回滚函数
    for (let i = failedStepIndex - 1; i >= 0; i--) {
      const step = this.config.steps[i];
      if (step.rollback) {
        try {
          console.log(`[RobustExecutor] Rolling back: ${step.name}`);
          this.partialContext = await step.rollback(this.partialContext);
          this.config.onRollback?.(step.name);
        } catch (error) {
          console.error(`[RobustExecutor] Rollback failed for ${step.name}: ${error}`);
          return false;
        }
      }
    }

    // 删除失败的检查点
    const checkpoint = await this.checkpointManager.loadLatest(this.config.taskId);
    if (checkpoint) {
      await this.checkpointManager.delete(checkpoint.id);
    }

    return true;
  }

  /**
   * 尝试重规划
   */
  private async attemptReplan(context: T): Promise<boolean> {
    console.log(`[RobustExecutor] Attempting replanning`);
    
    // 简单策略：跳过失败的步骤，用默认行为替代
    // 在实际实现中，这里可以调用 LLM 生成新的执行计划
    
    const oldPlan = this.executedSteps.slice();
    this.config.onReplan?.(oldPlan, this.executedSteps);
    
    return true;
  }
}

// ========== 使用示例 ==========

interface ResearchContext {
  topic: string;
  papers: Array<{ id: string; title: string; abstract?: string }>;
  summaries: string[];
}

const researchExecutor = new RobustExecutor<ResearchContext>({
  taskId: "research-rag-rl-001",
  checkpointDir: "./data/checkpoints",
  enableCheckpointing: true,
  enableCircuitBreaker: true,
  globalRetryConfig: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
  },
  globalCircuitBreakerConfig: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000,
  },
  steps: [
    {
      name: "search_papers",
      timeout: 10000,
      execute: async (ctx) => {
        const papers = await searchSemanticScholar(ctx.topic);
        return { papers };
      },
      retryConfig: { maxRetries: 5 },
    },
    {
      name: "fetch_details",
      timeout: 15000,
      execute: async (ctx) => {
        const detailed = await Promise.all(
          ctx.papers.slice(0, 3).map(p => fetchPaperDetails(p.id))
        );
        return { papers: detailed };
      },
      rollback: async (ctx) => ({ ...ctx, papers: [] }),
    },
    {
      name: "generate_summaries",
      timeout: 30000,
      execute: async (ctx) => {
        const summaries = await Promise.all(
          ctx.papers.map(p => generateSummary(p.abstract || ""))
        );
        return { summaries };
      },
    },
  ],
  onStepComplete: (step, output) => {
    console.log(`[Callback] Step completed: ${step}`);
  },
  onStepError: (step, error) => {
    console.error(`[Callback] Step failed: ${step}, error: ${error.message}`);
  },
});

// 执行研究任务
const result = await researchExecutor.execute({
  topic: "RAG Reinforcement Learning",
  papers: [],
  summaries: [],
});

if (result.success) {
  console.log(`Research completed: ${result.context.summaries.length} papers summarized`);
} else {
  console.error(`Research failed: ${result.error?.message}`);
}
```

### 6.2 任务队列与错误处理

在实际系统中，任务通常通过队列进行管理：

```typescript
// scripts/lib/task-queue.ts

interface QueuedTask {
  id: string;
  task: Task;
  priority: number;
  status: "pending" | "running" | "completed" | "failed";
  retryCount: number;
  maxRetries: number;
  error?: Error;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

class TaskQueue {
  private queue: QueuedTask[] = [];
  private running: Map<string, Promise<void>> = new Map();
  private maxConcurrent = 3;
  private executor: RobustExecutor<unknown>;

  async addTask(task: Task, options: { priority?: number; maxRetries?: number } = {}): Promise<string> {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    this.queue.push({
      id,
      task,
      priority: options.priority ?? 0,
      status: "pending",
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      createdAt: new Date().toISOString(),
    });

    // 按优先级排序
    this.queue.sort((a, b) => b.priority - a.priority);

    // 触发调度
    this.schedule();

    return id;
  }

  private async schedule(): Promise<void> {
    while (this.running.size < this.maxConcurrent) {
      const nextTask = this.queue.find(t => t.status === "pending");
      if (!nextTask) break;

      nextTask.status = "running";
      nextTask.startedAt = new Date().toISOString();

      const promise = this.processTask(nextTask);
      this.running.set(nextTask.id, promise);

      promise.then(() => {
        this.running.delete(nextTask.id);
        this.schedule();
      });
    }
  }

  private async processTask(queuedTask: QueuedTask): Promise<void> {
    try {
      const result = await this.executor.execute(queuedTask.task);

      if (result.success) {
        queuedTask.status = "completed";
        queuedTask.completedAt = new Date().toISOString();
      } else {
        await this.handleTaskFailure(queuedTask, result.error!);
      }

    } catch (error) {
      await this.handleTaskFailure(queuedTask, error as Error);
    }
  }

  private async handleTaskFailure(queuedTask: QueuedTask, error: Error): Promise<void> {
    queuedTask.retryCount++;
    queuedTask.error = error;

    if (queuedTask.retryCount < queuedTask.maxRetries) {
      console.log(`[TaskQueue] Retrying task ${queuedTask.id} (attempt ${queuedTask.retryCount})`);
      queuedTask.status = "pending";
      
      // 指数退避延迟
      const delay = Math.pow(2, queuedTask.retryCount) * 1000;
      setTimeout(() => this.schedule(), delay);
    } else {
      console.error(`[TaskQueue] Task ${queuedTask.id} failed after ${queuedTask.maxRetries} retries`);
      queuedTask.status = "failed";
    }
  }

  getStatus(taskId: string): QueuedTask | undefined {
    return this.queue.find(t => t.id === taskId);
  }
}
```

---

## 7. 参考文献

### 7.1 核心论文

1. **ReWOO: Reasoning With-Out Observation**
   - Authors: Binfeng Xu, et al.
   - arXiv: 2305.18323 (2023)
   - URL: https://arxiv.org/abs/2305.18323
   - 核心贡献：提出将 LLM 推理与工具执行解耦的框架，通过 Planner 生成包含引用的计划，Worker 执行工具调用，Solver 综合结果。

2. **Reflexion: Language Agents with Verbal Reinforcement Learning**
   - Authors: Noah Shinn, et al.
   - arXiv: 2303.11366 (2023)
   - URL: https://arxiv.org/abs/2303.11366
   - 核心贡献：提出让 LLM 从失败中反思的框架，通过"轨迹-评估-反思"循环改进执行策略。

3. **Chain-of-Thought Prompting Elicits Reasoning in Large Language Models**
   - Authors: Jason Wei, et al.
   - arXiv: 2201.11903 (2022)
   - URL: https://arxiv.org/abs/2201.11903
   - 核心贡献：提出思维链提示方法，通过显式推理步骤提升 LLM 的多步推理能力。

4. **Tree of Thoughts: Deliberate Problem Solving with Large Language Models**
   - Authors: Yao Lu, et al.
   - arXiv: 2305.10601 (2023)
   - URL: https://arxiv.org/abs/2305.10601
   - 核心贡献：将问题解决建模为树搜索过程，允许 LLM 在多个推理路径中进行选择和回溯。

5. **Self-Consistency Improves Chain of Thought Reasoning in Language Models**
   - Authors: Xuezhi Wang, et al.
   - arXiv: 2203.11171 (2022)
   - URL: https://arxiv.org/abs/2203.11171
   - 核心贡献：通过采样多个推理路径并选择最一致的答案，提升思维链推理的准确性。

### 7.2 框架与实现

6. **LangChain Retry Mechanisms**
   - URL: https://python.langchain.com/docs/modules/callbacks/retry
   - 贡献：LangChain 框架内置的重试机制实现，支持指数退避和自定义错误处理。

7. **AutoGPT Error Handling**
   - URL: https://github.com/Significant-Gravitas/AutoGPT
   - 贡献：AutoGPT 项目中实现的多步任务执行和错误恢复机制。

8. **LlamaIndex Retry Logic**
   - URL: https://docs.llamaindex.ai/en/stable/module_guides/observability/callbacks/root_builder.html
   - 贡献：LlamaIndex 中的重试和错误处理集成。

### 7.3 容错设计模式

9. **Pattern: Circuit Breaker**
   - Source: Martin Fowler's Bliki
   - URL: https://martinfowler.com/bliki/CircuitBreaker.html
   - 核心贡献：熔断器模式的详细描述和实现指南。

10. **Pattern: Retry Pattern**
    - Source: Microsoft Azure Architecture Center
    - URL: https://learn.microsoft.com/en-us/azure/architecture/patterns/retry
    - 核心贡献：云环境下的重试模式最佳实践。

11. **Pattern: Checkpoint Pattern**
    - Source: Distributed Systems Patterns
    - URL: https://www.google.com/search?q=checkpoint+pattern+distributed+systems
    - 核心贡献：检查点模式用于长时间运行任务的状态恢复。

### 7.4 相关技术

12. **Exponential Backoff and Jitter**
    - Authors: AWS Architecture Blog
    - URL: https://aws.amazon.com/cn/blogs/architecture/exponential-backoff-and-jitter/
    - 核心贡献：云计算环境下的指数退避和抖动算法的详细分析和最佳实践。

13. **Hystrix: Circuit Breaker**
    - Source: Netflix Open Source
    - URL: https://github.com/Netflix/Hystrix
    - 核心贡献：Netflix 的熔断器实现，影响了众多容错框架的设计。

---

## 附录 A: 术语表

| 术语 | 英文 | 定义 |
|-----|------|------|
| 重试策略 | Retry Strategy | 失败后重复执行操作的技术 |
| 指数退避 | Exponential Backoff | 重试间隔以指数增长的策略 |
| 抖动 | Jitter | 重试延迟中添加的随机性 |
| 熔断机制 | Circuit Breaker | 防止级联失败的快速失败机制 |
| 回滚策略 | Rollback Strategy | 恢复到之前稳定状态的技术 |
| 检查点 | Checkpoint | 保存的中间状态快照 |
| 重规划 | Replanning | 根据失败动态调整执行计划 |
| Plan-Then-Act | Plan-Then-Act | 先生成计划再执行的两阶段范式 |
| 惊群效应 | Thundering Herd | 多个客户端同时重试导致的服务过载 |

## 附录 B: 配置清单

以下是在生产环境中配置容错机制的建议清单：

```yaml
# 推荐的容错配置参数
retry:
  max_retries: 3-5
  base_delay_ms: 1000
  max_delay_ms: 30000-60000
  backoff_multiplier: 2
  jitter: true

circuit_breaker:
  failure_threshold: 3-5
  success_threshold: 2-3
  timeout_ms: 30000-60000
  half_open_max_calls: 1-3

checkpoint:
  enabled: true
  directory: ./data/checkpoints
  retention_days: 7

execution:
  max_iterations: 5-10
  step_timeout_ms: 30000
  max_concurrent_tasks: 3
```

---

*本文档由 OpenCode Agent 自动生成*
*生成时间: 2026-03-30*
*版本: 1.0.0*
