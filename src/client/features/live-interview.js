import React from 'react'
import { interviewApi } from '../shared/api.js'
import { useCommand, useInterviewQuery } from '../shared/hooks.js'
import { Button, Empty, ErrorNotice, h, Icon, Loading, Markdown, PhaseBadge, StarRating } from '../shared/ui.js'
import { leetcodeDifficultyLabel } from '../../domain/leetcode-top-100.js'
import { LeetcodeProblemCard } from './leetcode.js'
import { getArtifactQuestionActions } from './question-actions.js'

export function CompactResultCard({ title, detail, tone = 'quiet' }) {
  return h('div', { className: 'di-card' },
    h('div', { className: 'di-card-head' },
      h('div', { className: 'di-title' }, title),
      h(PhaseBadge, { phase: tone === 'completed' ? 'completed' : 'awaiting_next' })),
    detail ? h('div', { className: 'di-card-body' }, detail) : null)
}

export function QuestionResultCard({ sessionId, question, answerDisabled = false }) {
  if (!question) return null
  const command = useCommand(sessionId)
  const revealAnswer = () => command.run('question.reveal', { questionId: question.id }).catch(() => {})
  return h('article', { className: 'di-card di-question-card', 'aria-label': '面试题' },
    h('div', { className: 'di-question-main' },
      h('div', { className: 'di-question-text' }, h(Markdown, null, question.prompt))),
    h(Button, {
      className: 'di-answer-button',
      disabled: answerDisabled,
      busy: command.busy === 'question.reveal',
      onClick: revealAnswer,
      'aria-label': '查看本题答案',
    }, h(Icon, { name: 'eye' }), '看答案'),
    h(ErrorNotice, null, command.error))
}

export function ReviewResultCard({ sessionId, question, attempt, actionsDisabled = false }) {
  if (!question || !question.explanation || (attempt && !attempt.evaluation)) return null
  const command = useCommand(sessionId)
  const run = (name, payload) => command.run(name, payload).catch(() => {})
  const retry = () => run('question.retry', { questionId: question.id })
  const evaluation = attempt?.evaluation || null
  const explanation = question.explanation
  const isLeetcode = Boolean(question.leetcode)
  const nextRequestedRef = React.useRef(false)
  const [nextRequested, setNextRequested] = React.useState(false)
  const next = async () => {
    if (nextRequestedRef.current) return
    nextRequestedRef.current = true
    setNextRequested(true)
    try {
      await command.run('question.next')
    } catch {
      nextRequestedRef.current = false
      setNextRequested(false)
    }
  }
  return h('article', { id: `di-review-${question.id}`, className: 'di-card di-review-card', 'aria-label': isLeetcode ? '题目讲解' : '点评讲解' },
    evaluation ? h('header', { className: 'di-review-score' },
      h('span', { className: 'di-review-check' }, h(Icon, { name: 'check', size: 22 })),
      h('div', { className: 'di-review-score-summary' },
        h('div', { className: 'di-review-score-label' }, '评分'),
        h('div', { className: 'di-review-score-value' },
          h('span', { className: 'di-review-score-number' }, Number(evaluation.score).toFixed(1)), h('span', null, '/ 10'))),
      h(StarRating, { score: evaluation.score })) : null,
    h('div', { className: 'di-review-content' },
      evaluation ? h('section', { className: 'di-review-section' },
        h('h3', null, '评价'),
        h('div', { className: 'di-feedback-banner' }, h(Markdown, null, evaluation.feedback)),
        Object.keys(evaluation.dimensions || {}).length
          ? h('div', { className: 'di-dimensions' }, Object.entries(evaluation.dimensions).map(([name, score]) =>
              h('span', { key: name }, name, h('span', { className: 'di-dimension-score' }, `${score}/10`))))
          : null) : null,
      h('section', { className: 'di-review-section' },
        h('h3', null, '讲解'),
        h('div', { className: 'di-explanation-copy' }, h(Markdown, null, explanation.detail))),
      h('section', { className: 'di-memorize-box' },
        h('div', { className: 'di-memorize-copy' },
          h('div', { className: 'di-memorize-label' }, isLeetcode ? '解题要点' : '直接背'),
          h(Markdown, null, explanation.memorizationPoints))),
      h(ErrorNotice, null, command.error),
      h('div', { className: 'di-review-actions' },
        isLeetcode
          ? h(Button, { tone: 'primary', disabled: actionsDisabled || nextRequested, onClick: next }, nextRequested ? '已出下一题' : '随机下一题')
          : h(Button, { tone: 'primary', disabled: actionsDisabled, busy: command.busy === 'question.next', onClick: () => run('question.next') }, '下一题'),
        !isLeetcode ? h(Button, { disabled: actionsDisabled, busy: command.busy === 'question.retry', onClick: retry }, h(Icon, { name: 'swap' }), '重新作答') : null,
        !isLeetcode ? h(Button, { disabled: actionsDisabled, busy: command.busy === 'session.finish', onClick: () => run('session.finish') }, '结束练习') : null)))
}

export function ToolErrorCard({ message }) {
  return h('div', { className: 'di-tool-error', role: 'alert' },
    h('span', null, '面试操作失败'),
    h('span', null, message))
}

function useArtifactPractice(artifact, revision) {
  const practiceId = artifact?.practiceId
  return useInterviewQuery(
    `practice:${practiceId || 'none'}`,
    () => practiceId ? interviewApi.practice(practiceId) : Promise.resolve(null),
    [practiceId, revision],
    { version: revision },
  )
}

function useArtifactSession(sessionId, revision) {
  return useInterviewQuery(
    `session:${sessionId}`,
    () => interviewApi.session(sessionId),
    [sessionId, revision],
    { version: revision },
  )
}

function ArtifactState({ query, children, missing }) {
  if (query.loading && !query.data) return h('div', { className: 'di-card' }, h(Loading))
  if (query.error) return h('div', { className: 'di-card' }, h(ErrorNotice, null, query.error))
  return children || h('div', { className: 'di-card' }, h(Empty, { title: missing }))
}

export function QuestionResourceCard({ artifact, revision, sessionId }) {
  const query = useArtifactPractice(artifact, revision)
  const sessionQuery = useArtifactSession(sessionId, revision)
  const practice = query.data?.resource?.data
  const session = sessionQuery.data?.resource?.data
  const question = practice?.questions?.find((item) => item.id === artifact.questionId)
  const actions = getArtifactQuestionActions(session, artifact)
  return h(ArtifactState, { query, missing: '找不到题目卡片数据' }, question
    ? question.leetcode
      ? h(LeetcodeProblemCard, { sessionId, initialQuestion: question, language: practice.config?.language, resourceRevision: revision })
      : h(QuestionResultCard, { sessionId, question, answerDisabled: !actions.canReveal })
    : null)
}

export function ReviewResourceCard({ artifact, revision, sessionId }) {
  const query = useArtifactPractice(artifact, revision)
  const sessionQuery = useArtifactSession(sessionId, revision)
  const practice = query.data?.resource?.data
  const session = sessionQuery.data?.resource?.data
  const question = practice?.questions?.find((item) => item.id === artifact.questionId)
  const attempt = artifact.attemptId ? question?.attempts?.find((item) => item.id === artifact.attemptId) : null
  const complete = question?.explanation && (!artifact.attemptId || attempt?.evaluation)
  const actions = getArtifactQuestionActions(session, artifact)
  return h(ArtifactState, { query, missing: '找不到讲解数据' }, complete
    ? h(ReviewResultCard, { sessionId, question, attempt, actionsDisabled: !actions.canContinue })
    : null)
}

export function PracticeSummaryCard({ artifact, revision }) {
  const query = useArtifactPractice(artifact, revision)
  const practice = query.data?.resource?.data
  const summary = practice?.summary
  const leetcode = summary?.kind === 'leetcode'
  return h(ArtifactState, { query, missing: '找不到练习总结' }, summary ? h('article', { className: 'di-card', 'aria-label': '练习总结' },
    h('header', { className: 'di-card-head' },
      h('div', { className: 'di-title' }, '练习总结'),
      h(PhaseBadge, { phase: 'completed' })),
    h('div', { className: 'di-card-body' },
      leetcode
        ? h(React.Fragment, null,
            h('div', { className: 'di-meta' }, `本次共记录 ${summary.questionCount} 道题`),
            h('ol', null, summary.problems.map((problem) => h('li', { key: `${problem.sequence}-${problem.slug}` },
              h('a', { className: 'di-link', href: problem.url, target: '_blank', rel: 'noreferrer' }, `${problem.id}. ${problem.title}`),
              ` · ${problem.category} · ${leetcodeDifficultyLabel(problem.difficulty)}`))))
        : h(React.Fragment, null,
            h(Markdown, null, summary.overall),
            h('section', { className: 'di-section' },
              h('div', { className: 'di-section-label' }, '表现亮点'),
              h('ul', null, summary.strengths.map((item) => h('li', { key: item }, item)))),
            h('section', { className: 'di-section' },
              h('div', { className: 'di-section-label' }, '改进建议'),
              h('ul', null, summary.improvements.map((item) => h('li', { key: item }, item)))),
            h('div', { className: 'di-meta' }, `${practice.questionCount} 道题 · ${practice.attemptCount} 次作答 · 平均分 ${practice.averageScore ?? '—'}`)))) : null)
}
