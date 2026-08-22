export const AGENT_TASK_TYPES = Object.freeze({
  GENERATE_QUESTION: 'question.generate',
  EVALUATE_ANSWER: 'answer.evaluate',
  GENERATE_REVIEW: 'review.generate',
  GENERATE_LEETCODE_EXPLANATION: 'leetcode.explain',
  DELIVER_ARTIFACT: 'artifact.deliver',
  GENERATE_SUMMARY: 'practice.summarize',
})

export const ARTIFACT_DELIVERY_REASONS = Object.freeze({
  PRACTICE_STARTED: 'practice_started',
  PRACTICE_CONTINUED: 'practice_continued',
  NEXT_REQUESTED: 'next_requested',
  QUESTION_RETRIED: 'question_retried',
  ANSWER_REVEALED: 'answer_revealed',
})

export function agentTask(type, context) {
  if (!Object.values(AGENT_TASK_TYPES).includes(type)) throw new TypeError(`不支持的 Agent 任务：${String(type)}`)
  return Object.freeze({ type, ...context })
}
