import React from 'react'
import { interviewApi } from '../shared/api.js'
import { useInterviewQuery } from '../shared/hooks.js'
import { h, PhaseBadge, ScoreRail } from '../shared/ui.js'

export function TimelinePanel({ sessionId, revisionSignal }) {
  const [open, setOpen] = React.useState(true)
  const sessionQuery = useInterviewQuery(`timeline-session:${sessionId}:${revisionSignal}`, () => interviewApi.session(sessionId), [sessionId, revisionSignal])
  const session = sessionQuery.data?.resource?.data
  const practiceId = session?.practice?.id || null
  const detailQuery = useInterviewQuery(`timeline-practice:${practiceId || 'none'}:${revisionSignal}`, () => practiceId ? interviewApi.practice(practiceId) : Promise.resolve(null), [practiceId, revisionSignal])
  const practice = detailQuery.data?.resource?.data
  if (!session?.selected || !practice?.questions?.length) return null
  if (!open) return h('button', { className: 'di-button', style: { position: 'fixed', right: '16px', top: '112px', zIndex: 40 }, onClick: () => setOpen(true) }, `题目 ${practice.questions.length}`)
  return h('aside', { className: 'di-timeline', 'aria-label': '题目时间轴' },
    h('div', { className: 'di-timeline-head' },
      h('div', null, h('div', { className: 'di-eyebrow' }, 'QUESTION TRACK'), h('strong', null, practice.topic)),
      h('button', { className: 'di-button', onClick: () => setOpen(false), 'aria-label': '收起题目时间轴' }, '收起')),
    h('div', { className: 'di-timeline-body' },
      h(PhaseBadge, { phase: session.phase }),
      practice.questions.map((question) => h('div', { className: `di-time-item${session.questionId === question.id ? ' is-current' : ''}`, key: question.id },
        h('div', { className: 'di-sequence' }, `Q${String(question.sequence).padStart(2, '0')}`),
        h('div', { className: 'di-time-q', title: question.prompt }, question.prompt),
        h('div', { className: 'di-time-meta' }, h(ScoreRail, { score: question.latestScore, compact: true }), h('span', null, `${question.attempts.length} 次作答`)))))
  )
}
