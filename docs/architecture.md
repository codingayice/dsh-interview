# dsh-interview 目标架构

## 依赖方向

```text
DSH Agent ─┐
           ├─ adapters ─→ coordinator ─→ application ─→ domain
React UI ──┘                                      │
                                                 └─ ports ← infrastructure
```

依赖只能向内：适配器依赖应用层，应用层依赖领域层与端口，领域层不依赖外部实现。

## 模块职责

```text
src/
├── domain/          实体、值对象、状态机、模式策略、领域错误
├── application/     交互协调器、命令、查询、DTO、应用服务和端口
├── infrastructure/  SQLite、Markdown 导出、系统时钟和 UUID
├── adapters/        DSH 原子工具、HTTP 路由和 Agent 事件桥接
├── client/          React 功能模块、共享 API 和可视化组件
└── protocol/        Agent 与 Client 共享的工具名和协议常量
```

## 命令执行

```text
Adapter Input
→ validate atomic action schema
→ coordinate source and interaction
→ load aggregate and cursor
→ execute domain behavior
→ save aggregate and cursor in one application operation
→ publish domain events
→ materialize interaction artifact
→ return interaction state + next action + artifact + revision
```

## 查询执行

查询直接通过 Repository 的只读接口生成 DTO。查询不得修改选择、焦点或领域实体，UI 也不得依赖查询的副作用完成会话切换。

## UI 同步

UI 使用统一 API Client 和查询缓存。工具卡片只读取结构化 `artifact` 中的资源 ID，再通过读接口获取题目、作答、评价和讲解；不解析面向 Agent 的文本，也不从工具参数重建业务数据。评价是内部中间状态，只有讲解和“直接背”保存完成后才生成统一的 `review` 产物。

题目、点评讲解和总结分别由 `question`、`review` 和 `finished` 产物承载。会话中不存在可以动态替代这些产物的“练习工作台卡片”。工作台是独立的本地管理界面，不参与对话业务内容展示。

## 交互协议

所有入口由 `InterviewCoordinator` 生成 `dsh-interview/interaction-v2`：

```text
state             当前工作流状态
nextAction        Agent 下一步生成、评价或等待用户
artifact          UI 产物类型和权威资源 ID
assistantResponse Assistant Text 的固定响应契约
error.audience    agent / user / system 错误受众
```

只要结果包含 `artifact`，`assistantResponse` 就必须是后端给出的固定短句，模型不得复述产物内容。Agent 协议错误是可恢复的中间结果，不产生 UI；用户操作错误和系统错误才进入用户可见错误通道。

## 后端编排与 Agent 边界

状态机决定当前阶段和唯一下一动作，应用层完成业务写入，Agent 只承担必须使用模型能力的内容任务：

```text
后端状态机
→ 发布显式 Agent 内容任务
→ Agent 读取后端完整上下文
→ 生成一道题 / 评价 / 讲解 / 总结
→ 调用对应保存工具
→ 后端校验、持久化并生成 UI 产物
```

UI 操作已经由后端完成业务动作时，不允许 Agent 再执行一次业务命令。由于 DSH 的会话卡片依附工具调用块，后端会发布单独的 `artifact.deliver` 任务：

```text
UI 业务命令
→ 后端更新状态并确定当前产物
→ artifact.deliver
→ interview_render_current_artifact
→ 在对话最新位置展示后端权威产物
```

`interview_render_current_artifact` 不改变业务状态、不生成内容，也不能代替继续、下一题、重答或看答案。用户表达“继续练习”时只调用 `interview_continue_practice`，由后端根据当前游标决定恢复题目、评价、讲解、总结或生成下一题。

回答提交后的工具链固定为：

```text
interview_submit_answer
→ interview_save_evaluation
→ interview_complete_review
→ artifact.kind = review
```

若重新作答的题目已经存在参考讲解，保存新评价后直接复用该讲解生成点评讲解卡片。

直接看答案不会经过作答和评价：

```text
interview_reveal_answer
→ interview_complete_review
→ artifact.kind = review（无 attemptId）
```

非力扣练习使用独立总结阶段：

```text
interview_finish_practice
→ 读取完整练习上下文并生成总结
→ interview_complete_summary
→ artifact.kind = finished
```

力扣练习不进入总结生成阶段：

```text
interview_finish_practice
→ 本地保存本次抽取的题目清单并结束练习
→ artifact.kind = finished
```

切换练习返回的会话 DTO 内嵌完整练习详情，包括模式配置、总结、全部题目、历次作答、评价和讲解；Agent 无需依赖额外推断恢复上下文。
