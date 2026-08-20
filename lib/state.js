// 面试助手持久化模型：练习永久保留，每个会话只保存当前选中的练习。
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'

export const MODES = { baogu: '背八股', mock: '模拟面试', scenario: '场景题', resume: '简历出题' }
const MODE_ALIASES = {
  baogu: 'baogu', 背八股: 'baogu', 八股: 'baogu', mock: 'mock', 模拟面试: 'mock', 面试: 'mock',
  scenario: 'scenario', 场景题: 'scenario', 场景: 'scenario', resume: 'resume', 简历出题: 'resume', 简历: 'resume',
}

function profileName() {
  const argv = process.argv || []
  const flag = argv.indexOf('--profile')
  if (flag !== -1 && flag + 1 < argv.length && !argv[flag + 1].startsWith('-')) return argv[flag + 1]
  return 'web'
}
export function defaultDataPath() { return join(homedir(), '.dsh', 'profiles', profileName(), 'data', 'dsh-interview', 'data.json') }
function mintId(prefix) { return prefix + '-' + randomUUID() }
function createRoot() { return { version: 3, practices: [], selections: {}, focuses: {} } }
function finiteScore(value) { if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null; const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : null }
function syncQuestion(question) { const latest = question.attempts[question.attempts.length - 1] || null; question.userAnswer = latest ? latest.answer : ''; question.answeredAt = latest ? latest.answeredAt : null; question.score = latest ? latest.score : null; question.comment = latest ? latest.comment : ''; question.evaluatedAt = latest ? latest.evaluatedAt : null; return question }

function normalizeAttempt(raw, fallbackTime) {
  const a = raw && typeof raw === 'object' ? raw : {}; const answer = typeof a.answer === 'string' ? a.answer : typeof a.userAnswer === 'string' ? a.userAnswer : ''; const score = finiteScore(a.score)
  return { id: typeof a.id === 'string' && a.id ? a.id : mintId('attempt'), answer, answeredAt: Number(a.answeredAt) || fallbackTime, score, comment: typeof a.comment === 'string' ? a.comment : '', evaluatedAt: score === null ? null : Number(a.evaluatedAt) || fallbackTime }
}

function normalizeQuestion(raw, fallbackTime) {
  const q = raw && typeof raw === 'object' ? raw : {}
  const answer = typeof q.userAnswer === 'string' ? q.userAnswer : typeof q.answer === 'string' ? q.answer : ''
  const score = finiteScore(q.score)
  const askedAt = Number(q.askedAt) || fallbackTime
  const attempts = Array.isArray(q.attempts) ? q.attempts.map((a) => normalizeAttempt(a, askedAt)) : answer || score !== null || q.comment ? [normalizeAttempt({ answer, answeredAt: q.answeredAt, score, comment: q.comment, evaluatedAt: q.evaluatedAt }, askedAt)] : []
  const latest = attempts[attempts.length - 1] || null
  return {
    id: typeof q.id === 'string' && q.id ? q.id : mintId('question'),
    question: typeof q.question === 'string' ? q.question : '', askedAt,
    attempts, userAnswer: latest ? latest.answer : '', answeredAt: latest ? latest.answeredAt : null,
    score: latest ? latest.score : null, comment: latest ? latest.comment : '', evaluatedAt: latest ? latest.evaluatedAt : null,
    explain: typeof q.explain === 'string' ? q.explain : '', memo: typeof q.memo === 'string' ? q.memo : '',
    explainedAt: q.explain || q.memo ? Number(q.explainedAt) || askedAt : null,
    viewedAt: q.viewed || q.viewedAt ? Number(q.viewedAt) || askedAt : null,
  }
}

function normalizePractice(raw, fallbackTime = Date.now()) {
  const p = raw && typeof raw === 'object' ? raw : {}
  const createdAt = Number(p.createdAt) || Number(p.startedAt) || Number(p.endedAt) || fallbackTime
  const source = Array.isArray(p.questions) ? p.questions : Array.isArray(p.sessionQuestions) ? p.sessionQuestions : []
  const questions = source.map((q, i) => normalizeQuestion(q, createdAt + i))
  const updatedAt = Number(p.updatedAt) || Number(p.endedAt) || Math.max(createdAt, ...questions.map((q) => q.explainedAt || q.evaluatedAt || q.answeredAt || q.askedAt))
  return {
    id: typeof p.id === 'string' && p.id ? p.id : mintId('practice'), mode: MODE_ALIASES[String(p.mode)] || 'mock',
    topic: typeof p.topic === 'string' ? p.topic : '', resume: typeof p.resume === 'string' ? p.resume : '', createdAt, updatedAt,
    endedAt: Number(p.endedAt) || null, lastSummaryAt: Number(p.lastSummaryAt) || Number(p.endedAt) || null,
    lastSummary: p.lastSummary && typeof p.lastSummary === 'object' ? p.lastSummary : p.lastEndSummary || null, questions,
  }
}

function migrateLegacy(data) {
  const root = createRoot(); const history = Array.isArray(data.history) ? data.history : []
  for (const entry of history) root.practices.push(normalizePractice(entry, Number(entry.endedAt) || Date.now()))
  const hasCurrent = data.active || (history.length === 0 && ((Array.isArray(data.sessionQuestions) && data.sessionQuestions.length > 0) || data.startedAt || data.mode && data.mode !== 'idle'))
  if (hasCurrent) {
    const current = normalizePractice({ mode: data.mode, topic: data.topic, resume: data.resume, startedAt: data.startedAt, updatedAt: Date.now(), sessionQuestions: data.sessionQuestions, lastEndSummary: data.lastEndSummary })
    root.practices.push(current); root.selections.global = current.id
  } else if (root.practices.length) root.selections.global = root.practices[root.practices.length - 1].id
  return root
}

function migrateV2(data) {
  const root = createRoot(); root.practices = data.practices.map((p) => normalizePractice(p)); root.selections = data.selections && typeof data.selections === 'object' ? { ...data.selections } : {}; return root
}

function summaryFor(practice) {
  const scored = practice.questions.filter((q) => q.score !== null); const sum = scored.reduce((n, q) => n + q.score, 0)
  const avg = scored.length ? Math.round((sum / scored.length) * 10) / 10 : null
  return { answered: scored.length, avg, verdict: avg === null ? '未评分' : avg >= 8 ? '优秀' : avg >= 6 ? '合格' : '需要加强' }
}
function sortedPractices(root) { return root.practices.slice().sort((a, b) => b.updatedAt - a.updatedAt) }
const EXPORT_SECTIONS = ['metadata', 'question', 'answer', 'evaluation', 'explanation', 'memo', 'summary']
const EXPORT_SECTION_ALIASES = { 元数据: 'metadata', 题目: 'question', 问题: 'question', 回答: 'answer', 评价: 'evaluation', 点评: 'evaluation', 讲解: 'explanation', 答案: 'explanation', 直接背: 'memo', 背诵: 'memo', 总结: 'summary', 阶段总结: 'summary' }
function topicStats(root) {
  const map = new Map()
  for (const p of root.practices) for (const q of p.questions) if (p.topic && q.score !== null) {
    const v = map.get(p.topic) || { answered: 0, sum: 0 }; v.answered++; v.sum += q.score; map.set(p.topic, v)
  }
  return [...map].map(([topic, v]) => ({ topic, answered: v.answered, avg: Math.round((v.sum / v.answered) * 10) / 10 }))
}

function exportTime(value) {
  const d = new Date(value)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
function safeFilePart(value) {
  const text = String(value || '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '')
  return text || '未指定主题'
}
function exportSections(value) {
  if (value === undefined || value === null) return EXPORT_SECTIONS
  if (!Array.isArray(value)) throw new Error('export 的 include 必须是内容字段数组')
  const include = [...new Set(value.filter((item) => typeof item === 'string').map((item) => EXPORT_SECTION_ALIASES[item] || item))]
  const unknown = include.filter((item) => !EXPORT_SECTIONS.includes(item))
  if (unknown.length) throw new Error('export 不支持的内容字段：' + unknown.join('、'))
  return include
}
function exportTargets(store, key, args) {
  const result = []; const seen = new Set(); const add = (p) => { if (p && !seen.has(p.id)) { seen.add(p.id); result.push(p) } }
  const ids = []
  if (typeof args.practice_id === 'string' && args.practice_id) ids.push(args.practice_id)
  if (Array.isArray(args.practice_ids)) ids.push(...args.practice_ids.filter((id) => typeof id === 'string' && id))
  for (const id of ids) { const p = store.practiceById(id); if (!p) throw new Error('找不到练习：' + id); add(p) }
  const indexes = []
  if (Number.isInteger(args.index) && args.index >= 1) indexes.push(args.index)
  if (Array.isArray(args.indexes)) indexes.push(...args.indexes.filter((index) => Number.isInteger(index) && index >= 1))
  const sorted = sortedPractices(store.root)
  for (const index of indexes) { const p = sorted[index - 1]; if (!p) throw new Error('找不到练习序号：' + index); add(p) }
  if (!result.length && args.scope === 'all') sorted.forEach(add)
  if (!result.length) add(store.selectedPractice(key))
  if (!result.length) throw new Error('没有可导出的练习，请先选择练习，或传 scope: "all"')
  return result
}
function markdownText(value) { return String(value || '').trim() }
function appendSection(lines, title, value) { const text = markdownText(value); if (text) lines.push('', '### ' + title, '', text) }
export function renderPracticeMarkdown(practice, include = EXPORT_SECTIONS) {
  const sections = new Set(include); const topic = String(practice.topic || '未指定主题').replace(/[\r\n]+/g, ' ').trim() || '未指定主题'; const mode = MODES[practice.mode] || practice.mode; const started = exportTime(practice.createdAt)
  const title = topic + ' - ' + started + ' - ' + mode; const s = summaryFor(practice); const lines = ['# ' + title]
  if (sections.has('metadata')) lines.push('', '- 练习 ID: `' + practice.id + '`', '- 创建时间: ' + started, '- 更新时间: ' + exportTime(practice.updatedAt), '- 模式: ' + mode, '- 题目数: ' + practice.questions.length, '- 已评分: ' + s.answered, '- 平均分: ' + (s.avg === null ? '未评分' : s.avg))
  if (practice.questions.length && ['question', 'answer', 'evaluation', 'explanation', 'memo'].some((section) => sections.has(section))) {
    practice.questions.forEach((q, i) => {
      lines.push('', '## 第 ' + (i + 1) + ' 题')
      if (sections.has('question')) appendSection(lines, '题目', q.question)
      if ((sections.has('answer') || sections.has('evaluation')) && q.attempts.length) {
        q.attempts.forEach((attempt, attemptIndex) => {
          lines.push('', '### 第 ' + (attemptIndex + 1) + ' 次作答')
          if (sections.has('answer') && markdownText(attempt.answer)) lines.push('', '#### 我的回答', '', markdownText(attempt.answer))
          if (sections.has('evaluation') && attempt.score !== null) {
            lines.push('', '#### 评价', '', '- 得分: ' + attempt.score + '/10')
            if (markdownText(attempt.comment)) lines.push('- 点评: ' + markdownText(attempt.comment))
          }
        })
      }
      if (sections.has('explanation')) appendSection(lines, '讲解', q.explain)
      if (sections.has('memo')) appendSection(lines, '直接背', q.memo)
    })
  }
  if (sections.has('summary') && practice.lastSummary) {
    const latest = practice.lastSummary; lines.push('', '## ' + (practice.endedAt ? '最终总结' : '总结'), '', '- 已评分: ' + (latest.answered ?? s.answered), '- 平均分: ' + (latest.avg ?? s.avg ?? '未评分'), '- 结论: ' + (latest.verdict || s.verdict))
  }
  return { title, markdown: lines.join('\n') + '\n' }
}
function exportPath(store, title, outputDir) {
  const dir = outputDir ? resolve(outputDir) : join(dirname(store.filePath), 'exports'); mkdirSync(dir, { recursive: true })
  const base = safeFilePart(title).slice(0, 180); let path = join(dir, base + '.md'); let suffix = 2
  while (existsSync(path)) { path = join(dir, base.slice(0, 170) + ' (' + suffix + ').md'); suffix++ }
  return path
}
export function exportPractices(store, key, args = {}) {
  const include = exportSections(args.include); const targets = exportTargets(store, key, args); const exportedFiles = []
  for (const practice of targets) {
    const rendered = renderPracticeMarkdown(practice, include); const path = exportPath(store, rendered.title, args.output_dir); const tmp = path + '.tmp'
    writeFileSync(tmp, rendered.markdown, 'utf8'); renameSync(tmp, path)
    exportedFiles.push({ practiceId: practice.id, title: rendered.title, path })
  }
  return exportedFiles
}

export class InterviewStore {
  constructor(filePath) {
    this.filePath = filePath || defaultDataPath(); this.root = createRoot()
    this.configuring = new Map(); this.panelHints = new Map(); this.pendingReveals = new Map(); this.lastUserTexts = new Map(); this.lastExports = new Map(); this.load()
  }
  load() {
    try {
      const legacyPath = join(dirname(this.filePath), 'archive.json')
      const sourcePath = !existsSync(this.filePath) && existsSync(legacyPath) ? legacyPath : this.filePath
      const data = JSON.parse(readFileSync(sourcePath, 'utf8'))
      this.root = data && data.version === 3 && Array.isArray(data.practices)
        ? { version: 3, practices: data.practices.map((p) => normalizePractice(p)), selections: data.selections && typeof data.selections === 'object' ? { ...data.selections } : {}, focuses: data.focuses && typeof data.focuses === 'object' ? { ...data.focuses } : {} }
        : data && data.version === 2 && Array.isArray(data.practices) ? migrateV2(data)
        : data && typeof data === 'object' ? migrateLegacy(data) : createRoot()
    } catch { this.root = createRoot() }
    const ids = new Set(this.root.practices.map((p) => p.id)); for (const [key, id] of Object.entries(this.root.selections)) if (!ids.has(id)) delete this.root.selections[key]
    for (const [key, focus] of Object.entries(this.root.focuses)) { const p = focus && this.practiceById(focus.practiceId); if (!p || !p.questions.some((q) => q.id === focus.questionId)) delete this.root.focuses[key] }
  }
  save() {
    try {
      const slash = Math.max(this.filePath.lastIndexOf('/'), this.filePath.lastIndexOf('\\')); mkdirSync(this.filePath.slice(0, slash), { recursive: true })
      const tmp = this.filePath + '.tmp'; writeFileSync(tmp, JSON.stringify(this.root, null, 2), 'utf8'); renameSync(tmp, this.filePath)
    } catch (error) { console.error('dsh-interview: persist failed:', error instanceof Error ? error.message : String(error)) }
  }
  practiceById(id) { return typeof id === 'string' ? this.root.practices.find((p) => p.id === id) || null : null }
  selectedPractice(key = 'global') { return this.practiceById(this.root.selections[key]) }
  stateFor(key = 'global') { return this.selectedPractice(key) }
  selectPractice(key, practice) { if (practice) this.root.selections[key] = practice.id; else delete this.root.selections[key] }
  resolvePractice(key, args = {}, required = true) {
    const explicitId = typeof args.practice_id === 'string' && args.practice_id
    let p = explicitId ? this.practiceById(args.practice_id) : null
    if (explicitId && !p) throw new Error('找不到练习：' + args.practice_id)
    if (!p && Number(args.index) >= 1) {
      p = sortedPractices(this.root)[Number(args.index) - 1] || null
      if (!p) throw new Error('找不到练习序号：' + args.index)
    }
    if (!p) p = this.selectedPractice(key)
    if (!p && required) throw new Error('当前会话未选择练习，请先调用 practice.create 或 session.select_practice')
    if (p) this.selectPractice(key, p); return p
  }
  resolveQuestion(practice, args = {}, required = true, key = 'global') {
    const explicitId = typeof args.question_id === 'string' && args.question_id
    let q = explicitId ? practice.questions.find((x) => x.id === args.question_id) || null : null
    if (explicitId && !q) throw new Error('找不到题目：' + args.question_id)
    if (!q && Number(args.question_index) >= 1) q = practice.questions[Number(args.question_index) - 1] || null
    if (!q && Number(args.question_index) >= 1 && !q) throw new Error('找不到题目序号：' + args.question_index)
    if (!q && typeof args.question === 'string' && args.question.trim()) q = practice.questions.slice().reverse().find((x) => x.question === args.question.trim()) || null
    const focused = this.root.focuses[key]
    if (!q && focused && focused.practiceId === practice.id) q = practice.questions.find((x) => x.id === focused.questionId) || null
    if (!q && required) throw new Error('当前练习还没有题目，请先调用 question.open'); return q
  }
  focusQuestion(key, practice, question, attempt = null) { if (practice && question) this.root.focuses[key] = { practiceId: practice.id, questionId: question.id, attemptId: attempt ? attempt.id : null } }
  focusedQuestion(key, practice) { const focused = this.root.focuses[key]; return focused && practice && focused.practiceId === practice.id ? practice.questions.find((q) => q.id === focused.questionId) || null : null }
  focusedAttempt(key, question) { const focused = this.root.focuses[key]; return focused && question ? question.attempts.find((a) => a.id === focused.attemptId) || null : null }
  resolveAttempt(key, question, args = {}, required = true) {
    const explicitId = typeof args.attempt_id === 'string' && args.attempt_id; let attempt = explicitId ? question.attempts.find((a) => a.id === args.attempt_id) || null : null
    if (explicitId && !attempt) throw new Error('找不到作答：' + args.attempt_id)
    if (!attempt && Number(args.attempt_index) >= 1) attempt = question.attempts[Number(args.attempt_index) - 1] || null
    if (!attempt) attempt = this.focusedAttempt(key, question) || question.attempts[question.attempts.length - 1] || null
    if (!attempt && required) throw new Error('当前题目还没有作答，请先调用 attempt.create'); return attempt
  }
  createPractice(key, args = {}) {
    const now = Date.now(); const p = normalizePractice({ id: mintId('practice'), mode: MODE_ALIASES[String(args.mode)] || 'mock', topic: args.topic || '', resume: args.resume || '', createdAt: now, updatedAt: now, questions: [] }, now)
    this.root.practices.push(p); this.selectPractice(key, p); this.configuring.delete(key); this.panelHints.delete(key); return p
  }
  noteUserMessage(key, text) {
    const value = typeof text === 'string' ? text.trim().slice(0, 600) : ''; if (!value || ['下一题', '看答案', '结束', '继续'].includes(value)) return
    const p = this.selectedPractice(key); if (!p || p.endedAt) return
    const focus = this.root.focuses[key]; if (!focus || focus.practiceId !== p.id) return
    const q = this.focusedQuestion(key, p); if (!q) return
    let attempt = this.focusedAttempt(key, q); if (attempt && attempt.score !== null) return
    this.lastUserTexts.set(key, value)
    const now = Date.now(); if (!attempt) { attempt = normalizeAttempt({ id: mintId('attempt'), answer: value, answeredAt: now }, now); q.attempts.push(attempt) } else { attempt.answer = value; attempt.answeredAt = now }
    syncQuestion(q); this.focusQuestion(key, p, q, attempt); p.updatedAt = now; this.save()
  }
  snapshot(key = 'global', withResume = false) {
    const p = this.selectedPractice(key); const q = p && this.focusedQuestion(key, p); const attempt = q && this.focusedAttempt(key, q); const sum = p ? summaryFor(p) : { answered: 0, avg: null, verdict: '未评分' }
    const practices = sortedPractices(this.root).slice(0, 20).map((x, i) => { const s = summaryFor(x); return { index: i + 1, id: x.id, mode: x.mode, modeLabel: MODES[x.mode] || x.mode, topic: x.topic, questionsCount: x.questions.length, answered: s.answered, avg: s.avg, ended: Boolean(x.endedAt), endedAt: x.endedAt, updatedAt: x.updatedAt, selected: Boolean(p && p.id === x.id) } })
    return { version: 3, selected: Boolean(p), practiceId: p ? p.id : null, questionId: q ? q.id : null, attemptId: attempt ? attempt.id : null, practicesCount: this.root.practices.length, practices,
      mode: p ? p.mode : 'idle', modeLabel: p ? MODES[p.mode] || p.mode : '', topic: p ? p.topic : '', active: Boolean(p), configuring: this.configuring.get(key) === true,
      answered: sum.answered, avg: sum.avg, lastScore: q ? q.score : null, lastComment: q ? q.comment : '', pendingReveal: Boolean(this.pendingReveals.get(key)), panelHint: this.panelHints.get(key) || '',
      currentQuestion: q ? q.question : '', answer: q ? q.userAnswer : '', lastExplain: q ? q.explain : '', lastMemo: q ? q.memo : '', questionsCount: p ? p.questions.length : 0,
      historyCount: this.root.practices.length, topics: topicStats(this.root), hasResume: Boolean(p && p.resume), ended: Boolean(p && p.endedAt), endedAt: p ? p.endedAt : null, lastEndSummary: p ? p.lastSummary : null, lastExportFiles: this.lastExports.get(key) || [], ...(withResume ? { resume: p ? p.resume : '' } : {}) }
  }
  dashboardSnapshot(key = 'global') {
    const selected = this.selectedPractice(key); const practices = sortedPractices(this.root); const questions = practices.flatMap((p) => p.questions); const scored = questions.filter((q) => q.score !== null)
    const avg = scored.length ? Math.round((scored.reduce((sum, q) => sum + q.score, 0) / scored.length) * 10) / 10 : null
    return {
      practicesCount: practices.length, questionsCount: questions.length, answered: scored.length, avg, topicsCount: new Set(practices.map((p) => p.topic).filter(Boolean)).size,
      practices: practices.map((p, i) => { const s = summaryFor(p); return { index: i + 1, id: p.id, mode: p.mode, modeLabel: MODES[p.mode] || p.mode, topic: p.topic || '未指定主题', createdAt: p.createdAt, updatedAt: p.updatedAt, endedAt: p.endedAt, ended: Boolean(p.endedAt), questionsCount: p.questions.length, answered: s.answered, avg: s.avg, verdict: s.verdict, selected: Boolean(selected && selected.id === p.id) } }),
    }
  }
  practiceSnapshot(practiceId) {
    const p = this.practiceById(practiceId); if (!p) return null; const s = summaryFor(p)
    return {
      id: p.id, mode: p.mode, modeLabel: MODES[p.mode] || p.mode, topic: p.topic || '未指定主题', createdAt: p.createdAt, updatedAt: p.updatedAt, endedAt: p.endedAt, ended: Boolean(p.endedAt),
      resume: p.resume, questionsCount: p.questions.length, answered: s.answered, avg: s.avg, verdict: s.verdict, lastSummary: p.lastSummary, lastSummaryAt: p.lastSummaryAt,
      questions: p.questions.map((q, i) => ({ index: i + 1, id: q.id, question: q.question, askedAt: q.askedAt, userAnswer: q.userAnswer, answeredAt: q.answeredAt, score: q.score, comment: q.comment, evaluatedAt: q.evaluatedAt, explain: q.explain, memo: q.memo, explainedAt: q.explainedAt, viewedAt: q.viewedAt, attempts: q.attempts.map((a, j) => ({ index: j + 1, ...a })) })),
    }
  }
}

function fmtTime(value) { const d = new Date(value); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }
export function formatPracticeList(store, key = 'global') {
  const selected = store.selectedPractice(key); const lines = ['📋 练习列表', '─────────────────']; const list = sortedPractices(store.root)
  if (!list.length) lines.push('暂无练习。')
  list.slice(0, 20).forEach((p, i) => { const s = summaryFor(p); lines.push((i + 1) + '. ' + (selected && selected.id === p.id ? '[当前] ' : '') + fmtTime(p.updatedAt) + ' ' + (MODES[p.mode] || p.mode) + (p.topic ? ' · ' + p.topic : '') + ' · ' + p.questions.length + ' 题 · 均分 ' + (s.avg === null ? '—' : s.avg) + (p.endedAt ? ' · 已结束' : '') + ' · ID ' + p.id) })
  const topics = topicStats(store.root); lines.push('主题统计：'); if (!topics.length) lines.push('  暂无'); else topics.forEach((t) => lines.push('  ' + t.topic + '：' + t.answered + ' 题 · 均分 ' + t.avg)); return lines.join('\n')
}
function formatPractice(p, label) {
  const s = summaryFor(p); const lines = [label + '（' + (MODES[p.mode] || p.mode) + (p.topic ? ' · ' + p.topic : '') + ' · ' + p.questions.length + ' 题 · 均分 ' + (s.avg === null ? '—' : s.avg) + '）：', 'ID：' + p.id, '─────────────────']
  if (!p.questions.length) lines.push('还没有出题。')
  p.questions.forEach((q, i) => { lines.push('第 ' + (i + 1) + ' 题 [' + q.id + ']：' + q.question); q.attempts.forEach((attempt, j) => { lines.push('  第 ' + (j + 1) + ' 次回答：' + (attempt.answer || '（空）')); if (attempt.score !== null) lines.push('  第 ' + (j + 1) + ' 次点评：' + attempt.score + ' 分' + (attempt.comment ? ' — ' + attempt.comment : '')) }); const answer = []; if (q.explain) answer.push('讲解：' + q.explain); if (q.memo) answer.push('直接背：' + q.memo); if (answer.length) lines.push('  答案：' + answer.join(' / ')); else if (q.viewedAt) lines.push('  （已请求查看答案）') })
  return lines.join('\n')
}
export function formatCurrentDetail(store, key = 'global') { const p = store.selectedPractice(key); return p ? formatPractice(p, '当前选择的练习') : '当前会话未选择练习，请先查看练习列表并选择。' }
export function formatPracticeDetail(store, index, practiceId) { const p = practiceId ? store.practiceById(practiceId) : sortedPractices(store.root)[Number(index) - 1]; return p ? formatPractice(p, '练习详情') : '找不到指定练习，请先调用 practice.list。' }
export function deletePractice(store, index, practiceId) { const p = practiceId ? store.practiceById(practiceId) : sortedPractices(store.root)[Number(index) - 1]; if (!p) return '找不到指定练习，请先查看练习列表。'; store.root.practices = store.root.practices.filter((x) => x.id !== p.id); for (const [key, id] of Object.entries(store.root.selections)) if (id === p.id) delete store.root.selections[key]; for (const [key, focus] of Object.entries(store.root.focuses)) if (focus && focus.practiceId === p.id) delete store.root.focuses[key]; return '已删除练习（' + (MODES[p.mode] || p.mode) + (p.topic ? ' · ' + p.topic : '') + ' · ' + p.questions.length + ' 题，ID ' + p.id + '），不可恢复。' }

function touch(p) { p.updatedAt = Date.now() }
function reopen(p) { if (p.endedAt) { p.endedAt = null; p.updatedAt = Date.now() } }
function assertOpen(p) { if (p && p.endedAt) throw new Error('练习已结束，请先选择“继续练习”重新打开') }
function summarize(p, finish = false) { const now = Date.now(); const s = summaryFor(p); p.lastSummaryAt = now; p.lastSummary = s; p.updatedAt = now; if (finish) p.endedAt = now; return s }

export function applyControl(store, key, payload) {
  const args = payload && typeof payload === 'object' ? payload : {}; const action = args.action; let p; let q
  if (['reveal', 'retry', 'next', 'end'].includes(action)) {
    p = store.resolvePractice(key, args); if (action === 'retry' || action === 'next') assertOpen(p); q = store.resolveQuestion(p, args, action !== 'end', key)
    if (action === 'reveal') { q.viewedAt = Date.now(); store.pendingReveals.set(key, { practiceId: p.id, questionId: q.id }); touch(p) }
    else if (action === 'retry') { store.focusQuestion(key, p, q); store.lastUserTexts.delete(key); store.pendingReveals.delete(key); store.panelHints.set(key, '用户请求重新作答第 ' + (p.questions.indexOf(q) + 1) + ' 题。请调用 question.open 打开该题，等待用户回答。') }
    else if (action === 'next') { store.pendingReveals.delete(key); store.panelHints.set(key, '用户点击了「下一题」。请调用 session.get，再用 question.open 给当前练习创建下一题。') }
    else if (action === 'end') { const s = summarize(p, true); store.panelHints.set(key, '用户结束了本练习。请根据已保存的题目、回答和评价给出最终总结，并明确说明练习已结束。当前共评分 ' + s.answered + ' 题，均分 ' + (s.avg === null ? '—' : s.avg) + '。') }
  } else throw new Error('不支持的卡片操作：' + action)
  store.save(); return store.snapshot(key, false)
}

export function executeTool(store, key, args) {
  const action = args.action; let p; let q; let attempt; let result = null
  switch (action) {
    case 'practice.create': p = store.createPractice(key, args); result = { practice: store.practiceSnapshot(p.id) }; break
    case 'practice.list': case 'practice.dashboard': result = { dashboard: store.dashboardSnapshot(key) }; break
    case 'practice.get': p = store.resolvePractice(key, args); result = { practice: store.practiceSnapshot(p.id) }; break
    case 'practice.update': p = store.resolvePractice(key, args); if (typeof args.topic === 'string') p.topic = args.topic; if (MODE_ALIASES[String(args.mode)]) p.mode = MODE_ALIASES[String(args.mode)]; if (typeof args.resume === 'string') p.resume = args.resume; touch(p); result = { practice: store.practiceSnapshot(p.id) }; break
    case 'practice.delete': result = { message: deletePractice(store, args.index, args.practice_id) }; break
    case 'practice.finish': p = store.resolvePractice(key, args); summarize(p, true); result = { practice: store.practiceSnapshot(p.id), summary: p.lastSummary }; break
    case 'practice.reopen': p = store.resolvePractice(key, args); reopen(p); store.selectPractice(key, p); result = { practice: store.practiceSnapshot(p.id) }; break
    case 'practice.timeline': p = store.resolvePractice(key, args); result = { practiceId: p.id, questions: store.practiceSnapshot(p.id).questions }; break
    case 'practice.summary': p = store.resolvePractice(key, args); result = { practiceId: p.id, endedAt: p.endedAt, summary: p.lastSummary || summaryFor(p) }; break
    case 'question.open': {
      p = store.resolvePractice(key, args); assertOpen(p)
      const hasExistingTarget = (typeof args.question_id === 'string' && args.question_id) || Number(args.question_index) >= 1
      if (hasExistingTarget) q = store.resolveQuestion(p, args, true, key)
      else { if (typeof args.question !== 'string' || !args.question.trim()) throw new Error('question.open 需要 question，或 question_id/question_index'); const now = Date.now(); q = normalizeQuestion({ id: mintId('question'), question: args.question.trim(), askedAt: now }, now); p.questions.push(q); touch(p) }
      store.focusQuestion(key, p, q); store.lastUserTexts.delete(key); store.pendingReveals.delete(key); result = { question: store.practiceSnapshot(p.id).questions.find((x) => x.id === q.id) }; break
    }
    case 'question.list': p = store.resolvePractice(key, args); result = { practiceId: p.id, questions: store.practiceSnapshot(p.id).questions }; break
    case 'question.get': p = store.resolvePractice(key, args); q = store.resolveQuestion(p, args, true, key); result = { question: store.practiceSnapshot(p.id).questions.find((x) => x.id === q.id) }; break
    case 'question.update': p = store.resolvePractice(key, args); assertOpen(p); q = store.resolveQuestion(p, args, true, key); if (typeof args.question !== 'string' || !args.question.trim()) throw new Error('question.update 需要 question'); q.question = args.question.trim(); touch(p); result = { question: store.practiceSnapshot(p.id).questions.find((x) => x.id === q.id) }; break
    case 'question.delete': p = store.resolvePractice(key, args); assertOpen(p); q = store.resolveQuestion(p, args, true, key); p.questions = p.questions.filter((x) => x.id !== q.id); for (const [focusKey, focus] of Object.entries(store.root.focuses)) if (focus && focus.practiceId === p.id && focus.questionId === q.id) delete store.root.focuses[focusKey]; touch(p); result = { deletedQuestionId: q.id }; break
    case 'attempt.create': {
      p = store.resolvePractice(key, args); assertOpen(p); q = store.resolveQuestion(p, args, true, key); const answer = typeof args.answer === 'string' && args.answer.trim() ? args.answer.trim().slice(0, 600) : typeof args.user_answer === 'string' ? args.user_answer.trim().slice(0, 600) : store.lastUserTexts.get(key) || ''; if (!answer) throw new Error('attempt.create 需要 answer')
      attempt = store.focusedAttempt(key, q); const now = Date.now(); if (attempt && attempt.score === null) { attempt.answer = answer; attempt.answeredAt = now } else { attempt = normalizeAttempt({ id: mintId('attempt'), answer, answeredAt: now }, now); q.attempts.push(attempt) } syncQuestion(q); store.focusQuestion(key, p, q, attempt); touch(p); result = { attempt }; break
    }
    case 'attempt.list': p = store.resolvePractice(key, args); q = store.resolveQuestion(p, args, true, key); result = { questionId: q.id, attempts: q.attempts.map((a, i) => ({ index: i + 1, ...a })) }; break
    case 'attempt.get': p = store.resolvePractice(key, args); q = store.resolveQuestion(p, args, true, key); attempt = store.resolveAttempt(key, q, args); result = { attempt }; break
    case 'attempt.update': p = store.resolvePractice(key, args); assertOpen(p); q = store.resolveQuestion(p, args, true, key); attempt = store.resolveAttempt(key, q, args); if (typeof args.answer !== 'string' || !args.answer.trim()) throw new Error('attempt.update 需要 answer'); attempt.answer = args.answer.trim().slice(0, 600); attempt.answeredAt = Date.now(); syncQuestion(q); store.focusQuestion(key, p, q, attempt); touch(p); result = { attempt }; break
    case 'attempt.delete': p = store.resolvePractice(key, args); assertOpen(p); q = store.resolveQuestion(p, args, true, key); attempt = store.resolveAttempt(key, q, args); q.attempts = q.attempts.filter((a) => a.id !== attempt.id); syncQuestion(q); for (const focus of Object.values(store.root.focuses)) if (focus && focus.practiceId === p.id && focus.questionId === q.id && focus.attemptId === attempt.id) focus.attemptId = null; store.focusQuestion(key, p, q, q.attempts[q.attempts.length - 1] || null); touch(p); result = { deletedAttemptId: attempt.id }; break
    case 'evaluation.create': case 'evaluation.update': p = store.resolvePractice(key, args); assertOpen(p); q = store.resolveQuestion(p, args, true, key); attempt = store.resolveAttempt(key, q, args); { const score = finiteScore(args.score); if (score === null) throw new Error(action + ' 需要 score（0-10）'); attempt.score = score; attempt.comment = typeof args.comment === 'string' ? args.comment : ''; attempt.evaluatedAt = Date.now(); syncQuestion(q); store.focusQuestion(key, p, q, attempt); touch(p); result = { evaluation: { attemptId: attempt.id, score: attempt.score, comment: attempt.comment, evaluatedAt: attempt.evaluatedAt } } } break
    case 'evaluation.get': p = store.resolvePractice(key, args); q = store.resolveQuestion(p, args, true, key); attempt = store.resolveAttempt(key, q, args); result = { evaluation: { attemptId: attempt.id, score: attempt.score, comment: attempt.comment, evaluatedAt: attempt.evaluatedAt } }; break
    case 'evaluation.list': p = store.resolvePractice(key, args); q = store.resolveQuestion(p, args, true, key); result = { questionId: q.id, evaluations: q.attempts.filter((a) => a.score !== null).map((a, i) => ({ index: i + 1, attemptId: a.id, score: a.score, comment: a.comment, evaluatedAt: a.evaluatedAt })) }; break
    case 'explanation.create': case 'explanation.update': p = store.resolvePractice(key, args); assertOpen(p); q = store.resolveQuestion(p, args, true, key); if (typeof args.explain === 'string') q.explain = args.explain; if (typeof args.memo === 'string') q.memo = args.memo; q.explainedAt = Date.now(); store.focusQuestion(key, p, q, store.resolveAttempt(key, q, args, false)); touch(p); store.pendingReveals.delete(key); result = { explanation: { questionId: q.id, explain: q.explain, memo: q.memo, explainedAt: q.explainedAt } }; break
    case 'explanation.get': p = store.resolvePractice(key, args); q = store.resolveQuestion(p, args, true, key); result = { explanation: { questionId: q.id, explain: q.explain, memo: q.memo, explainedAt: q.explainedAt } }; break
    case 'explanation.delete': p = store.resolvePractice(key, args); assertOpen(p); q = store.resolveQuestion(p, args, true, key); q.explain = ''; q.memo = ''; q.explainedAt = null; touch(p); result = { deletedExplanationForQuestionId: q.id }; break
    case 'session.get': result = { session: store.snapshot(key, true) }; break
    case 'session.select_practice': p = store.resolvePractice(key, args); store.selectPractice(key, p); result = { session: store.snapshot(key, true) }; break
    case 'session.focus_question': p = store.resolvePractice(key, args); q = store.resolveQuestion(p, args, true, key); attempt = store.resolveAttempt(key, q, args, false); store.focusQuestion(key, p, q, attempt); result = { session: store.snapshot(key, true) }; break
    case 'session.clear_focus': delete store.root.focuses[key]; result = { session: store.snapshot(key, true) }; break
    case 'export.create': { const exportedFiles = exportPractices(store, key, args); store.lastExports.set(key, exportedFiles); result = { exportedFiles }; break }
    default: throw new Error('不支持的 action：' + action)
  }
  store.save(); const snap = store.snapshot(key, true); const response = { ...snap, ...(result || {}) }
  if (action === 'question.open') { response.practiceId = p.id; response.questionId = q.id }
  return response
}
