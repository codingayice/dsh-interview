import test from 'node:test'
import assert from 'node:assert/strict'
import { INTERVIEW_ACTIONS } from '../../src/application/interview-actions.js'
import {
  ARTIFACT_KINDS,
  artifactForSession,
  assertInteractionArtifactContract,
  createInteractionArtifact,
} from '../../src/application/interaction-artifact.js'

test('题目、点评和总结产物强制校验领域引用', () => {
  assert.throws(() => createInteractionArtifact(ARTIFACT_KINDS.QUESTION, { practiceId: 'p1' }), /questionId/)
  assert.throws(() => createInteractionArtifact(ARTIFACT_KINDS.REVIEW, { questionId: 'q1' }), /practiceId/)
  assert.throws(() => createInteractionArtifact(ARTIFACT_KINDS.FINISHED), /practiceId/)
})

test('会话阶段只能物化对应的当前业务产物', () => {
  const references = { practiceId: 'p1', questionId: 'q1', attemptId: 'a1' }
  const currentQuestion = { id: 'q1', explanation: { detail: '讲解' } }
  assert.equal(artifactForSession({ selected: true, phase: 'awaiting_answer', currentQuestion }, references).kind, 'question')
  assert.deepEqual(artifactForSession({ selected: true, phase: 'awaiting_next', currentQuestion }, references), {
    kind: 'review', practiceId: 'p1', questionId: 'q1', attemptId: 'a1',
  })
  assert.equal(artifactForSession({ selected: true, phase: 'generating_explanation', currentQuestion }, references), null)
})

test('内容完成动作必须返回匹配的 UI 产物和固定辅助文本', () => {
  assert.throws(() => assertInteractionArtifactContract(INTERVIEW_ACTIONS.PRESENT_QUESTION, {
    state: 'awaiting_answer', artifact: null, assistantResponse: { mode: 'continue' },
  }), /必须产生 question/)
  assert.throws(() => assertInteractionArtifactContract(INTERVIEW_ACTIONS.COMPLETE_REVIEW, {
    state: 'awaiting_next',
    artifact: createInteractionArtifact(ARTIFACT_KINDS.REVIEW, { practiceId: 'p1', questionId: 'q1' }),
    assistantResponse: { mode: 'continue' },
  }), /固定辅助文本/)
})
