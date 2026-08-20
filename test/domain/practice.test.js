import test from 'node:test'
import assert from 'node:assert/strict'
import {
  askQuestion,
  completePractice,
  createPractice,
  evaluateAnswer,
  reopenPractice,
  saveExplanation,
  submitAnswer,
  summarizePractice,
} from '../../src/domain/practice.js'
import { DomainError } from '../../src/domain/errors.js'

function samplePractice() {
  return createPractice({
    id: 'practice-1',
    mode: 'mock',
    topic: 'Java 后端',
    source: { kind: 'topic', content: 'Java 后端' },
    config: { difficulty: 'senior', targetQuestionCount: 5 },
    now: 1,
  })
}

test('练习配置会应用模式默认策略', () => {
  const practice = samplePractice()
  assert.equal(practice.config.followUp, true)
  assert.equal(practice.status, 'active')
})

test('八股模式只接受 bagu 标识', () => {
  const practice = createPractice({ id: 'practice-1', mode: 'bagu', topic: 'JVM', now: 1 })
  assert.equal(practice.mode, 'bagu')
  assert.throws(() => createPractice({ id: 'practice-2', mode: ['bao', 'gu'].join(''), topic: 'JVM', now: 1 }), {
    code: 'INVALID_MODE',
  })
})

test('简历模式必须提供来源内容', () => {
  assert.throws(() => createPractice({
    id: 'practice-1', mode: 'resume', topic: '简历面试', source: { kind: 'resume', content: '' }, now: 1,
  }), (error) => error instanceof DomainError && error.code === 'SOURCE_REQUIRED')
})

test('题目、作答、评价和讲解形成结构化聚合', () => {
  let practice = samplePractice()
  const asked = askQuestion(practice, { id: 'question-1', prompt: '解释双亲委派。', now: 2 })
  practice = asked.practice
  const submitted = submitAnswer(practice, {
    questionId: 'question-1', attemptId: 'attempt-1', answer: '先委托父加载器。', now: 3,
  })
  practice = submitted.practice
  const evaluated = evaluateAnswer(practice, {
    questionId: 'question-1', attemptId: 'attempt-1', score: 7.5, feedback: '基本正确。', dimensions: { accuracy: 8 }, now: 4,
  })
  practice = evaluated.practice
  assert.throws(() => saveExplanation(practice, {
    questionId: 'question-1', detail: '父加载器优先尝试。', memorizationPoints: '  ', now: 5,
  }), (error) => error instanceof DomainError && error.code === 'INVALID_MEMORIZATION_POINTS')
  practice = saveExplanation(practice, {
    questionId: 'question-1', detail: '父加载器优先尝试。', memorizationPoints: '向上委托，向下加载。', now: 5,
  }).practice

  assert.equal(practice.questions[0].attempts[0].evaluation.score, 7.5)
  assert.equal(practice.questions[0].explanation.memorizationPoints, '向上委托，向下加载。')
  assert.deepEqual(summarizePractice(practice), {
    questionCount: 1,
    attemptCount: 1,
    evaluatedCount: 1,
    averageScore: 7.5,
    verdict: '合格',
  })
})

test('已评价回答不能被覆盖，重新回答必须创建新记录', () => {
  let practice = askQuestion(samplePractice(), { id: 'question-1', prompt: '问题', now: 2 }).practice
  practice = submitAnswer(practice, { questionId: 'question-1', attemptId: 'attempt-1', answer: '回答', now: 3 }).practice
  practice = evaluateAnswer(practice, { questionId: 'question-1', attemptId: 'attempt-1', score: 8, feedback: '很好', now: 4 }).practice

  assert.throws(() => evaluateAnswer(practice, {
    questionId: 'question-1', attemptId: 'attempt-1', score: 9, feedback: '覆盖', now: 5,
  }), (error) => error instanceof DomainError && error.code === 'ATTEMPT_ALREADY_EVALUATED')

  practice = submitAnswer(practice, { questionId: 'question-1', attemptId: 'attempt-2', answer: '第二次回答', now: 6 }).practice
  assert.equal(practice.questions[0].attempts.length, 2)
})

test('结束后的练习禁止继续出题，重新打开后恢复写入', () => {
  const completed = completePractice(samplePractice(), 2)
  assert.throws(() => askQuestion(completed, { id: 'question-1', prompt: '问题', now: 3 }), {
    code: 'PRACTICE_NOT_ACTIVE',
  })
  const reopened = reopenPractice(completed, 4)
  assert.equal(askQuestion(reopened, { id: 'question-1', prompt: '问题', now: 5 }).practice.questions.length, 1)
})

test('达到配置的目标题数后禁止继续出题', () => {
  let practice = createPractice({ id: 'practice-1', mode: 'bagu', topic: 'JVM', config: { targetQuestionCount: 1 }, now: 1 })
  practice = askQuestion(practice, { id: 'question-1', prompt: '第一题', now: 2 }).practice
  assert.throws(() => askQuestion(practice, { id: 'question-2', prompt: '第二题', now: 3 }), {
    code: 'QUESTION_LIMIT_REACHED',
  })
})
