export function isArtifactQuestionCurrent(session, artifact) {
  return Boolean(
    session?.selected
    && session.practice?.id === artifact?.practiceId
    && session.questionId === artifact?.questionId,
  )
}

export function getArtifactQuestionActions(session, artifact) {
  const current = isArtifactQuestionCurrent(session, artifact)
  return {
    canReveal: current && session.phase === 'awaiting_answer',
    canContinue: current && session.phase === 'awaiting_next',
    canRetry: current && session.phase === 'awaiting_next',
    canFinish: current && session.phase === 'awaiting_next',
  }
}
