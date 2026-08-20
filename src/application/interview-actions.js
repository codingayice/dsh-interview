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
  REVEAL_ANSWER: 'question.reveal_answer',
  SUBMIT_ANSWER: 'answer.submit',
  SAVE_EVALUATION: 'answer.save_evaluation',
  COMPLETE_REVIEW: 'review.complete',
  LIST_PRACTICES: 'library.list',
  READ_PRACTICE_CONTEXT: 'library.read_context',
  GET_PRACTICE: 'library.get',
  GET_INSIGHTS: 'library.insights',
  EXPORT_PRACTICES: 'library.export',
  DELETE_PRACTICE: 'library.delete',
})

export const INTERVIEW_ACTION_VALUES = Object.freeze(Object.values(INTERVIEW_ACTIONS))
