import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createPractice, askQuestion, submitAnswer, evaluateAnswer, saveExplanation } from '../../src/domain/practice.js'
import { createCursor, markQuestionAsked } from '../../src/domain/workflow.js'
import { SqliteInterviewRepository } from '../../src/infrastructure/sqlite-interview-repository.js'

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-interview-sqlite-'))
  const repository = new SqliteInterviewRepository(join(directory, 'interview.sqlite'))
  return {
    repository,
    cleanup() {
      repository.close()
      rmSync(directory, { recursive: true, force: true })
    },
  }
}

function aggregate() {
  let practice = createPractice({ id: 'practice-1', mode: 'mock', topic: 'Java 后端', config: { difficulty: 'intermediate', targetQuestionCount: 10, followUp: true }, now: 1 })
  const asked = askQuestion(practice, { id: 'question-1', prompt: '解释 happens-before。', now: 2 })
  practice = asked.practice
  practice = submitAnswer(practice, { questionId: 'question-1', attemptId: 'attempt-1', answer: '它描述可见性顺序。', now: 3 }).practice
  practice = evaluateAnswer(practice, { questionId: 'question-1', attemptId: 'attempt-1', score: 8.5, feedback: '准确。', dimensions: { accuracy: 9 }, now: 4 }).practice
  practice = saveExplanation(practice, { questionId: 'question-1', detail: '前一个操作的结果对后一个操作可见。', memorizationPoints: '可见性与有序性。', now: 5 }).practice
  const cursor = markQuestionAsked(createCursor({ sessionId: 'session-1', practiceId: practice.id, now: 1 }), asked.question.id, 2)
  return { practice, cursor }
}

test('SQLite 事务保存并恢复完整聚合与会话游标', async () => {
  const context = fixture()
  try {
    const { practice, cursor } = aggregate()
    await context.repository.commit({ practice, cursor })
    const restored = await context.repository.getPractice(practice.id)
    const restoredCursor = await context.repository.getCursor(cursor.sessionId)
    assert.deepEqual(restored, practice)
    assert.deepEqual(restoredCursor, cursor)
  } finally {
    context.cleanup()
  }
})

test('SQLite 列表支持模式、状态和主题筛选', async () => {
  const context = fixture()
  try {
    await context.repository.commit(aggregate())
    const result = await context.repository.listPractices({ mode: 'mock', status: 'active', query: 'java' })
    assert.equal(result.length, 1)
    assert.equal((await context.repository.listPractices({ mode: 'scenario' })).length, 0)
  } finally {
    context.cleanup()
  }
})

test('删除练习通过外键级联清理题目、作答和游标', async () => {
  const context = fixture()
  try {
    const { practice, cursor } = aggregate()
    await context.repository.commit({ practice, cursor })
    await context.repository.deletePractice(practice.id)
    assert.equal(await context.repository.getPractice(practice.id), null)
    assert.equal(await context.repository.getCursor(cursor.sessionId), null)
  } finally {
    context.cleanup()
  }
})
