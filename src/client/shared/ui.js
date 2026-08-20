import React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

export const h = React.createElement

const MarkdownText = primitives.MarkdownText

export function Markdown({ children }) {
  const text = String(children || '')
  return MarkdownText ? h(MarkdownText, { text, content: text }) : h('div', { className: 'di-preline' }, text)
}

function resultText(block) {
  return (block?.content || [])
    .filter((item) => item?.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
}

export function parseInteractionResult(block) {
  try {
    const value = JSON.parse(resultText(block))
    return value?.protocol === 'dsh-interview/interaction-v1' ? value : null
  } catch {
    return null
  }
}

export function toolCallState(block) {
  if (!block || !('kind' in block)) return 'running'
  return block.isError ? 'error' : 'success'
}

export function toolErrorMessage(block) {
  const text = resultText(block).trim()
  return text || block?.error?.message || block?.error?.code || '工具执行失败'
}

export function toolErrorAudience(block) {
  const code = block?.error?.code || block?.error?.info?.code
  return code === 'INVALID_ARGS' ? 'agent' : 'user'
}

export function PhaseBadge({ phase }) {
  const labels = {
    awaiting_question: '准备出题',
    awaiting_answer: '等待回答',
    awaiting_evaluation: '正在评价',
    generating_explanation: '正在生成完整复盘',
    awaiting_next: '复盘完成',
    completed: '练习已结束',
    idle: '未选择练习',
  }
  return h('span', { className: `di-phase di-phase-${phase || 'idle'}` }, labels[phase] || phase)
}

export function ScoreRail({ score, compact = false }) {
  const normalized = Number.isFinite(Number(score)) ? Math.max(0, Math.min(10, Number(score))) : null
  const tone = normalized === null ? 'empty' : normalized >= 8 ? 'good' : normalized >= 6 ? 'mid' : 'low'
  return h('span', { className: `di-score-rail ${compact ? 'is-compact' : ''}`, 'aria-label': normalized === null ? '未评分' : `${normalized} 分` },
    Array.from({ length: 10 }, (_, index) => h('i', { key: index, className: index < Math.round(normalized || 0) ? `is-on is-${tone}` : '' })))
}

export function Loading({ label = '正在读取面试档案…' }) {
  return h('div', { className: 'di-state' }, h('span', { className: 'di-spinner' }), label)
}

export function ErrorNotice({ children }) {
  return children ? h('div', { className: 'di-notice is-error', role: 'alert' }, children) : null
}

export function Empty({ title, detail }) {
  return h('div', { className: 'di-empty' }, h('strong', null, title), detail ? h('span', null, detail) : null)
}

export function Button({ children, tone = 'quiet', busy = false, ...props }) {
  return h('button', { ...props, className: `di-button is-${tone}${props.className ? ` ${props.className}` : ''}`, disabled: props.disabled || busy }, busy ? '处理中…' : children)
}
