import { DomainError } from '../domain/errors.js'
import { INTERVIEW_ACTIONS } from './interview-actions.js'
import { createAgentProtocolError, createInteractionResult } from './interaction-result.js'

const AGENT_RECOVERABLE_CODES = new Set([
  'INVALID_WORKFLOW_PHASE',
  'INVALID_MODE',
  'INVALID_TOPIC',
  'CONFIGURATION_REQUIRED',
  'RESUME_REQUIRED',
  'INTERVIEWER_STYLE_REQUIRED',
  'CODING_REQUIRED',
  'DIFFICULTY_REQUIRED',
  'INVALID_DIFFICULTY',
  'SESSION_NOT_SELECTED',
  'QUESTION_NOT_FOCUSED',
  'ATTEMPT_NOT_FOCUSED',
  'INVALID_QUESTION',
  'QUESTION_TOO_LONG',
  'MULTI_PART_QUESTION',
  'INVALID_ANSWER',
  'INVALID_FEEDBACK',
  'INVALID_EXPLANATION',
  'INVALID_MEMORIZATION_POINTS',
  'INVALID_SCORE',
  'INVALID_DIMENSION_SCORE',
])

async function executeApplicationAction(application, sessionId, action, payload) {
  switch (action) {
    case INTERVIEW_ACTIONS.START_PRACTICE: return application.startPractice(sessionId, payload)
    case INTERVIEW_ACTIONS.GET_STATUS: return application.getSession(sessionId)
    case INTERVIEW_ACTIONS.SELECT_PRACTICE: return application.selectPractice(sessionId, payload.practiceId)
    case INTERVIEW_ACTIONS.REOPEN_PRACTICE: return application.reopenPractice(sessionId, payload.practiceId)
    case INTERVIEW_ACTIONS.FINISH_PRACTICE: return application.completePractice(sessionId)
    case INTERVIEW_ACTIONS.PRESENT_QUESTION: return application.askQuestion(sessionId, { prompt: payload.prompt })
    case INTERVIEW_ACTIONS.OPEN_QUESTION: {
      const result = await application.openQuestion(sessionId, payload.questionId)
      const session = await application.getSession(sessionId)
      return {
        ...result,
        events: [...result.events, {
          type: 'question.opened',
          sessionId,
          practiceId: session.resource.data.practice?.id,
          questionId: result.resource.data.id,
        }],
      }
    }
    case INTERVIEW_ACTIONS.REQUEST_NEXT: return application.requestNextQuestion(sessionId)
    case INTERVIEW_ACTIONS.RETRY_QUESTION: return application.retryQuestion(sessionId, payload.questionId)
    case INTERVIEW_ACTIONS.REVEAL_ANSWER: return application.revealAnswer(sessionId, { questionId: payload.questionId })
    case INTERVIEW_ACTIONS.SUBMIT_ANSWER: return application.submitAnswer(sessionId, { questionId: payload.questionId, answer: payload.answer })
    case INTERVIEW_ACTIONS.SAVE_EVALUATION: return application.evaluateAnswer(sessionId, payload)
    case INTERVIEW_ACTIONS.COMPLETE_REVIEW: return application.saveExplanation(sessionId, payload)
    case INTERVIEW_ACTIONS.LIST_PRACTICES: return application.listPractices(payload)
    case INTERVIEW_ACTIONS.READ_PRACTICE_CONTEXT: return application.getPractice(payload.practiceId)
    case INTERVIEW_ACTIONS.GET_PRACTICE: return application.getPractice(payload.practiceId)
    case INTERVIEW_ACTIONS.GET_INSIGHTS: return application.getInsights()
    case INTERVIEW_ACTIONS.EXPORT_PRACTICES: {
      if (payload.practiceIds?.length || payload.scope === 'all') return application.exportPractices(payload)
      const session = await application.getSession(sessionId)
      const practiceId = session.resource.data.practice?.id
      return application.exportPractices({ ...payload, practiceIds: practiceId ? [practiceId] : undefined })
    }
    case INTERVIEW_ACTIONS.DELETE_PRACTICE: return application.deletePractice(payload.practiceId, sessionId)
    default: throw new TypeError(`不支持的面试动作：${String(action)}`)
  }
}

export class InterviewCoordinator {
  constructor({ application, eventBridge = null }) {
    this.application = application
    this.eventBridge = eventBridge
  }

  async execute({ sessionId, action, payload = {}, source = 'agent' }) {
    try {
      const result = await executeApplicationAction(this.application, sessionId, action, payload)
      if (source === 'ui') this.eventBridge?.dispatch(result.events)
      return createInteractionResult(action, result)
    } catch (error) {
      if (source === 'agent' && error instanceof DomainError && AGENT_RECOVERABLE_CODES.has(error.code)) {
        return createAgentProtocolError(action, error)
      }
      throw error
    }
  }
}

export { AGENT_RECOVERABLE_CODES, executeApplicationAction }
