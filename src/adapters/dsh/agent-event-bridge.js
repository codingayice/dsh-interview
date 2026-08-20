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
    case 'leetcode.problem_drawn':
      return `刷力扣工作流事件：插件已经从固定的力扣热题 100 题库随机抽题。practice_id=${event.practiceId}，question_id=${event.questionId}。立即调用 interview_open_question，question_id 必须使用上述 ID，通过题目卡展示插件已经保存的题目。禁止自行生成、改写或替换题目。${ASSISTANT_RESPONSE_PROTOCOL}`
    case 'answer.evaluation_requested':
      return `面试工作流事件：需要恢复评价。practice_id=${event.practiceId}，question_id=${event.questionId}，attempt_id=${event.attemptId}。必须调用 interview_read_practice_context，找到上述作答的原始回答，生成评分与点评并调用 interview_save_evaluation；如果工具要求生成讲解，必须继续调用 interview_complete_review。不得创建新作答或新题。${ASSISTANT_RESPONSE_PROTOCOL}`
    case 'review.generation_requested':
      return `面试工作流事件：需要恢复点评讲解。practice_id=${event.practiceId}，question_id=${event.questionId}。必须调用 interview_read_practice_context，基于题目和已有评价生成详细讲解与直接背，然后调用 interview_complete_review。不得重复评价、创建作答或出题。${ASSISTANT_RESPONSE_PROTOCOL}`
    case 'practice.selected':
      return `面试工作流事件：用户通过 UI 切换了当前练习。practice_id=${event.practiceId}，phase=${event.phase}。立即调用 interview_select_practice，practice_id 必须使用上述 ID。该工具会把练习配置、总结、全部题目、历次作答、评价和讲解加载给你，并规定唯一确认文本。完成确认后停止，不要出题、评价或生成其他内容。${ASSISTANT_RESPONSE_PROTOCOL}`
    case 'question.retry_requested':
      return `面试工作流事件：用户要重新回答历史题。practice_id=${event.practiceId}，question_id=${event.questionId}。调用 interview_open_question 展示该题并等待用户回答，不要创建新题。${ASSISTANT_RESPONSE_PROTOCOL}`
    case 'answer.reveal_requested':
      return `面试工作流事件：用户选择直接看答案。practice_id=${event.practiceId}，question_id=${event.questionId}。必须调用 interview_read_practice_context 读取完整题目与练习配置，直接生成详细知识点讲解和可直接背诵的“直接背”，然后调用 interview_complete_review。禁止创建用户作答、评分或评价。${ASSISTANT_RESPONSE_PROTOCOL}`
    case 'practice.summary_requested':
      return `面试工作流事件：用户要求结束练习。practice_id=${event.practiceId}。必须调用 interview_read_practice_context 读取练习配置、全部题目、全部历次作答、评价和讲解；基于这些真实数据生成总体总结、表现亮点和改进建议，然后调用 interview_complete_summary。禁止继续出题。${ASSISTANT_RESPONSE_PROTOCOL}`
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
