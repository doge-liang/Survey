# CUDA 深入解析 — GPU 并行计算架构与优化

> **更新日期**: 2026-03-30
> **目标读者**: 工程师、研究者
> **前置知识**: C/C++ 基础, 计算机体系结构

---

## 目录

1. [CUDA 编程模型](#1-cuda-编程模型)
2. [GPU 硬件架构](#2-gpu-硬件架构)
3. [内存层次结构](#3-内存层次结构)
4. [执行模型](#4-执行模型)
5. [内存合并访问](#5-内存合并访问)
6. [Shared Memory 与 Bank Conflicts](#6-shared-memory-与-bank-conflicts)
7. [Streams 与并发执行](#7-streams-与并发执行)
8. [优化实践指南](#8-优化实践指南)
9. [现代 GPU 架构对比](#9-现代-gpu-架构对比)
10. [参考资料](#10-参考资料)

---

## 1. CUDA 编程模型

### 1.1 Host 与 Device 分离

CUDA 区分 **Host**（CPU 端）和 **Device**（GPU 端）：

```
┌─────────────────────────────────────────────────────┐
│                      Host (CPU)                      │
│  - 主程序逻辑                                        │
│  - 内存分配 (cudaMalloc)                            │
│  - 数据传输 (cudaMemcpy)                            │
│  - Kernel 启动 (<<<...>>>)                          │
└─────────────────────────────────────────────────────┘
                         │
                    cudaMemcpy
                    async/ sync
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    Device (GPU)                      │
│  - 并行计算                                          │
│  - 大量轻量级线程                                    │
│  - 高带宽内存访问                                    │
└─────────────────────────────────────────────────────┘
```

### 1.2 Kernel 函数定义

```cuda
// kernel 定义使用 __global__
__global__ void vectorAdd(const float *A, const float *B, float *C, int N) {
    // 计算当前线程的全局索引
    int tid = blockIdx.x * blockDim.x + threadIdx.x;
    
    if (tid < N) {
        C[tid] = A[tid] + B[tid];
    }
}

// 启动 kernel
int main() {
    // 线程块大小 (blockDim): 每个 block 256 线程
    // 块数量 (gridDim): N / 256
    vectorAdd<<<(N + 255) / 256, 256>>>(d_A, d_B, d_C, N);
}
```

### 1.3 线程层次结构

CUDA 三层线程组织：

```
Grid
├── Block 0                    (Block 1, Block 2, ...)
│   ├── Thread 0
│   ├── Thread 1
│   └── ...
│   └── Thread 255             (blockDim.x = 256)
├── Block 1
│   └── ...
└── Block N-1
```

| 层次 | 作用域 | 通信方式 | 同步 |
|------|--------|----------|------|
| **Grid** | 所有线程 | atomic 操作 / 全局内存 | cudaDeviceSynchronize() |
| **Block** | 同 block 内 | Shared Memory | __syncthreads() |
| **Thread** | 单个线程 | 寄存器 | 无 |

**关键约束**：
- 同一 Block 内线程可通过 Shared Memory 通信
- 不同 Block 之间无法直接通信（只能通过全局内存）
- Block 内线程数量限制：**1024**（Hopper 之前架构）

### 1.4 向量加法完整示例

```cuda
#include <cuda_runtime.h>
#include <stdio.h>

#define N 1024 * 1024
#define BLOCK_SIZE 256

// Host 端内存分配
void allocate_memory(float **h_ptr, float **d_ptr, size_t size) {
    *h_ptr = (float*)malloc(size);
    cudaMalloc(d_ptr, size);
}

// Kernel 实现
__global__ void vectorAdd(const float *A, const float *B, float *C, int N) {
    int idx = blockDim.x * blockIdx.x + threadIdx.x;
    if (idx < N) {
        C[idx] = A[idx] + B[idx];
    }
}

int main() {
    float *h_A, *h_B, *h_C;
    float *d_A, *d_B, *d_C;
    
    allocate_memory(&h_A, &d_A, N * sizeof(float));
    allocate_memory(&h_B, &d_B, N * sizeof(float));
    allocate_memory(&h_C, &d_C, N * sizeof(float));
    
    // 初始化输入数据
    for (int i = 0; i < N; i++) {
        h_A[i] = i * 1.0f;
        h_B[i] = i * 2.0f;
    }
    
    // H2D 传输
    cudaMemcpy(d_A, h_A, N * sizeof(float), cudaMemcpyHostToDevice);
    cudaMemcpy(d_B, h_B, N * sizeof(float), cudaMemcpyHostToDevice);
    
    // Launch kernel
    dim3 block(BLOCK_SIZE);
    dim3 grid((N + block.x - 1) / block.x);
    vectorAdd<<<grid, block>>>(d_A, d_B, d_C, N);
    
    // D2H 传输
    cudaMemcpy(h_C, d_C, N * sizeof(float), cudaMemcpyDeviceToHost);
    
    // 验证结果
    for (int i = 0; i < 10; i++) {
        printf("C[%d] = %.1f + %.1f = %.1f\n", i, h_A[i], h_B[i], h_C[i]);
    }
    
    cudaFree(d_A); cudaFree(d_B); cudaFree(d_C);
    free(h_A); free(h_B); free(h_C);
    return 0;
}
```

---

## 2. GPU 硬件架构

### 2.1 流式多处理器 (SM)

GPU 由多个 **Streaming Multiprocessor (SM)** 组成，每个 SM 包含：

```
┌─────────────────────────────────────────────────────┐
│              Streaming Multiprocessor (SM)           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Warp    │ │ Warp    │ │ Warp    │ │ Warp    │   │
│  │ Scheduler│ │ Scheduler│ │         │ │         │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────────────────────────────────────────┐    │
│  │           Register File (64KB - 256KB)       │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │              Shared Memory (48KB - 128KB)    │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │   SFU   │ │   SFU   │ │   LD/ST │ │   LD/ST │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────────────────────────────────────────┐    │
│  │            CUDA Cores / SP (Shader Cores)   │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

| 组件 | 功能 |
|------|------|
| **CUDA Cores** | 算术逻辑单元 (ALU)，执行 FP32/INT32 操作 |
| **SFU** | Special Function Units，执行 sin/cos/exp 等特殊函数 |
| **LD/ST** | Load/Store 单元，内存访问 |
| **Register File** | 线程私有寄存器，每个线程分配独立寄存器 |
| **Shared Memory** | Block 内线程共享，低延迟 |

### 2.2 历代架构对比

| 架构 | 代号 | SM 数量 | CUDA Cores/SM | Shared Memory/SM | 应用产品 |
|------|------|---------|----------------|------------------|----------|
| **Fermi** | GF100 | 16 | 32 | 64 KB | GTX 580 |
| **Kepler** | GK110 | 15 | 192 | 64 KB | Tesla K20 |
| **Maxwell** | GM200 | 16 | 128 | 64 KB | GTX 980 |
| **Pascal** | GP100 | 56 | 64 | 64 KB | Tesla P100 |
| **Volta** | GV100 | 80 | 64 | 96 KB | Tesla V100 |
| **Turing** | TU102 | 72 | 64 | 96 KB | RTX 2080 Ti |
| **Ampere** | GA100 | 108 | 64 | 164 KB | A100, RTX 3090 |
| **Ada** | AD102 | 144 | 128 | 128 KB | RTX 4090 |
| **Hopper** | GH100 | 132 | 128 | 256 KB | H100 |

---

## 3. 内存层次结构

### 3.1 完整内存层次

```
┌────────────────────────────────────────────────────────────┐
│                        GPU Device                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Global Memory                      │  │
│  │              (HBM2/HBM3, 80GB, 2TB/s)                │  │
│  │  - 所有线程可见                                       │  │
│  │  - 高延迟 (~400 cycles)                              │  │
│  │  - 需要 coalesced 访问                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ▲                             │
│         ┌────────────────────┼────────────────────┐       │
│         │                    │                    │       │
│         ▼                    ▼                    ▼       │
│  ┌────────────┐      ┌────────────┐      ┌────────────┐  │
│  │  L2 Cache  │      │  Constant  │      │   Texture  │  │
│  │  (80 MB)   │      │   Memory   │      │   Memory   │  │
│  └────────────┘      └────────────┘      └────────────┘  │
│                              ▲                             │
│         ┌────────────────────┼────────────────────┐       │
│         │                    │                    │       │
│         ▼                    ▼                    ▼       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Shared Memory (per SM)                   │  │
│  │              (128 KB, ~1 cycle)                       │  │
│  │  - Block 内线程共享                                   │  │
│  │  - 手动管理                                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ▲                             │
│         ┌────────────────────┼────────────────────┐       │
│         │                    │                    │       │
│         ▼                    ▼                    ▼       │
│  ┌────────────┐      ┌────────────┐      ┌────────────┐  │
│  │  Register  │      │   Local   │      │     PC     │  │
│  │   File    │      │  Memory   │      │  (Program  │  │
│  │           │      │           │      │   Counter) │  │
│  └────────────┘      └────────────┘      └────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 3.2 内存访问延迟对比

| 内存类型 | 延迟 | 带宽 | 作用域 |
|----------|------|------|--------|
| **Register** | 0 cycles | 32 regs/clock | Thread |
| **Shared Memory** | ~1 cycle | ~1 TB/s | Block |
| **L2 Cache** | ~40 cycles | ~4 TB/s | GPU |
| **Global Memory** | ~400 cycles | ~2 TB/s | GPU |

### 3.3 Shared Memory 声明与使用

```cuda
// 静态声明
__shared__ float sharedMem[256];

// 动态声明
extern __shared__ float sharedDyn[];
__global__ void kernel(float *data) {
    float *smem = sharedDyn;  // 动态 shared memory
    int tid = threadIdx.x;
    
    // 线程同步 - 确保所有数据加载完成
    __syncthreads();
    
    // 使用 shared memory
    smem[tid] = data[tid];
    
    __syncthreads();
}
```

---

## 4. 执行模型

### 4.1 SIMT 与 Warp

CUDA 采用 **SIMT** (Single Instruction Multiple Thread) 模型：

- **Warp**: 32 个线程为一组，**同一时刻执行同一条指令**
- Warp 内线程可能走不同分支，但会 **动态合并**（diverged paths serialize）

```cuda
__global__ void divergentKernel(int *data) {
    int tid = threadIdx.x;
    if (tid % 2 == 0) {        // Warp 内线程分支
        data[tid] = data[tid] * 2;    // 分支 A
    } else {
        data[tid] = data[tid] + 1;    // 分支 B (串行执行)
    }
}
```

### 4.2 Thread Divergence 影响

**坏案例**: Warp 内所有线程都走不同分支 → 32x 性能损失

```cuda
// 极差案例: 每个线程不同分支
if (threadIdx.x == 0) { ... }  // 只有 1/32 线程有效
```

**优化原则**:
- 同一 Warp 线程尽量走相同分支
- 分支粒度应为 32 的倍数

### 4.3 占用率计算

**占用率** = Active Warps / Max Warps per SM

```
占用率 = (Block_Size / Threads_per_Warp) / Max_Blocks_per_SM
       × Warps_per_Block
       / Max_Warps_per_SM
```

**计算器公式**:

```python
def compute_occupancy(block_size, registers_per_thread, smem_per_block):
    threads_per_warp = 32
    warps_per_block = (block_size + threads_per_warp - 1) // threads_per_warp
    
    # 每 SM 资源限制
    max_warps_per_sm = 64  # Hopper: 64, Ampere: 64
    max_threads_per_sm = 2048
    max_blocks_per_sm = 32
    
    # 寄存器限制 (每 SM 65536 寄存器)
    registers_per_warp = warps_per_block * registers_per_thread
    max_warps_by_regs = 65536 // registers_per_thread // threads_per_warp
    
    # Shared Memory 限制
    max_blocks_by_smem = 128 * 1024 // smem_per_block  # Ada: 128KB
    
    # 综合占用率
    active_warps = min(
        warps_per_block * (block_size * grid_size / block_size),
        max_warps_per_sm,
        max_warps_by_regs,
        max_blocks_by_smem * warps_per_block
    )
    
    return active_warps / max_warps_per_sm
```

---

## 5. 内存合并访问

### 5.1 合并访问 (Coalesced Access)

**合并访问**: 同一 Warp 内线程访问连续内存地址 → 合并为一次内存事务

```
好案例 (Coalesced):
┌────────────────────────────────────────┐
│ Thread 0 → addr[0]                    │
│ Thread 1 → addr[1]                     │
│ Thread 2 → addr[2]                     │
│ ...                                    │
│ Thread 31 → addr[31]                   │
│ → 1次内存事务 (128 bytes)               │
└────────────────────────────────────────┘

坏案例 (Not Coalesced):
┌────────────────────────────────────────┐
│ Thread 0 → addr[0]                     │
│ Thread 1 → addr[32]                    │
│ Thread 2 → addr[64]                    │
│ ...                                    │
│ Thread 31 → addr[992]                  │
│ → 32次内存事务                         │
└────────────────────────────────────────┘
```

### 5.2 行优先 vs 列优先

```cuda
#define N 1024

// 行优先访问 (合并访问)
__global__ void rowMajorAccess(float *matrix) {
    int row = blockIdx.y * blockDim.y + threadIdx.y;
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    float val = matrix[row * N + col];  // 连续访问
}

// 列优先访问 (非合并访问)
__global__ void colMajorAccess(float *matrix) {
    int row = blockIdx.y * blockDim.y + threadIdx.y;
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    float val = matrix[col * N + row];  // 跳跃访问
}
```

### 5.3 矩阵乘法优化示例

```cuda
#define TILE_SIZE 16
#define A(i,j) A[i * N + j]
#define B(i,j) B[i * N + j]
#define C(i,j) C[i * N + j]

__global__ void tiledMatrixMul(const float *A, const float *B, float *C, int N) {
    __shared__ float As[TILE_SIZE][TILE_SIZE];
    __shared__ float Bs[TILE_SIZE][TILE_SIZE];
    
    int row = blockIdx.y * TILE_SIZE + threadIdx.y;
    int col = blockIdx.x * TILE_SIZE + threadIdx.x;
    float sum = 0.0f;
    
    for (int m = 0; m < N / TILE_SIZE; m++) {
        // 加载 tile 到 shared memory (合并访问)
        As[threadIdx.y][threadIdx.x] = A(row, m * TILE_SIZE + threadIdx.x);
        Bs[threadIdx.y][threadIdx.x] = B(m * TILE_SIZE + threadIdx.y, col);
        
        __syncthreads();
        
        // 计算
        for (int k = 0; k < TILE_SIZE; k++) {
            sum += As[threadIdx.y][k] * Bs[k][threadIdx.x];
        }
        
        __syncthreads();
    }
    
    C(row, col) = sum;
}
```

---

## 6. Shared Memory 与 Bank Conflicts

### 6.1 Shared Memory 物理结构

Shared Memory 被划分为 **32 个物理 bank**（每 bank 宽度 4 bytes）：

```
Bank 0: addr[0], addr[32], addr[64], ...
Bank 1: addr[1], addr[33], addr[65], ...
...
Bank 31: addr[31], addr[63], addr[95], ...
```

### 6.2 Bank Conflict 类型

| 冲突类型 | 访问模式 | 惩罚 |
|----------|----------|------|
| **无冲突** | 每线程访问不同 bank | 1x |
| **2-way** | 2 线程访问同 bank 不同地址 | 2x |
| **4-way** | 4 线程访问同 bank 不同地址 | 4x |
| **Broadcast** | 所有线程访问同一地址 | 1x (广播) |

### 6.3 Bank Conflict 避免策略

```cuda
// 策略1: 使用 padding
__shared__ float smem[32][33];  // +1 padding 避免列冲突

// 策略2: Swizzling - 重新映射索引
__shared__ float tile[TILE_SIZE][TILE_SIZE];

if (threadIdx.x < TILE_SIZE && threadIdx.y < TILE_SIZE) {
    int i = threadIdx.y;
    int j = threadIdx.x;
    // Swizzle: 交换行列或应用映射函数
    tile[(i + j) % TILE_SIZE][j] = ...;
}

// 策略3: 选择合适访问模式
// 列访问 -> 使用 transpose 后行访问
__global__ void transpose(float *odata, const float *idata, int width) {
    __shared__ float tile[TILE_SIZE][TILE_SIZE];
    int x = blockIdx.x * TILE_SIZE + threadIdx.x;
    int y = blockIdx.y * TILE_SIZE + threadIdx.y;
    
    tile[threadIdx.y][threadIdx.x] = idata[y * width + x];
    __syncthreads();
    
    // 转置后输出 - 线程访问变为合并
    x = blockIdx.y * TILE_SIZE + threadIdx.x;
    y = blockIdx.x * TILE_SIZE + threadIdx.y;
    odata[y * width + x] = tile[threadIdx.x][threadIdx.y];
}
```

### 6.4 向量化访问优化

```cuda
// 使用 float4 向量化加载
__global__ void vectorizedLoad(float4 *A, float4 *B, float4 *C, int N) {
    int idx = blockDim.x * blockIdx.x + threadIdx.x;
    if (idx < N / 4) {
        float4 va = A[idx];
        float4 vb = B[idx];
        C[idx] = make_float4(
            va.x + vb.x,
            va.y + vb.y,
            va.z + vb.z,
            va.w + vb.w
        );
    }
}

// Bank-conflict-free 向量化加载
// 对于 float4，每个元素在不同 bank (4 banks stride)
__shared__ float4 smem[256];  // stride = 4 = 最佳
```

---

## 7. Streams 与并发执行

### 7.1 CUDA Stream 概念

**Stream**: 按顺序执行的 CUDA 操作序列（Kernel 调用、Memcpy 等）

```
Stream 0: [Memcpy Async] → [Kernel A] → [Memcpy Async]
Stream 1:                [Kernel B] → [Kernel C]    (与 Stream 0 并行)
```

### 7.2 默认 Stream vs 显式 Stream

```cuda
// 默认 Stream (隐式同步)
kernel<<<grid, block>>>(...);  // 与所有 stream 同步

// 显式 Stream
cudaStream_t stream;
cudaStreamCreate(&stream);

kernel<<<grid, block, 0, stream>>>(...);  // 只与同 stream 同步

// 显式同步
cudaStreamSynchronize(stream);
cudaStreamQuery(stream);  // 非阻塞查询
```

### 7.3 依赖 Stream 的实现

```cuda
// 依赖关系: Kernel A → Memcpy → Kernel B
cudaStream_t stream1, stream2;
cudaStreamCreate(&stream1);
cudaStreamCreate(&stream2);

float *d_input, *d_output;
// 错误方式: 两个 stream 同时启动无依赖
kernelA<<<grid, block, 0, stream1>>>(d_input, d_temp);
cudaMemcpyAsync(d_temp, d_output, size, cudaMemcpyDeviceToHost, stream2);  // 可能提前执行!

// 正确方式: 使用事件同步
cudaEvent_t event;
cudaEventCreate(&event);

kernelA<<<grid, block, 0, stream1>>>(d_input, d_temp);
cudaEventRecord(event, stream1);
cudaStreamWaitEvent(stream2, event, 0);  // stream2 等待 event
kernelB<<<grid, block, 0, stream2>>>(d_temp, d_output);
```

### 7.4 Copy-Compute 重叠

```cuda
__global__ void computeKernel(float *data, int N) { ... }

void overlappingExample(float *h_input, float *h_output, int N, size_t size) {
    float *d_input, *d_temp, *d_output;
    cudaMalloc(&d_input, size);
    cudaMalloc(&d_temp, size / 2);
    cudaMalloc(&d_output, size);
    
    cudaStream_t stream1, stream2;
    cudaStreamCreate(&stream1);
    cudaStreamCreate(&stream2);
    
    // Ping-pong 双缓冲: Stream1 计算时 Stream2 传输
    for (int i = 0; i < iterations; i++) {
        // 步骤1: Host→Device 传输
        cudaMemcpyAsync(d_input, h_input, size, cudaMemcpyHostToDevice, stream1);
        
        // 步骤2: 计算
        computeKernel<<<grid, block, 0, stream1>>>(d_input, d_temp, N);
        
        // 步骤3: Device→Host 传输 (与下一次传输重叠)
        cudaMemcpyAsync(h_output, d_temp, size/2, cudaMemcpyDeviceToHost, stream2);
        
        // 交换缓冲区
        swap(d_input, d_temp);
    }
    
    cudaStreamDestroy(stream1);
    cudaStreamDestroy(stream2);
}
```

### 7.5 Pinned Memory 提升传输带宽

```cuda
// Pinned Memory (页锁定) - 无法被 OS swap out，允许异步传输
float *h_pinned;
cudaMallocHost(&h_pinned, size);  // vs malloc()

// 异步 Memcpy (需要 pinned memory)
cudaMemcpyAsync(d_data, h_pinned, size, cudaMemcpyHostToDevice, stream);

// 注意: pinned memory 消耗系统内存，不能滥用
```

---

## 8. 优化实践指南

### 8.1 优化检查清单

| 优先级 | 优化项 | 预期收益 |
|--------|--------|----------|
| **P0** | 合并全局内存访问 | 10-100x |
| **P0** | 使用 Shared Memory | 5-20x |
| **P1** | 避免 Bank Conflicts | 2-4x |
| **P1** | 最大化占用率 (>50%) | 1.5-3x |
| **P2** | 使用向量化加载 | 2-4x |
| **P2** | 异步执行与Overlap | 1.5-2x |
| **P3** | Tensor Core / WMMA | 8-16x (矩阵运算) |

### 8.2 常用 Profiling 工具

```bash
# NVIDIA Nsight Systems - 系统级分析
nsys profile --output=report ./cuda_app

# NVIDIA Nsight Compute - Kernel 级分析
ncu --set full ./cuda_app

# nvprof (旧版)
nvprof --metrics achieved_occupancy,shared_efficiency ./cuda_app
```

### 8.3 占用率与性能关系

```
占用率
 100%│★★★★★★★★★★★★★★★★★★★★★★★★★★
     │★★★★★★★★★★★★★★★★★★★★★★★★★★
  80%│★★★★★★★★★★★★★★
     │★★★★★★★★★★★★★★
  60%│★★★★★★★
     │★★★★★★★
  40%│★★★
     │★★★
  20%│★
     │★
     └──────────────────────────────→ 性能
        简单Kernel    复杂Kernel
```

**注意**: 高占用率 ≠ 高性能。复杂 Kernel 可能因寄存器/SMEM 限制导致低占用率，但实际性能更好。

### 8.4 矩阵乘法的极致优化

```cuda
// WMMA (Warp Matrix Multiply Accumulate) - Tensor Core 编程接口
#include <mma.h>

using namespace nvcuda;
using namespace nvcuda::wmma;

#define M 16  // WMMA tile size
#define K 16
#define N 16

__global__ void wmmaMatrixMul(half *A, half *B, float *C, int M, int N, int K) {
    // Fragment 声明
    wmma::fragment<wmma::matrix_a, M, N, K, half, wmma::row_major> a_frag;
    wmma::fragment<wmma::matrix_b, M, N, K, half, wmma::col_major> b_frag;
    wmma::fragment<wmma::accumulator, M, N, K, float> acc_frag;
    wmma::fragment<wmma::accumulator, M, N, K, float> c_frag;
    
    // 初始化累加器
    wmma::fill_fragment(acc_frag, 0.0f);
    
    // 循环累加 (K / K_tile)
    for (int k = 0; k < K; k += K) {
        wmma::load_matrix_sync(a_frag, A + k, K);
        wmma::load_matrix_sync(b_frag, B + k * N, N);
        wmma::mma_sync(acc_frag, a_frag, b_frag, acc_frag);
    }
    
    // 存储结果
    wmma::store_matrix_sync(C, acc_frag, N, wmma::mem_row_major);
}
```

---

## 9. 现代 GPU 架构对比

### 9.1 Ampere (A100) vs Hopper (H100)

| 特性 | Ampere (A100) | Hopper (H100) |
|------|---------------|---------------|
| **制程** | 7nm TSMC | 4nm TSMC |
| **SM 数量** | 108 | 132 |
| **CUDA Cores/SM** | 64 | 128 |
| **FP32 性能** | 19.5 TFLOPS | 67 TFLOPS |
| **HBM3 带宽** | 2.0 TB/s | 3.35 TB/s |
| **L2 Cache** | 40 MB | 50 MB |
| **Shared Memory/SM** | 164 KB | 256 KB |
| **Transformer Engine** | 无 | 第三代 |
| **Async Loading** | 受限 | 完整支持 |
| **Thread Block Cluster** | 无 | 支持 |

### 9.2 Hopper 新特性

#### 9.2.1 Thread Block Cluster

```cuda
// Hopper 新特性: 更大的线程组织
// Cluster = 多个 Thread Block 组成，可片内同步
dim3 clusterSize(2, 2, 2);  // 8 个 block 为一个 cluster
dim3 blockSize(256, 1, 1);
dim3 gridSize(32, 32, 1);

// 启动带 cluster 的 kernel
kernel<<<gridSize, blockSize, 0, stream, clusterSize>>>(...);

// Cluster 内同步 (H100 新增)
__cluster_barrier_sync();
```

#### 9.2.2 Distributed Shared Memory

```cuda
// Cluster 内 block 共享 shared memory
__shared__ float cluster_smem[256];  // Cluster 级别 shared

// Cluster 内同步
__cluster_barrier_sync();

// Cluster 内广播
if (threadIdx.x == 0) {
    // 从 cluster 内另一个 block 读取数据
    float val = __cluster_read_shared_direct(cluster_smem, 
        blockIdxOther, threadIdxOther, offset);
}
```

#### 9.2.3 异步事务内存访问

```cuda
// Hopper: cp.async 异步批量加载
cp.async.shared.global [dest], [src], byteCount;
// 可配置 cache modifier
cp.async.shared.global.L2::256B [dst], [src], 16;  // L2 cache policy
```

### 9.3 CUDA 版本与架构支持

| CUDA 版本 | 最低架构 | 新特性 |
|-----------|----------|--------|
| CUDA 12.x | Volta+ | Hopper 支持, Unified Memory 改进 |
| CUDA 11.x | Volta+ | Ampere 支持, FP64 改进 |
| CUDA 10.x | Pascal+ | Turing 支持 |
| CUDA 9.x | Pascal+ | Volta 初支持 |

---

## 10. 参考资料

### 官方文档

1. **CUDA C++ Programming Guide** (NVIDIA, 2024)
   - URL: https://docs.nvidia.com/cuda/cuda-c-programming-guide/
   - 必读: 核心编程模型、内存层次

2. **CUDA C++ Best Practices Guide** (NVIDIA, 2024)
   - URL: https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/
   - 必读: 优化策略、性能调优

3. **Hopper Tuning Guide** (NVIDIA, 2026)
   - URL: https://docs.nvidia.com/cuda/pdf/Hopper_Tuning_Guide.pdf
   - 推荐: H100 架构优化

4. **Ampere Tuning Guide** (NVIDIA, 2024)
   - URL: https://docs.nvidia.com/cuda/pdf/Ampere_Tuning_Guide.pdf
   - 推荐: A100 架构优化

### 学术论文

5. **Optimizing CUDA Mixed-Precision Kernels** (NVIDIA, 2020)
   - Tensor Core 编程指南

6. ** CUTLASS: Fast Linear Algebra in CUDA C++** (NVIDIA, 2023)
   - 开源: https://github.com/NVIDIA/cutlass
   - 矩阵乘优化参考实现

### 工具

7. **Nsight Compute** - CUDA Kernel Profiling
   - URL: https://developer.nvidia.com/nsight-compute

8. **Nsight Systems** - 系统级 Profiling
   - URL: https://developer.nvidia.com/nsight-systems

### 社区资源

9. **CUDA Zone** - NVIDIA 官方资源
   - URL: https://developer.nvidia.com/cuda-zone

10. **Stack Overflow: CUDA** - 问答
    - Tag: `cuda`

---

## 附录: CUDA 术语表

| 术语 | 定义 |
|------|------|
| **SM** | Streaming Multiprocessor，GPU 基本计算单元 |
| **Warp** | 32 线程为一组的执行单元 |
| **Coalesced** | 合并访问，多线程访问连续地址 |
| **Bank Conflict** | 多线程访问同 bank 导致串行化 |
| **Occupancy** | 占用率，SM 内活跃 warp 比例 |
| **Tensor Core** | 矩阵运算专用硬件单元 |
| **WMMA** | Warp Matrix Multiply Accumulate，Tensor Core 编程接口 |
| **Stream** | CUDA 操作序列，支持并发执行 |
| **Pinned Memory** | 页锁定内存，支持异步传输 |

---

*文档版本: 1.0*
*创建日期: 2026-03-30*
