import React from 'react'
import { interviewApi } from '../shared/api.js'
import { useCommand, useInterviewQuery } from '../shared/hooks.js'
import { Button, Empty, ErrorNotice, h, Icon, Loading, Markdown, ScoreRail } from '../shared/ui.js'

function PracticeDetail({ practice, sessionId, onDeleted }) {
  const command = useCommand(sessionId)
  const [confirming, setConfirming] = React.useState(false)
  const [downloads, setDownloads] = React.useState([])
  if (!practice) return h(Empty, { title: '选择一条练习', detail: '右侧会展示题目、历次作答和讲解。' })
  const run = (name, payload) => command.run(name, payload).catch(() => null)
  const activate = async () => {
    await run(practice.status === 'completed' ? 'session.reopen' : 'session.select', { practiceId: practice.id })
  }
  const exportOne = async () => {
    const result = await run('library.export', { practiceIds: [practice.id] })
    if (result) setDownloads(result.resource.data || [])
  }
  const remove = async () => {
    const result = await run('library.delete', { practiceId: practice.id })
    if (result) onDeleted()
  }
  const retry = async (questionId) => {
    if (practice.status !== 'active') return
    await run('session.select', { practiceId: practice.id })
    await run('question.retry', { questionId })
  }
  return h('section', { className: 'di-detail' },
    h('div', { className: 'di-eyebrow' }, practice.modeLabel),
    h('h3', { className: 'di-ledger-title', style: { margin: '5px 0 0' } }, practice.topic),
    h('div', { className: 'di-subtitle' }, `${practice.questionCount} 题 · ${practice.evaluatedCount} 次已评价 · 均分 ${practice.averageScore ?? '—'}`),
    h('div', { className: 'di-actions' },
      h(Button, { tone: 'primary', busy: Boolean(command.busy?.startsWith('session.')), onClick: activate }, practice.status === 'completed' ? '重新打开' : '切换到练习'),
      h(Button, { busy: command.busy === 'library.export', onClick: exportOne }, '导出 Markdown'),
      h(Button, { tone: 'danger', onClick: () => setConfirming(true) }, '删除')),
    downloads.length ? h('div', { className: 'di-notice' }, downloads.map((file) =>
      h('a', { className: 'di-link', href: interviewApi.downloadUrl(file.token), key: file.token }, `下载 ${file.name}`))) : null,
    confirming ? h('div', { className: 'di-confirm' },
      h('div', null, '删除后无法恢复这条练习及全部作答。'),
      h('div', { className: 'di-actions' },
        h(Button, { onClick: () => setConfirming(false) }, '取消'),
        h(Button, { tone: 'danger', busy: command.busy === 'library.delete', onClick: remove }, '确认删除'))) : null,
    h(ErrorNotice, null, command.error),
    practice.summary ? h('section', { className: 'di-section' },
      h('div', { className: 'di-section-label' }, '练习总结'),
      h(Markdown, null, practice.summary.overall),
      h('div', { className: 'di-attempt' },
        h('strong', null, '表现亮点'),
        h('ul', null, practice.summary.strengths.map((item) => h('li', { key: item }, item))),
        h('strong', null, '改进建议'),
        h('ul', null, practice.summary.improvements.map((item) => h('li', { key: item }, item))))) : null,
    practice.questions.length ? practice.questions.map((question) => {
      const latest = question.attempts.at(-1)
      return h('article', { className: 'di-detail-question', key: question.id },
        h('div', { className: 'di-detail-question-head' },
          h('span', { className: 'di-sequence' }, `Q${String(question.sequence).padStart(2, '0')}`),
          h('div', { className: 'di-detail-question-text' }, h(Markdown, null, question.prompt)),
          h(ScoreRail, { score: question.latestScore, compact: true })),
        question.attempts.map((attempt) => h('div', { className: 'di-attempt', key: attempt.id },
          h('div', { className: 'di-attempt-head' }, h('span', null, `第 ${attempt.sequence} 次作答`), h('strong', null, attempt.evaluation ? `${attempt.evaluation.score}/10` : '未评价')),
          h(Markdown, null, attempt.answer),
          attempt.evaluation ? h('div', { className: 'di-section' }, h(Markdown, null, attempt.evaluation.feedback)) : null)),
        question.explanation ? h('div', { className: 'di-section' },
          h('div', { className: 'di-section-label' }, '参考讲解'),
          h(Markdown, null, question.explanation.detail)) : null,
        h('div', { className: 'di-detail-actions' },
          practice.status === 'active' && latest?.evaluation
            ? h(Button, { onClick: () => retry(question.id) }, '重新作答')
            : null))
    }) : h(Empty, { title: '这条练习还没有题目' }))
}

export function PracticeLibrary({ sessionId, initialPracticeId = null }) {
  const [queryText, setQueryText] = React.useState('')
  const [mode, setMode] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [selectedId, setSelectedId] = React.useState(initialPracticeId)
  const [confirmingId, setConfirmingId] = React.useState(null)
  const [downloads, setDownloads] = React.useState([])
  const command = useCommand(sessionId)
  const filters = { query: queryText, mode, status }
  const list = useInterviewQuery(`practices:${queryText}:${mode}:${status}`, () => interviewApi.practices(filters), [queryText, mode, status])
  const practices = list.data?.resource?.data || []
  const detail = useInterviewQuery(`practice:${selectedId || 'none'}`, () => selectedId ? interviewApi.practice(selectedId) : Promise.resolve(null), [selectedId])
  const selected = detail.data?.resource?.data || null
  const run = (name, payload) => command.run(name, payload).catch(() => null)
  const activate = async (practice) => {
    await run(practice.status === 'completed' ? 'session.reopen' : 'session.select', { practiceId: practice.id })
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
  const rows = practices.map((practice) => h('tr', { key: practice.id, className: selectedId === practice.id ? 'is-selected' : '' },
    h('td', null, h('button', { className: 'di-history-topic', onClick: () => setSelectedId(selectedId === practice.id ? null : practice.id) }, practice.topic)),
    h('td', null, practice.modeLabel),
    h('td', { className: 'di-history-time' }, dateText(practice.updatedAt)),
    h('td', null, h('strong', { className: `di-history-score ${scoreClass(practice.averageScore)}` }, practice.averageScore ?? '—')),
    h('td', null, h('div', { className: 'di-row-actions' },
      h(Button, { className: 'di-icon-button', title: '切换到该练习', 'aria-label': `切换到${practice.topic}`, onClick: () => activate(practice) }, h(Icon, { name: 'swap' })),
      h(Button, { className: 'di-icon-button is-delete', title: '删除', 'aria-label': `删除${practice.topic}`, onClick: () => setConfirmingId(practice.id) }, h(Icon, { name: 'trash' })),
      h(Button, { className: 'di-icon-button', title: '导出', 'aria-label': `导出${practice.topic}`, onClick: () => exportOne(practice) }, h(Icon, { name: 'download' }))))))

  return h('section', { className: 'di-ledger di-history', 'aria-label': '练习历史' },
    h('header', { className: 'di-history-head' },
      h('div', null, h('div', { className: 'di-ledger-title' }, '练习历史'), h('div', { className: 'di-subtitle' }, `共 ${practices.length} 条练习记录`)),
      h('div', { className: 'di-history-legend', 'aria-hidden': 'true' },
        h('span', null, h(Icon, { name: 'swap' }), '切换到该练习'),
        h('span', null, h(Icon, { name: 'trash' }), '删除'),
        h('span', null, h(Icon, { name: 'download' }), '导出'))),
    h('div', { className: 'di-history-filters' },
      h('input', { className: 'di-input', value: queryText, onChange: (event) => setQueryText(event.target.value), placeholder: '搜索练习主题', 'aria-label': '搜索练习主题' }),
      h('select', { className: 'di-select', value: mode, onChange: (event) => setMode(event.target.value), 'aria-label': '筛选模式' },
        h('option', { value: '' }, '全部模式'), h('option', { value: 'bagu' }, '背八股'), h('option', { value: 'mock' }, '模拟面试'), h('option', { value: 'scenario' }, '场景题')),
      h('select', { className: 'di-select', value: status, onChange: (event) => setStatus(event.target.value), 'aria-label': '筛选状态' },
        h('option', { value: '' }, '全部状态'), h('option', { value: 'active' }, '进行中'), h('option', { value: 'completed' }, '已结束'))),
    h(ErrorNotice, null, list.error),
    downloads.length ? h('div', { className: 'di-notice' }, downloads.map((file) =>
      h('a', { className: 'di-link', href: interviewApi.downloadUrl(file.token), key: file.token }, `下载 ${file.name}`))) : null,
    confirmingId ? h('div', { className: 'di-delete-confirm' },
      h('span', null, `确认删除“${practices.find((item) => item.id === confirmingId)?.topic || '该练习'}”及全部作答？`),
      h('div', { className: 'di-actions' },
        h(Button, { onClick: () => setConfirmingId(null) }, '取消'),
        h(Button, { tone: 'danger', busy: command.busy === 'library.delete', onClick: () => remove(practices.find((item) => item.id === confirmingId)) }, '确认删除'))) : null,
    list.loading && !list.data ? h(Loading) : practices.length
      ? h('div', { className: 'di-history-scroll' },
          h('table', { className: 'di-history-table' },
            h('thead', null, h('tr', null,
              h('th', null, '练习内容'), h('th', null, '类型'), h('th', null, '练习时间'), h('th', null, '得分'), h('th', { 'aria-label': '操作' }))),
            h('tbody', null, rows)))
      : h(Empty, { title: '还没有符合条件的练习', detail: '开始一次面试后，记录会自动出现在这里。' }),
    selectedId ? h('div', { className: 'di-history-detail' },
      detail.loading ? h(Loading, { label: '正在读取练习详情…' })
        : h(PracticeDetail, { practice: selected, sessionId, onDeleted: () => { setSelectedId(null); interviewApi.invalidate() } })) : null)
}

export function InsightsCard() {
  const query = useInterviewQuery('insights', () => interviewApi.insights(), [])
  if (query.loading && !query.data) return h('div', { className: 'di-card' }, h(Loading))
  if (query.error) return h('div', { className: 'di-card' }, h(ErrorNotice, null, query.error))
  const insight = query.data?.resource?.data
  return h('article', { className: 'di-card' },
    h('header', { className: 'di-card-head' }, h('div', null, h('div', { className: 'di-eyebrow' }, 'CAPABILITY REVIEW'), h('div', { className: 'di-title' }, '能力复盘'))),
    h('div', { className: 'di-card-body' },
      h('div', { className: 'di-score-row' }, h('span', { className: 'di-score-number' }, insight.averageScore ?? '—'), h(ScoreRail, { score: insight.averageScore })),
      h('div', { className: 'di-subtitle', style: { marginTop: '8px' } }, `${insight.practiceCount} 次练习 · ${insight.questionCount} 道题 · ${insight.evaluatedCount} 次评价`),
      insight.topics.length ? h('div', { className: 'di-section' }, insight.topics.map((topic) =>
        h('div', { className: 'di-attempt-head', key: topic.topic }, h('span', null, `${topic.topic} · ${topic.evaluatedCount} 题`), h('span', { className: 'di-score-row' }, h('strong', null, topic.averageScore), h(ScoreRail, { score: topic.averageScore, compact: true }))))
      ) : h(Empty, { title: '完成评价后生成能力复盘' })))
}
