# 昇腾算子开发 (Ascend C) 资源清单

> 详细资源列表，按类型和级别分类

## 入门资源 (Beginner)

### 官方文档

1. **[昇腾社区官方文档 - Ascend C](https://www.hiascend.com/document/detail/zh/canncommercial/82RC1/opdevg/Ascendcopdevg/)**
   - 语言: 中文
   - 说明: CANN 商用版 8.2 RC1 官方文档，权威权威
   - 更新: 2026-03

2. **[Ascend C 简介](https://www.hiascend.com/document/detail/zh/canncommercial/82RC1/opdevg/Ascendcopdevg/atlas_ascendc_10_0001.html)**
   - 语言: 中文
   - 说明: 官方概念介绍与快速入门
   - 更新: 2026-03

### 入门教程

1. **[Ascend C保姆级教程：我的第一份Ascend C代码](https://www.cnblogs.com/huaweiyun/p/17669701.html)**
   - 平台: 博客园
   - 时长: 2h
   - 说明: 配图丰富，适合完全零基础入门

2. **[CANN训练营第一季 - Ascend C新算子入门](https://blog.csdn.net/cftang9999/article/details/130912937)**
   - 平台: CSDN/B站视频
   - 时长: 4h
   - 说明: 官方训练营课程，附代码示例

3. **[CANN训练营第二季 - Ascend C算子开发(入门)](https://bbs.huaweicloud.com/blogs/413536)**
   - 平台: 华为云开发者社区
   - 时长: 3h
   - 说明: 系统性入门课程

### 环境搭建

1. **[Ascend C开发环境搭建与工程实践指南](https://blog.csdn.net/qq_39757921/article/details/155453419)**
   - 平台: CSDN
   - 说明: 从零构建开发环境，含 Docker 配置

## 进阶资源 (Intermediate)

### 进阶教程

1. **[CANN训练营 - Ascend C算子开发进阶篇](https://blog.csdn.net/weixin_46227276/article/details/136806866)**
   - 平台: CSDN
   - 时长: 4h
   - 说明: Tiling 策略、复杂算子开发

2. **[Ascend C算子开发进阶指南](https://cloud.tencent.com/developer/article/2606574)**
   - 平台: 腾讯云
   - 说明: 进阶概念与最佳实践

### 实战项目

1. **[深入Ascend C：双缓冲与向量化优化矩阵乘法(GEMM)](https://blog.csdn.net/2501_94589291/article/details/155753362)**
   - 平台: CSDN
   - 时长: 6h
   - 说明: 完整 GEMM 实现，含性能对比数据

2. **[昇腾Ascend C实战进阶：手把手实现Softmax算子](https://blog.csdn.net/2501_94610615/article/details/155891885)**
   - 平台: CSDN
   - 时长: 5h
   - 说明: 支持动态 Shape + 多核并行

3. **[Ascend C实战：开发自定义RMSNorm算子](https://blog.csdn.net/2501_94610615/article/details/155828176)**
   - 平台: CSDN
   - 时长: 5h
   - 说明: LLM 推理优化常用算子

### 算子认证

1. **[华为Ascend C算子开发(中级)考试题解](https://blog.csdn.net/weixin_52406641/article/details/140614939)**
   - 平台: CSDN
   - 说明: Sinh 算子完整实现，含考试要点

## 高级资源 (Advanced)

### 深度对比

1. **[Ascend C 与 CUDA 的对比分析 - 迁移指南](https://blog.csdn.net/m0_46721576/article/details/155916606)**
   - 平台: CSDN
   - 时长: 4h
   - 说明: 论文级深度对比，含性能数据

2. **[昇腾CANN实战：手把手教你用Ascend C开发高性能AI算子](https://blog.csdn.net/corn8/article/details/155369746)**
   - 平台: CSDN
   - 说明: 避坑指南，高性能实践

### 高级主题

1. **[Ascend C 算子开发中的模板元编程](https://blog.csdn.net/2302_79177254/article/details/157817586)**
   - 平台: CSDN
   - 说明: 类型抽象与指令生成

2. **[自动化测试的艺术：Ascend C算子生成测试数据脚本解析](https://blog.csdn.net/sinat_41617212/article/details/155950566)**
   - 平台: CSDN
   - 说明: 企业级测试框架设计

### PyTorch 集成

1. **[Pybind11桥梁工程：将Ascend C算子无缝集成到Python生态](https://blog.csdn.net/seven_767823098/article/details/154664242)**
   - 平台: CSDN
   - 时长: 4h
   - 说明: 完整 Python 集成方案

## 官方 Samples

1. **[Ascend/samples (Gitee)](https://gitee.com/ascend/samples)**
   - GitHub: Ascend/samples
   - Stars: N/A
   - 说明: 官方算子样例工程，含 Add、Conv 等

2. **[AddCustomSample](https://gitee.com/ascend/samples/tree/master/operator/AddCustomSample/KernelLaunch/AddKernelInvocationNeo)**
   - 说明: Add 算子完整实现，含 Kernel 直调和 Aclnn 调用

## 学术资源

1. **[《昇腾AI处理器架构与编程》](https://baike.baidu.com/item/昇腾AI处理器架构与编程)**
   - 来源: 清华大学出版社
   - 年份: 2019
   - 说明: 梁晓峣著，深度原理讲解

## 社区

### 论坛

- [昇腾社区](https://www.hiascend.com): 官方开发者社区
- [华为云开发者社区](https://bbs.huaweicloud.com/): 实战经验分享

### 在线课程

- [昇腾官方在线课程](https://www.hiascend.com/zh/edu/courses): 入门/中级/高级系统课程

### CSDN 标签

- [#Ascend C](https://so.csdn.net/so/search/tag?q=Ascend+C): 中文实战文章聚合

---

*最后更新: 2026-03-19*
