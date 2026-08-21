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
→ return interaction state + next action + presentation + revision
```

## 查询执行

查询直接通过 Repository 的只读接口生成 DTO。查询不得修改选择、焦点或领域实体，UI 也不得依赖查询的副作用完成会话切换。

## UI 同步

UI 使用统一 API Client 和查询缓存。工具卡片只读取结构化 `presentation` 中的资源 ID，再通过读接口获取题目、作答、评价和讲解；不解析面向 Agent 的文本，也不从工具参数重建业务数据。评价是内部中间状态，只有讲解和“直接背”保存完成后才生成统一的 `review` 展示资源。

## 交互协议

所有入口由 `InterviewCoordinator` 生成 `dsh-interview/interaction-v1`：

```text
state             当前工作流状态
nextAction        Agent 下一步生成、评价或等待用户
presentation      UI 展示类型和权威资源 ID
assistantResponse Assistant Text 的固定响应契约
error.audience    agent / user / system 错误受众
```

Agent 协议错误是可恢复的中间结果，不产生 UI；用户操作错误和系统错误才进入用户可见错误通道。

回答提交后的工具链固定为：

```text
interview_submit_answer
→ interview_save_evaluation
→ interview_complete_review
→ presentation.kind = review
```

若重新作答的题目已经存在参考讲解，保存新评价后直接复用该讲解生成点评讲解卡片。

直接看答案不会经过作答和评价：

```text
interview_reveal_answer
→ interview_complete_review
→ presentation.kind = review（无 attemptId）
```

非力扣练习使用独立总结阶段：

```text
interview_finish_practice
→ 读取完整练习上下文并生成总结
→ interview_complete_summary
→ presentation.kind = finished
```

力扣练习不进入总结生成阶段：

```text
interview_finish_practice
→ 本地保存本次抽取的题目清单并结束练习
→ presentation.kind = finished
```

切换练习返回的会话 DTO 内嵌完整练习详情，包括模式配置、总结、全部题目、历次作答、评价和讲解；Agent 无需依赖额外推断恢复上下文。
