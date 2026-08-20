const exact = (text) => Object.freeze({
  mode: 'exact',
  text,
  mustNotRepeatResource: true,
})

const CONTINUE = Object.freeze({
  mode: 'continue',
  text: null,
  mustNotRepeatResource: true,
})

const RESPONSES = Object.freeze({
  question: exact('已出题，请开始作答。'),
  evaluation: exact('评价已完成，请查看卡片。你可以查看讲解、重新作答或进入下一题。'),
  explanation: exact('讲解已生成，请查看卡片。'),
  library: exact('练习档案已打开。'),
  insights: exact('能力复盘已生成，请查看卡片。'),
  deleted: exact('练习已删除。'),
  exported: exact('复盘文档已生成，请通过卡片下载。'),
  finished: exact('本次练习已结束，复盘已归档。'),
  session: exact('当前练习状态已更新，请查看卡片。'),
})

function sessionResponse(command, data) {
  if (command === 'start') return CONTINUE
  if (command === 'finish') return RESPONSES.finished
  if (['select', 'reopen'].includes(command) && data?.phase === 'awaiting_question') return CONTINUE
  if (command === 'status' && ['awaiting_question', 'generating_explanation'].includes(data?.phase)) return CONTINUE
  return RESPONSES.session
}

export function assistantResponseFor({ toolName, command, data }) {
  switch (toolName) {
    case 'interview_session': return sessionResponse(command, data)
    case 'interview_question':
      if (['ask', 'open'].includes(command)) return RESPONSES.question
      if (command === 'save_explanation') return RESPONSES.explanation
      return CONTINUE
    case 'interview_answer':
      return command === 'evaluate' ? RESPONSES.evaluation : CONTINUE
    case 'interview_library':
      if (command === 'insights') return RESPONSES.insights
      if (command === 'delete') return RESPONSES.deleted
      if (command === 'export') return RESPONSES.exported
      return RESPONSES.library
    default:
      return CONTINUE
  }
}

export function assistantResponseInstruction(response) {
  if (response.mode === 'continue') {
    return '这是工作流中间步骤：继续执行下一项必要工具调用，不要向用户输出普通文本，也不要复述资源内容。'
  }
  return `这是工作流终态：完成必要工具调用后立即结束本轮，最终回复必须且只能是“${response.text}”，不要添加标题、表格、题目、评价、讲解或其他说明。`
}

export const ASSISTANT_RESPONSE_PROTOCOL = '响应协议：工具结果末尾包含 assistant_response。mode=continue 时继续调用必要工具且不输出普通文本；mode=exact 时立即结束本轮，最终回复必须严格等于 text，不得复述 UI 卡片内容。'

export { CONTINUE }
