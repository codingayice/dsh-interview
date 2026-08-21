import { assertDomain } from './errors.js'

export const WORKFLOW_PHASES = Object.freeze({
  AWAITING_QUESTION: 'awaiting_question',
  AWAITING_SOLUTION: 'awaiting_solution',
  AWAITING_ANSWER: 'awaiting_answer',
  AWAITING_EVALUATION: 'awaiting_evaluation',
  GENERATING_EXPLANATION: 'generating_explanation',
  AWAITING_NEXT: 'awaiting_next',
  GENERATING_SUMMARY: 'generating_summary',
  COMPLETED: 'completed',
})

export const CONTINUATION_ACTIONS = Object.freeze({
  GENERATE_QUESTION: 'generate_question',
  SHOW_CURRENT_QUESTION: 'show_current_question',
  EVALUATE_ANSWER: 'evaluate_answer',
  GENERATE_EXPLANATION: 'generate_explanation',
  REQUEST_NEXT: 'request_next',
  GENERATE_SUMMARY: 'generate_summary',
  CONFIRM_REOPEN: 'confirm_reopen',
})

const CONTINUATION_BY_PHASE = Object.freeze({
  [WORKFLOW_PHASES.AWAITING_QUESTION]: CONTINUATION_ACTIONS.GENERATE_QUESTION,
  [WORKFLOW_PHASES.AWAITING_SOLUTION]: CONTINUATION_ACTIONS.SHOW_CURRENT_QUESTION,
  [WORKFLOW_PHASES.AWAITING_ANSWER]: CONTINUATION_ACTIONS.SHOW_CURRENT_QUESTION,
  [WORKFLOW_PHASES.AWAITING_EVALUATION]: CONTINUATION_ACTIONS.EVALUATE_ANSWER,
  [WORKFLOW_PHASES.GENERATING_EXPLANATION]: CONTINUATION_ACTIONS.GENERATE_EXPLANATION,
  [WORKFLOW_PHASES.AWAITING_NEXT]: CONTINUATION_ACTIONS.REQUEST_NEXT,
  [WORKFLOW_PHASES.GENERATING_SUMMARY]: CONTINUATION_ACTIONS.GENERATE_SUMMARY,
  [WORKFLOW_PHASES.COMPLETED]: CONTINUATION_ACTIONS.CONFIRM_REOPEN,
})

export function continuationFor(cursor) {
  const action = CONTINUATION_BY_PHASE[cursor?.phase]
  assertDomain(Boolean(action), 'INVALID_WORKFLOW_PHASE', `无法从当前阶段 ${cursor?.phase || 'unknown'} 继续练习`)
  return action
}

function requirePhase(cursor, expected) {
  const phases = Array.isArray(expected) ? expected : [expected]
  assertDomain(
    phases.includes(cursor.phase),
    'INVALID_WORKFLOW_PHASE',
    `当前阶段 ${cursor.phase} 不允许执行该操作`,
    { current: cursor.phase, expected: phases },
  )
}

function advance(cursor, patch, now) {
  return { ...cursor, ...patch, revision: cursor.revision + 1, updatedAt: now }
}

export function createCursor({ sessionId, practiceId, now }) {
  assertDomain(typeof sessionId === 'string' && sessionId.trim(), 'INVALID_SESSION_ID', 'sessionId 不能为空')
  assertDomain(typeof practiceId === 'string' && practiceId.trim(), 'INVALID_PRACTICE_ID', 'practiceId 不能为空')
  return {
    sessionId,
    practiceId,
    questionId: null,
    attemptId: null,
    phase: WORKFLOW_PHASES.AWAITING_QUESTION,
    revision: 1,
    updatedAt: now,
  }
}

export function transferCursor(cursor, sessionId, now) {
  assertDomain(typeof sessionId === 'string' && sessionId.trim(), 'INVALID_SESSION_ID', 'sessionId 不能为空')
  return advance(cursor, { sessionId: sessionId.trim() }, now)
}

export function markQuestionAsked(cursor, questionId, now) {
  requirePhase(cursor, WORKFLOW_PHASES.AWAITING_QUESTION)
  return advance(cursor, {
    questionId,
    attemptId: null,
    phase: WORKFLOW_PHASES.AWAITING_ANSWER,
  }, now)
}

export function markLeetcodeProblemPresented(cursor, questionId, now) {
  requirePhase(cursor, [
    WORKFLOW_PHASES.AWAITING_QUESTION,
    WORKFLOW_PHASES.AWAITING_SOLUTION,
    WORKFLOW_PHASES.AWAITING_NEXT,
  ])
  return advance(cursor, {
    questionId,
    attemptId: null,
    phase: WORKFLOW_PHASES.AWAITING_SOLUTION,
  }, now)
}

export function markAnswerSubmitted(cursor, attemptId, now) {
  requirePhase(cursor, WORKFLOW_PHASES.AWAITING_ANSWER)
  return advance(cursor, {
    attemptId,
    phase: WORKFLOW_PHASES.AWAITING_EVALUATION,
  }, now)
}

export function markAnswerRevealed(cursor, now, { reviewReady = false } = {}) {
  requirePhase(cursor, [
    WORKFLOW_PHASES.AWAITING_ANSWER,
    WORKFLOW_PHASES.AWAITING_SOLUTION,
    WORKFLOW_PHASES.AWAITING_NEXT,
  ])
  return advance(cursor, {
    attemptId: null,
    phase: reviewReady ? WORKFLOW_PHASES.AWAITING_NEXT : WORKFLOW_PHASES.GENERATING_EXPLANATION,
  }, now)
}

export function markAnswerEvaluated(cursor, now, { reviewReady = false } = {}) {
  requirePhase(cursor, WORKFLOW_PHASES.AWAITING_EVALUATION)
  return advance(cursor, {
    phase: reviewReady ? WORKFLOW_PHASES.AWAITING_NEXT : WORKFLOW_PHASES.GENERATING_EXPLANATION,
  }, now)
}

export function markExplanationSaved(cursor, now) {
  requirePhase(cursor, WORKFLOW_PHASES.GENERATING_EXPLANATION)
  return advance(cursor, { phase: WORKFLOW_PHASES.AWAITING_NEXT }, now)
}

export function markNextRequested(cursor, now) {
  requirePhase(cursor, WORKFLOW_PHASES.AWAITING_NEXT)
  return advance(cursor, {
    questionId: null,
    attemptId: null,
    phase: WORKFLOW_PHASES.AWAITING_QUESTION,
  }, now)
}

export function markQuestionRetried(cursor, questionId, now) {
  assertDomain(cursor.phase !== WORKFLOW_PHASES.COMPLETED, 'PRACTICE_ALREADY_COMPLETED', '已结束练习必须先重新打开')
  return advance(cursor, {
    questionId,
    attemptId: null,
    phase: WORKFLOW_PHASES.AWAITING_ANSWER,
  }, now)
}

export function markPracticeFinishRequested(cursor, now) {
  assertDomain(cursor.phase !== WORKFLOW_PHASES.COMPLETED, 'PRACTICE_ALREADY_COMPLETED', '练习已经结束')
  return advance(cursor, { phase: WORKFLOW_PHASES.GENERATING_SUMMARY }, now)
}

export function markPracticeCompleted(cursor, now) {
  requirePhase(cursor, WORKFLOW_PHASES.GENERATING_SUMMARY)
  return advance(cursor, { phase: WORKFLOW_PHASES.COMPLETED }, now)
}

export function cursorForQuestion(cursor, question, now, { leetcodeCompleted = false } = {}) {
  if (question.leetcode) {
    return advance(cursor, {
      questionId: question.id,
      attemptId: null,
      phase: leetcodeCompleted ? WORKFLOW_PHASES.AWAITING_NEXT : WORKFLOW_PHASES.AWAITING_SOLUTION,
    }, now)
  }
  const latestAttempt = question.attempts.at(-1) || null
  let phase = question.explanation
    ? WORKFLOW_PHASES.AWAITING_NEXT
    : WORKFLOW_PHASES.AWAITING_ANSWER
  let attemptId = null
  if (latestAttempt) {
    attemptId = latestAttempt.id
    if (!latestAttempt.evaluation) phase = WORKFLOW_PHASES.AWAITING_EVALUATION
    else phase = question.explanation
      ? WORKFLOW_PHASES.AWAITING_NEXT
      : WORKFLOW_PHASES.GENERATING_EXPLANATION
  }
  return advance(cursor, { questionId: question.id, attemptId, phase }, now)
}
