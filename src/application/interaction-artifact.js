export const ARTIFACT_KINDS = Object.freeze({
  QUESTION: 'question',
  REVIEW: 'review',
  LIBRARY: 'library',
  INSIGHTS: 'insights',
  LEETCODE_CATALOG: 'leetcode-catalog',
  DELETED: 'deleted',
  EXPORTED: 'exported',
  FINISHED: 'finished',
  LIVE_SESSION: 'live-session',
})

const REFERENCE_REQUIREMENTS = Object.freeze({
  [ARTIFACT_KINDS.QUESTION]: ['practiceId', 'questionId'],
  [ARTIFACT_KINDS.REVIEW]: ['practiceId', 'questionId'],
  [ARTIFACT_KINDS.FINISHED]: ['practiceId'],
})

export function createInteractionArtifact(kind, references = {}) {
  if (!Object.values(ARTIFACT_KINDS).includes(kind)) {
    throw new TypeError(`不支持的交互产物：${String(kind)}`)
  }
  for (const name of REFERENCE_REQUIREMENTS[kind] || []) {
    const value = references[name]
    if (typeof value !== 'string' || !value.trim()) {
      throw new TypeError(`${kind} 交互产物缺少 ${name} 引用`)
    }
  }
  return Object.freeze({ kind, ...references })
}

export function artifactForSession(data, references = {}) {
  if (!data?.selected || !data.currentQuestion) return null
  if (data.phase === 'awaiting_answer' || data.phase === 'awaiting_solution') {
    return createInteractionArtifact(ARTIFACT_KINDS.QUESTION, {
      practiceId: references.practiceId,
      questionId: references.questionId,
    })
  }
  if (data.phase === 'awaiting_next' && data.currentQuestion.explanation) {
    return createInteractionArtifact(ARTIFACT_KINDS.REVIEW, {
      practiceId: references.practiceId,
      questionId: references.questionId,
      ...(references.attemptId ? { attemptId: references.attemptId } : {}),
    })
  }
  return null
}

const REQUIRED_ARTIFACT_BY_ACTION = Object.freeze({
  [INTERVIEW_ACTIONS.PRESENT_QUESTION]: ARTIFACT_KINDS.QUESTION,
  [INTERVIEW_ACTIONS.OPEN_QUESTION]: ARTIFACT_KINDS.QUESTION,
  [INTERVIEW_ACTIONS.RETRY_QUESTION]: ARTIFACT_KINDS.QUESTION,
  [INTERVIEW_ACTIONS.COMPLETE_REVIEW]: ARTIFACT_KINDS.REVIEW,
  [INTERVIEW_ACTIONS.COMPLETE_SUMMARY]: ARTIFACT_KINDS.FINISHED,
})

export function assertInteractionArtifactContract(action, outcome) {
  const requiredKind = REQUIRED_ARTIFACT_BY_ACTION[action]
  if (requiredKind && outcome.artifact?.kind !== requiredKind) {
    throw new TypeError(`${action} 必须产生 ${requiredKind} 交互产物`)
  }
  if (outcome.artifact && outcome.assistantResponse?.mode !== 'exact') {
    throw new TypeError(`交互产物 ${outcome.artifact.kind} 必须配合固定辅助文本输出`)
  }
  if (outcome.artifact?.kind === ARTIFACT_KINDS.QUESTION
    && !['awaiting_answer', 'awaiting_solution'].includes(outcome.state)) {
    throw new TypeError(`question 交互产物不能用于 ${String(outcome.state)} 状态`)
  }
  if (outcome.artifact?.kind === ARTIFACT_KINDS.REVIEW && outcome.state !== 'awaiting_next') {
    throw new TypeError(`review 交互产物不能用于 ${String(outcome.state)} 状态`)
  }
  if (outcome.artifact?.kind === ARTIFACT_KINDS.FINISHED && outcome.state !== 'completed') {
    throw new TypeError(`finished 交互产物不能用于 ${String(outcome.state)} 状态`)
  }
  return outcome
}
import { INTERVIEW_ACTIONS } from './interview-actions.js'
