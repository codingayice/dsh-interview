import React from 'react'
import { interviewApi } from './api.js'

export function useInterviewQuery(key, loader, dependencies = [], options = {}) {
  const cache = options.cache !== false
  const [state, setState] = React.useState({ loading: true, data: null, error: '' })
  const requestSequenceRef = React.useRef(0)
  const load = React.useCallback((force = false) => {
    const requestSequence = ++requestSequenceRef.current
    setState((current) => ({ ...current, loading: current.data === null, error: '' }))
    const request = force || !cache ? Promise.resolve().then(loader) : interviewApi.cached(key, loader)
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
  }, [key, cache, ...dependencies])

  React.useEffect(() => {
    load()
    const unsubscribe = interviewApi.subscribe(() => load(true))
    return () => {
      requestSequenceRef.current += 1
      unsubscribe()
    }
  }, [load])

  return { ...state, reload: () => load(true) }
}

export function useCommand(sessionId) {
  const [state, setState] = React.useState({ busy: '', error: '' })
  const inFlightRef = React.useRef(false)
  const run = React.useCallback(async (command, payload = {}) => {
    if (inFlightRef.current) return null
    inFlightRef.current = true
    setState({ busy: command, error: '' })
    try {
      return await interviewApi.command(sessionId, command, payload)
    } catch (error) {
      setState({ busy: '', error: error.message || '操作失败' })
      throw error
    } finally {
      inFlightRef.current = false
      setState((current) => ({ ...current, busy: '' }))
    }
  }, [sessionId])
  return { ...state, run, clearError: () => setState((current) => ({ ...current, error: '' })) }
}
