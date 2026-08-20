import { assertDomain } from './errors.js'

export const WORKFLOW_PHASES = Object.freeze({
  AWAITING_QUESTION: 'awaiting_question',
  AWAITING_ANSWER: 'awaiting_answer',
  AWAITING_EVALUATION: 'awaiting_evaluation',
  READY_FOR_EXPLANATION: 'ready_for_explanation',
  GENERATING_EXPLANATION: 'generating_explanation',
  AWAITING_NEXT: 'awaiting_next',
  COMPLETED: 'completed',
})

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

export function markQuestionAsked(cursor, questionId, now) {
  requirePhase(cursor, WORKFLOW_PHASES.AWAITING_QUESTION)
  return advance(cursor, {
    questionId,
    attemptId: null,
    phase: WORKFLOW_PHASES.AWAITING_ANSWER,
  }, now)
}

export function markAnswerSubmitted(cursor, attemptId, now) {
  requirePhase(cursor, WORKFLOW_PHASES.AWAITING_ANSWER)
  return advance(cursor, {
    attemptId,
    phase: WORKFLOW_PHASES.AWAITING_EVALUATION,
  }, now)
}

export function markAnswerEvaluated(cursor, now) {
  requirePhase(cursor, WORKFLOW_PHASES.AWAITING_EVALUATION)
  return advance(cursor, { phase: WORKFLOW_PHASES.READY_FOR_EXPLANATION }, now)
}

export function markExplanationRequested(cursor, now) {
  requirePhase(cursor, WORKFLOW_PHASES.READY_FOR_EXPLANATION)
  return advance(cursor, { phase: WORKFLOW_PHASES.GENERATING_EXPLANATION }, now)
}

export function markExplanationSaved(cursor, now) {
  requirePhase(cursor, [
    WORKFLOW_PHASES.READY_FOR_EXPLANATION,
    WORKFLOW_PHASES.GENERATING_EXPLANATION,
  ])
  return advance(cursor, { phase: WORKFLOW_PHASES.AWAITING_NEXT }, now)
}

export function markNextRequested(cursor, now) {
  requirePhase(cursor, [
    WORKFLOW_PHASES.READY_FOR_EXPLANATION,
    WORKFLOW_PHASES.AWAITING_NEXT,
  ])
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

export function markPracticeCompleted(cursor, now) {
  assertDomain(cursor.phase !== WORKFLOW_PHASES.COMPLETED, 'PRACTICE_ALREADY_COMPLETED', '练习已经结束')
  return advance(cursor, { phase: WORKFLOW_PHASES.COMPLETED }, now)
}

export function cursorForQuestion(cursor, question, now) {
  const latestAttempt = question.attempts.at(-1) || null
  let phase = WORKFLOW_PHASES.AWAITING_ANSWER
  let attemptId = null
  if (latestAttempt) {
    attemptId = latestAttempt.id
    if (!latestAttempt.evaluation) phase = WORKFLOW_PHASES.AWAITING_EVALUATION
    else phase = question.explanation
      ? WORKFLOW_PHASES.AWAITING_NEXT
      : WORKFLOW_PHASES.READY_FOR_EXPLANATION
  }
  return advance(cursor, { questionId: question.id, attemptId, phase }, now)
}
