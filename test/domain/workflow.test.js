import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CONTINUATION_ACTIONS,
  continuationFor,
  createCursor,
  markAnswerEvaluated,
  markAnswerRevealed,
  markAnswerSubmitted,
  markExplanationSaved,
  markNextRequested,
  markPracticeCompleted,
  markPracticeFinishRequested,
  markQuestionAsked,
  markQuestionRetried,
  WORKFLOW_PHASES,
} from '../../src/domain/workflow.js'

test('每个工作流阶段都有唯一的继续动作', () => {
  const cursor = { phase: null }
  const cases = [
    [WORKFLOW_PHASES.AWAITING_QUESTION, CONTINUATION_ACTIONS.GENERATE_QUESTION],
    [WORKFLOW_PHASES.AWAITING_ANSWER, CONTINUATION_ACTIONS.SHOW_CURRENT_QUESTION],
    [WORKFLOW_PHASES.AWAITING_EVALUATION, CONTINUATION_ACTIONS.EVALUATE_ANSWER],
    [WORKFLOW_PHASES.GENERATING_EXPLANATION, CONTINUATION_ACTIONS.GENERATE_EXPLANATION],
    [WORKFLOW_PHASES.AWAITING_NEXT, CONTINUATION_ACTIONS.REQUEST_NEXT],
    [WORKFLOW_PHASES.GENERATING_SUMMARY, CONTINUATION_ACTIONS.GENERATE_SUMMARY],
    [WORKFLOW_PHASES.COMPLETED, CONTINUATION_ACTIONS.CONFIRM_REOPEN],
  ]
  for (const [phase, action] of cases) assert.equal(continuationFor({ ...cursor, phase }), action)
  assert.throws(() => continuationFor(cursor), { code: 'INVALID_WORKFLOW_PHASE' })
})

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
  let cursor = markPracticeFinishRequested(
    createCursor({ sessionId: 'session-1', practiceId: 'practice-1', now: 1 }),
    2,
  )
  assert.equal(cursor.phase, WORKFLOW_PHASES.GENERATING_SUMMARY)
  cursor = markPracticeCompleted(cursor, 3)
  assert.equal(cursor.phase, WORKFLOW_PHASES.COMPLETED)
  assert.throws(() => markQuestionRetried(cursor, 'question-1', 4), { code: 'PRACTICE_ALREADY_COMPLETED' })
})
