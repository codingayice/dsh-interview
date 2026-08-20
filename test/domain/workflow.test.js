import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createCursor,
  markAnswerEvaluated,
  markAnswerRevealed,
  markAnswerSubmitted,
  markExplanationSaved,
  markNextRequested,
  markPracticeCompleted,
  markQuestionAsked,
  markQuestionRetried,
  WORKFLOW_PHASES,
} from '../../src/domain/workflow.js'

test('完整面试流程只能按状态机顺序推进', () => {
  let cursor = createCursor({ sessionId: 'session-1', practiceId: 'practice-1', now: 1 })
  cursor = markQuestionAsked(cursor, 'question-1', 2)
  cursor = markAnswerSubmitted(cursor, 'attempt-1', 3)
  cursor = markAnswerEvaluated(cursor, 4)
  assert.equal(cursor.phase, WORKFLOW_PHASES.GENERATING_EXPLANATION)
  cursor = markExplanationSaved(cursor, 5)
  cursor = markNextRequested(cursor, 6)

  assert.equal(cursor.phase, WORKFLOW_PHASES.AWAITING_QUESTION)
  assert.equal(cursor.questionId, null)
  assert.equal(cursor.revision, 6)
})

test('状态机拒绝越过回答直接评价', () => {
  const cursor = markQuestionAsked(
    createCursor({ sessionId: 'session-1', practiceId: 'practice-1', now: 1 }),
    'question-1',
    2,
  )
  assert.throws(() => markAnswerEvaluated(cursor, 3), { code: 'INVALID_WORKFLOW_PHASE' })
})

test('直接看答案从待回答进入讲解且不创建作答', () => {
  let cursor = createCursor({ sessionId: 'session-1', practiceId: 'practice-1', now: 1 })
  cursor = markQuestionAsked(cursor, 'question-1', 2)
  cursor = markAnswerRevealed(cursor, 3)
  assert.equal(cursor.phase, WORKFLOW_PHASES.GENERATING_EXPLANATION)
  assert.equal(cursor.attemptId, null)
  assert.equal(markExplanationSaved(cursor, 4).phase, WORKFLOW_PHASES.AWAITING_NEXT)
})

test('已评价题目可以重新作答并创建新的回答流程', () => {
  let cursor = createCursor({ sessionId: 'session-1', practiceId: 'practice-1', now: 1 })
  cursor = markQuestionAsked(cursor, 'question-1', 2)
  cursor = markAnswerSubmitted(cursor, 'attempt-1', 3)
  cursor = markAnswerEvaluated(cursor, 4)
  cursor = markQuestionRetried(cursor, 'question-1', 5)
  assert.equal(cursor.phase, WORKFLOW_PHASES.AWAITING_ANSWER)
  assert.equal(cursor.attemptId, null)
})

test('已有参考讲解的重答评价直接进入完整复盘', () => {
  let cursor = createCursor({ sessionId: 'session-1', practiceId: 'practice-1', now: 1 })
  cursor = markQuestionAsked(cursor, 'question-1', 2)
  cursor = markAnswerSubmitted(cursor, 'attempt-2', 3)
  cursor = markAnswerEvaluated(cursor, 4, { reviewReady: true })
  assert.equal(cursor.phase, WORKFLOW_PHASES.AWAITING_NEXT)
})

test('练习结束后游标进入 completed', () => {
  const cursor = markPracticeCompleted(
    createCursor({ sessionId: 'session-1', practiceId: 'practice-1', now: 1 }),
    2,
  )
  assert.equal(cursor.phase, WORKFLOW_PHASES.COMPLETED)
  assert.throws(() => markQuestionRetried(cursor, 'question-1', 3), { code: 'PRACTICE_ALREADY_COMPLETED' })
})
