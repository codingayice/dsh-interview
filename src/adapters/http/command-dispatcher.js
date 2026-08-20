import { INTERVIEW_ACTIONS } from '../../application/interview-actions.js'

const UI_ACTIONS = Object.freeze({
  'session.start': INTERVIEW_ACTIONS.START_PRACTICE,
  'session.select': INTERVIEW_ACTIONS.SELECT_PRACTICE,
  'session.finish': INTERVIEW_ACTIONS.FINISH_PRACTICE,
  'session.reopen': INTERVIEW_ACTIONS.REOPEN_PRACTICE,
  'question.open': INTERVIEW_ACTIONS.OPEN_QUESTION,
  'question.next': INTERVIEW_ACTIONS.REQUEST_NEXT,
  'question.retry': INTERVIEW_ACTIONS.RETRY_QUESTION,
  'question.reveal': INTERVIEW_ACTIONS.REVEAL_ANSWER,
  'library.delete': INTERVIEW_ACTIONS.DELETE_PRACTICE,
  'library.export': INTERVIEW_ACTIONS.EXPORT_PRACTICES,
})

export async function dispatchCommand(coordinator, sessionId, command, payload = {}) {
  const action = UI_ACTIONS[command]
  if (!action) throw new TypeError(`不支持的 UI command：${String(command)}`)
  return coordinator.execute({ sessionId, action, payload, source: 'ui' })
}

export { UI_ACTIONS }
