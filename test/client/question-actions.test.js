import test from 'node:test'
import assert from 'node:assert/strict'
import { getPresentedQuestionActions, isPresentedQuestionCurrent } from '../../src/client/features/question-actions.js'

const presentation = { practiceId: 'practice-1', questionId: 'question-1' }

function session(phase, overrides = {}) {
  return {
    selected: true,
    phase,
    questionId: 'question-1',
    practice: { id: 'practice-1' },
    ...overrides,
  }
}

test('只有当前会话绑定的题目被视为当前题', () => {
  assert.equal(isPresentedQuestionCurrent(session('awaiting_answer'), presentation), true)
  assert.equal(isPresentedQuestionCurrent(session('awaiting_answer', { questionId: 'question-2' }), presentation), false)
  assert.equal(isPresentedQuestionCurrent(session('awaiting_answer', { practice: { id: 'practice-2' } }), presentation), false)
  assert.equal(isPresentedQuestionCurrent({ selected: false }, presentation), false)
})

test('当前待回答题目只允许查看答案', () => {
  assert.deepEqual(getPresentedQuestionActions(session('awaiting_answer'), presentation), {
    canReveal: true,
    canContinue: false,
    canRetry: false,
    canFinish: false,
  })
})

test('当前点评卡只在等待下一题阶段开放操作', () => {
  assert.deepEqual(getPresentedQuestionActions(session('awaiting_next'), presentation), {
    canReveal: false,
    canContinue: true,
    canRetry: true,
    canFinish: true,
  })
  assert.deepEqual(getPresentedQuestionActions(session('generating_explanation'), presentation), {
    canReveal: false,
    canContinue: false,
    canRetry: false,
    canFinish: false,
  })
})

test('历史题目在任何阶段都不能操作', () => {
  const historical = session('awaiting_next', { questionId: 'question-2' })
  assert.deepEqual(getPresentedQuestionActions(historical, presentation), {
    canReveal: false,
    canContinue: false,
    canRetry: false,
    canFinish: false,
  })
})
