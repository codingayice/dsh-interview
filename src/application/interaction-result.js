import { INTERVIEW_ACTIONS } from './interview-actions.js'

const PROTOCOL = 'dsh-interview/interaction-v1'

const exact = (text) => ({ mode: 'exact', text, mustNotRepeatResource: true })
const continueSilently = () => ({ mode: 'continue', text: null, mustNotRepeatResource: true })

function referencesOf(result, ...names) {
  return Object.fromEntries(names.map((name) => {
    const value = result.references?.[name]
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`面试动作结果缺少 ${name} 引用`)
    return [name, value]
  }))
}

function optionalReference(result, name) {
  const value = result.references?.[name]
  return typeof value === 'string' && value.trim() ? { [name]: value } : {}
}

function descriptor(action, result) {
  const data = result.resource?.data
  switch (action) {
    case INTERVIEW_ACTIONS.START_PRACTICE:
      if (data.leetcode) {
        return {
          state: 'awaiting_solution',
          nextAction: 'wait_for_user',
          presentation: { kind: 'question', ...referencesOf(result, 'practiceId', 'questionId') },
          assistantResponse: exact('已随机抽取一道力扣题，请开始刷题。'),
        }
      }
      return { state: data.phase, nextAction: 'generate_question', presentation: null, assistantResponse: continueSilently(), context: data }
    case INTERVIEW_ACTIONS.UPDATE_PRACTICE:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'library', ...referencesOf(result, 'practiceId') }, assistantResponse: exact('练习配置已更新。'), context: data }
    case INTERVIEW_ACTIONS.GET_STATUS: {
      const generating = ['awaiting_question', 'generating_explanation', 'generating_summary'].includes(data.phase)
      return {
        state: data.phase,
        nextAction: data.phase === 'awaiting_question'
          ? 'generate_question'
          : data.phase === 'generating_explanation'
            ? data.currentQuestion?.leetcode ? 'generate_leetcode_explanation' : 'generate_explanation'
            : data.phase === 'generating_summary'
              ? 'generate_summary'
              : 'wait_for_user',
        presentation: generating ? null : { kind: 'live-session' },
        assistantResponse: generating ? continueSilently() : exact('当前练习状态已更新，请查看卡片。'),
        context: data,
      }
    }
    case INTERVIEW_ACTIONS.CONTINUE_PRACTICE: {
      const nextAction = data.resumeAction
      if (nextAction === 'select_practice') {
        return {
          state: 'idle',
          nextAction,
          presentation: { kind: 'library' },
          assistantResponse: exact('当前没有选中的练习，请先选择一条练习。'),
        }
      }
      if (nextAction === 'show_current_question') {
        const leetcode = Boolean(data.question?.leetcode)
        const response = leetcode && data.trigger === 'next_requested'
          ? '已抽取下一题。'
          : leetcode && data.trigger === 'practice_started'
            ? '已抽取题目，请开始刷题。'
            : leetcode
              ? '已恢复当前力扣题，请继续刷题。'
              : '已恢复当前题，请继续作答。'
        return {
          state: data.phase,
          nextAction: 'wait_for_user',
          presentation: { kind: 'question', ...referencesOf(result, 'practiceId', 'questionId') },
          assistantResponse: exact(response),
        }
      }
      if (nextAction === 'confirm_reopen') {
        return {
          state: data.phase,
          nextAction,
          presentation: { kind: 'live-session' },
          assistantResponse: exact('当前练习已结束，如需继续请先确认重新打开。'),
          context: referencesOf(result, 'practiceId'),
        }
      }
      const context = nextAction === 'evaluate_answer'
        ? { ...referencesOf(result, 'practiceId', 'questionId', 'attemptId'), answer: data.attempt.answer }
        : {
            ...optionalReference(result, 'practiceId'),
            ...optionalReference(result, 'questionId'),
            ...optionalReference(result, 'attemptId'),
          }
      return {
        state: data.phase,
        nextAction,
        presentation: null,
        assistantResponse: continueSilently(),
        context,
      }
    }
    case INTERVIEW_ACTIONS.SELECT_PRACTICE:
      return {
        state: data.phase,
        nextAction: 'wait_for_user',
        presentation: null,
        assistantResponse: exact(`已切换到当前练习：${data.practice.topic}。`),
        context: data,
      }
    case INTERVIEW_ACTIONS.REOPEN_PRACTICE: {
      const needsQuestion = data.phase === 'awaiting_question'
      const needsExplanation = data.phase === 'generating_explanation'
      const generating = needsQuestion || needsExplanation
      return {
        state: data.phase,
        nextAction: needsQuestion
          ? 'generate_question'
          : needsExplanation
            ? data.currentQuestion?.leetcode ? 'generate_leetcode_explanation' : 'generate_explanation'
            : 'wait_for_user',
        presentation: generating ? null : { kind: 'live-session' },
        assistantResponse: generating ? continueSilently() : exact('练习已切换，请继续作答。'),
        context: data,
      }
    }
    case INTERVIEW_ACTIONS.PRESENT_QUESTION:
    case INTERVIEW_ACTIONS.OPEN_QUESTION:
      return {
        state: data.leetcode ? 'awaiting_solution' : 'awaiting_answer',
        nextAction: 'wait_for_user',
        presentation: { kind: 'question', ...referencesOf(result, 'practiceId', 'questionId') },
        assistantResponse: exact(data.leetcode ? '力扣题目已打开，请开始刷题。' : '已出题，请开始作答。'),
      }
    case INTERVIEW_ACTIONS.GET_QUESTION:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'library', ...referencesOf(result, 'practiceId') }, assistantResponse: exact('题目详情已打开。'), context: data }
    case INTERVIEW_ACTIONS.UPDATE_QUESTION:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'library', ...referencesOf(result, 'practiceId') }, assistantResponse: exact('题目已更新。'), context: data }
    case INTERVIEW_ACTIONS.DELETE_QUESTION:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'library', ...referencesOf(result, 'practiceId') }, assistantResponse: exact('题目已删除。') }
    case INTERVIEW_ACTIONS.SUBMIT_ANSWER:
      return {
        state: 'awaiting_evaluation',
        nextAction: 'evaluate_answer',
        presentation: null,
        assistantResponse: continueSilently(),
        context: { ...referencesOf(result, 'practiceId', 'questionId', 'attemptId'), answer: data.answer },
      }
    case INTERVIEW_ACTIONS.REVEAL_ANSWER: {
      const references = referencesOf(result, 'practiceId', 'questionId')
      return data.reviewReady
        ? {
            state: 'awaiting_next',
            nextAction: 'wait_for_user',
            presentation: { kind: 'review', ...references },
            assistantResponse: exact('答案讲解已打开，请查看卡片。'),
          }
        : {
            state: 'generating_explanation',
            nextAction: data.explanationType === 'leetcode_solution'
              ? 'generate_leetcode_explanation'
              : 'generate_explanation',
            presentation: null,
            assistantResponse: continueSilently(),
            context: { ...references, explanationType: data.explanationType },
          }
    }
    case INTERVIEW_ACTIONS.SAVE_EVALUATION: {
      const references = referencesOf(result, 'practiceId', 'questionId', 'attemptId')
      return result.resource.data.reviewReady
        ? {
            state: 'awaiting_next',
            nextAction: 'wait_for_user',
            presentation: { kind: 'review', ...references },
            assistantResponse: exact('点评讲解已生成，请查看卡片。'),
          }
        : {
            state: 'generating_explanation',
            nextAction: 'generate_explanation',
            presentation: null,
            assistantResponse: continueSilently(),
            context: references,
          }
    }
    case INTERVIEW_ACTIONS.COMPLETE_REVIEW:
      return {
        state: 'awaiting_next',
        nextAction: 'wait_for_user',
        presentation: { kind: 'review', ...referencesOf(result, 'practiceId', 'questionId'), ...optionalReference(result, 'attemptId') },
        assistantResponse: exact(data.explanationType === 'leetcode_solution'
          ? '题目讲解已生成，请查看卡片。'
          : '点评讲解已生成，请查看卡片。'),
      }
    case INTERVIEW_ACTIONS.REQUEST_NEXT:
      if (data.leetcode) {
        return {
          state: 'awaiting_solution',
          nextAction: 'wait_for_user',
          presentation: { kind: 'question', ...referencesOf(result, 'practiceId', 'questionId') },
          assistantResponse: exact('已抽取下一题。'),
        }
      }
      return { state: 'awaiting_question', nextAction: 'generate_question', presentation: null, assistantResponse: continueSilently(), context: data }
    case INTERVIEW_ACTIONS.RETRY_QUESTION:
      return {
        state: 'awaiting_answer',
        nextAction: 'wait_for_user',
        presentation: { kind: 'question', ...referencesOf(result, 'practiceId', 'questionId') },
        assistantResponse: exact('已切换到这道题，请重新作答。'),
      }
    case INTERVIEW_ACTIONS.REQUEST_FINISH:
      if (data.mode === 'leetcode') {
        return {
          state: 'completed',
          nextAction: 'wait_for_user',
          presentation: { kind: 'finished', ...referencesOf(result, 'practiceId') },
          assistantResponse: exact(`本次力扣练习已结束，共记录 ${data.summary.questionCount} 道题。`),
        }
      }
      return {
        state: 'generating_summary',
        nextAction: 'generate_summary',
        presentation: null,
        assistantResponse: continueSilently(),
        context: data,
      }
    case INTERVIEW_ACTIONS.COMPLETE_SUMMARY:
      return {
        state: 'completed',
        nextAction: 'wait_for_user',
        presentation: { kind: 'finished', ...referencesOf(result, 'practiceId') },
        assistantResponse: exact('本次练习已结束，总结已归档。'),
      }
    case INTERVIEW_ACTIONS.LIST_PRACTICES:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'library' }, assistantResponse: exact('练习档案已打开。') }
    case INTERVIEW_ACTIONS.READ_PRACTICE_CONTEXT:
      return { state: 'reading_context', nextAction: 'continue_workflow', presentation: null, assistantResponse: continueSilently(), context: data }
    case INTERVIEW_ACTIONS.GET_PRACTICE:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'library', ...referencesOf(result, 'practiceId') }, assistantResponse: exact('练习档案已打开。') }
    case INTERVIEW_ACTIONS.GET_INSIGHTS:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'insights' }, assistantResponse: exact('能力复盘已生成，请查看卡片。') }
    case INTERVIEW_ACTIONS.GET_LEETCODE_CATALOG:
      return { state: 'complete', nextAction: 'wait_for_user', presentation: { kind: 'leetcode-catalog' }, assistantResponse: exact('力扣热题 100 题目列表已打开。') }
    case INTERVIEW_ACTIONS.SET_LEETCODE_COMPLETION:
      return { state: data.completed ? 'completed' : 'incomplete', nextAction: 'wait_for_user', presentation: { kind: 'leetcode-catalog' }, assistantResponse: exact(data.completed ? '已标记为完成。' : '已标记为未完成。') }
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
    agentTasks: result.agentTasks || [],
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
      ...(error.details !== undefined ? { details: error.details } : {}),
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
