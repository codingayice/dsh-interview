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

UI 使用统一 API Client 和查询缓存。工具卡片只读取结构化 `presentation` 中的资源 ID，再通过读接口获取题目、评价和讲解；不解析面向 Agent 的文本，也不从工具参数重建业务数据。

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
