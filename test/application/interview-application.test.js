import test from 'node:test'
import assert from 'node:assert/strict'
import { applicationFixture } from '../support/application-fixture.js'
import { AGENT_TASK_TYPES } from '../../src/application/agent-tasks.js'

async function start(fixture) {
  return fixture.application.startPractice('session-1', {
    mode: 'mock',
    config: { resume: 'Java 后端简历', interviewerStyle: '循序渐进', coding: true, difficulty: 'intermediate' },
  })
}

test('创建练习会持久化游标并发布出题请求', async () => {
  const fixture = applicationFixture()
  const result = await start(fixture)
  assert.equal(result.resource.kind, 'practice-started')
  assert.equal(result.resource.data.phase, 'awaiting_question')
  assert.deepEqual(result.resource.data.practice.config, { resume: 'Java 后端简历', interviewerStyle: '循序渐进', coding: true, difficulty: 'intermediate' })
  assert.equal(fixture.published[0].type, 'practice.started')
  assert.equal(result.agentTasks[0].type, AGENT_TASK_TYPES.GENERATE_QUESTION)
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

test('直接看答案只生成讲解，不伪造作答和评价', async () => {
  const fixture = applicationFixture()
  const started = await start(fixture)
  const asked = await fixture.application.askQuestion('session-1', { prompt: '什么是 JMM？' })
  const revealed = await fixture.application.revealAnswer('session-1')
  assert.equal(revealed.resource.data.reviewReady, false)
  assert.equal((await fixture.application.getSession('session-1')).resource.data.phase, 'generating_explanation')
  await fixture.application.saveExplanation('session-1', {
    detail: 'JMM 规定多线程共享内存的可见性与有序性。',
    memorizationPoints: 'JMM 解决原子性、可见性和有序性。',
  })
  const detail = await fixture.application.getPractice(started.resource.data.practice.id)
  assert.equal(detail.resource.data.questions[0].id, asked.resource.data.id)
  assert.equal(detail.resource.data.questions[0].attempts.length, 0)
  assert.equal(detail.resource.data.questions[0].explanation.memorizationPoints, 'JMM 解决原子性、可见性和有序性。')
})

test('结束、重新打开、洞察和导出通过独立用例完成', async () => {
  const fixture = applicationFixture()
  const started = await start(fixture)
  const practiceId = started.resource.data.practice.id
  await fixture.application.askQuestion('session-1', { prompt: '问题' })
  await fixture.application.submitAnswer('session-1', { answer: '回答' })
  await fixture.application.evaluateAnswer('session-1', { score: 6, feedback: '继续加强。' })
  await fixture.application.requestPracticeSummary('session-1')
  await fixture.application.completePractice('session-1', {
    overall: '基础知识仍需加强。', strengths: ['完成了作答。'], improvements: ['补充知识细节。'],
  })
  const completedSession = await fixture.application.getSession('session-1')
  assert.equal(completedSession.resource.data.selected, false)
  assert.equal((await fixture.application.getPractice(practiceId)).resource.data.summary.overall, '基础知识仍需加强。')
  assert.equal((await fixture.application.getInsights()).resource.data.weakestTopic.topic, '模拟面试')
  assert.equal((await fixture.application.exportPractices({ practiceIds: [practiceId] })).resource.data[0].token, `download-${practiceId}`)
  assert.equal((await fixture.application.reopenPractice('session-1', practiceId)).resource.data.practice.status, 'active')
  assert.equal((await fixture.application.getPractice(practiceId)).resource.data.summary, null)
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

test('应用层提供练习与题目 CRUD，切换时返回完整模型上下文', async () => {
  const fixture = applicationFixture()
  const started = await start(fixture)
  const practiceId = started.resource.data.practice.id
  const asked = await fixture.application.askQuestion('session-1', { prompt: '原题目' })
  const questionId = asked.resource.data.id
  await fixture.application.submitAnswer('session-1', { answer: '历史回答' })
  await fixture.application.evaluateAnswer('session-1', { score: 7, feedback: '历史评价' })
  await fixture.application.saveExplanation('session-1', { detail: '历史讲解', memorizationPoints: '历史直接背' })

  await fixture.application.updateQuestion(practiceId, questionId, { prompt: '修改后的题目' })
  const question = await fixture.application.getQuestion(practiceId, questionId)
  assert.equal(question.resource.data.prompt, '修改后的题目')
  assert.equal(question.resource.data.attempts[0].evaluation.feedback, '历史评价')

  await fixture.application.updatePractice(practiceId, { mode: 'scenario', config: { topic: '分布式场景' } })
  const selected = await fixture.application.selectPractice('session-2', practiceId)
  assert.equal(selected.resource.data.practice.questions[0].explanation.detail, '历史讲解')
  assert.equal(selected.resource.data.practice.questions[0].attempts[0].answer, '历史回答')
  assert.equal(selected.events[0].type, 'practice.selected')
  assert.equal(selected.events[0].practiceId, practiceId)
  assert.equal((await fixture.application.getSession('session-1')).resource.data.selected, false)

  await fixture.application.deleteQuestion(practiceId, questionId, 'session-2')
  assert.equal((await fixture.application.getPractice(practiceId)).resource.data.questions.length, 0)
  assert.equal((await fixture.application.getSession('session-2')).resource.data.phase, 'awaiting_question')
})

test('继续练习根据权威阶段恢复且不重复创建当前题', async () => {
  const fixture = applicationFixture()
  const idle = await fixture.application.continuePractice('empty-session')
  assert.equal(idle.resource.data.resumeAction, 'select_practice')

  await fixture.application.startPractice('session-continue', { mode: 'bagu', config: { topic: 'JMM' } })
  let resumed = await fixture.application.continuePractice('session-continue')
  assert.equal(resumed.resource.data.resumeAction, 'generate_question')
  assert.equal(resumed.agentTasks[0].type, AGENT_TASK_TYPES.GENERATE_QUESTION)

  const asked = await fixture.application.askQuestion('session-continue', { prompt: '什么是 happens-before？' })
  resumed = await fixture.application.continuePractice('session-continue')
  assert.equal(resumed.resource.data.resumeAction, 'show_current_question')
  assert.equal(resumed.resource.data.question.id, asked.resource.data.id)
  assert.equal(resumed.events.length, 0)

  const submitted = await fixture.application.submitAnswer('session-continue', { answer: '它描述操作间的可见性顺序。' })
  resumed = await fixture.application.continuePractice('session-continue')
  assert.equal(resumed.resource.data.resumeAction, 'evaluate_answer')
  assert.equal(resumed.resource.data.attempt.id, submitted.resource.data.id)
  assert.equal(resumed.agentTasks[0].type, AGENT_TASK_TYPES.EVALUATE_ANSWER)

  await fixture.application.evaluateAnswer('session-continue', { score: 8, feedback: '核心方向正确。' })
  resumed = await fixture.application.continuePractice('session-continue')
  assert.equal(resumed.resource.data.resumeAction, 'generate_explanation')
  assert.equal(resumed.agentTasks[0].type, AGENT_TASK_TYPES.GENERATE_REVIEW)

  await fixture.application.saveExplanation('session-continue', { detail: 'happens-before 保证前序结果对后序可见。', memorizationPoints: '规则先行，结果可见。' })
  resumed = await fixture.application.continuePractice('session-continue')
  assert.equal(resumed.resource.data.resumeAction, 'generate_question')
  assert.equal(resumed.resource.data.phase, 'awaiting_question')
  assert.equal(resumed.agentTasks[0].reason, 'practice_continued')

  await fixture.application.requestPracticeSummary('session-continue')
  resumed = await fixture.application.continuePractice('session-continue')
  assert.equal(resumed.resource.data.resumeAction, 'generate_summary')

  await fixture.application.completePractice('session-continue', {
    overall: '练习完成。', strengths: ['理解可见性。'], improvements: ['补充规则细节。'],
  })
  resumed = await fixture.application.continuePractice('session-continue')
  assert.equal(resumed.resource.data.resumeAction, 'select_practice')
  assert.equal(resumed.events.length, 0)
})

test('切换练习会完整转移游标并释放会话原来绑定的练习', async () => {
  const fixture = applicationFixture()
  const first = await fixture.application.startPractice('session-a', { mode: 'bagu', config: { topic: 'JMM' } })
  const firstPracticeId = first.resource.data.practice.id
  const question = await fixture.application.askQuestion('session-a', { prompt: '什么是 happens-before？' })
  const second = await fixture.application.startPractice('session-b', { mode: 'scenario', config: { topic: '缓存一致性' } })
  const secondPracticeId = second.resource.data.practice.id

  const switched = await fixture.application.selectPractice('session-b', firstPracticeId)
  assert.equal(switched.resource.data.phase, 'awaiting_answer')
  assert.equal(switched.resource.data.questionId, question.resource.data.id)
  assert.equal((await fixture.application.getSession('session-a')).resource.data.selected, false)
  assert.equal((await fixture.application.getSession('session-b')).resource.data.practice.id, firstPracticeId)
  assert.equal(await fixture.repository.getCursorByPractice(secondPracticeId), null)
})

test('力扣热题目录按官方题型分组并持久化完成状态', async () => {
  const fixture = applicationFixture()
  let catalog = await fixture.application.getLeetcodeCatalog()
  assert.equal(catalog.resource.data.total, 100)
  assert.equal(catalog.resource.data.groups.length, 17)
  assert.equal(catalog.resource.data.completedCount, 0)

  const completed = await fixture.application.setLeetcodeProblemCompletion('two-sum', true)
  assert.equal(completed.resource.data.completed, true)
  catalog = await fixture.application.getLeetcodeCatalog()
  assert.equal(catalog.resource.data.completedCount, 1)
  assert.equal(catalog.resource.data.groups[0].problems[0].completed, true)

  await fixture.application.setLeetcodeProblemCompletion('two-sum', false)
  assert.equal((await fixture.application.getLeetcodeCatalog()).resource.data.completedCount, 0)
  await assert.rejects(() => fixture.application.setLeetcodeProblemCompletion('not-in-plan', true), { code: 'LEETCODE_PROBLEM_NOT_FOUND' })
})

test('刷力扣模式由应用层随机抽题并根据完成状态继续', async () => {
  const fixture = applicationFixture()
  const started = await fixture.application.startPractice('leetcode-session', { mode: 'leetcode', config: { language: 'cpp' } })
  const startedPractice = await fixture.application.getPractice(started.references.practiceId)
  assert.equal(startedPractice.resource.data.config.language, 'cpp')
  assert.equal(startedPractice.resource.data.topic, '两数之和')
  assert.equal(started.resource.kind, 'question')
  assert.equal(started.resource.data.leetcode.slug, 'two-sum')
  assert.equal(started.resource.data.leetcode.category, '哈希')
  assert.equal(started.resource.data.leetcode.difficulty, 'easy')
  assert.equal(started.agentTasks[0].type, AGENT_TASK_TYPES.DELIVER_ARTIFACT)
  assert.equal(started.agentTasks[0].questionId, started.resource.data.id)
  assert.equal(started.agentTasks[0].reason, 'practice_started')
  assert.equal((await fixture.application.getSession('leetcode-session')).resource.data.phase, 'awaiting_solution')
  assert.equal(fixture.published.at(-1).type, 'leetcode.problem_drawn')

  const revealed = await fixture.application.revealAnswer('leetcode-session')
  assert.equal(revealed.resource.data.explanationType, 'leetcode_solution')
  assert.equal(revealed.agentTasks[0].type, AGENT_TASK_TYPES.GENERATE_LEETCODE_EXPLANATION)
  assert.equal((await fixture.application.getSession('leetcode-session')).resource.data.phase, 'generating_explanation')
  const resumedExplanation = await fixture.application.continuePractice('leetcode-session')
  assert.equal(resumedExplanation.resource.data.resumeAction, 'generate_leetcode_explanation')
  assert.equal(resumedExplanation.agentTasks[0].type, AGENT_TASK_TYPES.GENERATE_LEETCODE_EXPLANATION)
  await fixture.application.saveExplanation('leetcode-session', {
    detail: [
      '使用哈希表保存已访问元素及其下标，一次遍历查找目标差值。',
      '```cpp\nvector<int> twoSum(vector<int>& nums, int target) { return {}; }\n```',
    ].join('\n\n'),
    memorizationPoints: '边遍历边查差值，哈希表把查找降为常数时间。',
  })
  assert.equal((await fixture.application.getSession('leetcode-session')).resource.data.phase, 'awaiting_next')

  await fixture.application.setLeetcodeProblemCompletion('two-sum', true, 'leetcode-session')
  assert.equal((await fixture.application.getSession('leetcode-session')).resource.data.phase, 'awaiting_next')

  const continued = await fixture.application.continuePractice('leetcode-session')
  assert.equal(continued.resource.data.resumeAction, 'show_current_question')
  assert.equal(continued.resource.data.question.leetcode.slug, 'group-anagrams')
  assert.equal(continued.agentTasks[0].type, AGENT_TASK_TYPES.DELIVER_ARTIFACT)
  assert.equal((await fixture.application.getSession('leetcode-session')).resource.data.phase, 'awaiting_solution')
  assert.equal((await fixture.application.getPractice(started.references.practiceId)).resource.data.status, 'completed')
  const continuedPracticeId = continued.references.practiceId
  assert.notEqual(continuedPracticeId, started.references.practiceId)
  assert.equal((await fixture.application.getPractice(continuedPracticeId)).resource.data.questions.length, 1)

  const [next, duplicateNext] = await Promise.all([
    fixture.application.requestNextQuestion('leetcode-session'),
    fixture.application.requestNextQuestion('leetcode-session'),
  ])
  assert.equal(next.resource.data.leetcode.slug, 'longest-consecutive-sequence')
  assert.equal(duplicateNext.references.practiceId, next.references.practiceId)
  assert.equal(duplicateNext.references.questionId, next.references.questionId)
  assert.equal(next.agentTasks[0].type, AGENT_TASK_TYPES.DELIVER_ARTIFACT)
  assert.equal(next.agentTasks[0].questionId, next.resource.data.id)
  assert.equal(next.agentTasks[0].reason, 'next_requested')
  assert.notEqual(next.references.practiceId, continuedPracticeId)
  assert.equal((await fixture.application.getPractice(next.references.practiceId)).resource.data.questions.length, 1)
  assert.equal((await fixture.application.getPractice(continuedPracticeId)).resource.data.status, 'completed')

  await fixture.application.selectPractice('leetcode-session-2', next.references.practiceId)
  assert.equal((await fixture.application.getSession('leetcode-session-2')).resource.data.phase, 'awaiting_solution')

  const finished = await fixture.application.requestPracticeSummary('leetcode-session-2')
  assert.equal(finished.resource.data.status, 'completed')
  assert.equal(finished.resource.data.summary.kind, 'leetcode')
  assert.deepEqual(finished.resource.data.summary.problems.map((problem) => problem.slug), ['longest-consecutive-sequence'])
  assert.deepEqual(finished.agentTasks, [])
  assert.equal(await fixture.repository.getCursor('leetcode-session-2'), null)
  assert.equal(fixture.published.at(-1).type, 'practice.completed')
})
