import React from 'react'
import { interviewApi } from '../shared/api.js'
import { useCommand, useInterviewQuery } from '../shared/hooks.js'
import { Button, ErrorNotice, h, Loading, Markdown } from '../shared/ui.js'
import { leetcodeDifficultyLabel } from '../../domain/leetcode-top-100.js'
import { createLeetcodeCardStack, upsertLeetcodeCard } from './leetcode-card-stack.js'

const DIFFICULTY = Object.freeze({
  easy: { label: '简单', tone: 'easy' },
  medium: { label: '中等', tone: 'medium' },
  hard: { label: '困难', tone: 'hard' },
})

function catalogProblem(catalog, slug) {
  return catalog?.groups?.flatMap((group) => group.problems).find((problem) => problem.slug === slug) || null
}

function DifficultyBadge({ difficulty }) {
  const value = DIFFICULTY[difficulty] || { label: leetcodeDifficultyLabel(difficulty), tone: 'unknown' }
  return h('span', { className: `di-lc-difficulty is-${value.tone}` }, value.label)
}

function CompletionButton({ problem, pending, onToggle }) {
  return h('button', {
    type: 'button',
    className: `di-lc-check${problem.completed ? ' is-complete' : ''}`,
    disabled: pending,
    'aria-pressed': problem.completed,
    'aria-label': problem.completed ? `将${problem.title}标记为未完成` : `将${problem.title}标记为完成`,
    onClick: () => onToggle(problem),
  }, problem.completed ? '✓' : '')
}

export function LeetcodeCatalog({ sessionId }) {
  const query = useInterviewQuery('leetcode-catalog', () => interviewApi.leetcodeCatalog(), [], { cache: false })
  const command = useCommand(sessionId)
  const [pendingSlug, setPendingSlug] = React.useState('')
  if (query.loading && !query.data) return h('div', { className: 'di-lc-catalog' }, h(Loading, { label: '正在读取力扣热题 100…' }))
  if (query.error) return h('div', { className: 'di-lc-catalog' }, h(ErrorNotice, null, query.error))
  const catalog = query.data?.resource?.data
  if (!catalog) return null
  const toggle = async (problem) => {
    setPendingSlug(problem.slug)
    try {
      await command.run('leetcode.set-completion', { slug: problem.slug, completed: !problem.completed })
      await query.reload()
    } catch {
      // useCommand 已保存可展示错误。
    } finally {
      setPendingSlug('')
    }
  }
  const progress = catalog.total ? Math.round((catalog.completedCount / catalog.total) * 100) : 0

  return h('section', { className: 'di-lc-catalog', 'aria-label': '力扣热题 100 题目列表' },
    h('header', { className: 'di-lc-catalog-head' },
      h('h2', { className: 'di-lc-title' }, '热题 100'),
      h('div', { className: 'di-lc-catalog-summary' },
        h('a', { className: 'di-lc-source', href: catalog.source.url, target: '_blank', rel: 'noreferrer' }, '官方题单 ↗'),
        h('div', { className: 'di-lc-progress-copy' },
          h('span', { className: 'di-lc-progress-value' }, catalog.completedCount),
          h('span', null, `/ ${catalog.total}`)))),
    h('div', { className: 'di-lc-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': catalog.total, 'aria-valuenow': catalog.completedCount },
      h('i', { style: { width: `${progress}%` } })),
    h(ErrorNotice, null, command.error),
    h('div', { className: 'di-lc-groups' }, catalog.groups.map((group) => {
      const completed = group.problems.filter((problem) => problem.completed).length
      return h('section', { className: 'di-lc-group', key: group.category },
        h('div', { className: 'di-lc-group-head' },
          h('h3', null, group.category),
          h('span', null, `${completed}/${group.problems.length}`)),
        h('div', { className: 'di-lc-problems' }, group.problems.map((problem) => h('div', {
          className: `di-lc-row${problem.completed ? ' is-complete' : ''}`,
          key: problem.slug,
        },
        h(CompletionButton, { problem, pending: pendingSlug === problem.slug, onToggle: toggle }),
        h('a', { className: 'di-lc-problem-link', href: problem.url, target: '_blank', rel: 'noreferrer' },
          h('span', { className: 'di-lc-problem-id' }, problem.id),
          h('span', null, problem.title),
          h('span', { className: 'di-lc-open', 'aria-hidden': 'true' }, '↗')),
        h(DifficultyBadge, { difficulty: problem.difficulty }))))
      )
    })))
}

function LeetcodeQuestionCard({ question, catalog, active, expanded, command, phase, onRun, onExplain }) {
  const saved = catalogProblem(catalog, question.leetcode.slug)
  const problem = { ...question.leetcode, completed: saved?.completed === true }
  return h('article', { className: `di-card di-lc-problem-card${active ? ' is-active' : ' is-history'}`, 'aria-label': active ? '当前力扣题目' : '历史力扣题目' },
      h('div', { className: 'di-lc-problem-main' },
        h('div', { className: 'di-lc-problem-title' }, h('span', null, problem.id), problem.title),
        h('div', { className: 'di-lc-problem-meta' },
          h('span', null, problem.category),
          h(DifficultyBadge, { difficulty: problem.difficulty }),
          h('span', { className: problem.completed ? 'is-complete' : '' }, problem.completed ? '已完成' : '未完成'))),
      h('div', { className: 'di-lc-problem-actions' },
        h('a', { className: 'di-button is-primary', href: problem.url, target: '_blank', rel: 'noreferrer' }, '打开题目 ↗'),
        active ? h(React.Fragment, null,
          h(Button, {
            busy: command.busy === 'leetcode.set-completion',
            onClick: () => onRun('leetcode.set-completion', { slug: problem.slug, completed: !problem.completed }),
          }, problem.completed ? '标记未完成' : '标记完成'),
          h(Button, { busy: command.busy === 'question.next', onClick: () => onRun('question.next') }, '随机下一题'),
          h(Button, {
            busy: command.busy === 'question.reveal' || phase === 'generating_explanation',
            onClick: () => onExplain(question),
          }, '讲解'),
          h(Button, { busy: command.busy === 'session.finish', onClick: () => onRun('session.finish') }, '结束练习')) : null),
      active ? h(ErrorNotice, null, command.error) : null,
      expanded && question.explanation
        ? h('section', { className: 'di-section', 'aria-label': '题目讲解' },
            h('div', { className: 'di-section-label' }, '讲解'),
            h(Markdown, null, question.explanation.detail),
            question.explanation.memorizationPoints
              ? h('div', { className: 'di-attempt' },
                  h('div', { className: 'di-section-label' }, '解题要点'),
                  h(Markdown, null, question.explanation.memorizationPoints))
              : null)
        : null)
}

export function LeetcodeProblemCard({ sessionId, initialQuestion = null }) {
  const sessionQuery = useInterviewQuery(`leetcode-session:${sessionId}`, () => interviewApi.session(sessionId), [sessionId], { cache: false })
  const catalogQuery = useInterviewQuery('leetcode-catalog-current', () => interviewApi.leetcodeCatalog(), [], { cache: false })
  const command = useCommand(sessionId)
  const session = sessionQuery.data?.resource?.data
  const sessionQuestion = session?.currentQuestion?.leetcode ? session.currentQuestion : null
  const sourceQuestion = initialQuestion?.leetcode ? initialQuestion : sessionQuestion
  const [cards, setCards] = React.useState(() => createLeetcodeCardStack(sourceQuestion))
  const [expandedQuestionId, setExpandedQuestionId] = React.useState('')

  React.useEffect(() => {
    if (sourceQuestion) setCards((current) => upsertLeetcodeCard(current, sourceQuestion))
  }, [sourceQuestion])

  if (sessionQuery.loading && cards.length === 0) return h('div', { className: 'di-card' }, h(Loading))
  if (cards.length === 0) return null

  const run = async (name, payload) => {
    try {
      const result = await command.run(name, payload)
      const returnedQuestion = result?.resource?.kind === 'question' && result.resource.data?.leetcode
        ? result.resource.data
        : null
      if (returnedQuestion) setCards((current) => upsertLeetcodeCard(current, returnedQuestion))
      if (name === 'question.next') setExpandedQuestionId('')
      await Promise.all([sessionQuery.reload(), catalogQuery.reload()])
      return result
    } catch {
      // useCommand 已保存可展示错误。
      return null
    }
  }

  const explain = async (question) => {
    if (question.explanation) {
      setExpandedQuestionId((current) => current === question.id ? '' : question.id)
      return
    }
    const result = await run('question.reveal', { questionId: question.id })
    if (result) setExpandedQuestionId(question.id)
  }

  const catalog = catalogQuery.data?.resource?.data
  return h('section', { className: 'di-lc-card-stack', 'aria-label': '力扣题目卡片' }, cards.map((question, index) => {
    const liveQuestion = sessionQuestion?.id === question.id ? sessionQuestion : question
    return h(LeetcodeQuestionCard, {
      key: question.id,
      question: liveQuestion,
      catalog,
      active: index === cards.length - 1,
      expanded: expandedQuestionId === question.id,
      command,
      phase: session?.phase,
      onRun: run,
      onExplain: explain,
    })
  }))
}
