// Unified CRUD protocol smoke tests: persistence, re-answering, migration and export.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { InterviewStore, applyControl, executeTool, formatPracticeList } from './lib/state.js'
import { INTERVIEW_ACTIONS, renderToolSummary } from './lib/index.js'

const dir = mkdtempSync(join(tmpdir(), 'dsh-interview-'))
const file = join(dir, 'data.json')
const store = new InterviewStore(file)
let pass = 0
let fail = 0

function check(name, condition, detail = '') {
  if (condition) { pass++; console.log('PASS', name) }
  else { fail++; console.log('FAIL', name, detail) }
}

function rejects(name, callback) {
  let rejected = false
  try { callback() } catch { rejected = true }
  check(name, rejected)
}

check('empty workspace', executeTool(store, 'a', { action: 'session.get' }).session.selected === false)

let response = executeTool(store, 'a', { action: 'practice.create', mode: 'baogu', topic: 'JVM', resume: 'Java backend' })
const firstId = response.practice.id
check('practice.create persists a selected practice', Boolean(firstId) && response.practice.mode === 'baogu' && response.practiceId === firstId)

response = executeTool(store, 'a', { action: 'question.open', practice_id: firstId, question: '什么是双亲委派模型？' })
const firstQuestionId = response.question.id
check('question.open creates and focuses a question', response.questionId === firstQuestionId && store.practiceById(firstId).questions.length === 1)

store.noteUserMessage('a', '父加载器优先加载，找不到才由子加载器处理。')
const autoAttemptId = store.practiceById(firstId).questions[0].attempts[0].id
response = executeTool(store, 'a', { action: 'attempt.create', practice_id: firstId, question_id: firstQuestionId, answer: '父加载器优先加载，找不到才由子加载器处理。' })
check('attempt.create reuses the pending captured answer', response.attempt.id === autoAttemptId && store.practiceById(firstId).questions[0].attempts.length === 1)

executeTool(store, 'a', { action: 'evaluation.create', practice_id: firstId, question_id: firstQuestionId, attempt_id: autoAttemptId, score: 7, comment: '基本正确，缺少破坏委派的场景。' })
executeTool(store, 'a', { action: 'explanation.create', practice_id: firstId, question_id: firstQuestionId, explain: '先委托父加载器，父加载失败后再由当前加载器尝试。', memo: '向上委托，向下加载。' })
check('evaluation and explanation persist', store.practiceById(firstId).questions[0].score === 7 && store.practiceById(firstId).questions[0].memo.includes('向上委托'))

store.noteUserMessage('a', '查看练习档案')
check('commands after evaluation are not saved as attempts', store.practiceById(firstId).questions[0].attempts.length === 1)

applyControl(store, 'a', { action: 'retry', practice_id: firstId, question_id: firstQuestionId })
check('retry only focuses the existing question', store.root.focuses.a.questionId === firstQuestionId && store.root.focuses.a.attemptId === null && store.practiceById(firstId).questions.length === 1 && store.practiceById(firstId).questions[0].attempts.length === 1)
response = executeTool(store, 'a', { action: 'question.open', practice_id: firstId, question_id: firstQuestionId })
check('question.open restores without duplicating', response.question.id === firstQuestionId && store.practiceById(firstId).questions.length === 1)
rejects('restoring a question cannot reuse a stale user command', () => executeTool(store, 'a', { action: 'attempt.create', practice_id: firstId, question_id: firstQuestionId }))
store.noteUserMessage('a', '第二次回答：委派到父加载器可以避免核心类被重复加载。')
response = executeTool(store, 'a', { action: 'attempt.create', practice_id: firstId, question_id: firstQuestionId })
const secondAttemptId = response.attempt.id
executeTool(store, 'a', { action: 'evaluation.create', practice_id: firstId, question_id: firstQuestionId, attempt_id: secondAttemptId, score: 9, comment: '回答完整。' })
const firstQuestion = store.practiceById(firstId).questions[0]
check('re-answering appends a distinct attempt', firstQuestion.attempts.length === 2 && firstQuestion.attempts[0].score === 7 && firstQuestion.attempts[1].score === 9)
check('question projection uses the latest attempt', firstQuestion.score === 9 && firstQuestion.userAnswer.startsWith('第二次回答'))

response = executeTool(store, 'a', { action: 'attempt.list', practice_id: firstId, question_id: firstQuestionId })
check('attempt.list returns every attempt', response.attempts.length === 2 && response.attempts[1].id === secondAttemptId)
response = executeTool(store, 'a', { action: 'evaluation.list', practice_id: firstId, question_id: firstQuestionId })
check('evaluation.list follows attempts', response.evaluations.length === 2 && response.evaluations[1].score === 9)
executeTool(store, 'a', { action: 'evaluation.update', practice_id: firstId, question_id: firstQuestionId, attempt_id: secondAttemptId, score: 8.5, comment: '更新后的评价。' })
response = executeTool(store, 'a', { action: 'evaluation.get', practice_id: firstId, question_id: firstQuestionId, attempt_id: secondAttemptId })
check('evaluation.get/update work by attempt id', response.evaluation.score === 8.5 && response.evaluation.comment === '更新后的评价。')

executeTool(store, 'a', { action: 'explanation.update', practice_id: firstId, question_id: firstQuestionId, memo: '父优先。' })
response = executeTool(store, 'a', { action: 'explanation.get', practice_id: firstId, question_id: firstQuestionId })
check('explanation.get/update work', response.explanation.memo === '父优先。')

const second = executeTool(store, 'a', { action: 'practice.create', mode: 'scenario', topic: 'Redis' })
const secondId = second.practice.id
check('multiple practices coexist', secondId !== firstId && store.root.practices.length === 2)
response = executeTool(store, 'a', { action: 'question.open', practice_id: secondId, question: '如何处理缓存击穿？' })
const tempQuestionId = response.question.id
executeTool(store, 'a', { action: 'question.update', practice_id: secondId, question_id: tempQuestionId, question: '如何处理 Redis 缓存击穿？' })
response = executeTool(store, 'a', { action: 'question.get', practice_id: secondId, question_id: tempQuestionId })
check('question.get/update work', response.question.question.includes('Redis'))
check('question.list works', executeTool(store, 'a', { action: 'question.list', practice_id: secondId }).questions.length === 1)

response = executeTool(store, 'a', { action: 'attempt.create', practice_id: secondId, question_id: tempQuestionId, answer: '互斥锁。' })
const tempAttemptId = response.attempt.id
executeTool(store, 'a', { action: 'attempt.update', practice_id: secondId, question_id: tempQuestionId, attempt_id: tempAttemptId, answer: '互斥锁配合逻辑过期。' })
check('attempt.get/update work', executeTool(store, 'a', { action: 'attempt.get', practice_id: secondId, question_id: tempQuestionId, attempt_id: tempAttemptId }).attempt.answer.includes('逻辑过期'))
executeTool(store, 'a', { action: 'attempt.delete', practice_id: secondId, question_id: tempQuestionId, attempt_id: tempAttemptId })
check('attempt.delete removes only the target', store.practiceById(secondId).questions[0].attempts.length === 0)
executeTool(store, 'a', { action: 'explanation.create', practice_id: secondId, question_id: tempQuestionId, explain: '测试讲解' })
executeTool(store, 'a', { action: 'explanation.delete', practice_id: secondId, question_id: tempQuestionId })
check('explanation.delete clears the resource', store.practiceById(secondId).questions[0].explain === '')

executeTool(store, 'a', { action: 'practice.update', practice_id: secondId, topic: 'Redis 高可用' })
check('practice.get/update work', executeTool(store, 'a', { action: 'practice.get', practice_id: secondId }).practice.topic === 'Redis 高可用')
const detailResult = executeTool(store, 'a', { action: 'practice.get', practice_id: firstId })
check('practice.get returns structured detail without text fallback', detailResult.practice.questions.length === 1 && !Object.hasOwn(detailResult, '__practiceDetailText'))
response = executeTool(store, 'a', { action: 'practice.dashboard' })
check('dashboard aggregates all practices', response.dashboard.practicesCount === 2 && response.dashboard.questionsCount === 2)
check('practice.list renders both practices', formatPracticeList(store, 'a').includes(firstId) && formatPracticeList(store, 'a').includes(secondId))
check('practice.timeline returns persisted questions', executeTool(store, 'a', { action: 'practice.timeline', practice_id: firstId }).questions[0].attempts.length === 2)
check('practice.summary uses latest question scores', executeTool(store, 'a', { action: 'practice.summary', practice_id: firstId }).summary.avg === 8.5)

executeTool(store, 'a', { action: 'session.select_practice', practice_id: firstId })
executeTool(store, 'a', { action: 'session.focus_question', practice_id: firstId, question_id: firstQuestionId, attempt_id: autoAttemptId })
check('session selection and focus are explicit', executeTool(store, 'a', { action: 'session.get' }).session.attemptId === autoAttemptId)
executeTool(store, 'a', { action: 'session.clear_focus' })
check('session.clear_focus clears explicit focus', !Object.hasOwn(store.root.focuses, 'a'))

executeTool(store, 'a', { action: 'practice.finish', practice_id: firstId })
check('practice.finish persists summary and ended state', Boolean(store.practiceById(firstId).endedAt) && Boolean(store.practiceById(firstId).lastSummary))
rejects('ended practice blocks question mutations', () => executeTool(store, 'a', { action: 'question.open', practice_id: firstId, question: '不应创建' }))
executeTool(store, 'a', { action: 'session.select_practice', practice_id: firstId })
check('selecting does not implicitly reopen', Boolean(store.practiceById(firstId).endedAt))
executeTool(store, 'a', { action: 'practice.reopen', practice_id: firstId })
check('practice.reopen is explicit', store.practiceById(firstId).endedAt === null)

const singleExport = executeTool(store, 'a', { action: 'export.create', practice_id: firstId })
const markdown = readFileSync(singleExport.exportedFiles[0].path, 'utf8')
check('export.create writes one Markdown per practice', singleExport.exportedFiles.length === 1 && existsSync(singleExport.exportedFiles[0].path))
check('latest export is available to the client session', executeTool(store, 'a', { action: 'session.get' }).session.lastExportFiles[0].path === singleExport.exportedFiles[0].path)
check('export title is topic + time + mode', markdown.startsWith('# JVM - ') && markdown.includes(' - 背八股'))
check('export preserves all answer attempts', markdown.includes('### 第 1 次作答') && markdown.includes('### 第 2 次作答') && markdown.includes('7/10') && markdown.includes('8.5/10'))
const filteredExport = executeTool(store, 'a', { action: 'export.create', practice_id: firstId, include: ['题目', '讲解'] })
const filteredMarkdown = readFileSync(filteredExport.exportedFiles[0].path, 'utf8')
check('export filters support Chinese aliases', filteredMarkdown.includes('### 题目') && filteredMarkdown.includes('### 讲解') && !filteredMarkdown.includes('次作答'))
check('multi export creates one file per practice', executeTool(store, 'a', { action: 'export.create', practice_ids: [firstId, secondId], include: ['metadata'] }).exportedFiles.length === 2)

const restored = new InterviewStore(file)
check('v3 data survives restart', restored.root.version === 3 && restored.root.practices.length === 2)
check('attempt history survives restart', restored.practiceById(firstId).questions[0].attempts.length === 2)
check('session selection survives restart', restored.selectedPractice('a').id === firstId)

const v2File = join(dir, 'v2.json')
writeFileSync(v2File, JSON.stringify({ version: 2, practices: [{ id: 'p-v2', mode: 'mock', topic: '并发', archived: true, createdAt: 1, updatedAt: 2, questions: [{ id: 'q-v2', question: 'volatile?', userAnswer: '可见性', score: 8, comment: 'ok', askedAt: 1 }] }], selections: { a: 'p-v2' } }), 'utf8')
const migratedV2 = new InterviewStore(v2File)
check('v2 migrates to v3 attempts', migratedV2.root.version === 3 && migratedV2.root.practices[0].questions[0].attempts[0].score === 8)
check('migration removes archive state', !Object.hasOwn(migratedV2.root.practices[0], 'archived'))

const legacyFile = join(dir, 'legacy.json')
writeFileSync(legacyFile, JSON.stringify({ mode: 'mock', topic: '并发', active: true, startedAt: 1, sessionQuestions: [{ question: 'synchronized?', answer: 'monitor', score: 6 }] }), 'utf8')
const migratedLegacy = new InterviewStore(legacyFile)
check('legacy data migrates to v3', migratedLegacy.root.version === 3 && migratedLegacy.root.practices[0].questions[0].attempts[0].answer === 'monitor')

rejects('legacy public actions are rejected', () => executeTool(store, 'a', { action: 'ask', practice_id: firstId, question: '旧动作' }))
const clientSource = readFileSync(new URL('./client/client.js', import.meta.url), 'utf8')
check('client registers the new UI templates', clientSource.includes('AttemptComparisonView') && clientSource.includes('PracticeSummaryView') && clientSource.includes('ExportResultView'))
check('evaluation exposes explanation without next question', clientSource.includes('"看讲解"') && clientSource.includes('action === "evaluation.create"'))
check('client renders practice.get as a detail table', clientSource.includes('PracticeDetailView') && clientSource.includes('action === "practice.get"') && clientSource.includes('iv-detail-table'))
const presentationSource = clientSource.slice(clientSource.indexOf('const ACTION_PRESENTATION = {'), clientSource.indexOf('\n  };', clientSource.indexOf('const ACTION_PRESENTATION = {')))
const presentationActions = [...presentationSource.matchAll(/^\s*"([^"]+)":/gm)].map((match) => match[1])
check('every public action has an explicit presentation contract', INTERVIEW_ACTIONS.length === 33 && INTERVIEW_ACTIONS.every((action) => presentationActions.includes(action)) && presentationActions.every((action) => INTERVIEW_ACTIONS.includes(action)))
check('client has no generic interview text fallback', !clientSource.includes('面试 ·'))
check('null scores remain visually unscored', clientSource.includes('props.score !== null && props.score !== undefined && props.score !== ""'))
check('report cards size against their message container', clientSource.includes('width:min(640px,100%);max-width:640px'))
const displayActions = ['practice.list', 'practice.get', 'practice.finish', 'practice.dashboard', 'practice.timeline', 'practice.summary', 'question.open', 'question.list', 'question.get', 'attempt.list', 'attempt.get', 'evaluation.create', 'evaluation.get', 'evaluation.update', 'evaluation.list', 'explanation.create', 'explanation.get', 'explanation.update', 'export.create']
check('all display actions suppress model-authored restatements', displayActions.every((action) => renderToolSummary({ action }, { practiceId: firstId, topic: 'secret topic', comment: 'secret comment' })[0].text.includes('Client 固定 UI')))
const renderedDetail = renderToolSummary({ action: 'practice.get' }, { practiceId: firstId, topic: 'secret topic', questionsCount: 99 })[0].text
check('display tool summaries cannot trigger text reformatting', renderedDetail.includes('Client 固定 UI') && !renderedDetail.includes('secret topic') && !renderedDetail.includes('questionsCount'))
executeTool(store, 'a', { action: 'question.delete', practice_id: secondId, question_id: tempQuestionId })
check('question.delete removes the resource', store.practiceById(secondId).questions.length === 0)
executeTool(store, 'a', { action: 'practice.delete', practice_id: secondId })
check('practice.delete removes the resource', store.practiceById(secondId) === null && store.root.practices.length === 1)

rmSync(dir, { recursive: true, force: true })
console.log(`\n${fail === 0 ? 'ALL SMOKE TESTS PASSED' : fail + ' FAILED'} (${pass} passed)`)
process.exit(fail === 0 ? 0 : 1)
