import React from 'react'
import { interviewApi } from '../shared/api.js'
import { useInterviewQuery } from '../shared/hooks.js'
import { h, Markdown } from '../shared/ui.js'
import { leetcodeDifficultyLabel } from '../../domain/leetcode-top-100.js'

const TIMELINE_VIEWS = [
  { id: 'question', label: '题目' },
  { id: 'attempts', label: '作答记录' },
  { id: 'answer', label: '答案' },
]

function EmptyTimelineContent({ children }) {
  return h('div', { className: 'di-time-empty' }, children)
}

function TimelineContent({ question, view }) {
  if (view === 'question') return question.leetcode
    ? h('div', { className: 'di-time-lc-question' },
        h('a', { className: 'di-link', href: question.leetcode.url, target: '_blank', rel: 'noreferrer' }, question.prompt, ' ↗'),
        h('div', { className: 'di-meta' }, `${question.leetcode.category} · ${leetcodeDifficultyLabel(question.leetcode.difficulty)}`))
    : h(Markdown, null, question.prompt)

  if (view === 'attempts') {
    if (!question.attempts.length) return h(EmptyTimelineContent, null, '尚未作答')
    return h('div', { className: 'di-time-records' }, question.attempts.map((attempt) =>
      h('section', { className: 'di-time-record', key: attempt.id },
        h('div', { className: 'di-time-record-label' },
          h('span', null, `第 ${attempt.sequence} 次回答`),
          h('span', null, attempt.evaluation ? `${attempt.evaluation.score}/10` : '待点评')),
        h('div', { className: 'di-time-record-answer' },
          h('div', { className: 'di-time-content-label' }, '回答'),
          h(Markdown, null, attempt.answer)),
        attempt.evaluation ? h('div', { className: 'di-time-record-review' },
          h('div', { className: 'di-time-content-label' }, '点评'),
          h(Markdown, null, attempt.evaluation.feedback)) : null)))
  }

  if (!question.explanation) return h(EmptyTimelineContent, null, '暂无答案')
  return h('div', { className: 'di-time-answer' },
    h(Markdown, null, question.explanation.detail),
    question.explanation.memorizationPoints
      ? h('section', { className: 'di-time-memorize' },
          h('div', { className: 'di-time-record-label' }, question.leetcode ? '解题要点' : '直接背'),
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

  return h('nav', {
    className: 'di-timeline',
    'aria-label': '题目时间轴',
    onKeyDown: (event) => {
      if (event.key === 'Escape') setSelection(null)
    },
  }, practice.questions.map((question) => {
    const views = question.leetcode ? TIMELINE_VIEWS.slice(0, 1) : TIMELINE_VIEWS
    const activeView = selection?.questionId === question.id ? selection.view : null
    const activeLabel = views.find((item) => item.id === activeView)?.label
    return h('div', {
      className: `di-time-item${session.questionId === question.id ? ' is-current' : ''}${activeView ? ' has-view' : ''}`,
      key: question.id,
    },
    h('button', {
      className: 'di-time-node',
      type: 'button',
      'aria-label': `第 ${question.sequence} 题：${question.prompt}`,
      onClick: () => setSelection({ questionId: question.id, view: 'question' }),
    },
    h('span', { className: 'di-time-dot', 'aria-hidden': 'true' }),
    h('span', null, `Q${String(question.sequence).padStart(2, '0')}`)),
    activeView ? h('section', { className: 'di-time-flyout', 'aria-label': `${activeLabel}内容` },
      h('header', { className: 'di-time-flyout-head' },
        h('div', { className: 'di-time-tabs', role: 'tablist', 'aria-label': `第 ${question.sequence} 题详情` },
          views.map((item) => h('button', {
            className: `di-time-tab${activeView === item.id ? ' is-active' : ''}`,
            type: 'button',
            role: 'tab',
            key: item.id,
            'aria-selected': activeView === item.id,
            onClick: () => setSelection({ questionId: question.id, view: item.id }),
          }, item.label))),
        h('button', { type: 'button', onClick: () => setSelection(null), 'aria-label': '关闭' }, '×')),
      h('div', { className: 'di-time-flyout-body', role: 'tabpanel' }, h(TimelineContent, { question, view: activeView }))) : null)
  }))
}
