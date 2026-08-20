import React from 'react'
import { interviewApi } from '../shared/api.js'
import { useCommand, useInterviewQuery } from '../shared/hooks.js'
import { Button, Empty, ErrorNotice, h, Icon, Loading, Markdown, PhaseBadge, ScoreRail, StarRating } from '../shared/ui.js'

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
        session.phase === 'awaiting_next'
          ? h(Button, { tone: 'primary', busy: command.busy === 'question.next', onClick: () => run('question.next') }, '下一题')
          : null,
        question && session.phase === 'awaiting_next'
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
      h('div', { className: 'di-title' }, title),
      h(PhaseBadge, { phase: tone === 'completed' ? 'completed' : 'awaiting_next' })),
    detail ? h('div', { className: 'di-card-body' }, detail) : null)
}

export function QuestionResultCard({ sessionId, question }) {
  if (!question) return null
  const command = useCommand(sessionId)
  const revealAnswer = () => command.run('question.reveal', { questionId: question.id }).catch(() => {})
  return h('article', { className: 'di-card di-question-card', 'aria-label': '面试题' },
    h('div', { className: 'di-question-main' },
      h('div', { className: 'di-question-text' }, h(Markdown, null, question.prompt))),
    h(Button, {
      className: 'di-answer-button', busy: command.busy === 'question.reveal', onClick: revealAnswer, 'aria-label': '查看本题答案',
    }, h(Icon, { name: 'eye' }), '看答案'),
    h(ErrorNotice, null, command.error))
}

export function ReviewResultCard({ sessionId, question, attempt }) {
  if (!question || !question.explanation || (attempt && !attempt.evaluation)) return null
  const command = useCommand(sessionId)
  const [copied, setCopied] = React.useState(false)
  const run = (name, payload) => command.run(name, payload).catch(() => {})
  const evaluation = attempt?.evaluation || null
  const explanation = question.explanation
  const copyMemorization = async () => {
    try {
      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(explanation.memorizationPoints)
      } else {
        const textarea = globalThis.document?.createElement?.('textarea')
        if (!textarea) return
        textarea.value = explanation.memorizationPoints
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        globalThis.document.body.appendChild(textarea)
        textarea.select()
        globalThis.document.execCommand?.('copy')
        textarea.remove()
      }
      setCopied(true)
      globalThis.setTimeout?.(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return h('article', { id: `di-review-${question.id}`, className: `di-card di-review-card${evaluation ? '' : ' is-answer-only'}`, 'aria-label': '本题复盘' },
    evaluation ? h('aside', { className: 'di-review-score' },
      h('span', { className: 'di-review-check' }, h(Icon, { name: 'check', size: 22 })),
      h('div', { className: 'di-review-score-label' }, '评分'),
      h('div', { className: 'di-review-score-value' },
        h('strong', null, Number(evaluation.score).toFixed(1)), h('span', null, '/ 10')),
      h(StarRating, { score: evaluation.score })) : null,
    h('div', { className: 'di-review-content' },
      evaluation ? h('section', { className: 'di-review-section' },
        h('h3', null, '评价'),
        h('div', { className: 'di-feedback-banner' }, h(Markdown, null, evaluation.feedback)),
        Object.keys(evaluation.dimensions || {}).length
          ? h('div', { className: 'di-dimensions' }, Object.entries(evaluation.dimensions).map(([name, score]) =>
              h('span', { key: name }, name, h('strong', null, `${score}/10`))))
          : null) : null,
      h('section', { className: 'di-review-section' },
        h('h3', null, '讲解'),
        h('div', { className: 'di-explanation-copy' }, h(Markdown, null, explanation.detail))),
      h('section', { className: 'di-memorize-box' },
        h('div', { className: 'di-memorize-copy' },
          h('div', { className: 'di-memorize-label' }, '直接背'),
          h(Markdown, null, explanation.memorizationPoints)),
        h(Button, { className: 'di-copy-button', onClick: copyMemorization }, h(Icon, { name: 'copy' }), copied ? '已复制' : '复制')),
      attempt ? h('div', { className: 'di-review-answer' },
        h('span', null, `第 ${attempt.sequence} 次作答`),
        h(Markdown, null, attempt.answer)) : null,
      h(ErrorNotice, null, command.error),
      h('div', { className: 'di-review-actions' },
        h(Button, { tone: 'primary', busy: command.busy === 'question.next', onClick: () => run('question.next') }, '下一题'),
        h(Button, { busy: command.busy === 'question.retry', onClick: () => run('question.retry', { questionId: question.id }) }, h(Icon, { name: 'swap' }), '重新作答'),
        h(Button, { busy: command.busy === 'session.finish', onClick: () => run('session.finish') }, '结束练习'))))
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

export function QuestionResourceCard({ presentation, revision, sessionId }) {
  const query = usePresentedPractice(presentation, revision)
  const practice = query.data?.resource?.data
  const question = practice?.questions?.find((item) => item.id === presentation.questionId)
  return h(PresentedState, { query, missing: '找不到题目卡片数据' }, question ? h(QuestionResultCard, { sessionId, question }) : null)
}

export function ReviewResourceCard({ presentation, revision, sessionId }) {
  const query = usePresentedPractice(presentation, revision)
  const practice = query.data?.resource?.data
  const question = practice?.questions?.find((item) => item.id === presentation.questionId)
  const attempt = presentation.attemptId ? question?.attempts?.find((item) => item.id === presentation.attemptId) : null
  const complete = question?.explanation && (!presentation.attemptId || attempt?.evaluation)
  return h(PresentedState, { query, missing: '找不到完整复盘卡片数据' }, complete ? h(ReviewResultCard, { sessionId, question, attempt }) : null)
}

export function PracticeSummaryCard({ presentation, revision }) {
  const query = usePresentedPractice(presentation, revision)
  const practice = query.data?.resource?.data
  const summary = practice?.summary
  return h(PresentedState, { query, missing: '找不到练习总结' }, summary ? h('article', { className: 'di-card', 'aria-label': '练习总结' },
    h('header', { className: 'di-card-head' },
      h('div', null,
        h('div', { className: 'di-title' }, '练习总结'),
        h('div', { className: 'di-subtitle' }, `${practice.modeLabel} · ${practice.topic}`)),
      h(PhaseBadge, { phase: 'completed' })),
    h('div', { className: 'di-card-body' },
      h(Markdown, null, summary.overall),
      h('section', { className: 'di-section' },
        h('div', { className: 'di-section-label' }, '表现亮点'),
        h('ul', null, summary.strengths.map((item) => h('li', { key: item }, item)))),
      h('section', { className: 'di-section' },
        h('div', { className: 'di-section-label' }, '改进建议'),
        h('ul', null, summary.improvements.map((item) => h('li', { key: item }, item)))),
      h('div', { className: 'di-subtitle' }, `${practice.questionCount} 道题 · ${practice.attemptCount} 次作答 · 平均分 ${practice.averageScore ?? '—'}`))) : null)
}
