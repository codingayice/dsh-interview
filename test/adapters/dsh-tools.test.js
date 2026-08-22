import test from 'node:test'
import assert from 'node:assert/strict'
import { InterviewCoordinator } from '../../src/application/interview-coordinator.js'
import { createToolDefinitions, INTERVIEW_TOOL_NAMES, modelText, sessionIdOf } from '../../src/adapters/dsh/tool-definitions.js'
import { instructionFor } from '../../src/adapters/dsh/agent-event-bridge.js'
import { AGENT_TASK_TYPES } from '../../src/application/agent-tasks.js'
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
  assert.throws(() => sessionIdOf({}), /DSH 会话 ID 缺失/)
})

test('DSH 暴露无 command 联合的原子面试工具', () => {
  const fixture = toolFixture()
  const definitions = createToolDefinitions(fixture.coordinator)
  assert.deepEqual(definitions.map((tool) => tool.name), INTERVIEW_TOOL_NAMES)
  assert.ok(definitions.every((tool) => tool.parameters.type === 'object'), '所有函数参数 Schema 顶层必须声明 type: object')
  assert.ok(definitions.every((tool) => !Object.hasOwn(tool.parameters.properties || {}, 'command')))

  const presentQuestion = fixture.tools.interview_present_question
  assert.deepEqual(presentQuestion.parameters.required, ['prompt'])
  assert.equal(presentQuestion.parameters.properties.prompt.minLength, 1)
  assert.equal(presentQuestion.parameters.properties.prompt.maxLength, 120)
  assert.equal(presentQuestion.parameters.additionalProperties, false)
  const startVariants = fixture.tools.interview_start_practice.parameters.oneOf
  assert.equal(fixture.tools.interview_start_practice.parameters.type, 'object')
  assert.equal(fixture.tools.interview_update_practice.parameters.type, 'object')
  assert.deepEqual(startVariants.map((schema) => schema.required), [
    ['mode', 'topic'],
    ['mode', 'topic'],
    ['mode', 'language'],
    ['mode', 'resume', 'interviewer_style', 'coding', 'difficulty'],
  ])
  assert.deepEqual(startVariants[2].properties.language.enum, ['cpp', 'java', 'python', 'c', 'go'])
  assert.match(fixture.tools.interview_start_practice.description, /禁止根据上下文、历史练习或常识推断、补全和采用默认值/)
  assert.match(fixture.tools.interview_start_practice.description, /第一步只确认模式/)
  assert.match(fixture.tools.interview_start_practice.description, /简历、面试官风格、是否手撕代码、面试难度/)
  assert.match(fixture.tools.interview_start_practice.description, /不得询问题数、是否追问/)
  assert.match(fixture.tools.interview_continue_practice.description, /不把“继续”简单等同于“下一题”/)
  assert.match(fixture.tools.interview_continue_practice.description, /必须严格执行工具返回的 nextAction/)
  assert.deepEqual(fixture.tools.interview_continue_practice.parameters.properties.trigger.enum, ['practice_started', 'next_requested'])
  assert.match(fixture.tools.interview_reveal_answer.description, /generate_leetcode_explanation/)
  assert.match(fixture.tools.interview_reveal_answer.description, /只生成指定语言的一份完整答案代码/)
  assert.deepEqual(fixture.tools.interview_complete_review.parameters.required, ['detail', 'memorization_points'])
  assert.match(fixture.tools.interview_complete_review.parameters.properties.detail.description, /练习配置语言的一份完整答案代码/)
  assert.doesNotMatch(fixture.tools.interview_complete_review.parameters.properties.detail.description, /五种/)
  assert.equal(fixture.tools.interview_complete_review.parameters.properties.memorization_points.minLength, 1)
  assert.deepEqual(fixture.tools.interview_complete_summary.parameters.required, ['overall', 'strengths', 'improvements'])
  assert.deepEqual(fixture.tools.interview_set_leetcode_completion.parameters.required, ['slug', 'completed'])
})

test('力扣工具直接抽题、展示目录并保存显式完成状态', async () => {
  const fixture = toolFixture()
  const started = await fixture.tools.interview_start_practice.execute({ mode: 'leetcode', language: 'java' }, exec('leetcode-session'))
  assert.equal(started.state, 'awaiting_solution')
  assert.equal(started.nextAction, 'wait_for_user')
  assert.equal(started.presentation.kind, 'question')
  assert.equal(started.resource.data.leetcode.slug, 'two-sum')
  assert.equal(started.assistantResponse.text, '已随机抽取一道力扣题，请开始刷题。')

  const explanation = await fixture.tools.interview_reveal_answer.execute({}, exec('leetcode-session'))
  assert.equal(explanation.nextAction, 'generate_leetcode_explanation')
  assert.equal(explanation.context.explanationType, 'leetcode_solution')
  const explanationStatus = await fixture.tools.interview_get_status.execute({}, exec('leetcode-session'))
  assert.equal(explanationStatus.nextAction, 'generate_leetcode_explanation')
  const explained = await fixture.tools.interview_complete_review.execute({
    detail: [
      '算法推导与配置语言完整代码。',
      '```java\nclass Solution {}\n```',
    ].join('\n\n'),
    memorization_points: '哈希表查找差值，时间 O(n)，空间 O(n)。',
  }, exec('leetcode-session'))
  assert.equal(explained.assistantResponse.text, '题目讲解已生成，请查看卡片。')

  const completed = await fixture.tools.interview_set_leetcode_completion.execute({ slug: 'two-sum', completed: true }, exec('leetcode-session'))
  assert.equal(completed.resource.data.completed, true)
  assert.equal(completed.presentation.kind, 'leetcode-catalog')
  const catalog = await fixture.tools.interview_get_leetcode_catalog.execute({}, exec('leetcode-session'))
  assert.equal(catalog.resource.data.total, 100)
  assert.equal(catalog.resource.data.completedCount, 1)
  assert.equal(catalog.presentation.kind, 'leetcode-catalog')

  const next = await fixture.tools.interview_request_next.execute({}, exec('leetcode-session'))
  assert.equal(next.resource.data.leetcode.slug, 'group-anagrams')
  assert.equal(next.nextAction, 'wait_for_user')
  assert.equal(next.presentation.kind, 'question')
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

test('继续工具按阶段恢复并向模型返回确定的下一动作', async () => {
  const fixture = toolFixture()
  const idle = await fixture.tools.interview_continue_practice.execute({}, exec('idle-session'))
  assert.equal(idle.nextAction, 'select_practice')
  assert.equal(idle.presentation.kind, 'library')

  await fixture.tools.interview_start_practice.execute({ mode: 'bagu', topic: 'JVM' }, exec('continue-session'))
  const generating = await fixture.tools.interview_continue_practice.execute({}, exec('continue-session'))
  assert.equal(generating.nextAction, 'generate_question')
  assert.equal(generating.assistantResponse.mode, 'continue')

  await fixture.tools.interview_present_question.execute({ prompt: '什么是类加载器？' }, exec('continue-session'))
  const answering = await fixture.tools.interview_continue_practice.execute({}, exec('continue-session'))
  assert.equal(answering.nextAction, 'wait_for_user')
  assert.equal(answering.presentation.kind, 'question')
  assert.equal(answering.assistantResponse.text, '已恢复当前题，请继续作答。')

  await fixture.tools.interview_submit_answer.execute({ answer: '负责加载类。' }, exec('continue-session'))
  const evaluating = await fixture.tools.interview_continue_practice.execute({}, exec('continue-session'))
  assert.equal(evaluating.nextAction, 'evaluate_answer')
  assert.equal(evaluating.context.answer, '负责加载类。')
})

test('力扣题目展示事件区分新抽题与恢复文案', async () => {
  const fixture = toolFixture()
  await fixture.tools.interview_start_practice.execute({ mode: 'leetcode', language: 'java' }, exec('leetcode-announcement'))

  const started = await fixture.tools.interview_continue_practice.execute({ trigger: 'practice_started' }, exec('leetcode-announcement'))
  assert.equal(started.assistantResponse.text, '已抽取题目，请开始刷题。')

  const requested = await fixture.tools.interview_request_next.execute({}, exec('leetcode-announcement'))
  assert.equal(requested.assistantResponse.text, '已抽取下一题。')
  const next = await fixture.tools.interview_continue_practice.execute({ trigger: 'next_requested' }, exec('leetcode-announcement'))
  assert.equal(next.assistantResponse.text, '已抽取下一题。')

  const resumed = await fixture.tools.interview_continue_practice.execute({}, exec('leetcode-announcement'))
  assert.equal(resumed.assistantResponse.text, '已恢复当前力扣题，请继续刷题。')
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
  assert.equal(review.assistantResponse.text, '点评讲解已生成，请查看卡片。')
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
  const continued = await dispatchCommand(fixture.coordinator, 'session-1', 'session.continue')
  assert.equal(continued.nextAction, 'generate_question')
  const question = await fixture.application.askQuestion('session-1', { prompt: '类加载过程？' })
  const result = await dispatchCommand(fixture.coordinator, 'session-1', 'question.open', { questionId: question.resource.data.id })
  assert.equal(result.presentation.kind, 'question')
  assert.equal(fixture.dispatched[0].type, AGENT_TASK_TYPES.GENERATE_QUESTION)
})

test('事件桥接使用原子工具名并明确 prompt 必填语义', () => {
  const question = instructionFor({ type: AGENT_TASK_TYPES.GENERATE_QUESTION, practiceId: 'p1', reason: 'next_requested' })
  assert.match(question, /interview_present_question/)
  assert.match(question, /非空题目作为 prompt/)
  assert.match(question, /每轮只生成一道题/)
  assert.match(question, /禁止把多个子问题/)
  assert.match(question, /必须调用 interview_read_practice_context/)
  assert.match(question, /练习开始后禁止重新询问或自行修改配置/)
  const reveal = instructionFor({ type: AGENT_TASK_TYPES.GENERATE_REVIEW, practiceId: 'p1', questionId: 'q1', reason: 'answer_revealed' })
  assert.match(reveal, /禁止创建用户作答、评分或评价/)
  assert.match(reveal, /interview_complete_review/)
  const leetcodeExplanation = instructionFor({ type: AGENT_TASK_TYPES.GENERATE_LEETCODE_EXPLANATION, practiceId: 'p2', questionId: 'q2' })
  assert.match(leetcodeExplanation, /从零教会用户独立解决当前题目/)
  assert.match(leetcodeExplanation, /config\.language/)
  assert.match(leetcodeExplanation, /禁止输出其他语言代码/)
  assert.match(leetcodeExplanation, /interview_complete_review/)
  assert.doesNotMatch(leetcodeExplanation, /可直接背诵/)
  const leetcodePresentation = instructionFor({ type: AGENT_TASK_TYPES.PRESENT_LEETCODE_QUESTION, practiceId: 'p2', questionId: 'q3', reason: 'next_requested' })
  assert.match(leetcodePresentation, /interview_continue_practice/)
  assert.match(leetcodePresentation, /已经随机抽取并保存题目/)
  assert.match(leetcodePresentation, /trigger=next_requested/)
  assert.match(leetcodePresentation, /禁止调用 interview_request_next/)
  assert.match(leetcodePresentation, /禁止调用.*interview_present_question/)
  const summary = instructionFor({ type: AGENT_TASK_TYPES.GENERATE_SUMMARY, practiceId: 'p1' })
  assert.match(summary, /全部历次作答、评价和讲解/)
  assert.match(summary, /interview_complete_summary/)
  const evaluation = instructionFor({ type: AGENT_TASK_TYPES.EVALUATE_ANSWER, practiceId: 'p1', questionId: 'q1', attemptId: 'a1' })
  assert.match(evaluation, /interview_save_evaluation/)
  assert.match(evaluation, /不得创建新作答或新题/)
  const review = instructionFor({ type: AGENT_TASK_TYPES.GENERATE_REVIEW, practiceId: 'p1', questionId: 'q1' })
  assert.match(review, /interview_complete_review/)
  assert.match(review, /不得重复评价/)
  assert.equal(instructionFor({ type: 'practice.selected', practiceId: 'p1' }), null)
  assert.equal(instructionFor({ type: 'leetcode.problem_drawn', practiceId: 'p1' }), null)
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

test('结束力扣练习直接归档题目且不请求模型总结', async () => {
  const fixture = toolFixture()
  const started = await fixture.tools.interview_start_practice.execute({ mode: 'leetcode', language: 'java' }, exec('leetcode-finish'))
  const finished = await fixture.tools.interview_finish_practice.execute({}, exec('leetcode-finish'))

  assert.equal(finished.nextAction, 'wait_for_user')
  assert.equal(finished.presentation.kind, 'finished')
  assert.match(finished.assistantResponse.text, /共记录 1 道题/)
  const detail = await fixture.application.getPractice(started.presentation.practiceId)
  assert.equal(detail.resource.data.summary.kind, 'leetcode')
  assert.equal(detail.resource.data.summary.problems[0].slug, 'two-sum')
})

test('Agent 工具覆盖练习和题目 CRUD', async () => {
  const fixture = toolFixture()
  const started = await fixture.tools.interview_start_practice.execute({ mode: 'bagu', topic: 'JVM' }, exec())
  const practiceId = started.resource.data.practice.id
  const presented = await fixture.tools.interview_present_question.execute({ prompt: '原题目' }, exec())
  const questionId = presented.resource.data.id

  const updatedPractice = await fixture.tools.interview_update_practice.execute({
    practice_id: practiceId, mode: 'scenario', topic: '高并发系统',
  }, exec())
  assert.equal(updatedPractice.resource.data.config.topic, '高并发系统')

  const updatedQuestion = await fixture.tools.interview_update_question.execute({
    practice_id: practiceId, question_id: questionId, prompt: '修改后的题目',
  }, exec())
  assert.equal(updatedQuestion.resource.data.prompt, '修改后的题目')
  const readQuestion = await fixture.tools.interview_get_question.execute({ practice_id: practiceId, question_id: questionId }, exec())
  assert.equal(readQuestion.context.prompt, '修改后的题目')

  const selected = await fixture.tools.interview_select_practice.execute({ practice_id: practiceId }, exec('another-session'))
  assert.equal(selected.context.practice.questions[0].prompt, '修改后的题目')
  assert.ok(Array.isArray(selected.context.practice.questions[0].attempts))

  await fixture.tools.interview_delete_question.execute({ practice_id: practiceId, question_id: questionId }, exec())
  assert.equal((await fixture.application.getPractice(practiceId)).resource.data.questions.length, 0)
})
