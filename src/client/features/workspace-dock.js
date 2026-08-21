import React from 'react'
import { LiveInterviewCard } from './live-interview.js'
import { PracticeLibrary } from './practice-library.js'
import { LeetcodeCatalog } from './leetcode.js'
import { interviewApi } from '../shared/api.js'
import { h } from '../shared/ui.js'

const WORKSPACE_TABS = Object.freeze([
  { id: 'current', label: '当前练习' },
  { id: 'library', label: '练习档案' },
  { id: 'leetcode', label: '热题 100' },
])

function WorkspaceContent({ tab, sessionId }) {
  if (tab === 'library') return h(PracticeLibrary, { sessionId })
  if (tab === 'leetcode') return h(LeetcodeCatalog, { sessionId })
  return h(LiveInterviewCard, { sessionId })
}

export function WorkspaceDock({ sessionId }) {
  const [open, setOpen] = React.useState(false)
  const [tab, setTab] = React.useState('current')
  const [notice, setNotice] = React.useState('')

  React.useEffect(() => {
    let timer = null
    const unsubscribe = interviewApi.subscribeNotifications((message) => {
      if (timer) clearTimeout(timer)
      setNotice(message)
      timer = setTimeout(() => setNotice(''), 2600)
    })
    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [])

  React.useEffect(() => interviewApi.subscribeWorkspaceNavigation((nextTab) => {
    if (WORKSPACE_TABS.some((item) => item.id === nextTab)) setTab(nextTab)
    setOpen(true)
  }), [])

  return h(React.Fragment, null,
    h('button', {
      type: 'button',
      className: `di-workspace-launcher${open ? ' is-open' : ''}`,
      'aria-expanded': open,
      'aria-controls': 'di-interview-workspace',
      onClick: () => setOpen((value) => !value),
    }, h('span', { className: 'di-workspace-mark', 'aria-hidden': 'true' }, 'I'), '练习工作台'),
    open ? h('section', {
      id: 'di-interview-workspace',
      className: 'di-workspace-panel',
      'aria-label': '本地练习工作台',
    },
    h('header', { className: 'di-workspace-head' },
      h('h2', null, '练习工作台'),
      h('button', { type: 'button', onClick: () => setOpen(false), 'aria-label': '关闭练习工作台' }, '×')),
    h('div', { className: 'di-workspace-layout' },
      h('nav', { className: 'di-workspace-tabs', 'aria-label': '工作台视图' }, WORKSPACE_TABS.map((item) => h('button', {
        type: 'button',
        key: item.id,
        className: tab === item.id ? 'is-active' : '',
        'aria-current': tab === item.id ? 'page' : undefined,
        onClick: () => setTab(item.id),
      }, item.label))),
      h('div', { className: 'di-workspace-content' }, h(WorkspaceContent, { tab, sessionId })))
    ) : null,
    notice ? h('div', { className: 'di-local-toast', role: 'status' }, notice) : null)
}
