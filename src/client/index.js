import React from 'react'
import { LiveInterviewCard, CompactResultCard } from './features/live-interview.js'
import { InsightsCard, PracticeLibrary } from './features/practice-library.js'
import { TimelinePanel } from './features/timeline.js'
import { installStyles } from './shared/styles.js'
import { h, parseToolArgs } from './shared/ui.js'

export const name = 'dsh-interview'
export const inject = ['slots']

function ToolResourceView({ toolName, sessionId, block }) {
  const args = parseToolArgs(block)
  if (toolName === 'interview_library') {
    if (args.command === 'list') return h(PracticeLibrary, { sessionId })
    if (args.command === 'get') return h(PracticeLibrary, { sessionId, initialPracticeId: args.practice_id })
    if (args.command === 'insights') return h(InsightsCard)
    if (args.command === 'delete') return h(CompactResultCard, { title: '练习已删除', detail: '档案和对应会话游标已经清理。', tone: 'completed' })
    if (args.command === 'export') return h(CompactResultCard, { title: 'Markdown 已生成', detail: '打开练习档案可以下载本次导出。' })
  }
  return h(LiveInterviewCard, { sessionId })
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
