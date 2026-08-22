import React from 'react'
import { interviewApi } from './api.js'
import { createSingleFlight } from './single-flight.js'

export function useInterviewQuery(key, loader, dependencies = [], options = {}) {
  const cache = options.cache !== false
  const version = options.version || 0
  const [state, setState] = React.useState({ loading: true, data: null, error: '' })
  const requestSequenceRef = React.useRef(0)
  const load = React.useCallback((force = false) => {
    const requestSequence = ++requestSequenceRef.current
    setState((current) => ({ ...current, loading: current.data === null, error: '' }))
    const request = force || !cache ? Promise.resolve().then(loader) : interviewApi.cached(key, loader, version)
    return request
      .then((data) => {
        if (requestSequence === requestSequenceRef.current) setState({ loading: false, data, error: '' })
        return data
      })
      .catch((error) => {
        if (requestSequence === requestSequenceRef.current) {
          setState((current) => ({ ...current, loading: false, error: error.message || '加载失败' }))
        }
      })
  }, [key, cache, version, ...dependencies])

  React.useEffect(() => {
    load()
    const unsubscribe = interviewApi.subscribe(() => load())
    return () => {
      requestSequenceRef.current += 1
      unsubscribe()
    }
  }, [load])

  return { ...state, reload: () => load(true) }
}

export function useCommand(sessionId) {
  const [state, setState] = React.useState({ busy: '', error: '' })
  const sessionIdRef = React.useRef(sessionId)
  const runnerRef = React.useRef(null)
  sessionIdRef.current = sessionId
  if (!runnerRef.current) {
    runnerRef.current = createSingleFlight(async (command, payload = {}) => {
      setState({ busy: command, error: '' })
      try {
        return await interviewApi.command(sessionIdRef.current, command, payload)
      } catch (error) {
        setState({ busy: '', error: error.message || '操作失败' })
        throw error
      } finally {
        setState((current) => ({ ...current, busy: '' }))
      }
    })
  }
  const run = React.useCallback((command, payload = {}) => runnerRef.current(command, payload), [])
  return { ...state, run, clearError: () => setState((current) => ({ ...current, error: '' })) }
}
