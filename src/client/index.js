import React from 'react'
import {
  CompactResultCard,
  EvaluationResultCard,
  ExplanationResultCard,
  LiveInterviewCard,
  QuestionResultCard,
  ToolErrorCard,
} from './features/live-interview.js'
import { InsightsCard, PracticeLibrary } from './features/practice-library.js'
import { TimelinePanel } from './features/timeline.js'
import { installStyles } from './shared/styles.js'
import { h, parseToolArgs, parseToolResult, toolCallState, toolErrorMessage } from './shared/ui.js'

export const name = 'dsh-interview'
export const inject = ['slots']

export function resolveToolView(toolName, block) {
  const state = toolCallState(block)
  if (state === 'running') return { kind: 'hidden' }
  if (state === 'error') return { kind: 'error', message: toolErrorMessage(block) }
  const args = parseToolArgs(block)
  const result = parseToolResult(block)

  if (toolName === 'interview_library') {
    if (args.command === 'list') return { kind: 'library' }
    if (args.command === 'get') return { kind: 'library', practiceId: args.practice_id }
    if (args.command === 'insights') return { kind: 'insights' }
    if (args.command === 'delete') return { kind: 'deleted' }
    if (args.command === 'export') return { kind: 'exported' }
  }

  if (toolName === 'interview_question') {
    if (['ask', 'open'].includes(args.command) && result?.kind === 'question') return { kind: 'question', data: result.data }
    if (args.command === 'save_explanation' && result?.kind === 'explanation') return { kind: 'explanation', data: result.data }
    return { kind: 'hidden' }
  }

  if (toolName === 'interview_answer') {
    if (args.command === 'evaluate' && result?.kind === 'evaluation') return { kind: 'evaluation', data: result.data }
    return { kind: 'hidden' }
  }

  if (toolName === 'interview_session') {
    if (['status', 'select', 'reopen'].includes(args.command)) return { kind: 'live' }
    if (args.command === 'finish') return { kind: 'finished', data: result?.data }
  }

  return { kind: 'hidden' }
}

function ToolResourceView({ toolName, sessionId, block }) {
  const view = resolveToolView(toolName, block)
  switch (view.kind) {
    case 'error': return h(ToolErrorCard, { message: view.message })
    case 'question': return h(QuestionResultCard, { question: view.data })
    case 'evaluation': return h(EvaluationResultCard, { evaluation: view.data })
    case 'explanation': return h(ExplanationResultCard, { explanation: view.data })
    case 'library': return h(PracticeLibrary, { sessionId, initialPracticeId: view.practiceId })
    case 'insights': return h(InsightsCard)
    case 'deleted': return h(CompactResultCard, { title: '练习已删除', detail: '档案和对应会话游标已经清理。', tone: 'completed' })
    case 'exported': return h(CompactResultCard, { title: 'Markdown 已生成', detail: '打开练习档案可以下载本次导出。' })
    case 'finished': return h(CompactResultCard, { title: '练习已结束', detail: view.data?.topic ? `${view.data.topic} 已归档，可以在练习档案中查看复盘。` : '本次练习已经归档。', tone: 'completed' })
    case 'live': return h(LiveInterviewCard, { sessionId })
    default: return null
  }
}

export function apply(ctx) {
  installStyles()
  const slots = ctx.get('slots')
  if (!slots) return

  for (const toolName of ['interview_session', 'interview_question', 'interview_answer', 'interview_library']) {
    slots.inject('tool.call.toolview', () => slots.register(
      { name: 'tool.call.toolview', key: toolName },
      (props) => h(ToolResourceView, { toolName, sessionId: props.sessionId || 'global', block: props.block }),
    ))
  }

  slots.inject('conversation.input.dock', () => slots.register(
    { name: 'conversation.input.dock', id: 'interview-timeline', order: 25 },
    (props) => {
      const revisionSignal = typeof props.useSession === 'function'
        ? props.useSession((snapshot) => {
            const order = snapshot?.chat?.order || []
            return `${order.length}:${order.at(-1) || ''}`
          })
        : ''
      return h(TimelinePanel, { sessionId: props.sessionId || 'global', revisionSignal })
    },
  ))
}

export { ToolResourceView }
