function pluginMessage(text) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `dsh-interview-${Date.now()}`,
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'plugin', plugin: 'dsh-interview' },
  }
}

function instructionFor(event) {
  switch (event.type) {
    case 'question.generation_requested':
      return `面试工作流事件：需要生成题目。practice_id=${event.practiceId}，reason=${event.reason}。先调用 interview_session.status；需要历史上下文时调用 interview_library.get；然后调用 interview_question.ask 保存且展示一道符合模式和进度的新题。不要在普通文本中重复题目。`
    case 'explanation.generation_requested':
      return `面试工作流事件：用户明确请求当前题讲解。practice_id=${event.practiceId}，question_id=${event.questionId}。调用 interview_library.get 获取题目和作答，再调用 interview_question.save_explanation 保存完整讲解与直接背要点。不要在普通文本中重复讲解。`
    case 'question.retry_requested':
      return `面试工作流事件：用户要重新回答历史题。practice_id=${event.practiceId}，question_id=${event.questionId}。调用 interview_question.open 展示该题并等待用户回答，不要创建新题。`
    default:
      return null
  }
}

export class AgentEventBridge {
  constructor(ctx) {
    this.ctx = ctx
  }

  dispatch(events) {
    for (const event of events || []) {
      const text = instructionFor(event)
      if (!text) continue
      const agents = this.ctx.get('agents')
      const agent = agents?.get?.(event.sessionId)
      if (!agent?.followup) continue
      try {
        agent.followup(pluginMessage(text))
      } catch (error) {
        this.ctx.logger?.warn?.(`dsh-interview: Agent 事件投递失败：${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
}

export { instructionFor }
