export async function dispatchCommand(application, sessionId, command, payload = {}) {
  switch (command) {
    case 'session.start': return application.startPractice(sessionId, payload)
    case 'session.select': return application.selectPractice(sessionId, payload.practiceId)
    case 'session.finish': return application.completePractice(sessionId)
    case 'session.reopen': return application.reopenPractice(sessionId, payload.practiceId)
    case 'question.open': return application.openQuestion(sessionId, payload.questionId)
    case 'question.request_explanation': return application.requestExplanation(sessionId)
    case 'question.next': return application.requestNextQuestion(sessionId)
    case 'question.retry': return application.retryQuestion(sessionId, payload.questionId)
    case 'library.delete': return application.deletePractice(payload.practiceId, sessionId)
    case 'library.export': return application.exportPractices(payload)
    default: throw new TypeError(`不支持的 UI command：${String(command)}`)
  }
}
