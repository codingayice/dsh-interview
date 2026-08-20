import React from 'react'
import { interviewApi } from '../shared/api.js'
import { useCommand, useInterviewQuery } from '../shared/hooks.js'
import { Button, Empty, ErrorNotice, h, Loading, Markdown, PhaseBadge, ScoreRail } from '../shared/ui.js'

function Evaluation({ attempt }) {
  if (!attempt?.evaluation) return null
  const evaluation = attempt.evaluation
  return h('div', { className: 'di-section' },
    h('div', { className: 'di-section-label' }, '本次评价'),
    h('div', { className: 'di-score-row' },
      h('span', { className: 'di-score-number' }, evaluation.score),
      h(ScoreRail, { score: evaluation.score })),
    h('div', { style: { marginTop: '12px' } }, h(Markdown, null, evaluation.feedback)),
    Object.keys(evaluation.dimensions || {}).length
      ? h('div', { className: 'di-attempt' }, Object.entries(evaluation.dimensions).map(([name, score]) =>
          h('div', { className: 'di-attempt-head', key: name }, h('span', null, name), h('strong', null, `${score}/10`))))
      : null)
}

function Explanation({ explanation }) {
  if (!explanation) return null
  return h('div', { className: 'di-section' },
    h('div', { className: 'di-section-label' }, '参考讲解'),
    h(Markdown, null, explanation.detail),
    explanation.memorizationPoints
      ? h('div', { className: 'di-attempt' },
          h('div', { className: 'di-section-label' }, '直接背'),
          h(Markdown, null, explanation.memorizationPoints))
      : null)
}

export function LiveInterviewCard({ sessionId }) {
  const query = useInterviewQuery(`session:${sessionId}`, () => interviewApi.session(sessionId), [sessionId], { cache: false })
  const command = useCommand(sessionId)
  if (query.loading && !query.data) return h('div', { className: 'di-card' }, h(Loading))
  if (query.error) return h('div', { className: 'di-card' }, h(ErrorNotice, null, query.error))
  const session = query.data?.resource?.data
  if (!session?.selected) return h('div', { className: 'di-card' }, h(Empty, { title: '还没有开始练习', detail: '用自然语言描述面试模式和主题即可开始。' }))

  const question = session.currentQuestion
  const latestAttempt = question?.attempts?.at(-1) || null
  const run = (name, payload) => command.run(name, payload).catch(() => {})

  return h('article', { className: 'di-card', 'aria-label': '当前面试题' },
    h('header', { className: 'di-card-head' },
      h('div', null,
        h('div', { className: 'di-eyebrow' }, `${session.practice.modeLabel} · Q${String(question?.sequence || 0).padStart(2, '0')}`),
        h('div', { className: 'di-title' }, session.practice.topic),
        h('div', { className: 'di-subtitle' }, `${session.practice.questionCount} 题 · ${session.practice.evaluatedCount} 次已评价`)),
      h(PhaseBadge, { phase: session.phase })),
    h('div', { className: 'di-card-body' },
      question
        ? h(React.Fragment, null,
            h('div', { className: 'di-question-text' }, h(Markdown, null, question.prompt)),
            latestAttempt ? h('div', { className: 'di-attempt' },
              h('div', { className: 'di-attempt-head' }, h('span', null, `第 ${latestAttempt.sequence} 次作答`), h('span', null, latestAttempt.evaluation ? `${latestAttempt.evaluation.score}/10` : '等待评价')),
              h(Markdown, null, latestAttempt.answer)) : null,
            h(Evaluation, { attempt: latestAttempt }),
            h(Explanation, { explanation: question.explanation }))
        : h(Empty, { title: '面试官正在准备下一题', detail: '题目生成后会自动出现在这里。' }),
      h(ErrorNotice, null, command.error),
      h('div', { className: 'di-actions' },
        session.phase === 'ready_for_explanation'
          ? h(Button, { tone: 'primary', busy: command.busy === 'question.request_explanation', onClick: () => run('question.request_explanation') }, '查看讲解')
          : null,
        session.phase === 'awaiting_next' || session.phase === 'ready_for_explanation'
          ? h(Button, { tone: session.phase === 'awaiting_next' ? 'primary' : 'quiet', busy: command.busy === 'question.next', onClick: () => run('question.next') }, '下一题')
          : null,
        question && ['ready_for_explanation', 'awaiting_next'].includes(session.phase)
          ? h(Button, { busy: command.busy === 'question.retry', onClick: () => run('question.retry', { questionId: question.id }) }, '重新作答')
          : null,
        session.phase !== 'completed'
          ? h(Button, { busy: command.busy === 'session.finish', onClick: () => run('session.finish') }, '结束练习')
          : null))
  )
}

export function CompactResultCard({ title, detail, tone = 'quiet' }) {
  return h('div', { className: 'di-card' },
    h('div', { className: 'di-card-head' },
      h('div', null, h('div', { className: 'di-eyebrow' }, 'INTERVIEW WORKSPACE'), h('div', { className: 'di-title' }, title)),
      h(PhaseBadge, { phase: tone === 'completed' ? 'completed' : 'awaiting_next' })),
    detail ? h('div', { className: 'di-card-body' }, detail) : null)
}

export function QuestionResultCard({ question }) {
  if (!question) return null
  return h('article', { className: 'di-card', 'aria-label': '面试题' },
    h('header', { className: 'di-card-head' },
      h('div', null,
        h('div', { className: 'di-eyebrow' }, `INTERVIEW QUESTION · Q${String(question.sequence || 0).padStart(2, '0')}`),
        h('div', { className: 'di-title' }, '请回答这道题')),
      h(PhaseBadge, { phase: 'awaiting_answer' })),
    h('div', { className: 'di-card-body' },
      h('div', { className: 'di-question-text' }, h(Markdown, null, question.prompt))))
}

export function EvaluationResultCard({ evaluation }) {
  if (!evaluation) return null
  return h('article', { className: 'di-card', 'aria-label': '回答评价' },
    h('header', { className: 'di-card-head' },
      h('div', null, h('div', { className: 'di-eyebrow' }, 'ANSWER REVIEW'), h('div', { className: 'di-title' }, '本题评价')),
      h(PhaseBadge, { phase: 'ready_for_explanation' })),
    h('div', { className: 'di-card-body' },
      h('div', { className: 'di-score-row' }, h('span', { className: 'di-score-number' }, evaluation.score), h(ScoreRail, { score: evaluation.score })),
      evaluation.feedback ? h('div', { className: 'di-section' }, h(Markdown, null, evaluation.feedback)) : null,
      Object.keys(evaluation.dimensions || {}).length
        ? h('div', { className: 'di-attempt' }, Object.entries(evaluation.dimensions).map(([name, score]) =>
            h('div', { className: 'di-attempt-head', key: name }, h('span', null, name), h('strong', null, `${score}/10`))))
        : null))
}

export function ExplanationResultCard({ explanation }) {
  if (!explanation) return null
  return h('article', { className: 'di-card', 'aria-label': '参考讲解' },
    h('header', { className: 'di-card-head' },
      h('div', null, h('div', { className: 'di-eyebrow' }, 'REFERENCE NOTES'), h('div', { className: 'di-title' }, '参考讲解')),
      h(PhaseBadge, { phase: 'awaiting_next' })),
    h('div', { className: 'di-card-body' },
      h(Markdown, null, explanation.detail),
      explanation.memorizationPoints
        ? h('div', { className: 'di-attempt' }, h('div', { className: 'di-section-label' }, '直接背'), h(Markdown, null, explanation.memorizationPoints))
        : null))
}

export function ToolErrorCard({ message }) {
  return h('div', { className: 'di-tool-error', role: 'alert' },
    h('strong', null, '面试操作失败'),
    h('span', null, message))
}

function usePresentedPractice(presentation, revision) {
  const practiceId = presentation?.practiceId
  return useInterviewQuery(
    `presented-practice:${practiceId || 'none'}:${revision || 0}`,
    () => practiceId ? interviewApi.practice(practiceId) : Promise.resolve(null),
    [practiceId, revision],
    { cache: false },
  )
}

function PresentedState({ query, children, missing }) {
  if (query.loading && !query.data) return h('div', { className: 'di-card' }, h(Loading))
  if (query.error) return h('div', { className: 'di-card' }, h(ErrorNotice, null, query.error))
  return children || h('div', { className: 'di-card' }, h(Empty, { title: missing }))
}

export function QuestionResourceCard({ presentation, revision }) {
  const query = usePresentedPractice(presentation, revision)
  const practice = query.data?.resource?.data
  const question = practice?.questions?.find((item) => item.id === presentation.questionId)
  return h(PresentedState, { query, missing: '找不到题目卡片数据' }, question ? h(QuestionResultCard, { question }) : null)
}

export function EvaluationResourceCard({ presentation, revision }) {
  const query = usePresentedPractice(presentation, revision)
  const practice = query.data?.resource?.data
  const question = practice?.questions?.find((item) => item.id === presentation.questionId)
  const attempt = question?.attempts?.find((item) => item.id === presentation.attemptId)
  return h(PresentedState, { query, missing: '找不到评价卡片数据' }, attempt?.evaluation ? h(EvaluationResultCard, { evaluation: attempt.evaluation }) : null)
}

export function ExplanationResourceCard({ presentation, revision }) {
  const query = usePresentedPractice(presentation, revision)
  const practice = query.data?.resource?.data
  const question = practice?.questions?.find((item) => item.id === presentation.questionId)
  return h(PresentedState, { query, missing: '找不到讲解卡片数据' }, question?.explanation ? h(ExplanationResultCard, { explanation: question.explanation }) : null)
}
