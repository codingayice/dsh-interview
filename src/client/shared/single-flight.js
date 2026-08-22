export function createSingleFlight(handler) {
  let running = false
  return async (...args) => {
    if (running) return null
    running = true
    try {
      return await handler(...args)
    } finally {
      running = false
    }
  }
}
