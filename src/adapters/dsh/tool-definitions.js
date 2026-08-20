import { INTERVIEW_ACTIONS } from '../../application/interview-actions.js'
import { toAgentInteractionResult } from '../../application/interaction-result.js'
import { INTERVIEW_TOOL_NAMES } from '../../protocol/interview-tool-names.js'
import { ASSISTANT_RESPONSE_PROTOCOL } from './assistant-response-policy.js'

const emptyParameters = Object.freeze({ type: 'object', properties: {}, additionalProperties: false })

function idParameters(name, description) {
  return {
    type: 'object',
    properties: { [name]: { type: 'string', minLength: 1, description } },
    required: [name],
    additionalProperties: false,
  }
}

function sessionIdOf(exec) {
  return exec?.agent?.session?.header?.id || exec?.agent?.session?.id || 'global'
}

function modelText(interaction) {
  return [{ type: 'text', text: JSON.stringify(toAgentInteractionResult(interaction), null, 2) }]
}

const output = {
  schema: { type: 'object', additionalProperties: true },
  render: (_args, interaction) => modelText(interaction),
}

function atomicTool({ name, description, action, parameters = emptyParameters, payload = (args) => args }) {
  return (coordinator) => ({
    name,
    description: `${description}${ASSISTANT_RESPONSE_PROTOCOL}`,
    parameters,
    output,
    execute(args, exec) {
      return coordinator.execute({
        sessionId: sessionIdOf(exec),
        action,
        payload: payload(args || {}),
        source: 'agent',
      })
    },
  })
}

const tools = [
  atomicTool({
    name: 'interview_start_practice',
    action: INTERVIEW_ACTIONS.START_PRACTICE,
    description: '开始一条全新的面试练习。成功后必须按 nextAction 继续生成第一题。',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['bagu', 'mock', 'scenario', 'resume'], description: '练习模式。bagu 表示八股题。' },
        topic: { type: 'string', minLength: 1, description: '练习主题。' },
        source_kind: { type: 'string', enum: ['topic', 'resume', 'job_description'] },
        source_content: { type: 'string' },
        difficulty: { type: 'string', enum: ['junior', 'intermediate', 'senior'] },
        target_question_count: { type: 'integer', minimum: 1, maximum: 100 },
        follow_up: { type: 'boolean' },
      },
      required: ['mode', 'topic'],
      additionalProperties: false,
    },
    payload: (args) => ({
      mode: args.mode,
      topic: args.topic,
      source: { kind: args.source_kind || (args.mode === 'resume' ? 'resume' : 'topic'), content: args.source_content || args.topic },
      config: { difficulty: args.difficulty, targetQuestionCount: args.target_question_count, followUp: args.follow_up },
    }),
  }),
  atomicTool({ name: 'interview_get_status', action: INTERVIEW_ACTIONS.GET_STATUS, description: '读取当前面试会话的权威状态。只在需要判断 nextAction 或用户明确查询状态时调用。' }),
  atomicTool({
    name: 'interview_select_practice', action: INTERVIEW_ACTIONS.SELECT_PRACTICE, description: '把当前会话切换到指定练习。',
    parameters: idParameters('practice_id', '练习 ID'), payload: (args) => ({ practiceId: args.practice_id }),
  }),
  atomicTool({
    name: 'interview_reopen_practice', action: INTERVIEW_ACTIONS.REOPEN_PRACTICE, description: '重新打开一条已经结束的练习。',
    parameters: idParameters('practice_id', '练习 ID'), payload: (args) => ({ practiceId: args.practice_id }),
  }),
  atomicTool({ name: 'interview_finish_practice', action: INTERVIEW_ACTIONS.FINISH_PRACTICE, description: '结束并归档当前练习。' }),
  atomicTool({
    name: 'interview_present_question',
    action: INTERVIEW_ACTIONS.PRESENT_QUESTION,
    description: '保存并通过 UI 展示一道已经生成完成的面试题。你必须先自行生成完整题目，再把完整题目放入必填 prompt；本工具不会替你生成题目，禁止空参数调用。',
    parameters: {
      type: 'object',
      properties: { prompt: { type: 'string', minLength: 1, description: '已经生成完成、可以直接向候选人展示的完整题目。' } },
      required: ['prompt'],
      additionalProperties: false,
    },
  }),
  atomicTool({
    name: 'interview_open_question', action: INTERVIEW_ACTIONS.OPEN_QUESTION, description: '打开并通过 UI 展示指定历史题目，不创建新题。',
    parameters: idParameters('question_id', '题目 ID'), payload: (args) => ({ questionId: args.question_id }),
  }),
  atomicTool({ name: 'interview_request_next', action: INTERVIEW_ACTIONS.REQUEST_NEXT, description: '请求进入下一题。成功后必须按照 nextAction 生成完整题目并调用 interview_present_question。' }),
  atomicTool({
    name: 'interview_retry_question', action: INTERVIEW_ACTIONS.RETRY_QUESTION, description: '把指定历史题切换为当前待回答题目。',
    parameters: idParameters('question_id', '题目 ID'), payload: (args) => ({ questionId: args.question_id }),
  }),
  atomicTool({
    name: 'interview_submit_answer',
    action: INTERVIEW_ACTIONS.SUBMIT_ANSWER,
    description: '原样保存用户对当前题目的回答。成功后必须按 nextAction 继续生成评价。',
    parameters: {
      type: 'object',
      properties: {
        answer: { type: 'string', minLength: 1, description: '用户原始回答，不得改写。' },
        question_id: { type: 'string', minLength: 1 },
      },
      required: ['answer'],
      additionalProperties: false,
    },
    payload: (args) => ({ answer: args.answer, questionId: args.question_id }),
  }),
  atomicTool({
    name: 'interview_save_evaluation',
    action: INTERVIEW_ACTIONS.SAVE_EVALUATION,
    description: '保存当前回答的结构化评价。若 nextAction=generate_explanation，必须继续读取练习上下文并调用 interview_complete_review，不得在评价后停止。',
    parameters: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 10 },
        feedback: { type: 'string', minLength: 1 },
        dimensions: { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 10 } },
        question_id: { type: 'string', minLength: 1 },
        attempt_id: { type: 'string', minLength: 1 },
      },
      required: ['score', 'feedback'],
      additionalProperties: false,
    },
    payload: (args) => ({ score: args.score, feedback: args.feedback, dimensions: args.dimensions, questionId: args.question_id, attemptId: args.attempt_id }),
  }),
  atomicTool({
    name: 'interview_complete_review',
    action: INTERVIEW_ACTIONS.COMPLETE_REVIEW,
    description: '保存完整参考讲解和直接背要点，并通过 UI 展示包含评价、讲解和背诵要点的本题复盘。',
    parameters: {
      type: 'object',
      properties: {
        detail: { type: 'string', minLength: 1, description: '完整参考讲解。' },
        memorization_points: { type: 'string', minLength: 1, description: '可直接复述的精炼背诵要点。' },
        question_id: { type: 'string', minLength: 1 },
      },
      required: ['detail', 'memorization_points'],
      additionalProperties: false,
    },
    payload: (args) => ({ detail: args.detail, memorizationPoints: args.memorization_points, questionId: args.question_id }),
  }),
  atomicTool({
    name: 'interview_list_practices', action: INTERVIEW_ACTIONS.LIST_PRACTICES, description: '打开练习档案，可按主题、模式和状态筛选。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        mode: { type: 'string', enum: ['bagu', 'mock', 'scenario', 'resume'] },
        status: { type: 'string', enum: ['active', 'completed'] },
      },
      additionalProperties: false,
    },
  }),
  atomicTool({
    name: 'interview_read_practice_context', action: INTERVIEW_ACTIONS.READ_PRACTICE_CONTEXT, description: '仅供生成题目、评价或讲解时静默读取指定练习的完整上下文；不会打开 UI。读取后必须继续当前工作流。',
    parameters: idParameters('practice_id', '练习 ID'), payload: (args) => ({ practiceId: args.practice_id }),
  }),
  atomicTool({
    name: 'interview_get_practice', action: INTERVIEW_ACTIONS.GET_PRACTICE, description: '打开指定练习的完整档案。',
    parameters: idParameters('practice_id', '练习 ID'), payload: (args) => ({ practiceId: args.practice_id }),
  }),
  atomicTool({ name: 'interview_get_insights', action: INTERVIEW_ACTIONS.GET_INSIGHTS, description: '生成并展示全部练习的能力复盘。' }),
  atomicTool({
    name: 'interview_export_practices', action: INTERVIEW_ACTIONS.EXPORT_PRACTICES, description: '导出当前练习、指定练习或全部练习的 Markdown 复盘。',
    parameters: {
      type: 'object',
      properties: {
        practice_ids: { type: 'array', items: { type: 'string', minLength: 1 } },
        scope: { type: 'string', enum: ['selected', 'all'] },
        include: { type: 'array', items: { type: 'string', enum: ['metadata', 'questions', 'answers', 'evaluations', 'explanations', 'summary'] } },
      },
      additionalProperties: false,
    },
    payload: (args) => ({ practiceIds: args.practice_ids, scope: args.scope, include: args.include }),
  }),
  atomicTool({
    name: 'interview_delete_practice', action: INTERVIEW_ACTIONS.DELETE_PRACTICE, description: '永久删除指定练习。仅在用户明确确认删除后调用。',
    parameters: idParameters('practice_id', '练习 ID'), payload: (args) => ({ practiceId: args.practice_id }),
  }),
]

export function createToolDefinitions(coordinator) {
  return tools.map((create) => create(coordinator))
}

export { INTERVIEW_TOOL_NAMES, modelText, sessionIdOf }
