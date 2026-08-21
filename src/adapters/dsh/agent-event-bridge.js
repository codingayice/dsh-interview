import { LEETCODE_EXPLANATION_POLICY, QUESTION_GENERATION_POLICY } from './interview-prompt-policy.js'
import { ASSISTANT_RESPONSE_PROTOCOL } from './assistant-response-policy.js'
import { AGENT_TASK_TYPES } from '../../application/agent-tasks.js'

function pluginMessage(text) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `dsh-interview-${Date.now()}`,
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'plugin', plugin: 'dsh-interview' },
  }
}

function instructionFor(task) {
  switch (task.type) {
    case AGENT_TASK_TYPES.GENERATE_QUESTION:
      return `面试工作流事件：需要生成题目。practice_id=${task.practiceId}，reason=${task.reason}。先调用 interview_get_status，再必须调用 interview_read_practice_context 读取已保存的模式专属配置和全部历史。你必须严格按配置自行生成题目，然后把非空题目作为 prompt 调用 interview_present_question；该工具只保存和展示，不会替你生成题目。${QUESTION_GENERATION_POLICY}${ASSISTANT_RESPONSE_PROTOCOL}`
    case AGENT_TASK_TYPES.EVALUATE_ANSWER:
      return `面试工作流事件：需要恢复评价。practice_id=${task.practiceId}，question_id=${task.questionId}，attempt_id=${task.attemptId}。必须调用 interview_read_practice_context，找到上述作答的原始回答，生成评分与点评并调用 interview_save_evaluation；如果工具要求生成讲解，必须继续调用 interview_complete_review。不得创建新作答或新题。${ASSISTANT_RESPONSE_PROTOCOL}`
    case AGENT_TASK_TYPES.GENERATE_REVIEW:
      return task.reason === 'answer_revealed'
        ? `面试工作流事件：用户选择直接看答案。practice_id=${task.practiceId}，question_id=${task.questionId}。必须调用 interview_read_practice_context 读取完整题目与练习配置，直接生成详细知识点讲解和可直接背诵的“直接背”，然后调用 interview_complete_review。禁止创建用户作答、评分或评价。${ASSISTANT_RESPONSE_PROTOCOL}`
        : `面试工作流事件：需要恢复点评讲解。practice_id=${task.practiceId}，question_id=${task.questionId}。必须调用 interview_read_practice_context，基于题目和已有评价生成详细讲解与直接背，然后调用 interview_complete_review。不得重复评价、创建作答或出题。${ASSISTANT_RESPONSE_PROTOCOL}`
    case AGENT_TASK_TYPES.GENERATE_LEETCODE_EXPLANATION:
      return `力扣练习事件：用户请求当前题讲解。practice_id=${task.practiceId}，question_id=${task.questionId}。必须调用 interview_read_practice_context 读取当前力扣题，再严格生成教学型算法讲解和五种语言答案代码，最后调用 interview_complete_review 保存；不得创建作答、评分、评价或新题。${LEETCODE_EXPLANATION_POLICY}${ASSISTANT_RESPONSE_PROTOCOL}`
    case AGENT_TASK_TYPES.PRESENT_LEETCODE_QUESTION:
      return `力扣题目展示事件：插件已经随机抽取并保存题目。practice_id=${task.practiceId}，question_id=${task.questionId}。必须只调用 interview_continue_practice 读取并展示当前权威题目卡片。禁止调用 interview_request_next、interview_present_question 或自行生成题目，避免重复抽题。${ASSISTANT_RESPONSE_PROTOCOL}`
    case AGENT_TASK_TYPES.GENERATE_SUMMARY:
      return `面试工作流事件：用户要求结束练习。practice_id=${task.practiceId}。必须调用 interview_read_practice_context 读取练习配置、全部题目、全部历次作答、评价和讲解；基于这些真实数据生成总体总结、表现亮点和改进建议，然后调用 interview_complete_summary。禁止继续出题。${ASSISTANT_RESPONSE_PROTOCOL}`
    default:
      return null
  }
}

export class AgentEventBridge {
  constructor(ctx) {
    this.ctx = ctx
  }

  dispatch(tasks) {
    for (const task of tasks || []) {
      const text = instructionFor(task)
      if (!text) continue
      const agents = this.ctx.get('agents')
      const agent = agents?.get?.(task.sessionId)
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
