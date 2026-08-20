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
      return `面试工作流事件：需要生成题目。practice_id=${event.practiceId}，reason=${event.reason}。先调用 interview_get_status；需要历史上下文时调用 interview_read_practice_context。你必须自行生成一道完整题目，然后把非空完整题目作为 prompt 调用 interview_present_question；该工具只保存和展示，不会替你生成题目。${ASSISTANT_RESPONSE_PROTOCOL}`
    case 'question.retry_requested':
      return `面试工作流事件：用户要重新回答历史题。practice_id=${event.practiceId}，question_id=${event.questionId}。调用 interview_open_question 展示该题并等待用户回答，不要创建新题。${ASSISTANT_RESPONSE_PROTOCOL}`
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
import { ASSISTANT_RESPONSE_PROTOCOL } from './assistant-response-policy.js'
