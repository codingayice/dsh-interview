import React from 'react'
import {
  CompactResultCard,
  LiveInterviewCard,
  PracticeSummaryCard,
  QuestionResourceCard,
  ReviewResourceCard,
  ToolErrorCard,
} from './features/live-interview.js'
import { InsightsCard, PracticeLibrary } from './features/practice-library.js'
import { TimelinePanel } from './features/timeline.js'
import { LeetcodeCatalog } from './features/leetcode.js'
import { WorkspaceDock } from './features/workspace-dock.js'
import { INTERVIEW_TOOL_NAMES } from '../protocol/interview-tool-names.js'
import { installStyles } from './shared/styles.js'
import { h, parseInteractionResult, toolCallState, toolErrorAudience, toolErrorMessage } from './shared/ui.js'

export const name = 'dsh-interview'
export const inject = ['slots']

export function resolveToolView(toolName, block) {
  const state = toolCallState(block)
  if (state === 'running') return { kind: 'hidden' }
  if (state === 'error' && toolErrorAudience(block) === 'agent') return { kind: 'hidden' }
  if (state === 'error') return { kind: 'error', message: toolErrorMessage(block) }
  const result = parseInteractionResult(block)
  if (!result || result.error?.audience === 'agent' || !result.artifact) return { kind: 'hidden' }
  return { ...result.artifact, revision: result.revision, toolName }
}

function ToolResourceView({ toolName, sessionId, block }) {
  const view = resolveToolView(toolName, block)
  switch (view.kind) {
    case 'error': return h(ToolErrorCard, { message: view.message })
    case 'question': return h(QuestionResourceCard, { artifact: view, revision: view.revision, sessionId })
    case 'review': return h(ReviewResourceCard, { artifact: view, revision: view.revision, sessionId })
    case 'library': return h(PracticeLibrary, { sessionId, initialPracticeId: view.practiceId })
    case 'insights': return h(InsightsCard)
    case 'leetcode-catalog': return h(LeetcodeCatalog, { sessionId })
    case 'deleted': return h(CompactResultCard, { title: '练习已删除', detail: '档案和对应会话游标已经清理。', tone: 'completed' })
    case 'exported': return h(CompactResultCard, { title: 'Markdown 已生成', detail: '打开练习档案可以下载本次导出。' })
    case 'finished': return h(PracticeSummaryCard, { artifact: view, revision: view.revision })
    case 'live-session': return h(LiveInterviewCard, { sessionId })
    default: return null
  }
}

export function apply(ctx) {
  installStyles()
  const slots = ctx.get('slots')
  if (!slots) return

  for (const toolName of INTERVIEW_TOOL_NAMES) {
    slots.inject('tool.call.toolview', () => slots.register(
      { name: 'tool.call.toolview', key: toolName },
      (props) => h(ToolResourceView, { toolName, sessionId: props.sessionId, block: props.block }),
    ))
  }

  slots.inject('conversation.input.dock', () => slots.register(
    { name: 'conversation.input.dock', id: 'interview-workspace', order: 24 },
    (props) => h(WorkspaceDock, { sessionId: props.sessionId }),
  ))

  slots.inject('conversation.input.dock', () => slots.register(
    { name: 'conversation.input.dock', id: 'interview-timeline', order: 25 },
    (props) => {
      const revisionSignal = typeof props.useSession === 'function'
        ? props.useSession((snapshot) => {
            const order = snapshot?.chat?.order || []
            return `${order.length}:${order.at(-1) || ''}`
          })
        : ''
      return h(TimelinePanel, { sessionId: props.sessionId, revisionSignal })
    },
  ))
}

export { ToolResourceView }
