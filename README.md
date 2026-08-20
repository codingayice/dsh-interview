# dsh-interview

[![npm](https://img.shields.io/npm/v/dsh-interview)](https://www.npmjs.com/package/dsh-interview)
[![license](https://img.shields.io/github/license/codingayice/dsh-interview)](./LICENSE)

dsh-interview 是面向 DeepSeek Harness Web 的本地 AI 面试训练工作区。它支持自然语言和可视化 UI 双入口，把题目、历次作答、评价、讲解和能力复盘结构化保存在本机。

## 功能

- 四种练习模式：背八股、模拟面试、场景题和刷力扣。
- 内置[力扣热题 100](https://leetcode.cn/studyplan/top-100-liked/)固定题库快照，按官方题型展示 100 道题的地址、难度和本地完成状态。
- 显式面试流程：单题出题、回答或直接看答案、点评讲解、下一题和练习总结。
- 历次作答永久保留，重新回答不会覆盖已评价记录。
- 支持用“继续练习”从权威工作流阶段恢复，不会把继续一律解释为下一题。
- 练习档案支持新建、搜索、筛选、详情、修改、继续、重新打开、删除和导出，题目支持查询、修改和删除。
- 能力复盘提供平均分、主题掌握度和薄弱主题。
- 聊天卡片与右侧轻量题目时间轴使用同一份权威读模型；点击节点后通过题目、作答记录、答案三个标签查看详情。
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

开始前先明确选择模式，插件和 Agent 不会自行推断或使用默认值。不同模式只收集自己的必要配置：

- 背八股：主题
- 场景题：主题
- 模拟面试：简历、面试官风格、是否手撕代码、面试难度（初级、中级或高级）
- 刷力扣：无需额外配置，由插件从固定的热题 100 中随机抽题

模式没有明确时，Agent 只询问模式；模式明确后，只询问该模式缺少的字段。Agent 不得沿用历史配置、把缺少的布尔值当作 `false`，也不得增加题数、追问策略或面试时长等配置。

可以一次性描述完整配置：

```text
开始 JVM 八股练习
开始 Redis 高可用场景题练习
根据下面这份简历进行高级模拟面试，面试官风格是深挖项目，需要手撕代码：……
开始刷力扣
```

创建后，Agent 每次只生成一道简单、明确、简短的问题，并在聊天流中展示题目卡片。

刷力扣模式例外：题目不由 Agent 生成，而是由插件从本地固定题库随机抽取。抽题优先选择本次练习尚未出现且尚未完成的题；当前候选池用尽后再逐级回退。题目卡可以打开力扣原题、标记完成或未完成、随机下一题、查看完整题目列表和结束练习。完成状态独立于单次练习，保存在本地 SQLite 中。

### 回答和点评讲解

可以直接在正常聊天输入框回答，也可以点击题目卡的“看答案”。作答后 Agent 会保存回答，并自动生成结构化点评讲解：

- 0–10 分总分
- 文字反馈
- 可选的准确性、完整性、分析深度和表达结构等维度分
- 完整参考讲解
- 必填的“直接背”要点

同一道题可以重新回答。每次回答都是独立记录，适合比较进步。

直接看答案不会创建虚假的作答和评价，只展示详细知识点讲解与“直接背”。

### 点评讲解后的操作

点评讲解卡片生成后，可以直接点击卡片按钮或使用自然语言：

```text
下一题
重新回答这道题
结束练习
```

评价是内部中间结果，不单独生成半成品卡片。点评讲解卡片采用上下结构，只展示评分、评价、详细讲解和“直接背”，不重复展示用户作答，也不提供复制按钮。

结束练习后，Agent 会读取本次练习的全部题目、历次作答、评价和讲解，生成并保存总体总结、表现亮点和改进建议。

### 练习档案和复盘

```text
查看我的练习
查看 JVM 练习详情
查看能力复盘
导出当前练习
```

练习档案支持搜索和筛选，并展示每道题的历次回答、评价和讲解。Markdown 导出通过一次性受控令牌下载。

点击“切换到该练习”后，插件会立即通知 Agent 加载该练习的完整上下文，并由 Agent 确认当前练习已经切换成功。

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

练习模式标识为 `bagu`（背八股）、`mock`（模拟面试）、`scenario`（场景题）和 `leetcode`（刷力扣）。

| 范围 | 工具 |
| --- | --- |
| 练习生命周期 | `interview_start_practice`、`interview_update_practice`、`interview_get_status`、`interview_select_practice`、`interview_reopen_practice`、`interview_finish_practice`、`interview_complete_summary` |
| 题目流程 | `interview_present_question`、`interview_get_question`、`interview_update_question`、`interview_delete_question`、`interview_open_question`、`interview_request_next`、`interview_retry_question`、`interview_reveal_answer` |
| 回答与点评讲解 | `interview_submit_answer`、`interview_save_evaluation`、`interview_complete_review` |
| 力扣题库 | `interview_get_leetcode_catalog`、`interview_set_leetcode_completion` |
| 档案与复盘 | `interview_list_practices`、`interview_read_practice_context`、`interview_get_practice`、`interview_get_insights`、`interview_export_practices`、`interview_delete_practice` |

工具返回 `dsh-interview/interaction-v1` 结构化交互结果，包含 `state`、`nextAction`、`presentation` 和 `assistantResponse`。评价保存后必须继续完成点评讲解；参考讲解和“直接背”均由 Schema 设置为非空必填，无效调用不会进入领域写入。

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
