# dsh-interview 目标架构

## 依赖方向

```text
DSH Agent ─┐
           ├─ adapters ─→ application ─→ domain
React UI ──┘                    │
                               └─ ports ← infrastructure
```

依赖只能向内：适配器依赖应用层，应用层依赖领域层与端口，领域层不依赖外部实现。

## 模块职责

```text
src/
├── domain/          实体、值对象、状态机、模式策略、领域错误
├── application/     命令、查询、DTO、应用服务和端口
├── infrastructure/  SQLite、Markdown 导出、系统时钟和 UUID
├── adapters/        DSH 工具、HTTP 路由和 Agent 事件桥接
└── client/          React 功能模块、共享 API 和可视化组件
```

## 命令执行

```text
Adapter Input
→ validate command
→ load aggregate and cursor
→ execute domain behavior
→ save aggregate and cursor in one application operation
→ publish domain events
→ return typed resource + revision
```

## 查询执行

查询直接通过 Repository 的只读接口生成 DTO。查询不得修改选择、焦点或领域实体，UI 也不得依赖查询的副作用完成会话切换。

## UI 同步

UI 使用统一 API Client 和查询缓存。命令返回 `revision` 后使相关查询失效；聊天卡片和时间轴均重新读取当前会话或指定资源，不从工具参数复制题目、评价和讲解正文。
