# Changelog

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
