import test from 'node:test'
import assert from 'node:assert/strict'
import { createToolDefinitions, modelText } from '../../src/adapters/dsh/tool-definitions.js'
import { instructionFor } from '../../src/adapters/dsh/agent-event-bridge.js'
import { dispatchCommand } from '../../src/adapters/http/command-dispatcher.js'
import { errorResponse } from '../../src/adapters/http/api-routes.js'
import { DomainError } from '../../src/domain/errors.js'
import { applicationFixture } from '../support/application-fixture.js'

function exec(sessionId = 'session-1') {
  return { agent: { session: { id: sessionId } } }
}

test('DSH 只暴露四个职责明确的面试工具', () => {
  const fixture = applicationFixture()
  const tools = createToolDefinitions(fixture.application)
  assert.deepEqual(tools.map((tool) => tool.name), [
    'interview_session',
    'interview_question',
    'interview_answer',
    'interview_library',
  ])
})

test('工具协议驱动完整的开始、出题、回答和评价流程', async () => {
  const fixture = applicationFixture()
  const tools = Object.fromEntries(createToolDefinitions(fixture.application).map((tool) => [tool.name, tool]))
  await tools.interview_session.execute({ command: 'start', mode: 'mock', topic: 'Java', target_question_count: 3 }, exec())
  const question = await tools.interview_question.execute({ command: 'ask', prompt: '什么是 JMM？' }, exec())
  await tools.interview_answer.execute({ command: 'submit', answer: 'Java 内存模型。' }, exec())
  const evaluation = await tools.interview_answer.execute({ command: 'evaluate', score: 8, feedback: '正确。' }, exec())

  assert.equal(question.resource.kind, 'question')
  assert.equal(evaluation.resource.kind, 'evaluation')
  assert.match(modelText(evaluation)[0].text, /resource_kind: evaluation/)
})

test('UI 命令分发与 Agent 工具复用同一应用用例', async () => {
  const fixture = applicationFixture()
  await dispatchCommand(fixture.application, 'session-1', 'session.start', {
    mode: 'bagu', topic: 'JVM', source: { kind: 'topic', content: 'JVM' },
  })
  const question = await fixture.application.askQuestion('session-1', { prompt: '类加载过程？' })
  const result = await dispatchCommand(fixture.application, 'session-1', 'question.open', { questionId: question.resource.data.id })
  assert.equal(result.resource.kind, 'question')
})

test('事件桥接只为需要 Agent 继续生成的事件创建指令', () => {
  assert.match(instructionFor({ type: 'question.generation_requested', practiceId: 'p1', reason: 'next_requested' }), /interview_question\.ask/)
  assert.match(instructionFor({ type: 'explanation.generation_requested', practiceId: 'p1', questionId: 'q1' }), /save_explanation/)
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
  const fixture = applicationFixture()
  const tools = Object.fromEntries(createToolDefinitions(fixture.application).map((tool) => [tool.name, tool]))
  await tools.interview_session.execute({ command: 'start', mode: 'bagu', topic: 'JVM' }, exec())
  await tools.interview_session.execute({ command: 'start', mode: 'scenario', topic: 'Redis' }, exec())
  const result = await tools.interview_library.execute({ command: 'export' }, exec())
  assert.equal(result.resource.data.length, 1)
  assert.match(result.resource.data[0].name, /Redis/)
})
