import React from 'react'
import { interviewApi } from '../shared/api.js'
import { useCommand, useInterviewQuery } from '../shared/hooks.js'
import { Button, Empty, ErrorNotice, h, Icon, Loading, Markdown, ScoreRail, Select } from '../shared/ui.js'
import { leetcodeDifficultyLabel } from '../../domain/leetcode-top-100.js'
import { LEETCODE_LANGUAGES, leetcodeLanguageLabel } from '../../domain/leetcode-languages.js'

const MODE_OPTIONS = [
  { value: 'bagu', label: '背八股' },
  { value: 'mock', label: '模拟面试' },
  { value: 'scenario', label: '场景题' },
  { value: 'leetcode', label: '刷力扣' },
]
const CODING_OPTIONS = [{ value: 'true', label: '是' }, { value: 'false', label: '否' }]
const DIFFICULTY_OPTIONS = [
  { value: 'junior', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'senior', label: '高级' },
]

function PracticeForm({ initial = null, busy = false, onSubmit, onCancel }) {
  const [mode, setMode] = React.useState(initial?.mode || '')
  const [topic, setTopic] = React.useState(initial?.config?.topic || '')
  const [resume, setResume] = React.useState(initial?.config?.resume || '')
  const [interviewerStyle, setInterviewerStyle] = React.useState(initial?.config?.interviewerStyle || '')
  const [coding, setCoding] = React.useState(typeof initial?.config?.coding === 'boolean' ? String(initial.config.coding) : '')
  const [difficulty, setDifficulty] = React.useState(initial?.config?.difficulty || '')
  const [language, setLanguage] = React.useState(initial?.config?.language || '')
  const topicMode = mode === 'bagu' || mode === 'scenario'
  const valid = topicMode
    ? Boolean(topic.trim())
    : mode === 'leetcode' ? Boolean(language) : mode === 'mock' && Boolean(resume.trim() && interviewerStyle.trim() && coding && difficulty)
  const submit = () => {
    if (!valid) return
    onSubmit(mode === 'mock'
      ? { mode, config: { resume: resume.trim(), interviewerStyle: interviewerStyle.trim(), coding: coding === 'true', difficulty } }
      : mode === 'leetcode' ? { mode, config: { language } } : { mode, config: { topic: topic.trim() } })
  }
  return h('div', { className: 'di-practice-form' },
    h('label', { className: 'di-field' }, h('span', null, '模式'),
      h(Select, { value: mode, options: MODE_OPTIONS, onChange: setMode, 'aria-label': '选择练习模式' })),
    topicMode ? h('label', { className: 'di-field' }, h('span', null, '主题'),
      h('input', { className: 'di-input', value: topic, onChange: (event) => setTopic(event.target.value) })) : null,
    mode === 'leetcode' ? h('label', { className: 'di-field' }, h('span', null, '编程语言'),
      h(Select, { value: language, options: LEETCODE_LANGUAGES.map((item) => ({ value: item.id, label: item.label })), onChange: setLanguage, 'aria-label': '选择编程语言' })) : null,
    mode === 'mock' ? h(React.Fragment, null,
      h('label', { className: 'di-field di-field-wide' }, h('span', null, '简历'),
        h('textarea', { className: 'di-input di-textarea', value: resume, onChange: (event) => setResume(event.target.value) })),
      h('label', { className: 'di-field' }, h('span', null, '面试官风格'),
        h('input', { className: 'di-input', value: interviewerStyle, onChange: (event) => setInterviewerStyle(event.target.value) })),
      h('label', { className: 'di-field' }, h('span', null, '是否手撕代码'),
        h(Select, { value: coding, options: CODING_OPTIONS, onChange: setCoding, 'aria-label': '选择是否手撕代码' })),
      h('label', { className: 'di-field' }, h('span', null, '面试难度'),
        h(Select, { value: difficulty, options: DIFFICULTY_OPTIONS, onChange: setDifficulty, 'aria-label': '选择面试难度' }))) : null,
    h('div', { className: 'di-actions di-field-wide' },
      h(Button, { onClick: onCancel }, '取消'),
      h(Button, { tone: 'primary', disabled: !valid, busy, onClick: submit }, initial ? '保存配置' : '开始练习')))
}

function PracticeDetail({ practice, sessionId, onDeleted }) {
  const command = useCommand(sessionId)
  const [confirming, setConfirming] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [editingQuestionId, setEditingQuestionId] = React.useState(null)
  const [questionDraft, setQuestionDraft] = React.useState('')
  const [deletingQuestionId, setDeletingQuestionId] = React.useState(null)
  const [downloads, setDownloads] = React.useState([])
  if (!practice) return h(Empty, { title: '选择一条练习', detail: '右侧会展示题目、历次作答和讲解。' })
  const run = (name, payload) => command.run(name, payload).catch(() => null)
  const activate = async () => {
    const result = await run(practice.status === 'completed' ? 'session.reopen' : 'session.select', { practiceId: practice.id })
    if (result) interviewApi.navigateWorkspace('active')
  }
  const exportOne = async () => {
    const result = await run('library.export', { practiceIds: [practice.id] })
    if (result) setDownloads(result.resource.data || [])
  }
  const remove = async () => {
    const result = await run('library.delete', { practiceId: practice.id })
    if (result) onDeleted()
  }
  const updateConfiguration = async (payload) => {
    const result = await run('practice.update', { practiceId: practice.id, ...payload })
    if (result) setEditing(false)
  }
  const updateQuestion = async (questionId) => {
    const result = await run('question.update', { practiceId: practice.id, questionId, prompt: questionDraft })
    if (result) { setEditingQuestionId(null); setQuestionDraft('') }
  }
  const deleteQuestion = async (questionId) => {
    const result = await run('question.delete', { practiceId: practice.id, questionId })
    if (result) setDeletingQuestionId(null)
  }
  const retry = async (questionId) => {
    if (practice.status !== 'active') return
    await run('session.select', { practiceId: practice.id })
    await run('question.retry', { questionId })
  }
  return h('section', { className: 'di-detail' },
    h('div', { className: 'di-detail-heading' },
      h('h3', { className: 'di-ledger-title' }, practice.topic),
      h('span', { className: 'di-meta' }, practice.mode === 'leetcode'
        ? `${practice.modeLabel} · ${leetcodeLanguageLabel(practice.config.language)}`
        : `${practice.modeLabel} · ${practice.questionCount} 题 · ${practice.evaluatedCount} 次已评价 · 均分 ${practice.averageScore ?? '—'}`)),
    h('div', { className: 'di-actions' },
      h(Button, { tone: 'primary', busy: Boolean(command.busy?.startsWith('session.')), onClick: activate }, practice.status === 'completed' ? '重新打开' : '切换到练习'),
      h(Button, { onClick: () => setEditing((value) => !value) }, '编辑配置'),
      h(Button, { busy: command.busy === 'library.export', onClick: exportOne }, '导出 Markdown'),
      h(Button, { tone: 'danger', onClick: () => setConfirming(true) }, '删除')),
    downloads.length ? h('div', { className: 'di-notice' }, downloads.map((file) =>
      h('a', { className: 'di-link', href: interviewApi.downloadUrl(file.token), key: file.token }, `下载 ${file.name}`))) : null,
    confirming ? h('div', { className: 'di-modal-backdrop' },
      h('div', { className: 'di-confirm-modal', role: 'alertdialog', 'aria-label': '确认删除练习' },
        h('div', { className: 'di-confirm-copy' },
          h('span', { className: 'di-confirm-icon', 'aria-hidden': 'true' }, h(Icon, { name: 'alert', size: 17 })),
          h('div', null, h('h4', null, '确认删除该练习？'), h('p', null, '确认删除该练习及全部作答记录吗？此操作无法撤销。'))),
        h('div', { className: 'di-actions' },
          h(Button, { onClick: () => setConfirming(false) }, '取消'),
          h(Button, { tone: 'danger', busy: command.busy === 'library.delete', onClick: remove }, '确认删除')))) : null,
    editing ? h(PracticeForm, { initial: practice, busy: command.busy === 'practice.update', onSubmit: updateConfiguration, onCancel: () => setEditing(false) }) : null,
    h(ErrorNotice, null, command.error),
    practice.summary?.kind === 'leetcode' ? h('section', { className: 'di-section' },
      h('div', { className: 'di-section-label' }, '刷题汇总'),
      h('div', { className: 'di-meta' }, `本次共记录 ${practice.summary.questionCount} 道题，详细题目见下方。`))
      : practice.summary ? h('section', { className: 'di-section' },
      h('div', { className: 'di-section-label' }, '练习总结'),
      h(Markdown, null, practice.summary.overall),
      h('div', { className: 'di-attempt' },
        h('div', null, '表现亮点'),
        h('ul', null, practice.summary.strengths.map((item) => h('li', { key: item }, item))),
        h('div', null, '改进建议'),
        h('ul', null, practice.summary.improvements.map((item) => h('li', { key: item }, item))))) : null,
    practice.questions.length ? practice.questions.map((question) => {
      const latest = question.attempts.at(-1)
      return h('article', { className: 'di-detail-question', key: question.id },
        h('div', { className: 'di-detail-question-head' },
          h('span', { className: 'di-sequence' }, `Q${String(question.sequence).padStart(2, '0')}`),
          h('div', { className: 'di-detail-question-text' }, editingQuestionId === question.id
            ? h('input', { className: 'di-input', value: questionDraft, onChange: (event) => setQuestionDraft(event.target.value) })
            : h(Markdown, null, question.prompt)),
          question.leetcode
            ? h('a', { className: 'di-link', href: question.leetcode.url, target: '_blank', rel: 'noreferrer' }, `${question.leetcode.category} · ${leetcodeDifficultyLabel(question.leetcode.difficulty)}`)
            : h(ScoreRail, { score: question.latestScore, compact: true })),
        question.attempts.map((attempt) => h('div', { className: 'di-attempt', key: attempt.id },
          h('div', { className: 'di-attempt-head' }, h('span', null, `第 ${attempt.sequence} 次作答`), h('span', null, attempt.evaluation ? `${attempt.evaluation.score}/10` : '未评价')),
          h(Markdown, null, attempt.answer),
          attempt.evaluation ? h('div', { className: 'di-section' }, h(Markdown, null, attempt.evaluation.feedback)) : null)),
        question.explanation ? h('div', { className: 'di-section' },
          h('div', { className: 'di-section-label' }, question.leetcode ? '算法讲解' : '参考讲解'),
          h(Markdown, null, question.explanation.detail),
          question.explanation.memorizationPoints
            ? h('div', { className: 'di-attempt' },
                h('div', { className: 'di-section-label' }, question.leetcode ? '解题要点' : '直接背'),
                h(Markdown, null, question.explanation.memorizationPoints))
            : null) : null,
        h('div', { className: 'di-detail-actions' },
          !question.leetcode && editingQuestionId === question.id
            ? h(React.Fragment, null,
                h(Button, { tone: 'primary', disabled: !questionDraft.trim(), busy: command.busy === 'question.update', onClick: () => updateQuestion(question.id) }, '保存题目'),
                h(Button, { onClick: () => { setEditingQuestionId(null); setQuestionDraft('') } }, '取消'))
            : !question.leetcode ? h(Button, { onClick: () => { setEditingQuestionId(question.id); setQuestionDraft(question.prompt) } }, '编辑题目') : null,
          !question.leetcode && practice.status === 'active' && latest?.evaluation
            ? h(Button, { onClick: () => retry(question.id) }, '重新作答')
            : null,
          h(Button, { tone: 'danger', onClick: () => setDeletingQuestionId(question.id) }, '删除题目')),
        deletingQuestionId === question.id ? h('div', { className: 'di-confirm' },
          h('div', null, '确认删除该题及其全部作答、评价和讲解？'),
          h('div', { className: 'di-actions' },
            h(Button, { onClick: () => setDeletingQuestionId(null) }, '取消'),
            h(Button, { tone: 'danger', busy: command.busy === 'question.delete', onClick: () => deleteQuestion(question.id) }, '确认删除'))) : null)
    }) : h(Empty, { title: '这条练习还没有题目' }))
}

export function PracticeLibrary({
  sessionId,
  initialPracticeId = null,
  statusScope = 'completed',
  title = '练习档案',
  allowCreate = false,
}) {
  const [queryText, setQueryText] = React.useState('')
  const [mode, setMode] = React.useState('')
  const [selectedId, setSelectedId] = React.useState(initialPracticeId)
  const [confirmingId, setConfirmingId] = React.useState(null)
  const [downloads, setDownloads] = React.useState([])
  const [creating, setCreating] = React.useState(false)
  const command = useCommand(sessionId)
  const effectiveStatus = statusScope === 'active' ? 'active' : 'completed'
  const normalizedQuery = queryText.trim()
  const modeFilter = MODE_OPTIONS.some((option) => option.value === mode) ? mode : undefined
  const filters = { query: normalizedQuery || undefined, mode: modeFilter, status: effectiveStatus }
  const list = useInterviewQuery(`practices:${normalizedQuery}:${modeFilter || 'all'}:${effectiveStatus}`, () => interviewApi.practices(filters), [normalizedQuery, modeFilter, effectiveStatus])
  const practices = list.data?.resource?.data || []
  const visibleSelectedId = practices.some((practice) => practice.id === selectedId) ? selectedId : null
  const detail = useInterviewQuery(`practice:${visibleSelectedId || 'none'}`, () => visibleSelectedId ? interviewApi.practice(visibleSelectedId) : Promise.resolve(null), [visibleSelectedId])
  const selected = detail.data?.resource?.data || null
  const run = (name, payload) => command.run(name, payload).catch(() => null)
  const createPractice = async (payload) => {
    const result = await run('session.start', payload)
    if (!result) return
    setCreating(false)
    setSelectedId(result.presentation?.practiceId || result.resource?.data?.practice?.id || null)
    interviewApi.navigateWorkspace('active')
  }
  const activate = async (practice) => {
    const result = await run(practice.status === 'completed' ? 'session.reopen' : 'session.select', { practiceId: practice.id })
    if (result) interviewApi.navigateWorkspace('active')
  }
  const exportOne = async (practice) => {
    const result = await run('library.export', { practiceIds: [practice.id] })
    if (result) setDownloads(result.resource.data || [])
  }
  const remove = async (practice) => {
    if (!practice) return
    const result = await run('library.delete', { practiceId: practice.id })
    if (!result) return
    if (selectedId === practice.id) setSelectedId(null)
    setConfirmingId(null)
    interviewApi.invalidate()
  }
  const dateText = (value) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).replaceAll('/', '-')
  }
  const scoreClass = (score) => Number(score) >= 8 ? 'is-good' : Number(score) >= 6 ? 'is-mid' : 'is-empty'
  const emptyState = effectiveStatus === 'active'
    ? { title: '没有进行中的练习', detail: '新建练习后会显示在这里。' }
    : { title: '练习档案为空', detail: '结束练习后会归档到这里。' }
  const rows = practices.map((practice) => h('tr', { key: practice.id, className: visibleSelectedId === practice.id ? 'is-selected' : '' },
    h('td', null, h('button', { className: 'di-history-topic', onClick: () => setSelectedId(visibleSelectedId === practice.id ? null : practice.id) }, practice.topic)),
    h('td', null, h('span', { className: `di-mode-badge is-${practice.mode}` }, practice.modeLabel)),
    h('td', { className: 'di-history-time' }, dateText(practice.updatedAt)),
    h('td', null, h('span', { className: `di-history-score ${scoreClass(practice.averageScore)}` }, practice.averageScore ?? '—')),
    h('td', null, h('div', { className: 'di-row-actions' },
      h(Button, {
        className: 'di-icon-button',
        title: practice.status === 'completed' ? '重新打开' : '切换到该练习',
        'aria-label': practice.status === 'completed' ? `重新打开${practice.topic}` : `切换到${practice.topic}`,
        onClick: () => activate(practice),
      }, h(Icon, { name: 'swap' })),
      h(Button, { className: 'di-icon-button is-delete', title: '删除', 'aria-label': `删除${practice.topic}`, onClick: () => setConfirmingId(practice.id) }, h(Icon, { name: 'trash' })),
      h(Button, { className: 'di-icon-button', title: '导出', 'aria-label': `导出${practice.topic}`, onClick: () => exportOne(practice) }, h(Icon, { name: 'download' }))))))

  return h('section', { className: 'di-ledger di-history', 'aria-label': title },
    h('header', { className: 'di-history-head' },
      h('h2', { className: 'di-ledger-title' }, title),
      allowCreate ? h(Button, { tone: 'primary', onClick: () => setCreating((value) => !value) }, h(Icon, { name: 'plus', size: 15 }), '新建练习') : null),
    allowCreate && creating ? h(PracticeForm, { busy: command.busy === 'session.start', onSubmit: createPractice, onCancel: () => setCreating(false) }) : null,
    h('div', { className: 'di-history-filters' },
      h('input', { className: 'di-input', value: queryText, onChange: (event) => setQueryText(event.target.value), placeholder: '搜索练习主题', 'aria-label': '搜索练习主题' }),
      h(Select, { className: 'di-history-mode-select', value: mode, options: [{ value: '', label: '全部模式' }, ...MODE_OPTIONS], onChange: setMode, 'aria-label': '筛选模式' })),
    h(ErrorNotice, null, list.error),
    downloads.length ? h('div', { className: 'di-notice' }, downloads.map((file) =>
      h('a', { className: 'di-link', href: interviewApi.downloadUrl(file.token), key: file.token }, `下载 ${file.name}`))) : null,
    confirmingId ? h('div', { className: 'di-modal-backdrop' },
      h('div', { className: 'di-confirm-modal', role: 'alertdialog', 'aria-label': '确认删除练习' },
        h('div', { className: 'di-confirm-copy' },
          h('span', { className: 'di-confirm-icon', 'aria-hidden': 'true' }, h(Icon, { name: 'alert', size: 17 })),
          h('div', null,
            h('h4', null, '确认删除该练习？'),
            h('p', null, `确认删除“${practices.find((item) => item.id === confirmingId)?.topic || '该练习'}”及全部作答记录吗？此操作无法撤销。`))),
        h('div', { className: 'di-actions' },
          h(Button, { onClick: () => setConfirmingId(null) }, '取消'),
          h(Button, { tone: 'danger', busy: command.busy === 'library.delete', onClick: () => remove(practices.find((item) => item.id === confirmingId)) }, '确认删除')))) : null,
    list.loading && !list.data ? h(Loading) : practices.length
      ? h('div', { className: 'di-history-scroll' },
          h('table', { className: 'di-history-table' },
            h('thead', null, h('tr', null,
              h('th', null, '练习内容'), h('th', null, '类型'), h('th', null, '练习时间'), h('th', null, '得分'), h('th', { 'aria-label': '操作' }))),
            h('tbody', null, rows)))
      : h('div', { className: 'di-history-empty' },
          h('span', { className: 'di-history-empty-icon', 'aria-hidden': 'true' }, h(Icon, { name: 'archive', size: 24 })),
          h('div', { className: 'di-history-empty-title' }, emptyState.title),
          h('span', null, emptyState.detail)),
    visibleSelectedId ? h('div', { className: 'di-history-detail' },
      detail.loading ? h(Loading, { label: '正在读取练习详情…' })
        : h(PracticeDetail, { practice: selected, sessionId, onDeleted: () => { setSelectedId(null); interviewApi.invalidate() } })) : null)
}

export function InsightsCard() {
  const query = useInterviewQuery('insights', () => interviewApi.insights(), [])
  if (query.loading && !query.data) return h('div', { className: 'di-card' }, h(Loading))
  if (query.error) return h('div', { className: 'di-card' }, h(ErrorNotice, null, query.error))
  const insight = query.data?.resource?.data
  return h('article', { className: 'di-card' },
    h('header', { className: 'di-card-head' }, h('div', { className: 'di-title' }, '能力复盘')),
    h('div', { className: 'di-card-body' },
      h('div', { className: 'di-score-row' }, h('span', { className: 'di-score-number' }, insight.averageScore ?? '—'), h(ScoreRail, { score: insight.averageScore })),
      h('div', { className: 'di-meta', style: { marginTop: '8px' } }, `${insight.practiceCount} 次练习 · ${insight.questionCount} 道题 · ${insight.evaluatedCount} 次评价`),
      insight.topics.length ? h('div', { className: 'di-section' }, insight.topics.map((topic) =>
        h('div', { className: 'di-attempt-head', key: topic.topic }, h('span', null, `${topic.topic} · ${topic.evaluatedCount} 题`), h('span', { className: 'di-score-row' }, h('span', null, topic.averageScore), h(ScoreRail, { score: topic.averageScore, compact: true }))))
      ) : h(Empty, { title: '完成评价后生成能力复盘' })))
}
