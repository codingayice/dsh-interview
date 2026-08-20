import React from 'react'
import { interviewApi } from './api.js'

export function useInterviewQuery(key, loader, dependencies = []) {
  const [state, setState] = React.useState({ loading: true, data: null, error: '' })
  const load = React.useCallback((force = false) => {
    setState((current) => ({ ...current, loading: current.data === null, error: '' }))
    const request = force ? Promise.resolve().then(loader) : interviewApi.cached(key, loader)
    return request
      .then((data) => setState({ loading: false, data, error: '' }))
      .catch((error) => setState((current) => ({ ...current, loading: false, error: error.message || '加载失败' })))
  }, [key, ...dependencies])

  React.useEffect(() => {
    load()
    return interviewApi.subscribe(() => load(true))
  }, [load])

  return { ...state, reload: () => load(true) }
}

export function useCommand(sessionId) {
  const [state, setState] = React.useState({ busy: '', error: '' })
  const run = React.useCallback(async (command, payload = {}) => {
    setState({ busy: command, error: '' })
    try {
      return await interviewApi.command(sessionId, command, payload)
    } catch (error) {
      setState({ busy: '', error: error.message || '操作失败' })
      throw error
    } finally {
      setState((current) => ({ ...current, busy: '' }))
    }
  }, [sessionId])
  return { ...state, run, clearError: () => setState((current) => ({ ...current, error: '' })) }
}
