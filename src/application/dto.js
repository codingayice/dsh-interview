import { INTERVIEW_MODES } from '../domain/modes.js'
import { summarizePractice } from '../domain/practice.js'

export function toQuestionDto(question) {
  const latestAttempt = question.attempts.at(-1) || null
  return {
    id: question.id,
    sequence: question.sequence,
    prompt: question.prompt,
    createdAt: question.createdAt,
    attempts: question.attempts.map((attempt) => ({
      id: attempt.id,
      sequence: attempt.sequence,
      answer: attempt.answer,
      submittedAt: attempt.submittedAt,
      evaluation: attempt.evaluation ? { ...attempt.evaluation, dimensions: { ...attempt.evaluation.dimensions } } : null,
    })),
    latestScore: latestAttempt?.evaluation?.score ?? null,
    explanation: question.explanation ? { ...question.explanation } : null,
  }
}

export function toPracticeSummaryDto(practice) {
  const summary = summarizePractice(practice)
  return {
    id: practice.id,
    mode: practice.mode,
    modeLabel: INTERVIEW_MODES[practice.mode]?.label || practice.mode,
    topic: practice.topic,
    status: practice.status,
    createdAt: practice.createdAt,
    updatedAt: practice.updatedAt,
    completedAt: practice.completedAt,
    ...summary,
  }
}

export function toPracticeDetailDto(practice) {
  return {
    ...toPracticeSummaryDto(practice),
    source: { ...practice.source },
    config: { ...practice.config },
    questions: practice.questions.map(toQuestionDto),
  }
}

export function toSessionDto(cursor, practice) {
  if (!cursor || !practice) return {
    selected: false,
    phase: 'idle',
    revision: 0,
    practice: null,
    currentQuestion: null,
  }
  const question = practice.questions.find((item) => item.id === cursor.questionId) || null
  return {
    selected: true,
    sessionId: cursor.sessionId,
    phase: cursor.phase,
    revision: cursor.revision,
    questionId: cursor.questionId,
    attemptId: cursor.attemptId,
    practice: { ...toPracticeSummaryDto(practice), config: { ...practice.config } },
    currentQuestion: question ? toQuestionDto(question) : null,
  }
}

export function buildInsights(practices) {
  const completedAttempts = practices.flatMap((practice) => practice.questions.flatMap((question) =>
    question.attempts.filter((attempt) => attempt.evaluation).map((attempt) => ({ practice, attempt }))))
  const topicMap = new Map()
  for (const { practice, attempt } of completedAttempts) {
    const stats = topicMap.get(practice.topic) || { topic: practice.topic, evaluatedCount: 0, scoreTotal: 0 }
    stats.evaluatedCount += 1
    stats.scoreTotal += attempt.evaluation.score
    topicMap.set(practice.topic, stats)
  }
  const topics = [...topicMap.values()].map((stats) => ({
    topic: stats.topic,
    evaluatedCount: stats.evaluatedCount,
    averageScore: Math.round((stats.scoreTotal / stats.evaluatedCount) * 10) / 10,
  })).sort((left, right) => left.averageScore - right.averageScore)
  const averageScore = completedAttempts.length
    ? Math.round((completedAttempts.reduce((sum, item) => sum + item.attempt.evaluation.score, 0) / completedAttempts.length) * 10) / 10
    : null
  return {
    practiceCount: practices.length,
    questionCount: practices.reduce((sum, practice) => sum + practice.questions.length, 0),
    evaluatedCount: completedAttempts.length,
    averageScore,
    weakestTopic: topics[0] || null,
    topics,
  }
}
