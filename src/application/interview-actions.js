export const INTERVIEW_ACTIONS = Object.freeze({
  START_PRACTICE: 'practice.start',
  GET_STATUS: 'session.status',
  SELECT_PRACTICE: 'practice.select',
  REOPEN_PRACTICE: 'practice.reopen',
  FINISH_PRACTICE: 'practice.finish',
  PRESENT_QUESTION: 'question.present',
  OPEN_QUESTION: 'question.open',
  REQUEST_NEXT: 'question.request_next',
  RETRY_QUESTION: 'question.retry',
  SUBMIT_ANSWER: 'answer.submit',
  PRESENT_EVALUATION: 'answer.present_evaluation',
  REQUEST_EXPLANATION: 'explanation.request',
  PRESENT_EXPLANATION: 'explanation.present',
  LIST_PRACTICES: 'library.list',
  GET_PRACTICE: 'library.get',
  GET_INSIGHTS: 'library.insights',
  EXPORT_PRACTICES: 'library.export',
  DELETE_PRACTICE: 'library.delete',
})

export const INTERVIEW_ACTION_VALUES = Object.freeze(Object.values(INTERVIEW_ACTIONS))
