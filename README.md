# dsh-interview

dsh-interview 是一个面向 DeepSeek Harness Web 的本地面试复习插件。

它把“刷面试题”做成可持久化的练习工作区：每次练习、每道题、每次作答、每条评价和参考讲解都会保存到本机。你可以同时维护多条练习，随时切换、继续、重新作答、查看历史，并把练习记录导出为 Markdown。

项目无额外运行时依赖，不需要前端构建步骤。

> 开发状态：本插件仍处于开发中，可能存在未发现的 bug 和功能缺陷。欢迎在使用过程中提交 issue、复现步骤和改进建议。

## 特色

- **把面试复习从“聊天记录”变成“练习资产”**：题目、回答、评价、讲解都会结构化保存，复盘时不需要翻聊天上下文。
- **围绕真实练习流程设计**：先答题，再评价，再看讲解，最后继续下一题或结束总结，节奏更接近面试复习本身。
- **保留作答演进过程**：同一道题可以反复回答，旧回答和旧评价不会被覆盖，适合观察自己从不会答到能答好的变化。
- **多主题并行复习**：JVM、Redis、项目深挖、场景题等练习可以同时存在，切换练习不会打乱已有进度。
- **界面负责呈现，模型负责内容**：题目、评价、讲解、面板和导出都有固定 UI，减少模型用普通 Markdown 乱排版带来的不稳定体验。
- **本地优先**：练习数据默认写入 DSH profile 下的本地文件，便于长期积累，也更适合处理简历和个人复盘内容。

## 功能一览

### 练习模式

- **背八股**：按主题连续练基础知识，例如 JVM、Redis、MySQL、Spring。
- **模拟面试**：按真实面试节奏出题、追问、评价回答。
- **场景题**：练线上排障、性能优化、系统设计、业务方案等开放问题。
- **简历出题**：根据简历内容生成项目追问、技术深挖和风险点问题。

### 答题流程

- **出题**：在聊天流里展示题目卡片，用户直接用正常输入框回答。
- **保存作答**：每次回答都会记录到当前题目下，作为独立作答历史。
- **评价回答**：保存评分、点评、遗漏点和改进建议。
- **查看讲解**：按需生成参考答案和“直接背”要点。
- **继续或结束**：讲解后可以进入下一题，也可以结束练习并生成总结。

### 历史管理

- **多练习并行**：可以同时保留多个主题、多个模式的练习。
- **切换练习**：从练习面板选择任意历史练习继续。
- **重新作答**：对旧题再次回答，不覆盖之前的回答和评价。
- **重新打开**：已结束练习可以重新打开后继续写入新题。
- **删除练习**：支持删除不再需要的练习，删除前需要确认。

### 复盘与导出

- **练习面板**：查看所有练习，搜索、筛选、展开题目和历次作答。
- **题目时间轴**：在右侧快速查看当前练习的问题、回答、点评和答案。
- **练习总结**：统计已评分题数、平均分和整体结论。
- **Markdown 导出**：导出当前、指定或全部练习，并可选择包含题目、回答、评价、讲解、背诵要点和总结。

## 安装

环境要求：

- DeepSeek Harness Web
- Node.js 支持原生 ESM 和 `crypto.randomUUID()`
- 当前实现按 DSH `0.1.0-rc.6` 插件接口开发

在仓库根目录执行：

```powershell
dsh plugin --profile web add .
```

如果是从其他目录安装本地副本，传入仓库路径即可：

```powershell
dsh plugin --profile web add "D:\path\to\dsh-interview"
```

安装完成后重启 `dsh web`。如果后续更新插件代码，执行：

```powershell
dsh plugin --profile web update dsh-interview
```

然后再次重启 `dsh web` 使 Host 和 Client 的改动生效。

## 基本用法

插件只使用自然语言交互。安装后，在 DeepSeek Harness Web 里直接说出你想练什么即可。

### 开始练习

```text
开始一个 JVM 背八股练习
开始一个 Redis 场景题练习
开始一个 Java 后端模拟面试
根据这份简历出题：这里粘贴简历全文
围绕 Spring 事务和 MySQL 索引出 10 道面试题
```

建议在一句话里说清楚模式和主题，例如“JVM 背八股”“Redis 场景题”“Java 后端模拟面试”。如果是简历出题，直接把简历内容一起发给模型即可。

### 回答题目

开始后，插件会在聊天流中展示题目卡片。你直接在输入框里回答即可：

```text
类加载器主要分为 Bootstrap、Extension、Application，自定义类加载器也可以参与加载。双亲委派会先把加载请求交给父加载器...
```

回答后，模型应保存你的作答并生成评价卡片。评价包含：

- 分数：0-10 分。
- 点评：答得好的地方、遗漏点、表达问题。
- 建议：下一次应该怎么答得更完整。

### 看答案和下一题

题目卡片和评价卡片都有查看讲解的入口。你也可以直接说：

```text
看答案
看讲解
```

讲解卡片会展示两部分：

- 讲解：完整参考答案和原因。
- 直接背：适合面试时复述的精简要点。

讲解卡片里会出现“下一题”和“结束练习”。点击“下一题”会继续出题，点击“结束练习”会保存本次练习总结。

### 重新作答

你可以对当前题或历史题重新作答：

```text
重新回答这道题
重新回答第 1 题
继续做第 3 题
```

重新作答不会覆盖旧回答。插件会追加一次新的作答记录，并把新的评价和旧评价一起保留，方便对比进步。

### 查看历史练习

```text
查看我的练习
打开练习面板
查看 JVM 的练习
继续第 2 个练习
查看第 1 个练习详情
查看当前练习时间轴
```

练习面板中可以：

- 搜索主题或题目。
- 按模式筛选练习。
- 查看题目数量、已评分数量、平均分和练习状态。
- 展开练习详情，查看每道题的回答、点评和答案。
- 切换当前练习。
- 对旧题重新作答。
- 导出或删除练习。

已结束的练习不会继续写入新题；需要先重新打开：

```text
重新打开第 2 个练习
继续第 2 个练习
```

### 导出 Markdown

可以导出当前练习：

```text
导出当前练习
```

导出指定练习：

```text
导出第 1 个练习
导出第 1、3 个练习
```

导出全部练习：

```text
导出全部练习
```

也可以选择导出内容：

```text
导出当前练习，只包含题目、回答和评价
导出第 2 个练习，包含题目、讲解和直接背
导出全部练习，包含元数据、题目、回答、评价、讲解、直接背和总结
```

可选内容包括：

| 内容 | 说明 |
| --- | --- |
| 元数据 | 练习 ID、创建时间、更新时间、模式、题目数、平均分。 |
| 题目 | 每道题的题干。 |
| 回答 | 每道题的历次作答。 |
| 评价 | 每次作答的分数和点评。 |
| 讲解 | 每道题的参考讲解。 |
| 直接背 | 面试中可直接复述的要点。 |
| 总结 | 练习结束时保存的总结。 |

默认导出目录：

```text
%USERPROFILE%\.dsh\profiles\web\data\dsh-interview\exports
```

每次练习会生成一篇 Markdown，文件名格式为：

```text
主题 - 创建时间 - 模式.md
```

示例：

```text
JVM - 2026-08-19 14:30 - 背八股.md
```

## 常用句式

```text
开始一个 JVM 背八股练习
开始一个 Redis 场景题练习
开始一个 Java 后端模拟面试
根据这份简历出题：...

看答案
看讲解
下一题
结束练习

查看我的练习
查看当前练习详情
继续第 2 个练习
重新打开第 2 个练习
重新回答第 1 题

导出当前练习
导出第 1、3 个练习，只包含题目、回答和评价
导出全部练习

你支持哪些操作？
```

## 数据存储

默认数据文件：

```text
%USERPROFILE%\.dsh\profiles\web\data\dsh-interview\data.json
```

根结构版本为 v3：

```json
{
  "version": 3,
  "practices": [],
  "selections": {},
  "focuses": {}
}
```

资源关系：

```text
practice
└── question
    ├── attempt 1
    │   └── evaluation
    ├── attempt 2
    │   └── evaluation
    └── explanation
```

插件启动时，如果同目录存在旧版 `archive.json` 且 `data.json` 不存在，会自动迁移到 v3。迁移会把旧题目的扁平回答和评价转换为第一条 `attempt`，后续写入都使用 `data.json`。

数据只保存在本机。简历、回答和评价可能包含个人信息，公开 issue、日志或导出文件前请自行脱敏。仓库不应提交真实 `data.json`、`archive.json`、导出文档、简历或会话日志。

## 开发

目录结构：

```text
dsh-interview/
├── client/client.js     # 卡片、练习面板、题目时间轴
├── lib/index.js         # 工具注册、事件监听、HTTP 路由
├── lib/state.js         # v3 数据模型、CRUD、迁移和导出
├── smoke-command.mjs    # 无外部依赖的冒烟测试
├── package.json
├── LICENSE
└── README.md
```

本地验证：

```powershell
node --check lib/state.js
node --check lib/index.js
node --check client/client.js
node smoke-command.mjs
npm pack --dry-run
```

## 工具协议参考

插件向模型暴露一个 `interview` 工具，通过 `action` 操作资源。普通用户不需要直接调用这些 action；这一节主要给插件开发者和调试者参考。

| 资源 | Actions |
| --- | --- |
| 练习 | `practice.create`, `practice.list`, `practice.get`, `practice.update`, `practice.delete` |
| 生命周期与视图 | `practice.finish`, `practice.reopen`, `practice.dashboard`, `practice.timeline`, `practice.summary` |
| 题目 | `question.open`, `question.list`, `question.get`, `question.update`, `question.delete` |
| 作答 | `attempt.create`, `attempt.list`, `attempt.get`, `attempt.update`, `attempt.delete` |
| 评价 | `evaluation.create`, `evaluation.get`, `evaluation.update`, `evaluation.list` |
| 讲解 | `explanation.create`, `explanation.get`, `explanation.update`, `explanation.delete` |
| 会话 | `session.get`, `session.select_practice`, `session.focus_question`, `session.clear_focus` |
| 导出 | `export.create` |

核心约束：

- 新题和恢复旧题都使用 `question.open`，这样才能展示同一套题目卡片。
- 用户回答后先保存 `attempt.create`，再保存 `evaluation.create`。
- 重新作答会创建或更新未评分的 attempt；已评分记录不会被覆盖。
- 只有用户明确请求答案或讲解时才创建 `explanation.create`。
- 删除练习前必须得到用户确认。

## 排障

卡片未显示：确认模型实际调用了 `question.open`、`evaluation.create` 或 `explanation.create`，然后重启 DSH 以加载最新 Client。

点评只有普通文本：检查模型是否在用户回答后调用了 `attempt.create` 和 `evaluation.create`。评价不应只写在普通聊天文本里。

恢复题目串题：先查看当前会话状态，再使用明确的 `practice_id` 和 `question_id` 或 `question_index` 打开题目。

按钮无响应：检查 Host 是否注册了 `/interview/control`，以及浏览器请求是否返回 4xx 错误。

数据读取失败：先备份 `data.json`，再检查 JSON 是否完整。旧版 `archive.json` 只在 `data.json` 不存在时作为迁移来源。

## 贡献

欢迎提交 issue 和 pull request。行为改动建议补充 `smoke-command.mjs`；UI 改动建议同时检查桌面和窄屏布局。提交前请运行开发章节中的验证命令，并确认没有提交个人练习数据。

## License

[MIT](./LICENSE)
