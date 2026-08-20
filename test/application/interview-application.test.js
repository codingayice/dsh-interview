import test from 'node:test'
import assert from 'node:assert/strict'
import { applicationFixture } from '../support/application-fixture.js'

async function start(fixture) {
  return fixture.application.startPractice('session-1', {
    mode: 'mock',
    topic: 'Java 后端',
    source: { kind: 'topic', content: 'Java 后端' },
    config: { difficulty: 'intermediate', targetQuestionCount: 3, followUp: true },
  })
}

test('创建练习会持久化游标并发布出题请求', async () => {
  const fixture = applicationFixture()
  const result = await start(fixture)
  assert.equal(result.resource.kind, 'practice-started')
  assert.equal(result.resource.data.phase, 'awaiting_question')
  assert.deepEqual(result.resource.data.practice.config, { difficulty: 'intermediate', targetQuestionCount: 3, followUp: true })
  assert.equal(fixture.published[0].type, 'question.generation_requested')
  assert.equal((await fixture.repository.listPractices()).length, 1)
})

test('应用层完成一条面试主流程', async () => {
  const fixture = applicationFixture()
  await start(fixture)
  const asked = await fixture.application.askQuestion('session-1', { prompt: '解释双亲委派。' })
  const questionId = asked.resource.data.id
  const submitted = await fixture.application.submitAnswer('session-1', { answer: '先委托父加载器。' })
  const attemptId = submitted.resource.data.id
  await fixture.application.evaluateAnswer('session-1', {
    score: 8,
    feedback: '回答准确。',
    dimensions: { accuracy: 8, structure: 7 },
  })
  await fixture.application.saveExplanation('session-1', {
    detail: '父加载器先尝试加载。',
    memorizationPoints: '向上委托，向下加载。',
  })
  await fixture.application.requestNextQuestion('session-1')

  const session = await fixture.application.getSession('session-1')
  const detail = await fixture.application.getPractice(session.resource.data.practice.id)
  assert.equal(session.resource.data.phase, 'awaiting_question')
  assert.equal(detail.resource.data.questions[0].id, questionId)
  assert.equal(detail.resource.data.questions[0].attempts[0].id, attemptId)
  assert.equal(detail.resource.data.averageScore, 8)
})

test('应用层拒绝在错误阶段提交命令', async () => {
  const fixture = applicationFixture()
  await start(fixture)
  await assert.rejects(() => fixture.application.submitAnswer('session-1', { answer: '提前回答' }), {
    code: 'QUESTION_NOT_FOCUSED',
  })
})

test('重新作答保留历史 attempt', async () => {
  const fixture = applicationFixture()
  await start(fixture)
  const question = await fixture.application.askQuestion('session-1', { prompt: '什么是可见性？' })
  await fixture.application.submitAnswer('session-1', { answer: '线程可以看到最新值。' })
  await fixture.application.evaluateAnswer('session-1', { score: 7, feedback: '缺少 happens-before。' })
  await fixture.application.saveExplanation('session-1', {
    detail: '可见性由 happens-before 规则建立保证。',
    memorizationPoints: '写前读后，规则建立可见性。',
  })
  await fixture.application.retryQuestion('session-1', question.resource.data.id)
  await fixture.application.submitAnswer('session-1', { answer: '通过 happens-before 保证可见性。' })
  await fixture.application.evaluateAnswer('session-1', { score: 9, feedback: '完整。' })

  const detail = await fixture.application.getPractice(question.events[0].practiceId)
  assert.deepEqual(detail.resource.data.questions[0].attempts.map((attempt) => attempt.evaluation.score), [7, 9])
  assert.equal(detail.resource.data.questions[0].explanation.memorizationPoints, '写前读后，规则建立可见性。')
  assert.equal((await fixture.application.getSession('session-1')).resource.data.phase, 'awaiting_next')
})

test('结束、重新打开、洞察和导出通过独立用例完成', async () => {
  const fixture = applicationFixture()
  const started = await start(fixture)
  const practiceId = started.resource.data.practice.id
  await fixture.application.askQuestion('session-1', { prompt: '问题' })
  await fixture.application.submitAnswer('session-1', { answer: '回答' })
  await fixture.application.evaluateAnswer('session-1', { score: 6, feedback: '继续加强。' })
  await fixture.application.completePractice('session-1')
  assert.equal((await fixture.application.getSession('session-1')).resource.data.phase, 'completed')
  assert.equal((await fixture.application.getInsights()).resource.data.weakestTopic.topic, 'Java 后端')
  assert.equal((await fixture.application.exportPractices({ practiceIds: [practiceId] })).resource.data[0].token, `download-${practiceId}`)
  assert.equal((await fixture.application.reopenPractice('session-1', practiceId)).resource.data.practice.status, 'active')
})

test('练习查询支持筛选，删除会清理会话游标', async () => {
  const fixture = applicationFixture()
  const started = await start(fixture)
  const practiceId = started.resource.data.practice.id
  const list = await fixture.application.listPractices({ query: 'java', mode: 'mock' })
  assert.equal(list.resource.data.length, 1)
  await fixture.application.deletePractice(practiceId, 'session-1')
  assert.equal((await fixture.application.getSession('session-1')).resource.data.selected, false)
})
