import test from 'node:test'
import assert from 'node:assert/strict'
import { InterviewCoordinator } from '../../src/application/interview-coordinator.js'
import { createToolDefinitions, INTERVIEW_TOOL_NAMES, modelText, sessionIdOf } from '../../src/adapters/dsh/tool-definitions.js'
import { instructionFor } from '../../src/adapters/dsh/agent-event-bridge.js'
import { dispatchCommand } from '../../src/adapters/http/command-dispatcher.js'
import { errorResponse } from '../../src/adapters/http/api-routes.js'
import { DomainError } from '../../src/domain/errors.js'
import { applicationFixture } from '../support/application-fixture.js'

function exec(sessionId = 'session-1') {
  return { agent: { session: { id: sessionId } } }
}

function toolFixture() {
  const fixture = applicationFixture()
  const dispatched = []
  const coordinator = new InterviewCoordinator({
    application: fixture.application,
    eventBridge: { dispatch(events) { dispatched.push(...events) } },
  })
  const tools = Object.fromEntries(createToolDefinitions(coordinator).map((tool) => [tool.name, tool]))
  return { ...fixture, coordinator, dispatched, tools }
}

test('工具优先使用 DSH 会话头中的稳定会话 ID', () => {
  assert.equal(sessionIdOf({ agent: { session: { id: 'runtime-id', header: { id: 'stable-id' } } } }), 'stable-id')
  assert.equal(sessionIdOf(exec('legacy-id')), 'legacy-id')
})

test('DSH 暴露无 command 联合的原子面试工具', () => {
  const fixture = toolFixture()
  const definitions = createToolDefinitions(fixture.coordinator)
  assert.deepEqual(definitions.map((tool) => tool.name), INTERVIEW_TOOL_NAMES)
  assert.ok(definitions.every((tool) => !Object.hasOwn(tool.parameters.properties, 'command')))

  const presentQuestion = fixture.tools.interview_present_question
  assert.deepEqual(presentQuestion.parameters.required, ['prompt'])
  assert.equal(presentQuestion.parameters.properties.prompt.minLength, 1)
  assert.equal(presentQuestion.parameters.additionalProperties, false)
})

test('原子工具驱动开始、出题、回答和评价流程', async () => {
  const fixture = toolFixture()
  const { tools } = fixture
  const started = await tools.interview_start_practice.execute({ mode: 'mock', topic: 'Java', target_question_count: 3 }, exec())
  const question = await tools.interview_present_question.execute({ prompt: '什么是 JMM？' }, exec())
  const attempt = await tools.interview_submit_answer.execute({ answer: 'Java 内存模型。' }, exec())
  const evaluation = await tools.interview_present_evaluation.execute({ score: 8, feedback: '正确。' }, exec())

  assert.equal(started.nextAction, 'generate_question')
  assert.equal(question.presentation.kind, 'question')
  assert.equal(attempt.nextAction, 'evaluate_answer')
  assert.equal(evaluation.presentation.kind, 'evaluation')
  assert.match(modelText(question)[0].text, /"text": "已出题，请开始作答。"/)
  assert.doesNotMatch(modelText(question)[0].text, /什么是 JMM/)
  assert.match(tools.interview_present_evaluation.output.render({}, evaluation)[0].text, /最终回复必须且只能是/)
})

test('空题目被归类为 Agent 可恢复协议错误而不生成 UI', async () => {
  const fixture = toolFixture()
  await fixture.tools.interview_start_practice.execute({ mode: 'bagu', topic: 'JVM' }, exec())
  const invalid = await fixture.tools.interview_present_question.execute({ prompt: '' }, exec())
  assert.equal(invalid.error.code, 'INVALID_QUESTION')
  assert.equal(invalid.error.audience, 'agent')
  assert.equal(invalid.presentation, null)
})

test('UI 命令分发与 Agent 工具复用同一个协调器', async () => {
  const fixture = toolFixture()
  await dispatchCommand(fixture.coordinator, 'session-1', 'session.start', {
    mode: 'bagu', topic: 'JVM', source: { kind: 'topic', content: 'JVM' },
  })
  const question = await fixture.application.askQuestion('session-1', { prompt: '类加载过程？' })
  const result = await dispatchCommand(fixture.coordinator, 'session-1', 'question.open', { questionId: question.resource.data.id })
  assert.equal(result.presentation.kind, 'question')
  assert.equal(fixture.dispatched[0].type, 'question.generation_requested')
})

test('事件桥接使用原子工具名并明确 prompt 必填语义', () => {
  const question = instructionFor({ type: 'question.generation_requested', practiceId: 'p1', reason: 'next_requested' })
  assert.match(question, /interview_present_question/)
  assert.match(question, /非空完整题目作为 prompt/)
  assert.match(instructionFor({ type: 'explanation.generation_requested', practiceId: 'p1', questionId: 'q1' }), /interview_present_explanation/)
  assert.equal(instructionFor({ type: 'answer.submitted' }), null)
})

test('HTTP 错误响应包含稳定错误码', () => {
  assert.deepEqual(errorResponse(new DomainError('INVALID_SCORE', '评分错误')), {
    status: 400,
    body: { error: { code: 'INVALID_SCORE', message: '评分错误', details: undefined } },
  })
  assert.equal(errorResponse(new Error('secret')).body.error.code, 'INTERNAL_ERROR')
})

test('未指定范围时只导出当前选择的练习', async () => {
  const fixture = toolFixture()
  await fixture.tools.interview_start_practice.execute({ mode: 'bagu', topic: 'JVM' }, exec())
  await fixture.tools.interview_start_practice.execute({ mode: 'scenario', topic: 'Redis' }, exec())
  const result = await fixture.tools.interview_export_practices.execute({}, exec())
  assert.equal(result.resource.data.length, 1)
  assert.match(result.resource.data[0].name, /Redis/)
})
