import test from 'node:test'
import assert from 'node:assert/strict'
import { INTERVIEW_ACTIONS } from '../../src/application/interview-actions.js'
import { InterviewCoordinator } from '../../src/application/interview-coordinator.js'
import { applicationFixture } from '../support/application-fixture.js'
import { AGENT_TASK_TYPES } from '../../src/application/agent-tasks.js'

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
  assert.equal(dispatched[0].type, AGENT_TASK_TYPES.GENERATE_QUESTION)
  await coordinator.execute({
    sessionId: 'session-ui', action: INTERVIEW_ACTIONS.SELECT_PRACTICE,
    payload: { practiceId: started.resource.data.practice.id }, source: 'ui',
  })
  assert.equal(dispatched.length, 1, '切换练习只更新本地会话，不派发 Agent 任务')
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
  assert.equal(dispatched.at(-1).type, AGENT_TASK_TYPES.GENERATE_QUESTION)

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
  assert.equal(dispatched.at(-1).type, AGENT_TASK_TYPES.EVALUATE_ANSWER)
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

test('力扣抽题触发 Agent 展示事件且其他本地管理保持零模型调用', async () => {
  const fixture = applicationFixture()
  const dispatched = []
  const coordinator = new InterviewCoordinator({
    application: fixture.application,
    eventBridge: { dispatch(tasks) { dispatched.push(...tasks) } },
  })
  const executeUi = (sessionId, action, payload = {}) => coordinator.execute({ sessionId, action, payload, source: 'ui' })

  const leetcode = await executeUi('leetcode-local', INTERVIEW_ACTIONS.START_PRACTICE, { mode: 'leetcode', config: { language: 'java' } })
  assert.deepEqual(dispatched.map((task) => task.type), [AGENT_TASK_TYPES.PRESENT_LEETCODE_QUESTION])
  dispatched.length = 0
  await executeUi('leetcode-local', INTERVIEW_ACTIONS.SET_LEETCODE_COMPLETION, { slug: 'two-sum', completed: true })
  assert.equal(dispatched.length, 0, '完成状态仍然是纯本地操作')
  await executeUi('leetcode-local', INTERVIEW_ACTIONS.REQUEST_NEXT)
  assert.deepEqual(dispatched.map((task) => task.type), [AGENT_TASK_TYPES.PRESENT_LEETCODE_QUESTION])
  dispatched.length = 0

  const practiceId = leetcode.presentation.practiceId
  const questionId = leetcode.presentation.questionId
  await executeUi('leetcode-local', INTERVIEW_ACTIONS.SELECT_PRACTICE, { practiceId })
  await executeUi('leetcode-local', INTERVIEW_ACTIONS.OPEN_QUESTION, { questionId })
  await executeUi('leetcode-local', INTERVIEW_ACTIONS.RETRY_QUESTION, { questionId })
  await executeUi('leetcode-local', INTERVIEW_ACTIONS.UPDATE_PRACTICE, { practiceId, mode: 'leetcode', config: { language: 'java' } })
  await executeUi('leetcode-local', INTERVIEW_ACTIONS.GET_LEETCODE_CATALOG)
  await executeUi('leetcode-local', INTERVIEW_ACTIONS.EXPORT_PRACTICES, { practiceIds: [practiceId] })
  assert.equal(dispatched.length, 0, '切换、打开、重答、修改、查询和导出均为本地操作')
})

test('只有内容生成阶段会派发显式 Agent 任务', async () => {
  const fixture = applicationFixture()
  const dispatched = []
  const coordinator = new InterviewCoordinator({
    application: fixture.application,
    eventBridge: { dispatch(tasks) { dispatched.push(...tasks) } },
  })
  const executeUi = (action, payload = {}) => coordinator.execute({ sessionId: 'paid-boundary', action, payload, source: 'ui' })

  await executeUi(INTERVIEW_ACTIONS.START_PRACTICE, { mode: 'bagu', config: { topic: 'JVM' } })
  assert.deepEqual(dispatched.map((task) => task.type), [AGENT_TASK_TYPES.GENERATE_QUESTION])
  dispatched.length = 0

  await coordinator.execute({ sessionId: 'paid-boundary', action: INTERVIEW_ACTIONS.PRESENT_QUESTION, payload: { prompt: '什么是 JMM？' }, source: 'agent' })
  await executeUi(INTERVIEW_ACTIONS.REVEAL_ANSWER)
  assert.deepEqual(dispatched.map((task) => task.type), [AGENT_TASK_TYPES.GENERATE_REVIEW])
})
