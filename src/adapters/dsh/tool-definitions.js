function sessionIdOf(exec) {
  return exec?.agent?.session?.header?.id || exec?.agent?.session?.id || 'global'
}

function modelText(value) {
  const resource = value?.resource || { kind: 'unknown', data: null }
  const lines = [`resource_kind: ${resource.kind}`, `revision: ${value?.revision ?? 0}`]
  const data = resource.data
  if (data && typeof data === 'object') lines.push(`resource_data:\n${JSON.stringify(data, null, 2)}`)
  if (Array.isArray(value?.events) && value.events.length) {
    lines.push(`events:\n${JSON.stringify(value.events, null, 2)}`)
  }
  return [{ type: 'text', text: lines.join('\n') }]
}

const baseOutput = {
  schema: { type: 'object', additionalProperties: true },
  render: (_args, value) => modelText(value),
}

const sessionTool = (application) => ({
  name: 'interview_session',
  description: '管理面试练习生命周期。开始练习后会进入 awaiting_question；随后必须调用 interview_question.ask 保存并展示第一题。status 返回权威会话状态。完成练习用 finish；已结束练习必须显式 reopen 后才能继续。',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', enum: ['start', 'status', 'select', 'finish', 'reopen'] },
      practice_id: { type: 'string' },
      mode: { type: 'string', enum: ['bagu', 'mock', 'scenario', 'resume'] },
      topic: { type: 'string' },
      source_kind: { type: 'string', enum: ['topic', 'resume', 'job_description'] },
      source_content: { type: 'string' },
      difficulty: { type: 'string', enum: ['junior', 'intermediate', 'senior'] },
      target_question_count: { type: 'integer', minimum: 1, maximum: 100 },
      follow_up: { type: 'boolean' },
    },
    required: ['command'],
  },
  output: baseOutput,
  async execute(args, exec) {
    const sessionId = sessionIdOf(exec)
    switch (args.command) {
      case 'start':
        return application.startPractice(sessionId, {
          mode: args.mode,
          topic: args.topic,
          source: { kind: args.source_kind || (args.mode === 'resume' ? 'resume' : 'topic'), content: args.source_content || args.topic || '' },
          config: {
            difficulty: args.difficulty,
            targetQuestionCount: args.target_question_count,
            followUp: args.follow_up,
          },
        })
      case 'status': return application.getSession(sessionId)
      case 'select': return application.selectPractice(sessionId, args.practice_id)
      case 'finish': return application.completePractice(sessionId)
      case 'reopen': return application.reopenPractice(sessionId, args.practice_id)
      default: throw new TypeError(`不支持的 session command：${String(args.command)}`)
    }
  },
})

const questionTool = (application) => ({
  name: 'interview_question',
  description: '管理当前题目工作流。ask 只能在 awaiting_question 阶段调用；用户明确要求讲解后先 request_explanation，再用 save_explanation 保存完整讲解；next 会请求生成下一题，随后再调用 ask。重新回答旧题使用 retry，不创建重复题目。',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', enum: ['ask', 'open', 'request_explanation', 'save_explanation', 'next', 'retry'] },
      question_id: { type: 'string' },
      prompt: { type: 'string' },
      detail: { type: 'string' },
      memorization_points: { type: 'string' },
    },
    required: ['command'],
  },
  output: baseOutput,
  async execute(args, exec) {
    const sessionId = sessionIdOf(exec)
    switch (args.command) {
      case 'ask': return application.askQuestion(sessionId, { prompt: args.prompt })
      case 'open': return application.openQuestion(sessionId, args.question_id)
      case 'request_explanation': return application.requestExplanation(sessionId)
      case 'save_explanation': return application.saveExplanation(sessionId, {
        questionId: args.question_id,
        detail: args.detail,
        memorizationPoints: args.memorization_points,
      })
      case 'next': return application.requestNextQuestion(sessionId)
      case 'retry': return application.retryQuestion(sessionId, args.question_id)
      default: throw new TypeError(`不支持的 question command：${String(args.command)}`)
    }
  },
})

const answerTool = (application) => ({
  name: 'interview_answer',
  description: '提交和评价当前回答。用户发送回答后调用 submit，必须原样保存用户回答；随后调用 evaluate 结构化保存评分和反馈。每次重新回答会生成新的 attempt，禁止覆盖已评价记录。',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', enum: ['submit', 'evaluate'] },
      question_id: { type: 'string' },
      attempt_id: { type: 'string' },
      answer: { type: 'string' },
      score: { type: 'number', minimum: 0, maximum: 10 },
      feedback: { type: 'string' },
      dimensions: {
        type: 'object',
        additionalProperties: { type: 'number', minimum: 0, maximum: 10 },
      },
    },
    required: ['command'],
  },
  output: baseOutput,
  async execute(args, exec) {
    const sessionId = sessionIdOf(exec)
    switch (args.command) {
      case 'submit': return application.submitAnswer(sessionId, { questionId: args.question_id, answer: args.answer })
      case 'evaluate': return application.evaluateAnswer(sessionId, {
        questionId: args.question_id,
        attemptId: args.attempt_id,
        score: args.score,
        feedback: args.feedback,
        dimensions: args.dimensions,
      })
      default: throw new TypeError(`不支持的 answer command：${String(args.command)}`)
    }
  },
})

const libraryTool = (application) => ({
  name: 'interview_library',
  description: '查询和管理本地练习档案。list/get/insights 返回结构化读模型；export 返回受控下载令牌；delete 仅在用户明确确认删除后调用。读取操作不会隐式切换当前练习。',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', enum: ['list', 'get', 'insights', 'export', 'delete'] },
      practice_id: { type: 'string' },
      practice_ids: { type: 'array', items: { type: 'string' } },
      query: { type: 'string' },
      mode: { type: 'string', enum: ['bagu', 'mock', 'scenario', 'resume'] },
      status: { type: 'string', enum: ['active', 'completed'] },
      scope: { type: 'string', enum: ['selected', 'all'] },
      include: {
        type: 'array',
        items: { type: 'string', enum: ['metadata', 'questions', 'answers', 'evaluations', 'explanations', 'summary'] },
      },
    },
    required: ['command'],
  },
  output: baseOutput,
  async execute(args, exec) {
    const sessionId = sessionIdOf(exec)
    switch (args.command) {
      case 'list': return application.listPractices({ query: args.query, mode: args.mode, status: args.status })
      case 'get': return application.getPractice(args.practice_id)
      case 'insights': return application.getInsights()
      case 'export': {
        let practiceIds = args.practice_ids || (args.practice_id ? [args.practice_id] : undefined)
        if (!practiceIds?.length && args.scope !== 'all') {
          const session = await application.getSession(sessionId)
          const selectedId = session.resource.data.practice?.id
          practiceIds = selectedId ? [selectedId] : undefined
        }
        return application.exportPractices({ practiceIds, scope: args.scope, include: args.include })
      }
      case 'delete': return application.deletePractice(args.practice_id, sessionId)
      default: throw new TypeError(`不支持的 library command：${String(args.command)}`)
    }
  },
})

export function createToolDefinitions(application) {
  return [sessionTool(application), questionTool(application), answerTool(application), libraryTool(application)]
}

export { modelText, sessionIdOf }
