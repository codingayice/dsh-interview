import { QUESTION_GENERATION_POLICY } from './interview-prompt-policy.js'
import { ASSISTANT_RESPONSE_PROTOCOL } from './assistant-response-policy.js'

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
      return `面试工作流事件：需要生成题目。practice_id=${event.practiceId}，reason=${event.reason}。先调用 interview_get_status，再必须调用 interview_read_practice_context 读取已保存的模式专属配置和全部历史。你必须严格按配置自行生成题目，然后把非空题目作为 prompt 调用 interview_present_question；该工具只保存和展示，不会替你生成题目。${QUESTION_GENERATION_POLICY}${ASSISTANT_RESPONSE_PROTOCOL}`
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
