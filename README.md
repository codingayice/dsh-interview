# dsh-interview

[![npm](https://img.shields.io/npm/v/dsh-interview)](https://www.npmjs.com/package/dsh-interview)
[![license](https://img.shields.io/github/license/codingayice/dsh-interview)](./LICENSE)

dsh-interview 是面向 DeepSeek Harness Web 的本地 AI 面试训练工作区。它支持自然语言和可视化 UI 双入口，把题目、历次作答、评价、讲解和能力复盘结构化保存在本机。

## 功能

- 四种练习模式：背八股、模拟面试、场景题和简历出题。
- 显式面试流程：出题、回答、评价、讲解、下一题和结束。
- 历次作答永久保留，重新回答不会覆盖已评价记录。
- 练习档案支持搜索、筛选、详情、继续、重新打开、删除和导出。
- 能力复盘提供平均分、主题掌握度和薄弱主题。
- 聊天卡片与右侧题目时间轴使用同一份权威读模型。
- 数据默认保存在本地 SQLite，不上传简历和回答。

## 环境要求

- DeepSeek Harness Web
- Node.js 22.5 或更高版本

插件使用 Node.js 内置 SQLite，不需要额外数据库服务。

## 安装

```powershell
dsh plugin --profile web add dsh-interview
```

安装后重启 `dsh web`。更新插件时执行：

```powershell
dsh plugin --profile web update dsh-interview
```

## 使用方式

### 开始练习

直接描述模式、主题和要求：

```text
开始一个 JVM 背八股练习
开始一个 Redis 场景题练习，难度高级，共 8 题
开始一个 Java 高级后端模拟面试，重点考察并发和系统设计
根据下面这份简历进行模拟面试：……
```

创建后，Agent 会生成第一题并在聊天流中展示题目卡片。

### 回答和评价

直接在正常聊天输入框回答。Agent 会依次保存回答并生成结构化评价：

- 0–10 分总分
- 文字反馈
- 可选的准确性、完整性、分析深度和表达结构等维度分

同一道题可以重新回答。每次回答都是独立记录，适合比较进步。

### 讲解和下一题

评价完成后，可以点击卡片按钮或直接说：

```text
看讲解
下一题
重新回答这道题
结束练习
```

讲解只在明确请求后生成，包含完整说明和“直接背”要点。

### 练习档案和复盘

```text
查看我的练习
查看 JVM 练习详情
查看能力复盘
导出当前练习
```

练习档案支持搜索和筛选，并展示每道题的历次回答、评价和讲解。Markdown 导出通过一次性受控令牌下载。

## 数据存储

默认数据库：

```text
%USERPROFILE%\.dsh\profiles\web\data\dsh-interview\interview.sqlite
```

默认导出目录：

```text
%USERPROFILE%\.dsh\profiles\web\data\dsh-interview\exports
```

0.2.0 不自动迁移 0.1.x 的 `data.json` 或 `archive.json`。如需保留旧数据，请在升级前自行备份。

## Agent 工具协议

插件使用无 `command` 联合的原子工具。每个工具只执行一个业务动作，并通过 JSON Schema 硬性声明必填参数：

练习模式标识为 `bagu`（八股）、`mock`（模拟面试）、`scenario`（场景题）和 `resume`（简历出题）。

| 范围 | 工具 |
| --- | --- |
| 练习生命周期 | `interview_start_practice`、`interview_get_status`、`interview_select_practice`、`interview_reopen_practice`、`interview_finish_practice` |
| 题目流程 | `interview_present_question`、`interview_open_question`、`interview_request_next`、`interview_retry_question` |
| 回答与评价 | `interview_submit_answer`、`interview_present_evaluation` |
| 讲解流程 | `interview_request_explanation`、`interview_present_explanation` |
| 档案与复盘 | `interview_list_practices`、`interview_read_practice_context`、`interview_get_practice`、`interview_get_insights`、`interview_export_practices`、`interview_delete_practice` |

工具返回 `dsh-interview/interaction-v1` 结构化交互结果，包含 `state`、`nextAction`、`presentation` 和 `assistantResponse`。题目、回答、评价和讲解的正文参数均设置 `minLength` 与 `required`，无效的 Agent 调用不会进入领域写入。

UI 按钮不会绕过业务层。所有 UI 命令与 Agent 工具先进入同一个 `InterviewCoordinator`，再调用 `InterviewApplication`。

## 架构

```text
DSH Agent ─┐
           ├─ adapters ─→ coordinator ─→ application ─→ domain
React UI ──┘                                      │
                                                 └─ ports ← infrastructure
```

```text
src/
├── domain/          实体、值对象和工作流状态机
├── application/     协调器、交互协议、命令、查询、DTO 和端口
├── infrastructure/  SQLite、Markdown 导出和系统能力
├── adapters/        DSH 工具、HTTP API 和 Agent 事件桥接
├── client/          React 功能模块、共享 API 和设计系统
└── protocol/        Agent 与 Client 共享的稳定协议常量
```

详细边界参见 [目标架构](./docs/architecture.md) 和 [重构需求基线](./docs/refactor-requirements.md)。

## 本地开发

安装开发依赖：

```powershell
npm install
```

生成 Client：

```powershell
npm run build
```

运行完整验证：

```powershell
npm run verify
npm pack --dry-run
```

测试覆盖领域状态机、应用用例、SQLite Repository、DSH 工具、Client 注册和完整端到端流程。

## 发布检查

- `npm run verify` 全部通过。
- `npm pack --dry-run` 包含 `lib/`、`src/`、`client/` 和插件清单。
- 不提交 SQLite、导出文件、简历、回答或会话日志。
- 提交信息遵循 Conventional Commits。

## License

[MIT](./LICENSE)
