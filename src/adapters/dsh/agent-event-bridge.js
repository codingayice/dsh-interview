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
      return `面试工作流事件：后端状态机要求生成题目。practice_id=${task.practiceId}，reason=${task.reason}。必须调用 interview_read_practice_context 读取已保存的模式专属配置和全部历史。严格遵守 interview_present_question 的出题约束生成一道题，然后把非空题目作为 prompt 调用该工具；题目必须先由后端保存为领域对象，再由 question 产物卡片展示，禁止通过普通 Assistant Text 出题。${ASSISTANT_RESPONSE_PROTOCOL}`
    case AGENT_TASK_TYPES.EVALUATE_ANSWER:
      return `面试工作流事件：需要恢复评价。practice_id=${task.practiceId}，question_id=${task.questionId}，attempt_id=${task.attemptId}。必须调用 interview_read_practice_context，找到上述作答的原始回答，生成评分与点评并调用 interview_save_evaluation；如果工具要求生成讲解，必须继续调用 interview_complete_review。不得创建新作答或新题。${ASSISTANT_RESPONSE_PROTOCOL}`
    case AGENT_TASK_TYPES.GENERATE_REVIEW:
      return task.reason === 'answer_revealed'
        ? `面试工作流事件：用户选择直接看答案。practice_id=${task.practiceId}，question_id=${task.questionId}。必须调用 interview_read_practice_context 读取完整题目与练习配置，直接生成详细知识点讲解和可直接背诵的“直接背”，然后调用 interview_complete_review。禁止创建用户作答、评分或评价。${ASSISTANT_RESPONSE_PROTOCOL}`
        : `面试工作流事件：需要恢复点评讲解。practice_id=${task.practiceId}，question_id=${task.questionId}。必须调用 interview_read_practice_context，基于题目和已有评价生成详细讲解与直接背，然后调用 interview_complete_review。不得重复评价、创建作答或出题。${ASSISTANT_RESPONSE_PROTOCOL}`
    case AGENT_TASK_TYPES.GENERATE_LEETCODE_EXPLANATION:
      return `力扣练习事件：用户请求当前题讲解。practice_id=${task.practiceId}，question_id=${task.questionId}。必须调用 interview_read_practice_context 读取当前力扣题和 config.language，严格遵守 interview_complete_review 的力扣讲解约束生成内容并调用该工具保存；不得创建作答、评分、评价或新题。${ASSISTANT_RESPONSE_PROTOCOL}`
    case AGENT_TASK_TYPES.DELIVER_ARTIFACT:
      return `交互产物投递事件：后端已经完成业务动作并确定当前权威 UI 产物。practice_id=${task.practiceId}，question_id=${task.questionId}，reason=${task.reason}。必须只调用 interview_render_current_artifact，并原样传入 reason=${task.reason}；该工具只负责把后端产物放到当前对话的最新位置。禁止调用任何业务工具，禁止生成、改写或复述题目、点评、讲解和总结。${ASSISTANT_RESPONSE_PROTOCOL}`
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
