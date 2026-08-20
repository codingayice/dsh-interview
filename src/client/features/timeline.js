import React from 'react'
import { interviewApi } from '../shared/api.js'
import { useInterviewQuery } from '../shared/hooks.js'
import { h, Markdown } from '../shared/ui.js'

const TIMELINE_VIEWS = [
  { id: 'question', label: '题目' },
  { id: 'attempts', label: '作答记录' },
  { id: 'reviews', label: '点评' },
  { id: 'answer', label: '答案' },
]

function EmptyTimelineContent({ children }) {
  return h('div', { className: 'di-time-empty' }, children)
}

function TimelineContent({ question, view }) {
  if (view === 'question') return h(Markdown, null, question.prompt)

  if (view === 'attempts') {
    if (!question.attempts.length) return h(EmptyTimelineContent, null, '尚未作答')
    return h('div', { className: 'di-time-records' }, question.attempts.map((attempt) =>
      h('section', { className: 'di-time-record', key: attempt.id },
        h('div', { className: 'di-time-record-label' }, `第 ${attempt.sequence} 次回答`),
        h(Markdown, null, attempt.answer))))
  }

  if (view === 'reviews') {
    const reviewed = question.attempts.filter((attempt) => attempt.evaluation)
    if (!reviewed.length) return h(EmptyTimelineContent, null, '暂无点评')
    return h('div', { className: 'di-time-records' }, reviewed.map((attempt) =>
      h('section', { className: 'di-time-record', key: attempt.id },
        h('div', { className: 'di-time-record-label' },
          h('span', null, `第 ${attempt.sequence} 次回答`),
          h('strong', null, `${attempt.evaluation.score}/10`)),
        h(Markdown, null, attempt.evaluation.feedback))))
  }

  if (!question.explanation) return h(EmptyTimelineContent, null, '暂无答案')
  return h('div', { className: 'di-time-answer' },
    h(Markdown, null, question.explanation.detail),
    question.explanation.memorizationPoints
      ? h('section', { className: 'di-time-memorize' },
          h('div', { className: 'di-time-record-label' }, '直接背'),
          h(Markdown, null, question.explanation.memorizationPoints))
      : null)
}

export function TimelinePanel({ sessionId, revisionSignal }) {
  const [selection, setSelection] = React.useState(null)
  const sessionQuery = useInterviewQuery(`timeline-session:${sessionId}:${revisionSignal}`, () => interviewApi.session(sessionId), [sessionId, revisionSignal], { cache: false })
  const session = sessionQuery.data?.resource?.data
  const practiceId = session?.practice?.id || null
  const detailQuery = useInterviewQuery(`timeline-practice:${practiceId || 'none'}:${revisionSignal}`, () => practiceId ? interviewApi.practice(practiceId) : Promise.resolve(null), [practiceId, revisionSignal], { cache: false })
  const practice = detailQuery.data?.resource?.data
  if (!session?.selected || !practice?.questions?.length) return null

  const toggleView = (questionId, view) => {
    setSelection((current) => current?.questionId === questionId && current.view === view
      ? null
      : { questionId, view })
  }

  return h('nav', {
    className: 'di-timeline',
    'aria-label': '题目时间轴',
    onKeyDown: (event) => {
      if (event.key === 'Escape') setSelection(null)
    },
  }, practice.questions.map((question) => {
    const activeView = selection?.questionId === question.id ? selection.view : null
    const activeLabel = TIMELINE_VIEWS.find((item) => item.id === activeView)?.label
    return h('div', {
      className: `di-time-item${session.questionId === question.id ? ' is-current' : ''}${activeView ? ' has-view' : ''}`,
      key: question.id,
    },
    h('button', {
      className: 'di-time-node',
      type: 'button',
      'aria-label': `第 ${question.sequence} 题：${question.prompt}`,
      onClick: () => toggleView(question.id, 'question'),
    },
    h('span', { className: 'di-time-dot', 'aria-hidden': 'true' }),
    h('span', null, `Q${String(question.sequence).padStart(2, '0')}`)),
    h('div', { className: 'di-time-actions', role: 'toolbar', 'aria-label': `第 ${question.sequence} 题操作` },
      TIMELINE_VIEWS.map((item) => h('button', {
        className: `di-time-action${activeView === item.id ? ' is-active' : ''}`,
        type: 'button',
        key: item.id,
        'aria-pressed': activeView === item.id,
        onClick: () => toggleView(question.id, item.id),
      }, item.label))),
    activeView ? h('section', { className: 'di-time-flyout', 'aria-label': `${activeLabel}内容` },
      h('header', { className: 'di-time-flyout-head' },
        h('strong', null, activeLabel),
        h('button', { type: 'button', onClick: () => setSelection(null), 'aria-label': '关闭' }, '×')),
      h('div', { className: 'di-time-flyout-body' }, h(TimelineContent, { question, view: activeView }))) : null)
  }))
}
