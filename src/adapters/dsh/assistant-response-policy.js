export const TOOL_RESULT_PROTOCOL = '调用后必须严格执行返回的 assistantInstruction。'

export const ASSISTANT_RESPONSE_PROTOCOL = '响应协议：严格读取工具返回的 nextAction、assistantResponse 和 assistantInstruction。assistantResponse.mode=continue 时继续必要工具调用且不输出普通文本；mode=exact 时立即结束工具链，最终回复必须严格等于 text，不得复述 UI 卡片内容。'
