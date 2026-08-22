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
