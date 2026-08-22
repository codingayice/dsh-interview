import React from 'react'
import { PracticeLibrary } from './practice-library.js'
import { LeetcodeCatalog } from './leetcode.js'
import { interviewApi } from '../shared/api.js'
import { useInterviewQuery } from '../shared/hooks.js'
import { h, Icon } from '../shared/ui.js'

const WORKSPACE_TABS = Object.freeze([
  { id: 'active', label: '进行中', icon: 'clock' },
  { id: 'library', label: '练习档案', icon: 'archive' },
  { id: 'leetcode', label: '热题 100', icon: 'flame' },
])

const LAUNCHER_POSITION_KEY = 'dsh-interview:workspace-launcher-position'
const LAUNCHER_MARGIN = 8

function loadLauncherPosition() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(LAUNCHER_POSITION_KEY) || 'null')
    return Number.isFinite(value?.left) && Number.isFinite(value?.top) ? value : null
  } catch {
    return null
  }
}

function clampLauncherPosition(position, width, height) {
  return {
    left: Math.min(Math.max(LAUNCHER_MARGIN, position.left), Math.max(LAUNCHER_MARGIN, globalThis.innerWidth - width - LAUNCHER_MARGIN)),
    top: Math.min(Math.max(LAUNCHER_MARGIN, position.top), Math.max(LAUNCHER_MARGIN, globalThis.innerHeight - height - LAUNCHER_MARGIN)),
  }
}

function saveLauncherPosition(position) {
  try {
    globalThis.localStorage?.setItem(LAUNCHER_POSITION_KEY, JSON.stringify(position))
  } catch {
    // 存储不可用时仍保留当前会话内的拖动结果。
  }
}

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
  const [launcherPosition, setLauncherPosition] = React.useState(loadLauncherPosition)
  const [draggingLauncher, setDraggingLauncher] = React.useState(false)
  const launcherRef = React.useRef(null)
  const launcherPositionRef = React.useRef(launcherPosition)
  const launcherDragRef = React.useRef(null)
  const suppressLauncherClickRef = React.useRef(false)
  launcherPositionRef.current = launcherPosition
  const activeQuery = useInterviewQuery(
    `workspace-active-count:${open}`,
    () => interviewApi.practices({ status: 'active' }),
    [open],
    { cache: false },
  )
  const activeCount = activeQuery.data?.resource?.data?.length || 0

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

  React.useEffect(() => {
    const keepLauncherInViewport = () => {
      const rect = launcherRef.current?.getBoundingClientRect()
      const current = launcherPositionRef.current
      if (!rect || !current) return
      const next = clampLauncherPosition(current, rect.width, rect.height)
      launcherPositionRef.current = next
      setLauncherPosition(next)
      saveLauncherPosition(next)
    }
    keepLauncherInViewport()
    globalThis.addEventListener?.('resize', keepLauncherInViewport)
    return () => globalThis.removeEventListener?.('resize', keepLauncherInViewport)
  }, [])

  const startLauncherDrag = (event) => {
    if (event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    launcherDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
      position: { left: rect.left, top: rect.top },
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDraggingLauncher(true)
  }

  const moveLauncher = (event) => {
    const drag = launcherDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 4) return
    drag.moved = true
    drag.position = clampLauncherPosition({ left: drag.left + deltaX, top: drag.top + deltaY }, drag.width, drag.height)
    setLauncherPosition(drag.position)
  }

  const finishLauncherDrag = (event) => {
    const drag = launcherDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (drag.moved) {
      suppressLauncherClickRef.current = true
      saveLauncherPosition(drag.position)
    }
    launcherDragRef.current = null
    setDraggingLauncher(false)
  }

  return h(React.Fragment, null,
    h('button', {
      ref: launcherRef,
      type: 'button',
      className: `di-workspace-launcher${open ? ' is-open' : ''}${draggingLauncher ? ' is-dragging' : ''}`,
      style: launcherPosition ? { left: `${launcherPosition.left}px`, top: `${launcherPosition.top}px`, right: 'auto', bottom: 'auto' } : undefined,
      'aria-expanded': open,
      'aria-controls': 'di-interview-workspace',
      onPointerDown: startLauncherDrag,
      onPointerMove: moveLauncher,
      onPointerUp: finishLauncherDrag,
      onPointerCancel: finishLauncherDrag,
      onClick: (event) => {
        if (suppressLauncherClickRef.current) {
          suppressLauncherClickRef.current = false
          event.preventDefault()
          return
        }
        setOpen((value) => !value)
      },
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
        }, h(Icon, { name: item.icon, size: 16 }), h('span', null, item.label),
        item.id === 'active' && activeCount > 0 ? h('span', { className: 'di-workspace-count' }, activeCount) : null))),
        h('main', { className: `di-workspace-content is-${tab}` }, h(WorkspaceContent, { tab, sessionId }))))
      ) : null,
    notice ? h('div', { className: 'di-local-toast', role: 'status' }, notice) : null)
}
