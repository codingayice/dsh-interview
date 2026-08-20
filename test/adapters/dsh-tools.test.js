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
  assert.ok(definitions.every((tool) => !Object.hasOwn(tool.parameters.properties || {}, 'command')))

  const presentQuestion = fixture.tools.interview_present_question
  assert.deepEqual(presentQuestion.parameters.required, ['prompt'])
  assert.equal(presentQuestion.parameters.properties.prompt.minLength, 1)
  assert.equal(presentQuestion.parameters.properties.prompt.maxLength, 120)
  assert.equal(presentQuestion.parameters.additionalProperties, false)
  const startVariants = fixture.tools.interview_start_practice.parameters.oneOf
  assert.deepEqual(startVariants.map((schema) => schema.required), [
    ['mode', 'topic'],
    ['mode', 'topic'],
    ['mode', 'resume', 'interviewer_style', 'coding', 'difficulty'],
  ])
  assert.match(fixture.tools.interview_start_practice.description, /禁止根据上下文、历史练习或常识推断、补全和采用默认值/)
  assert.match(fixture.tools.interview_start_practice.description, /第一步只确认模式/)
  assert.match(fixture.tools.interview_start_practice.description, /简历、面试官风格、是否手撕代码、面试难度/)
  assert.match(fixture.tools.interview_start_practice.description, /不得询问题数、是否追问/)
  assert.deepEqual(fixture.tools.interview_complete_review.parameters.required, ['detail', 'memorization_points'])
  assert.equal(fixture.tools.interview_complete_review.parameters.properties.memorization_points.minLength, 1)
  assert.deepEqual(fixture.tools.interview_complete_summary.parameters.required, ['overall', 'strengths', 'improvements'])
})

test('原子工具驱动开始、出题、回答和完整复盘流程', async () => {
  const fixture = toolFixture()
  const { tools } = fixture
  const started = await tools.interview_start_practice.execute({ mode: 'mock', resume: 'Java 简历', interviewer_style: '深挖项目', coding: true, difficulty: 'intermediate' }, exec())
  const question = await tools.interview_present_question.execute({ prompt: '什么是 JMM？' }, exec())
  const attempt = await tools.interview_submit_answer.execute({ answer: 'Java 内存模型。' }, exec())
  const evaluation = await tools.interview_save_evaluation.execute({ score: 8, feedback: '正确。' }, exec())
  const review = await tools.interview_complete_review.execute({ detail: 'JMM 定义线程间可见性与有序性规则。', memorization_points: '原子性、可见性、有序性。' }, exec())
  const context = await tools.interview_read_practice_context.execute({ practice_id: started.resource.data.practice.id }, exec())

  assert.equal(started.nextAction, 'generate_question')
  assert.equal(question.presentation.kind, 'question')
  assert.equal(question.presentation.practiceId, started.resource.data.practice.id)
  assert.equal(question.presentation.questionId, question.resource.data.id)
  assert.equal(attempt.nextAction, 'evaluate_answer')
  assert.equal(evaluation.presentation, null)
  assert.equal(evaluation.nextAction, 'generate_explanation')
  assert.equal(review.presentation.kind, 'review')
  assert.equal(review.presentation.practiceId, started.resource.data.practice.id)
  assert.equal(review.presentation.questionId, question.resource.data.id)
  assert.equal(review.presentation.attemptId, attempt.resource.data.id)
  assert.equal(context.presentation, null)
  assert.equal(context.assistantResponse.mode, 'continue')
  assert.match(modelText(context)[0].text, /什么是 JMM/)
  assert.match(modelText(question)[0].text, /"text": "已出题，请开始作答。"/)
  assert.doesNotMatch(modelText(question)[0].text, /什么是 JMM/)
  assert.match(tools.interview_complete_review.output.render({}, review)[0].text, /最终回复必须且只能是/)
})

test('空题目被归类为 Agent 可恢复协议错误而不生成 UI', async () => {
  const fixture = toolFixture()
  await fixture.tools.interview_start_practice.execute({ mode: 'bagu', topic: 'JVM' }, exec())
  const invalid = await fixture.tools.interview_present_question.execute({ prompt: '' }, exec())
  assert.equal(invalid.error.code, 'INVALID_QUESTION')
  assert.equal(invalid.error.audience, 'agent')
  assert.equal(invalid.presentation, null)
})

test('看答案工具直接驱动讲解且复盘不要求作答引用', async () => {
  const fixture = toolFixture()
  await fixture.tools.interview_start_practice.execute({ mode: 'bagu', topic: 'JVM' }, exec())
  await fixture.tools.interview_present_question.execute({ prompt: '什么是双亲委派？' }, exec())
  const revealed = await fixture.tools.interview_reveal_answer.execute({}, exec())
  const review = await fixture.tools.interview_complete_review.execute({
    detail: '类加载器先委托父加载器，父加载器无法完成时再自行加载。',
    memorization_points: '向上委托，向下加载，避免类重复和核心类被篡改。',
  }, exec())
  assert.equal(revealed.nextAction, 'generate_explanation')
  assert.equal(review.presentation.kind, 'review')
  assert.equal(review.presentation.attemptId, undefined)
  assert.equal(review.assistantResponse.text, '本题复盘已生成，请查看卡片。')
})

test('模拟面试不会自行补全缺失配置', async () => {
  const fixture = toolFixture()
  const invalid = await fixture.tools.interview_start_practice.execute({
    mode: 'mock', resume: 'Java 后端简历', interviewer_style: '压力面', difficulty: 'senior',
  }, exec('mock-session'))
  assert.equal(invalid.error.code, 'CODING_REQUIRED')
  assert.equal(invalid.error.audience, 'agent')
  assert.equal(invalid.presentation, null)
})

test('UI 命令分发与 Agent 工具复用同一个协调器', async () => {
  const fixture = toolFixture()
  await dispatchCommand(fixture.coordinator, 'session-1', 'session.start', {
    mode: 'bagu', config: { topic: 'JVM' },
  })
  const question = await fixture.application.askQuestion('session-1', { prompt: '类加载过程？' })
  const result = await dispatchCommand(fixture.coordinator, 'session-1', 'question.open', { questionId: question.resource.data.id })
  assert.equal(result.presentation.kind, 'question')
  assert.equal(fixture.dispatched[0].type, 'question.generation_requested')
})

test('事件桥接使用原子工具名并明确 prompt 必填语义', () => {
  const question = instructionFor({ type: 'question.generation_requested', practiceId: 'p1', reason: 'next_requested' })
  assert.match(question, /interview_present_question/)
  assert.match(question, /非空题目作为 prompt/)
  assert.match(question, /每轮只生成一道题/)
  assert.match(question, /禁止把多个子问题/)
  assert.match(question, /必须调用 interview_read_practice_context/)
  assert.match(question, /练习开始后禁止重新询问或自行修改配置/)
  const reveal = instructionFor({ type: 'answer.reveal_requested', practiceId: 'p1', questionId: 'q1' })
  assert.match(reveal, /禁止创建用户作答、评分或评价/)
  assert.match(reveal, /interview_complete_review/)
  const summary = instructionFor({ type: 'practice.summary_requested', practiceId: 'p1' })
  assert.match(summary, /全部历次作答、评价和讲解/)
  assert.match(summary, /interview_complete_summary/)
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

test('结束练习必须生成并持久化完整总结', async () => {
  const fixture = toolFixture()
  const started = await fixture.tools.interview_start_practice.execute({ mode: 'bagu', topic: 'JVM' }, exec())
  const requested = await fixture.tools.interview_finish_practice.execute({}, exec())
  assert.equal(requested.nextAction, 'generate_summary')
  assert.equal(requested.presentation, null)
  const completed = await fixture.tools.interview_complete_summary.execute({
    overall: '完成了一次 JVM 练习。', strengths: ['主动开始练习。'], improvements: ['继续积累题目。'],
  }, exec())
  assert.equal(completed.presentation.kind, 'finished')
  const detail = await fixture.application.getPractice(started.resource.data.practice.id)
  assert.equal(detail.resource.data.summary.overall, '完成了一次 JVM 练习。')
})
