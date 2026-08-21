import React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

export const h = React.createElement

const MarkdownText = primitives.MarkdownText

export function Markdown({ children }) {
  const text = String(children || '')
  return MarkdownText ? h(MarkdownText, { text, content: text, className: 'di-markdown' }) : h('div', { className: 'di-preline di-markdown' }, text)
}

const ICON_PATHS = {
  check: [h('path', { key: 'p', d: 'm5 12 4 4L19 6' })],
  eye: [h('path', { key: 'p', d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z' }), h('circle', { key: 'c', cx: 12, cy: 12, r: 2.5 })],
  copy: [h('rect', { key: 'a', x: 9, y: 9, width: 10, height: 10, rx: 1.5 }), h('path', { key: 'b', d: 'M15 9V6.5A1.5 1.5 0 0 0 13.5 5h-7A1.5 1.5 0 0 0 5 6.5v7A1.5 1.5 0 0 0 6.5 15H9' })],
  swap: [h('path', { key: 'a', d: 'M7 7h11l-3-3m3 3-3 3' }), h('path', { key: 'b', d: 'M17 17H6l3 3m-3-3 3-3' })],
  trash: [h('path', { key: 'a', d: 'M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5' })],
  download: [h('path', { key: 'a', d: 'M12 3v12m0 0 4-4m-4 4-4-4M5 19h14' })],
  play: [h('path', { key: 'a', d: 'M8 5.5v13l10-6.5L8 5.5Z' })],
  clock: [h('circle', { key: 'a', cx: 12, cy: 12, r: 8 }), h('path', { key: 'b', d: 'M12 8v4l3 2' })],
  archive: [h('path', { key: 'a', d: 'M4 7h16v13H4V7Zm-1-3h18v3H3V4Zm6 7h6' })],
  code: [h('path', { key: 'a', d: 'm8 9-3 3 3 3m8-6 3 3-3 3m-2-9-4 12' })],
  grid: [h('rect', { key: 'a', x: 4, y: 4, width: 6, height: 6, rx: 1 }), h('rect', { key: 'b', x: 14, y: 4, width: 6, height: 6, rx: 1 }), h('rect', { key: 'c', x: 4, y: 14, width: 6, height: 6, rx: 1 }), h('rect', { key: 'd', x: 14, y: 14, width: 6, height: 6, rx: 1 })],
  close: [h('path', { key: 'a', d: 'm6 6 12 12M18 6 6 18' })],
  flame: [h('path', { key: 'a', d: 'M12 22c4 0 7-3 7-7 0-3-1.5-5.5-4.5-8 .2 2-1 3.5-2 4.5C12 8 10 5 7 3c.4 4-2 6-2 10 0 5 3 9 7 9Z' })],
  plus: [h('path', { key: 'a', d: 'M12 5v14M5 12h14' })],
  alert: [h('path', { key: 'a', d: 'M10.3 4.2 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0ZM12 9v4m0 3h.01' })],
}

export function Icon({ name, size = 18 }) {
  return h('svg', {
    className: 'di-icon', width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': 'true',
  }, ...(ICON_PATHS[name] || []))
}

export function StarRating({ score }) {
  const normalized = Math.max(0, Math.min(5, Number(score || 0) / 2))
  return h('div', { className: 'di-stars', 'aria-label': `${Number(score || 0)} 分，满分 10 分` },
    Array.from({ length: 5 }, (_, index) => {
      const fill = Math.max(0, Math.min(1, normalized - index)) * 100
      return h('span', { className: 'di-star', key: index, style: { '--di-star-fill': `${fill}%` } }, '★')
    }))
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
    awaiting_solution: '刷题中',
    awaiting_answer: '等待回答',
    awaiting_evaluation: '正在评价',
    generating_explanation: '正在生成点评讲解',
    generating_summary: '正在生成练习总结',
    awaiting_next: '点评讲解完成',
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
  return h('div', { className: 'di-empty' }, h('div', { className: 'di-empty-title' }, title), detail ? h('span', null, detail) : null)
}

export function Button({ children, tone = 'quiet', busy = false, ...props }) {
  return h('button', { ...props, className: `di-button is-${tone}${props.className ? ` ${props.className}` : ''}`, disabled: props.disabled || busy }, busy ? '处理中…' : children)
}
