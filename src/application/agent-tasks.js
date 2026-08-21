export const AGENT_TASK_TYPES = Object.freeze({
  GENERATE_QUESTION: 'question.generate',
  EVALUATE_ANSWER: 'answer.evaluate',
  GENERATE_REVIEW: 'review.generate',
  GENERATE_LEETCODE_EXPLANATION: 'leetcode.explain',
  PRESENT_LEETCODE_QUESTION: 'leetcode.present',
  GENERATE_SUMMARY: 'practice.summarize',
})

export function agentTask(type, context) {
  if (!Object.values(AGENT_TASK_TYPES).includes(type)) throw new TypeError(`不支持的 Agent 任务：${String(type)}`)
  return Object.freeze({ type, ...context })
}
