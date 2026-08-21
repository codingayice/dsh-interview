import React from 'react'
import { PracticeLibrary } from './practice-library.js'
import { LeetcodeCatalog } from './leetcode.js'
import { interviewApi } from '../shared/api.js'
import { h, Icon } from '../shared/ui.js'

const WORKSPACE_TABS = Object.freeze([
  { id: 'active', label: '进行中', icon: 'play' },
  { id: 'library', label: '练习档案', icon: 'archive' },
  { id: 'leetcode', label: '热题 100', icon: 'code' },
])

function WorkspaceContent({ tab, sessionId }) {
  if (tab === 'active') return h(PracticeLibrary, {
    sessionId, statusScope: 'active', title: '进行中', allowCreate: true,
  })
  if (tab === 'library') return h(PracticeLibrary, {
    sessionId, statusScope: 'completed', title: '练习档案', allowCreate: false,
  })
  if (tab === 'leetcode') return h(LeetcodeCatalog, { sessionId })
  return null
}

export function WorkspaceDock({ sessionId }) {
  const [open, setOpen] = React.useState(false)
  const [tab, setTab] = React.useState('active')
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
    open ? h('div', { className: 'di-workspace-backdrop' },
      h('section', {
        id: 'di-interview-workspace',
        className: 'di-workspace-panel',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': '练习工作台',
      },
      h('header', { className: 'di-workspace-head' },
        h('div', { className: 'di-workspace-brand' },
          h('span', { className: 'di-workspace-brand-icon', 'aria-hidden': 'true' }, h(Icon, { name: 'grid', size: 18 })),
          h('h2', null, '练习工作台')),
        h('button', { type: 'button', onClick: () => setOpen(false), 'aria-label': '关闭练习工作台' }, h(Icon, { name: 'close', size: 20 }))),
      h('div', { className: 'di-workspace-layout' },
        h('nav', { className: 'di-workspace-tabs', 'aria-label': '工作台视图' }, WORKSPACE_TABS.map((item) => h('button', {
          type: 'button',
          key: item.id,
          className: tab === item.id ? 'is-active' : '',
          'aria-current': tab === item.id ? 'page' : undefined,
          onClick: () => setTab(item.id),
        }, h(Icon, { name: item.icon, size: 17 }), h('span', null, item.label)))),
        h('main', { className: `di-workspace-content is-${tab}` }, h(WorkspaceContent, { tab, sessionId }))))
      ) : null,
    notice ? h('div', { className: 'di-local-toast', role: 'status' }, notice) : null)
}
