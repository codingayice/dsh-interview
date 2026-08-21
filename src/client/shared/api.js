const cache = new Map()
const listeners = new Set()
const notificationListeners = new Set()

async function jsonRequest(url, options) {
  const response = await fetch(url, options)
  const value = await response.json().catch(() => null)
  if (!response.ok || value?.error) {
    const error = new Error(value?.error?.message || `HTTP ${response.status}`)
    error.code = value?.error?.code || 'REQUEST_FAILED'
    throw error
  }
  return value
}

function queryString(values) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== null && value !== '') params.set(key, value)
  return params.toString()
}

export const interviewApi = {
  session(sessionId) {
    return jsonRequest(`/interview/api/session?${queryString({ session: sessionId })}`)
  },
  practices(filters = {}) {
    return jsonRequest(`/interview/api/practices?${queryString(filters)}`)
  },
  practice(practiceId) {
    return jsonRequest(`/interview/api/practice?${queryString({ id: practiceId })}`)
  },
  insights() {
    return jsonRequest('/interview/api/insights')
  },
  leetcodeCatalog() {
    return jsonRequest('/interview/api/leetcode')
  },
  async command(sessionId, command, payload = {}) {
    const value = await jsonRequest('/interview/api/command', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: sessionId, command, payload }),
    })
    cache.clear()
    for (const listener of listeners) listener(value.revision)
    const message = value?.assistantResponse?.mode === 'exact' ? value.assistantResponse.text : ''
    if (message) for (const listener of notificationListeners) listener(message)
    return value
  },
  downloadUrl(token) {
    return `/interview/api/download?${queryString({ token })}`
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  subscribeNotifications(listener) {
    notificationListeners.add(listener)
    return () => notificationListeners.delete(listener)
  },
  cached(key, loader) {
    if (!cache.has(key)) cache.set(key, Promise.resolve().then(loader).catch((error) => { cache.delete(key); throw error }))
    return cache.get(key)
  },
  invalidate() {
    cache.clear()
    for (const listener of listeners) listener(Date.now())
  },
}
