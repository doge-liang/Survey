# 学术论文

本目录用于存放待分析的学术论文及相关笔记。

## 目录结构

```
essay/
├── README.md           # 本文件
└── {topic}/            # 按主题组织
    ├── {paper-name}.pdf        # 原始论文
    ├── {paper-name}-notes.md   # 阅读笔记
    └── summary.md              # 主题总结
```

## 命名规范

### 论文文件命名

格式：`{第一作者}-{年份}-{关键词}.pdf`

示例：
- `vaswani-2017-attention.pdf`
- `brown-2020-gpt3.pdf`
- `touvron-2023-llama.pdf`

### 笔记文件命名

- `{paper-name}-notes.md` - 单篇论文笔记
- `summary.md` - 主题综述

## 笔记模板

```markdown
# {论文标题}

## 基本信息
- **作者**: 
- **年份**: 
- **机构**: 
- **链接**: 
- **会议/期刊**: 

## 核心贡献
1. 
2. 
3. 

## 方法论


## 实验结果


## 个人思考


## 相关工作
- 
```

## 主题分类建议

- `llm/` - 大语言模型
- `vlm/` - 视觉语言模型
- `agent/` - AI 代理
- `rl/` - 强化学习
- `inference/` - 推理优化
- `training/` - 训练技术
