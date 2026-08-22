import { INTERVIEW_ACTIONS } from '../../application/interview-actions.js'
import { toAgentInteractionResult } from '../../application/interaction-result.js'
import { INTERVIEW_TOOL_NAMES } from '../../protocol/interview-tool-names.js'
import { TOOL_RESULT_PROTOCOL } from './assistant-response-policy.js'
import { ANSWER_SUBMISSION_POLICY, CONTINUE_PRACTICE_POLICY, LEETCODE_EXPLANATION_POLICY, PRACTICE_CONFIGURATION_POLICY, QUESTION_GENERATION_POLICY } from './interview-prompt-policy.js'
import { LEETCODE_LANGUAGE_IDS } from '../../domain/leetcode-languages.js'

const emptyParameters = Object.freeze({ type: 'object', properties: {}, additionalProperties: false })

function idParameters(name, description) {
  return {
    type: 'object',
    properties: { [name]: { type: 'string', minLength: 1, description } },
    required: [name],
    additionalProperties: false,
  }
}

function practiceConfigurationParameters({ includePracticeId = false } = {}) {
  const identityProperties = includePracticeId
    ? { practice_id: { type: 'string', minLength: 1, description: '练习 ID' } }
    : {}
  const identityRequired = includePracticeId ? ['practice_id'] : []
  const variant = (mode, properties, required) => ({
    type: 'object',
    properties: { ...identityProperties, mode: { const: mode }, ...properties },
    required: [...identityRequired, 'mode', ...required],
    additionalProperties: false,
  })
  return {
    type: 'object',
    oneOf: [
      variant('bagu', { topic: { type: 'string', minLength: 1, description: '用户明确提供的八股主题原文。' } }, ['topic']),
      variant('scenario', { topic: { type: 'string', minLength: 1, description: '用户明确提供的场景题主题原文。' } }, ['topic']),
      variant('leetcode', {
        language: { type: 'string', enum: LEETCODE_LANGUAGE_IDS, description: '用户明确选择的刷题语言，禁止默认。' },
      }, ['language']),
      variant('mock', {
        resume: { type: 'string', minLength: 1, description: '用户明确提供的完整简历内容。' },
        interviewer_style: { type: 'string', minLength: 1, description: '用户明确选择的面试官风格。' },
        coding: { type: 'boolean', description: '用户明确选择是否包含手撕代码，禁止默认。' },
        difficulty: { type: 'string', enum: ['junior', 'intermediate', 'senior'], description: '用户明确选择的面试难度。' },
      }, ['resume', 'interviewer_style', 'coding', 'difficulty']),
    ],
  }
}

function practiceConfigurationPayload(args) {
  return {
    ...(args.practice_id ? { practiceId: args.practice_id } : {}),
    mode: args.mode,
    config: args.mode === 'mock'
      ? { resume: args.resume, interviewerStyle: args.interviewer_style, coding: args.coding, difficulty: args.difficulty }
      : args.mode === 'leetcode' ? { language: args.language } : { topic: args.topic },
  }
}

function sessionIdOf(exec) {
  const sessionId = exec?.agent?.session?.header?.id || exec?.agent?.session?.id
  if (typeof sessionId !== 'string' || !sessionId.trim()) throw new TypeError('DSH 会话 ID 缺失')
  return sessionId.trim()
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
    description: `${description}${TOOL_RESULT_PROTOCOL}`,
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
    description: `开始一条全新的练习。刷力扣模式会直接从固定题库随机抽题并展示；其他模式成功后先调用 interview_read_practice_context 读取已保存配置，再按 nextAction 生成第一题。${PRACTICE_CONFIGURATION_POLICY}`,
    parameters: practiceConfigurationParameters(),
    payload: practiceConfigurationPayload,
  }),
  atomicTool({
    name: 'interview_update_practice', action: INTERVIEW_ACTIONS.UPDATE_PRACTICE,
    description: '完整替换指定练习的模式配置。只传入用户明确提供的当前模式全部必填字段，禁止保留、推断或补全其他字段。',
    parameters: practiceConfigurationParameters({ includePracticeId: true }),
    payload: practiceConfigurationPayload,
  }),
  atomicTool({
    name: 'interview_continue_practice', action: INTERVIEW_ACTIONS.CONTINUE_PRACTICE,
    description: `用户明确表达继续、接着练或恢复练习时必须调用的唯一入口。从后端权威阶段恢复业务并返回当前应展示的 UI 产物，不把“继续”简单等同于“下一题”。禁止读取历史上下文后通过普通 Assistant Text 自行复述题目、点评或总结。trigger 仅供插件题目展示事件按指令传入，用户主动继续时禁止自行填写。${CONTINUE_PRACTICE_POLICY}`,
    parameters: {
      type: 'object',
      properties: {
        trigger: { type: 'string', enum: ['practice_started', 'next_requested'], description: '插件事件明确提供的题目展示来源。' },
      },
      additionalProperties: false,
    },
  }),
  atomicTool({
    name: 'interview_select_practice', action: INTERVIEW_ACTIONS.SELECT_PRACTICE, description: '把当前会话切换到指定练习。返回上下文包含该练习配置、总结、全部题目、历次作答、评价和讲解；最终只确认已切换到当前练习，不继续执行其他动作。',
    parameters: idParameters('practice_id', '练习 ID'), payload: (args) => ({ practiceId: args.practice_id }),
  }),
  atomicTool({
    name: 'interview_reopen_practice', action: INTERVIEW_ACTIONS.REOPEN_PRACTICE, description: '重新打开一条已经结束的练习。',
    parameters: idParameters('practice_id', '练习 ID'), payload: (args) => ({ practiceId: args.practice_id }),
  }),
  atomicTool({ name: 'interview_finish_practice', action: INTERVIEW_ACTIONS.REQUEST_FINISH, description: '结束当前练习。力扣练习会立即在本地结束并汇总本次抽取的题目，收到最终响应后必须停止；其他模式必须基于返回的完整上下文生成总结，再调用 interview_complete_summary。' }),
  atomicTool({
    name: 'interview_complete_summary', action: INTERVIEW_ACTIONS.COMPLETE_SUMMARY,
    description: '仅用于非力扣模式：保存基于完整练习上下文生成的面试分析总结，并正式结束练习。力扣练习禁止调用。',
    parameters: {
      type: 'object',
      properties: {
        overall: { type: 'string', minLength: 1, description: '本次练习的总体总结。' },
        strengths: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 }, description: '用户表现亮点。' },
        improvements: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 }, description: '后续改进建议。' },
      },
      required: ['overall', 'strengths', 'improvements'],
      additionalProperties: false,
    },
  }),
  atomicTool({
    name: 'interview_present_question',
    action: INTERVIEW_ACTIONS.PRESENT_QUESTION,
    description: `保存并通过 UI 展示一道已经生成完成的面试题。你必须先自行生成题目，再把题目放入必填 prompt；本工具不会替你生成题目，禁止空参数调用。${QUESTION_GENERATION_POLICY}`,
    parameters: {
      type: 'object',
      properties: { prompt: { type: 'string', minLength: 1, maxLength: 120, description: '可以直接向候选人展示的一道简短问题。' } },
      required: ['prompt'],
      additionalProperties: false,
    },
  }),
  atomicTool({
    name: 'interview_get_question', action: INTERVIEW_ACTIONS.GET_QUESTION, description: '读取指定练习中的一道题及其全部作答、评价和讲解。',
    parameters: {
      type: 'object',
      properties: {
        practice_id: { type: 'string', minLength: 1 },
        question_id: { type: 'string', minLength: 1 },
      },
      required: ['practice_id', 'question_id'],
      additionalProperties: false,
    },
    payload: (args) => ({ practiceId: args.practice_id, questionId: args.question_id }),
  }),
  atomicTool({
    name: 'interview_update_question', action: INTERVIEW_ACTIONS.UPDATE_QUESTION, description: '修改指定题目的题干，不改变历次作答、评价和讲解。新题干仍必须是一道简短、单一问题。',
    parameters: {
      type: 'object',
      properties: {
        practice_id: { type: 'string', minLength: 1 },
        question_id: { type: 'string', minLength: 1 },
        prompt: { type: 'string', minLength: 1, maxLength: 120 },
      },
      required: ['practice_id', 'question_id', 'prompt'],
      additionalProperties: false,
    },
    payload: (args) => ({ practiceId: args.practice_id, questionId: args.question_id, prompt: args.prompt }),
  }),
  atomicTool({
    name: 'interview_delete_question', action: INTERVIEW_ACTIONS.DELETE_QUESTION, description: '永久删除指定题目及其全部作答、评价和讲解。仅在用户明确确认后调用。',
    parameters: {
      type: 'object',
      properties: {
        practice_id: { type: 'string', minLength: 1 },
        question_id: { type: 'string', minLength: 1 },
      },
      required: ['practice_id', 'question_id'],
      additionalProperties: false,
    },
    payload: (args) => ({ practiceId: args.practice_id, questionId: args.question_id }),
  }),
  atomicTool({
    name: 'interview_open_question', action: INTERVIEW_ACTIONS.OPEN_QUESTION, description: '打开并通过 UI 展示指定历史题目，不创建新题。',
    parameters: idParameters('question_id', '题目 ID'), payload: (args) => ({ questionId: args.question_id }),
  }),
  atomicTool({ name: 'interview_request_next', action: INTERVIEW_ACTIONS.REQUEST_NEXT, description: '请求进入下一题。刷力扣模式由插件直接随机抽题；其他模式严格按照返回的 nextAction 继续生成并展示题目。' }),
  atomicTool({
    name: 'interview_retry_question', action: INTERVIEW_ACTIONS.RETRY_QUESTION, description: '把指定历史题切换为当前待回答题目。',
    parameters: idParameters('question_id', '题目 ID'), payload: (args) => ({ questionId: args.question_id }),
  }),
  atomicTool({
    name: 'interview_reveal_answer', action: INTERVIEW_ACTIONS.REVEAL_ANSWER,
    description: '用户明确选择查看当前面试题答案或讲解当前力扣题时调用。不得伪造作答或评价；按照返回的 nextAction 生成内容，并严格遵守 interview_complete_review 的对应讲解约束。',
    parameters: {
      type: 'object',
      properties: { question_id: { type: 'string', minLength: 1, description: '当前题目 ID；省略时使用会话当前题。' } },
      additionalProperties: false,
    },
    payload: (args) => ({ questionId: args.question_id }),
  }),
  atomicTool({
    name: 'interview_submit_answer',
    action: INTERVIEW_ACTIONS.SUBMIT_ANSWER,
    description: `原样保存用户对当前题目的正式回答。成功后必须按 nextAction 继续生成评价。${ANSWER_SUBMISSION_POLICY}`,
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
    description: `保存当前题目的完整讲解。面试题的 memorization_points 是直接背；力扣题的 detail 必须包含算法教学与练习配置语言的一份完整代码，禁止输出其他语言，memorization_points 是解题要点。${LEETCODE_EXPLANATION_POLICY}`,
    parameters: {
      type: 'object',
      properties: {
        detail: { type: 'string', minLength: 1, description: '完整讲解；力扣题必须包含练习配置语言的一份完整答案代码。' },
        memorization_points: { type: 'string', minLength: 1, description: '面试题填写直接背；力扣题填写精炼解题要点。' },
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
        mode: { type: 'string', enum: ['bagu', 'mock', 'scenario', 'leetcode'] },
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
  atomicTool({ name: 'interview_get_leetcode_catalog', action: INTERVIEW_ACTIONS.GET_LEETCODE_CATALOG, description: '按力扣热题 100 官方题型分组打开全部题目，展示题目地址、难度和本地完成状态。' }),
  atomicTool({
    name: 'interview_set_leetcode_completion', action: INTERVIEW_ACTIONS.SET_LEETCODE_COMPLETION,
    description: '将力扣热题 100 中指定题目标记为完成或未完成。completed 必须由用户明确表达，禁止自行推断。',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', minLength: 1, description: '固定题库中的题目标识，例如 two-sum。' },
        completed: { type: 'boolean', description: '用户明确指定的完成状态。' },
      },
      required: ['slug', 'completed'],
      additionalProperties: false,
    },
  }),
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
