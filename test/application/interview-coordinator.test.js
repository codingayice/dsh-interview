import test from 'node:test'
import assert from 'node:assert/strict'
import { INTERVIEW_ACTIONS } from '../../src/application/interview-actions.js'
import { InterviewCoordinator } from '../../src/application/interview-coordinator.js'
import { applicationFixture } from '../support/application-fixture.js'

test('协调器把应用结果转换为状态驱动的结构化交互', async () => {
  const fixture = applicationFixture()
  const coordinator = new InterviewCoordinator({ application: fixture.application })
  const started = await coordinator.execute({
    sessionId: 'session-1',
    action: INTERVIEW_ACTIONS.START_PRACTICE,
    payload: { mode: 'bagu', config: { topic: '并发编程' } },
  })
  const asked = await coordinator.execute({
    sessionId: 'session-1',
    action: INTERVIEW_ACTIONS.PRESENT_QUESTION,
    payload: { prompt: '什么是 JMM？' },
  })

  assert.equal(started.protocol, 'dsh-interview/interaction-v1')
  assert.equal(started.nextAction, 'generate_question')
  assert.equal(started.assistantResponse.mode, 'continue')
  assert.equal(asked.presentation.kind, 'question')
  assert.equal(asked.presentation.practiceId, started.resource.data.practice.id)
  assert.equal(asked.presentation.questionId, asked.resource.data.id)
  assert.notEqual(asked.presentation.practiceId, asked.presentation.questionId)
  const detail = await fixture.application.getPractice(asked.presentation.practiceId)
  assert.equal(detail.resource.data.questions[0].id, asked.presentation.questionId)
  assert.equal(asked.assistantResponse.text, '已出题，请开始作答。')
})

test('协调器把 Agent 协议错误标记为可恢复且不交给 UI', async () => {
  const fixture = applicationFixture()
  const coordinator = new InterviewCoordinator({ application: fixture.application })
  await coordinator.execute({ sessionId: 'session-1', action: INTERVIEW_ACTIONS.START_PRACTICE, payload: { mode: 'bagu', config: { topic: 'JVM' } } })
  const invalid = await coordinator.execute({ sessionId: 'session-1', action: INTERVIEW_ACTIONS.PRESENT_QUESTION, payload: { prompt: '' } })

  assert.equal(invalid.error.audience, 'agent')
  assert.equal(invalid.error.recoverable, true)
  assert.equal(invalid.presentation, null)
  assert.equal(invalid.nextAction, 'read_status_and_retry')
})

test('UI 入口由协调器统一派发后续生成事件', async () => {
  const fixture = applicationFixture()
  const dispatched = []
  const coordinator = new InterviewCoordinator({
    application: fixture.application,
    eventBridge: { dispatch(events) { dispatched.push(...events) } },
  })
  const started = await coordinator.execute({
    sessionId: 'session-ui',
    action: INTERVIEW_ACTIONS.START_PRACTICE,
    payload: { mode: 'mock', config: { resume: 'Java 简历', interviewerStyle: '深挖项目', coding: true, difficulty: 'intermediate' } },
    source: 'ui',
  })
  assert.equal(dispatched[0].type, 'question.generation_requested')
  await coordinator.execute({
    sessionId: 'session-ui', action: INTERVIEW_ACTIONS.SELECT_PRACTICE,
    payload: { practiceId: started.resource.data.practice.id }, source: 'ui',
  })
  assert.equal(dispatched.at(-1).type, 'practice.selected')
})

test('UI 继续命令按当前阶段派发对应恢复事件', async () => {
  const fixture = applicationFixture()
  const dispatched = []
  const coordinator = new InterviewCoordinator({
    application: fixture.application,
    eventBridge: { dispatch(events) { dispatched.push(...events) } },
  })
  await coordinator.execute({
    sessionId: 'session-ui-continue', action: INTERVIEW_ACTIONS.START_PRACTICE,
    payload: { mode: 'bagu', config: { topic: '并发编程' } }, source: 'agent',
  })
  const questionResume = await coordinator.execute({
    sessionId: 'session-ui-continue', action: INTERVIEW_ACTIONS.CONTINUE_PRACTICE, source: 'ui',
  })
  assert.equal(questionResume.nextAction, 'generate_question')
  assert.equal(dispatched.at(-1).type, 'question.generation_requested')

  await coordinator.execute({
    sessionId: 'session-ui-continue', action: INTERVIEW_ACTIONS.PRESENT_QUESTION,
    payload: { prompt: '什么是可见性？' }, source: 'agent',
  })
  await coordinator.execute({
    sessionId: 'session-ui-continue', action: INTERVIEW_ACTIONS.SUBMIT_ANSWER,
    payload: { answer: '一个线程能看到另一个线程的修改。' }, source: 'agent',
  })
  const evaluationResume = await coordinator.execute({
    sessionId: 'session-ui-continue', action: INTERVIEW_ACTIONS.CONTINUE_PRACTICE, source: 'ui',
  })
  assert.equal(evaluationResume.nextAction, 'evaluate_answer')
  assert.equal(dispatched.at(-1).type, 'answer.evaluation_requested')
})

test('选择练习向模型提供完整上下文并只返回切换确认', async () => {
  const fixture = applicationFixture()
  const coordinator = new InterviewCoordinator({ application: fixture.application })
  const started = await coordinator.execute({
    sessionId: 'session-1', action: INTERVIEW_ACTIONS.START_PRACTICE,
    payload: { mode: 'bagu', config: { topic: 'JVM' } },
  })
  await coordinator.execute({ sessionId: 'session-1', action: INTERVIEW_ACTIONS.PRESENT_QUESTION, payload: { prompt: '什么是 JMM？' } })
  const selected = await coordinator.execute({
    sessionId: 'session-2', action: INTERVIEW_ACTIONS.SELECT_PRACTICE,
    payload: { practiceId: started.resource.data.practice.id },
  })
  assert.equal(selected.presentation, null)
  assert.equal(selected.assistantResponse.text, '已切换到当前练习：JVM。')
  assert.equal(selected.context.practice.questions[0].prompt, '什么是 JMM？')
})
