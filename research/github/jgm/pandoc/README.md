# Pandoc

> 通用标记语言转换器——一款 Haskell 库与命令行工具，实现 40+ 标记格式之间的双向转换。

[![GitHub stars](https://img.shields.io/github/stars/jgm/pandoc)](https://github.com/jgm/pandoc)
[![License](https://img.shields.io/github/license/jgm/pandoc)](https://github.com/jgm/pandoc)
[![Haskell](https://img.shields.io/badge/language-Haskell-blue)](https://www.haskell.org)
[![Latest Release](https://img.shields.io/github/release/jgm/pandoc.svg?label=latest)](https://github.com/jgm/pandoc/releases)

## 概述

Pandoc 是由 John MacFarlane 创建的通用文档格式转换工具，于 2006 年首次发布，至今已活跃维护近 20 年。它以 Haskell 语言实现，核心是一个"标记语言瑞士军刀"——无论输入是 Markdown、LaTeX、HTML、Word docx 还是 EPUB，Pandoc 都能将其转换为任意目标格式。

Pandoc 的设计哲学是**模块化的 Reader/Writer 架构**：每个输入格式对应一个 Reader（解析器），将源文档转换为中立的**抽象语法树（AST）**；每个输出格式对应一个 Writer（生成器），将 AST 渲染为目标格式。这种架构使得添加新的输入或输出格式仅需增加对应的 Reader 或 Writer，无需改动核心逻辑。

截至 2026 年 3 月，Pandoc 拥有 **42,657 颗 GitHub Stars**、**3,790 个 Fork**，是 Haskell 生态中下载量最高、社区最活跃的项目之一。其最新版本 3.9（2026 年 2 月）引入了 WebAssembly 编译支持，标志着 Pandoc 正式进入浏览器端运行。

## 技术栈

| 类别 | 技术 |
|------|------|
| **语言** | Haskell (81.9%), Roff (6.1%), RTF (4.6%), HTML (2.2%), Lua (2.0%) |
| **编译器** | GHC 8.10–9.10 |
| **解析框架** | attoparsec, parsec, megaparsec |
| **HTML 生成** | blaze-html, blaze-markup |
| **JSON 处理** | aeson, aeson-pretty |
| **引用处理** | citeproc |
| **数学公式** | texmath |
| **语法高亮** | skylighting, skylighting-core |
| **模板引擎** | doctemplates |
| **Lua 集成** | pandoc-lua-engine |
| **测试框架** | Tasty (golden tests, HUnit, QuickCheck) |
| **构建工具** | Cabal, Stack, Nix flakes |
| **其他关键依赖** | commonmark, djot, typst, jira-wiki-markup, haddock-library, doclayout, zip-archive, texmath |

## 项目结构

```
jgm/pandoc/
├── pandoc.cabal              # 主包配置（核心库 + 5 个子包定义）
├── pandoc-cli/               # 命令行工具（独立子包）
│   ├── src/                  # CLI 入口、选项解析、输出设置
│   ├── server/               # HTTP 服务端实现
│   └── lua/                  # Lua 相关 CLI 工具
├── pandoc-lua-engine/        # Lua 过滤器引擎（独立子包）
│   └── src/
├── pandoc-server/            # HTTP API 服务（独立子包）
├── src/                      # 核心库源码
│   └── Text/Pandoc/
│       ├── App/              # 命令行应用层
│       ├── Class/            # 类型类（Monad Reader/Writer 接口）
│       ├── Readers/          # 40+ 格式的解析器
│       │   ├── Markdown.hs
│       │   ├── LaTeX.hs
│       │   ├── HTML.hs
│       │   ├── Docx.hs
│       │   ├── Org.hs
│       │   ├── RST.hs
│       │   ├── EPUB.hs
│       │   ├── Djot.hs
│       │   ├── Typst.hs
│       │   └── ...
│       ├── Writers/          # 50+ 格式的生成器
│       │   ├── HTML.hs
│       │   ├── LaTeX.hs
│       │   ├── Docx.hs
│       │   ├── EPUB.hs
│       │   ├── Markdown.hs
│       │   ├── Powerpoint.hs
│       │   ├── Typst.hs
│       │   └── ...
│       ├── Parsing/          # 共享解析基础设施
│       ├── Filter/          # JSON 过滤器框架
│       ├── Citeproc/        # 引用与参考文献处理
│       ├── PDF.hs            # PDF 生成（调用外部引擎）
│       └── ...
├── data/                     # 模板、翻译、默认样式
│   ├── templates/            # 各格式输出模板（HTML/LaTeX/EPUB 等）
│   ├── translations/         # 多语言翻译文件
│   ├── docx/                 # Word 参考文档素材
│   ├── pptx/                # PowerPoint 幻灯片模板
│   └── odt/                 # OpenDocument 模板
├── test/                     # 完整测试套件（golden tests）
│   ├── Tests/               # HUnit/QuickCheck 测试
│   ├── command/             # 命令行集成测试
│   ├── *.native             # 各格式 Golden 标准输出
│   └── ...
├── doc/                      # 项目文档
│   ├── custom-readers.md    # 自定义 Reader 开发指南
│   ├── custom-writers.md   # 自定义 Writer 开发指南
│   ├── lua-filters.md      # Lua 过滤器开发指南
│   └── ...
├── tools/                    # 构建、发布、文档工具
├── benchmark/                # 性能基准测试
├── citeproc/                # biblatex 本地化文件
└── xml-light/               # 轻量 XML 解析库（独立子包）
```

## 核心特性

### 1. 海量格式支持（40+ 输入 / 50+ 输出）

Pandoc 支持的格式覆盖了文档处理的方方面面：

**输入格式（部分）：**
- 轻量标记：Markdown（含 CommonMark/GitHub Flavored）、reStructuredText、AsciiDoc、Org-mode、Emacs Muse、Textile、djot
- HTML/XML：HTML 4/5、DocBook、JATS、TEI Simple
- 办公文档：Word docx、ODT、RTF、EPUB
- 幻灯片：LaTeX Beamer、PowerPoint
- 数据格式：CSV、TSV、Excel xlsx
- 其他：LaTeX、Typst、InDesign ICML、Jupyter notebook、BibTeX 参考文献等

**输出格式（部分）：**
- 涵盖上述所有格式的双向支持
- 额外的幻灯片格式：reveal.js、Slidy、DZSlides、Slideous、S5
- 终端输出：ANSI 彩色文本
- 序列化格式：JSON AST、XML AST、Haskell Native

### 2. 模块化 Reader/Writer 架构

Pandoc 的核心设计是经典的 Reader → AST → Writer 流水线：

```
[输入格式] --Reader--> [Pandoc AST] --Writer--> [输出格式]
```

AST 定义在独立的 `pandoc-types` 包中（`Text.Pandoc.Definition`），包含：
- `Pandoc`：顶层结构，含元数据（Meta）和块级元素列表
- `Block`：块级元素（段落、标题、表格、列表、引用、代码块等）
- `Inline`：行内元素（强调、链接、图片、脚注引用等）

这种设计使得添加新格式只需实现对应的 Reader 或 Writer，是教科书级别的可扩展系统设计。

### 3. Lua 过滤器系统

Pandoc 支持通过 Lua 脚本在 AST 层面修改文档，无需重新编译：

```lua
-- 示例：自动为所有链接添加 target="_blank"
function Link(elem)
  elem.target = "_blank"
  return elem
end
```

Lua 过滤器通过 `pandoc-lua-engine` 子包驱动，可在命令行通过 `--lua-filter` 参数指定。Pandoc 3.9 进一步增强了沙箱模式，支持限制文件/网络访问。官方维护的 [lua-filters](https://github.com/pandoc/lua-filters) 仓库提供了大量预制过滤器。

### 4. 引用与参考文献自动处理（citeproc）

Pandoc 内置完整的引用处理能力：
- 支持多种参考文献格式：BibTeX、BibLaTeX、CSL JSON、CSL YAML、RIS、EndNote XML
- 通过 `--citeproc` 参数自动处理文档中的引用标记
- 支持 Citation Style Language (CSL) 样式文件自定义引用格式
- 可生成符合学术期刊要求的参考文献列表

### 5. PDF 生成

Pandoc 不直接生成 PDF，而是通过外部 PDF 引擎实现：
- 支持的引擎：`pdflatex`、`lualatex`、`xelatex`、`latexmk`、`tectonic`、`wkhtmltopdf`、`weasyprint`、`prince`、`pagedjs-cli`、`context`、`pdfroff`、`groff`
- 3.9 版本新增 `--pdf-engine groff` 支持
- 支持 `--extract-media` 提取文档中的媒体资源（现已支持 .zip 格式输出）

### 6. 模板与元数据系统

Pandoc 使用 doctemplates 作为模板引擎：
- 每个输出格式都有对应的模板文件（`data/templates/default.*`）
- 用户可通过 `--template` 指定自定义模板
- 支持 YAML/JSON 格式的元数据块
- Defaults 文件（`--defaults`）可组合多个命令行选项为可复用配置（3.9 支持变量插值）

### 7. WebAssembly 支持（v3.9+）

从 3.9 版本起，Pandoc 支持编译为 WebAssembly，可在浏览器中直接运行。官方提供了全功能 GUI 界面：https://pandoc.org/app

### 8. HTTP 服务端 API

`pandoc-server` 子包提供了 HTTP API，可作为后台服务处理文档转换请求，支持：
- JSON 格式的请求/响应
- 批量转换
- 自定义过滤器集成

## 架构设计

### 多包项目结构

Pandoc 采用 Haskell 生态常见的**多包单体仓库（multi-package monorepo）**结构，通过 `pandoc.cabal` 中的多个 library/test-suite/benchmark 条目组织：

| 子包 | 职责 |
|------|------|
| `pandoc`（主库） | 核心 AST、Readers、Writers、解析基础设施、过滤器 |
| `pandoc-cli` | 命令行工具、选项解析、服务端启动器 |
| `pandoc-lua-engine` | Lua 运行时集成、过滤器执行引擎 |
| `pandoc-server` | HTTP API 服务实现 |
| `xml-light` | 轻量 XML 工具库（被其他子包共享） |

### 解析层设计

核心解析逻辑集中于 `Text.Pandoc.Parsing` 模块，提供：
- `Parsec` 风格的解析器组合子
- 状态管理（解析上下文、元数据、扩展标志等）
- 网格表格、脚注、引用等高级语法支持

各格式的 Reader 继承统一的解析接口，保证行为一致性。

### 类型类抽象

`Text.Pandoc.Class` 定义了核心类型类：
- `PandocMonad`：统一 Reader/Writer 的 Monad 接口
- `ReaderOptions`：解析选项（扩展标志、参考文件路径等）
- `WriterOptions`：生成选项（模板、元数据、输出格式等）

这种设计使得核心逻辑与 IO 副作用完全分离，便于单元测试和纯函数式推理。

### 扩展系统

Pandoc 通过 `--from` 和 `--to` 的扩展标记（如 `markdown+footnotes+tex_math_dollars`）精确控制解析和生成行为。`Text.Pandoc.Extensions` 模块定义了 50+ 种扩展选项，覆盖引用、脚注、数学公式、表格变体等各个方面。

## 快速开始

### 安装

**通过包管理器（推荐）：**

```bash
# macOS
brew install pandoc

# Linux (Debian/Ubuntu)
sudo apt install pandoc

# Python 用户
pip install pandoc

# Nix/NixOS
nix-env -iA haskellPackages.pandoc
```

**从源码构建：**

```bash
git clone https://github.com/jgm/pandoc.git
cd pandoc
cabal update && cabal install
# 或使用 Stack: stack install
```

### 基本用法

```bash
# Markdown 转 HTML
pandoc input.md -o output.html

# Markdown 转 LaTeX（生成 PDF）
pandoc input.md -o output.tex
pandoc input.md --pdf-engine=xelatex -o output.pdf

# 带引用的 Markdown 转 Word
pandoc input.md --bibliography=refs.bib -o output.docx

# 处理引用并生成参考文献
pandoc input.md --bibliography=refs.bib --citeproc -o output.html

# Markdown 转 reveal.js 幻灯片
pandoc slides.md -t revealjs -s -o slides.html

# 查看 AST 结构
pandoc input.md -t native

# 使用 Lua 过滤器
pandoc input.md --lua-filter=filter.lua -o output.html

# 批量转换（defaults 文件）
pandoc --defaults=publish.yaml
```

### 作为 Haskell 库使用

```haskell
import Text.Pandoc
import Text.Pandoc.Options

main :: IO ()
main = do
  result <- runIO $ do
    readMarkdown def { readerExtensions = pandocExtensions } "**Hello**, world!"
    >>= writeHtml5String def
  case result of
    Left e -> putStrLn $ show e
    Right html -> putStrLn html
```

## 学习价值

Pandoc 作为 Haskell 生态中规模最大、设计最优雅的项目之一，是学习以下内容的绝佳参考：

### 1. Haskell 实用工程
- **Parsec 风格解析器组合子**的工业级应用（attoparsec 用于高性能路径，parsec/megaparsec 用于复杂语法）
- **类型类多态**的实际运用（`PandocMonad`、`Reader/WriterOptions`）
- **代数数据类型（ADT）**建模复杂文档结构
- **纯函数式错误处理**（`Either` monad、显式错误类型）

### 2. 软件架构设计
- **Reader/Writer 模式**的教科书实现——添加新格式零改动核心逻辑
- **插件式过滤器架构**——Lua 脚本修改 AST，无需重新编译
- **多包仓库管理**——通过 Cabal 构建系统组织多个子包

### 3. 文档处理技术
- **标记语言解析**的通用方法（正则 vs PEG vs 组合子）
- **多格式互转的精度控制**（何时保留、何时丢失信息）
- **模板系统设计**（doctemplates 与格式模板的分离）
- **语法高亮**（skylighting）和**数学公式渲染**（texmath）的集成

### 4. 工程实践
- **Golden testing** 模式——完整的回归测试套件（每个格式的 round-trip 测试）
- **长期项目维护**——近 20 年活跃开发，420+ 贡献者，153 个发布版本
- **渐进式 API 设计**——保留向后兼容的同时引入新特性

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [python-docutils](https://github.com/python-docutils/docutils) | Python 的 reStructuredText 处理工具集 | 中 |
| [marked](https://github.com/markedjs/marked) | JavaScript Markdown 解析器（Node.js 生态） | 低 |
| [remark](https://github.com/remarkjs/remark) | unified/remark/mdast 生态的 Markdown 处理平台 | 低 |
| [markdown-it](https://github.com/markdown-it/markdown-it) | Node.js Markdown 解析器，支持 100+ 插件 | 低 |
| [MyST Parser](https://github.com/executablebooks/MyST-Parser) | Python 的 Markdown + Sphinx 扩展 | 低 |
| [mdBook](https://github.com/rust-lang/mdBook) | Rust 实现的 Markdown 书籍生成器 | 低 |
| [markua](https://leanpub.com/markua/read) | Leanpub 的 Markdown 方言 | 低 |
| [@pandoc/lua-filters](https://github.com/pandoc/lua-filters) | Pandoc 官方 Lua 过滤器仓库 | 高（生态） |
| [@pandoc/dockerfiles](https://github.com/pandoc/dockerfiles) | Pandoc Docker 镜像构建文件 | 高（生态） |
| [haddock-library](https://github.com/haskell/haddock-library) | Haskell 文档系统库（Pandoc 依赖） | 高（依赖） |
| [citeproc-hs](https://github.com/Juris-M/citeproc-hs) | Haskell 引用处理引擎 | 高（依赖/替代） |
| [texmath](https://github.com/jgm/texmath) | Pandoc 官方数学公式渲染库 | 高（依赖） |
| [pandoc-types](https://github.com/jgm/pandoc-types) | Pandoc AST 类型定义库 | 高（依赖） |

## 参考资料

- [GitHub 仓库](https://github.com/jgm/pandoc)
- [官方网站](https://pandoc.org)
- [用户手册（在线版）](https://pandoc.org/MANUAL.html)
- [API 文档（Hackage）](https://hackage.haskell.org/package/pandoc)
- [在线试用](https://pandoc.org/try)
- [Lua 过滤器指南](https://pandoc.org/lua-filters.html)
- [使用 Pandoc API](https://pandoc.org/using-the-pandoc-api.html)
- [@pandoc 组织仓库](https://github.com/pandoc)
- [WebAssembly GUI](https://pandoc.org/app)

---

*Generated: 2026-03-18*
