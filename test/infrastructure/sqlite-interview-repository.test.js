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
  let practice = createPractice({ id: 'practice-1', mode: 'mock', config: { resume: 'Java 后端简历', interviewerStyle: '深挖项目', coding: true, difficulty: 'intermediate' }, now: 1 })
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

test('SQLite 在绑定练习时原子转移会话并释放原绑定', async () => {
  const context = fixture()
  try {
    const { practice, cursor } = aggregate()
    await context.repository.commit({ practice, cursor })
    const transferred = { ...cursor, sessionId: 'session-2', revision: cursor.revision + 1, updatedAt: cursor.updatedAt + 1 }
    await context.repository.commit({ cursor: transferred })
    assert.equal(await context.repository.getCursor('session-1'), null)
    assert.deepEqual(await context.repository.getCursor('session-2'), transferred)
    assert.deepEqual(await context.repository.getCursorByPractice(practice.id), transferred)

    await context.repository.commit({ unbindSessionId: 'session-2' })
    assert.equal(await context.repository.getCursorByPractice(practice.id), null)
  } finally {
    context.cleanup()
  }
})

test('SQLite 迁移时只保留同一练习最近更新的会话绑定', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-interview-sqlite-migration-'))
  const filePath = join(directory, 'interview.sqlite')
  let repository = new SqliteInterviewRepository(filePath)
  try {
    const { practice, cursor } = aggregate()
    await repository.commit({ practice, cursor })
    repository.database.exec('DROP INDEX ux_session_cursors_practice')
    repository.database.prepare(`
      INSERT INTO session_cursors (session_id, practice_id, question_id, attempt_id, phase, revision, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('session-new', practice.id, cursor.questionId, cursor.attemptId, cursor.phase, cursor.revision + 1, cursor.updatedAt + 1)
    repository.close()
    repository = null

    repository = new SqliteInterviewRepository(filePath)
    assert.equal(await repository.getCursor('session-1'), null)
    assert.equal((await repository.getCursorByPractice(practice.id)).sessionId, 'session-new')
  } finally {
    repository?.close()
    rmSync(directory, { recursive: true, force: true })
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

test('SQLite 保存并更新力扣热题完成状态', async () => {
  const context = fixture()
  try {
    await context.repository.saveLeetcodeProgress({ slug: 'two-sum', completed: true, completedAt: 10, updatedAt: 10 })
    assert.deepEqual(await context.repository.listLeetcodeProgress(), [
      { slug: 'two-sum', completed: true, completedAt: 10, updatedAt: 10 },
    ])
    await context.repository.saveLeetcodeProgress({ slug: 'two-sum', completed: false, completedAt: null, updatedAt: 11 })
    assert.deepEqual(await context.repository.listLeetcodeProgress(), [
      { slug: 'two-sum', completed: false, completedAt: null, updatedAt: 11 },
    ])
  } finally {
    context.cleanup()
  }
})

test('SQLite 保存并恢复力扣题库元数据', async () => {
  const context = fixture()
  try {
    let practice = createPractice({ id: 'leetcode-1', mode: 'leetcode', config: {}, now: 1 })
    practice = askQuestion(practice, {
      id: 'question-1', prompt: '1. 两数之和', leetcode: { slug: 'two-sum' }, now: 2,
    }).practice
    await context.repository.commit({ practice })
    assert.deepEqual((await context.repository.getPractice(practice.id)).questions[0].leetcode, practice.questions[0].leetcode)
  } finally {
    context.cleanup()
  }
})
