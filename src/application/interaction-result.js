import { INTERVIEW_ACTIONS } from './interview-actions.js'

const PROTOCOL = 'dsh-interview/interaction-v1'

const exact = (text) => ({ mode: 'exact', text, mustNotRepeatResource: true })
const continueSilently = () => ({ mode: 'continue', text: null, mustNotRepeatResource: true })

function eventOf(result, type) {
  return result.events?.find((event) => event.type === type) || null
}

function practiceIdOf(result) {
  return result.resource?.data?.practice?.id
    || result.resource?.data?.id
    || result.resource?.data?.practiceId
    || result.events?.find((event) => event.practiceId)?.practiceId
    || null
}

function descriptor(action, result) {
  const data = result.resource?.data
  const practiceId = practiceIdOf(result)
  switch (action) {
    case INTERVIEW_ACTIONS.START_PRACTICE:
      return { state: data.phase, nextAction: 'generate_question', presentation: null, assistantResponse: continueSilently(), context: data }
    case INTERVIEW_ACTIONS.GET_STATUS: {
      const generating = ['awaiting_question', 'generating_explanation'].includes(data.phase)
      return {
        state: data.phase,
        nextAction: data.phase === 'awaiting_question' ? 'generate_question' : data.phase === 'generating_explanation' ? 'generate_explanation' : 'wait_for_user',
        presentation: generating ? null : { kind: 'live-session' },
        assistantResponse: generating ? continueSilently() : exact('当前练习状态已更新，请查看卡片。'),
        context: data,
      }
    }
    case INTERVIEW_ACTIONS.SELECT_PRACTICE:
    case INTERVIEW_ACTIONS.REOPEN_PRACTICE: {
      const needsQuestion = data.phase === 'awaiting_question'
      return {
        state: data.phase,
        nextAction: needsQuestion ? 'generate_question' : 'wait_for_user',
        presentation: needsQuestion ? null : { kind: 'live-session' },
        assistantResponse: needsQuestion ? continueSilently() : exact('练习已切换，请继续作答。'),
        context: data,
      }
    }
    case INTERVIEW_ACTIONS.PRESENT_QUESTION:
    case INTERVIEW_ACTIONS.OPEN_QUESTION:
      return {
        state: 'awaiting_answer',
        nextAction: 'wait_for_user',
        presentation: { kind: 'question', practiceId, questionId: data.id },
        assistantResponse: exact('已出题，请开始作答。'),
      }
    case INTERVIEW_ACTIONS.SUBMIT_ANSWER:
      return {
        state: 'awaiting_evaluation',
        nextAction: 'evaluate_answer',
        presentation: null,
        assistantResponse: continueSilently(),
        context: { practiceId, questionId: data.questionId, attemptId: data.id, answer: data.answer },
      }
    case INTERVIEW_ACTIONS.PRESENT_EVALUATION:
      return {
        state: 'ready_for_explanation',
        nextAction: 'wait_for_user',
        presentation: { kind: 'evaluation', practiceId, questionId: data.questionId, attemptId: data.attemptId },
        assistantResponse: exact('评价已完成，请查看卡片。你可以查看讲解、重新作答或进入下一题。'),
      }
    case INTERVIEW_ACTIONS.REQUEST_EXPLANATION: {
      const event = eventOf(result, 'explanation.generation_requested')
      return {
        state: 'generating_explanation',
        nextAction: 'generate_explanation',
        presentation: null,
        assistantResponse: continueSilently(),
        context: { practiceId, questionId: event?.questionId || data.questionId },
      }
    }
    case INTERVIEW_ACTIONS.PRESENT_EXPLANATION:
      return {
        state: 'awaiting_next',
        nextAction: 'wait_for_user',
        presentation: { kind: 'explanation', practiceId, questionId: data.questionId },
        assistantResponse: exact('讲解已生成，请查看卡片。'),
      }
    case INTERVIEW_ACTIONS.REQUEST_NEXT:
      return { state: 'awaiting_question', nextAction: 'generate_question', presentation: null, assistantResponse: continueSilently(), context: data }
    case INTERVIEW_ACTIONS.RETRY_QUESTION:
      return {
        state: 'awaiting_answer',
        nextAction: 'wait_for_user',
        presentation: { kind: 'question', practiceId, questionId: data.currentQuestion?.id || data.questionId },
        assistantResponse: exact('已切换到这道题，请重新作答。'),
      }
    case INTERVIEW_ACTIONS.FINISH_PRACTICE:
      return {
        state: 'completed',
        nextAction: 'wait_for_user',
        presentation: { kind: 'finished', practiceId },
        assistantResponse: exact('本次练习已结束，复盘已归档。'),
      }
    case INTERVIEW_ACTIONS.LIST_PRACTICES:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'library' }, assistantResponse: exact('练习档案已打开。') }
    case INTERVIEW_ACTIONS.GET_PRACTICE:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'library', practiceId }, assistantResponse: exact('练习档案已打开。') }
    case INTERVIEW_ACTIONS.GET_INSIGHTS:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'insights' }, assistantResponse: exact('能力复盘已生成，请查看卡片。') }
    case INTERVIEW_ACTIONS.EXPORT_PRACTICES:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'exported' }, assistantResponse: exact('复盘文档已生成，请通过卡片下载。') }
    case INTERVIEW_ACTIONS.DELETE_PRACTICE:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'deleted' }, assistantResponse: exact('练习已删除。') }
    default:
      throw new TypeError(`不支持的面试动作：${String(action)}`)
  }
}

export function createInteractionResult(action, result) {
  return {
    protocol: PROTOCOL,
    action,
    revision: result.revision ?? 0,
    ...descriptor(action, result),
    resource: result.resource,
    events: result.events || [],
  }
}

export function createAgentProtocolError(action, error) {
  return {
    protocol: PROTOCOL,
    action,
    revision: 0,
    state: 'recovering',
    nextAction: 'read_status_and_retry',
    presentation: null,
    assistantResponse: continueSilently(),
    error: {
      audience: 'agent',
      code: error.code || 'AGENT_PROTOCOL_ERROR',
      message: error.message || '工具参数或工作流状态无效',
      recoverable: true,
      details: error.details,
    },
    resource: null,
    events: [],
  }
}

export function toAgentInteractionResult(interaction) {
  const assistantInstruction = interaction.assistantResponse.mode === 'continue'
    ? '继续执行 nextAction 指定的必要步骤，不要向用户输出普通文本。'
    : `立即结束当前工具链，最终回复必须且只能是“${interaction.assistantResponse.text}”，不得复述 UI 内容。`
  return {
    protocol: interaction.protocol,
    action: interaction.action,
    revision: interaction.revision,
    state: interaction.state,
    nextAction: interaction.nextAction,
    presentation: interaction.presentation,
    assistantResponse: interaction.assistantResponse,
    assistantInstruction,
    ...(interaction.context ? { context: interaction.context } : {}),
    ...(interaction.error ? { error: interaction.error } : {}),
  }
}

export { PROTOCOL as INTERACTION_PROTOCOL }
