import React from 'react'
import { interviewApi } from '../shared/api.js'
import { h } from '../shared/ui.js'
import { LeetcodeProblemCard } from './leetcode.js'

export function LatestQuestionDock({ sessionId, transcriptKey }) {
  const [entry, setEntry] = React.useState(null)

  React.useEffect(() => {
    setEntry(null)
    return interviewApi.subscribeLocalQuestions((event) => {
      if (event.sessionId !== sessionId) return
      setEntry({ question: event.question, transcriptKey })
    })
  }, [sessionId, transcriptKey])

  React.useEffect(() => {
    setEntry((current) => current && current.transcriptKey !== transcriptKey ? null : current)
  }, [transcriptKey])

  if (!entry?.question) return null
  return h('div', { className: 'di-latest-question' },
    h(LeetcodeProblemCard, { key: entry.question.id, sessionId, initialQuestion: entry.question }))
}
