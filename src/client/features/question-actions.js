export function isPresentedQuestionCurrent(session, presentation) {
  return Boolean(
    session?.selected
    && session.practice?.id === presentation?.practiceId
    && session.questionId === presentation?.questionId,
  )
}

export function getPresentedQuestionActions(session, presentation) {
  const current = isPresentedQuestionCurrent(session, presentation)
  return {
    canReveal: current && session.phase === 'awaiting_answer',
    canContinue: current && session.phase === 'awaiting_next',
    canRetry: current && session.phase === 'awaiting_next',
    canFinish: current && session.phase === 'awaiting_next',
  }
}
