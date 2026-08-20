# Changelog

## 0.3.0

### 重大变更

- 将四个多命令工具替换为具备硬 Schema 的原子工具，不再保留旧工具名和 `command` 调用方式。
- 新增统一 `InterviewCoordinator`，Agent 与 UI 入口共享动作执行、事件派发和交互结果生成。
- 工具结果切换为 `dsh-interview/interaction-v1`，Client 不再解析旧的资源文本格式。

### 修复

- `interview_present_question.prompt` 现在是 `required + minLength: 1`，空题目调用在执行前被拒绝。
- Agent 参数和工作流错误被标记为可恢复内部错误，不再生成用户可见错误卡片。
- Assistant Text 由结构化响应契约控制，只做状态确认，不再复述 UI 内容。

### 改进

- Client 通过练习、题目和作答 ID 查询权威读模型，历史题目、评价和讲解卡片不依赖工具参数。
- 原子工具使用 `additionalProperties: false` 和字段级说明，降低模型误用概率。

## 0.2.0

### 重大变更

- 使用面试领域模型和显式状态机重写全部业务流程，不兼容 0.1.x 的工具协议与 JSON 数据。
- 将单一 `interview` 工具拆分为 `interview_session`、`interview_question`、`interview_answer` 和 `interview_library`。
- 将八股模式的协议标识统一为 `bagu`。
- 数据存储从单文件 JSON 切换为启用事务和外键约束的 SQLite。

### 新增

- 自然语言与可视化 UI 共享应用用例和权威读模型。
- 新增练习档案、搜索筛选、历次作答对比、能力复盘和题目时间轴。
- 新增受控 Markdown 下载令牌，避免通过 HTTP 暴露任意本地文件路径。
- 新增领域、应用、适配器、存储、Client 和端到端自动化测试。

### 改进

- Client 改为模块化源码并由 esbuild 生成 DSH 可加载产物。
- UI 使用明确阶段提示和十格掌握度轨道，并支持窄屏与键盘焦点。
- 错误响应提供稳定错误码，HTTP 响应默认禁止缓存。

## 0.1.0

- Initial open source release.
