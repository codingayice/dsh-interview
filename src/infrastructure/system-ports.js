import { randomUUID } from 'node:crypto'

export function createSystemPorts() {
  return {
    clock: { now: () => Date.now() },
    ids: { next: (prefix) => `${prefix}-${randomUUID()}` },
    events: { publish: async () => {} },
  }
}
