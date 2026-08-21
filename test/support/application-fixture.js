import { InterviewApplication } from '../../src/application/interview-application.js'

function clone(value) {
  return value === undefined ? undefined : structuredClone(value)
}

export class InMemoryInterviewRepository {
  constructor() {
    this.practices = new Map()
    this.cursors = new Map()
    this.leetcodeProgress = new Map()
  }

  async getPractice(id) { return clone(this.practices.get(id) || null) }

  async listPractices(filters = {}) {
    return [...this.practices.values()]
      .filter((practice) => !filters.mode || practice.mode === filters.mode)
      .filter((practice) => !filters.status || practice.status === filters.status)
      .filter((practice) => !filters.query || JSON.stringify({ topic: practice.topic, source: practice.source, config: practice.config }).toLowerCase().includes(String(filters.query).toLowerCase()))
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map(clone)
  }

  async getCursor(sessionId) { return clone(this.cursors.get(sessionId) || null) }

  async getCursorByPractice(practiceId) {
    return clone([...this.cursors.values()].find((cursor) => cursor.practiceId === practiceId) || null)
  }

  async commit({ practice, practices = [], cursor, unbindSessionId }) {
    for (const item of [...practices, ...(practice ? [practice] : [])]) this.practices.set(item.id, clone(item))
    if (unbindSessionId) this.cursors.delete(unbindSessionId)
    if (cursor) {
      for (const [sessionId, selected] of this.cursors) {
        if (selected.practiceId === cursor.practiceId) this.cursors.delete(sessionId)
      }
      this.cursors.set(cursor.sessionId, clone(cursor))
    }
  }

  async deletePractice(id) {
    this.practices.delete(id)
    for (const [sessionId, cursor] of this.cursors) if (cursor.practiceId === id) this.cursors.delete(sessionId)
  }

  async clearCursor(sessionId) { this.cursors.delete(sessionId) }

  async listLeetcodeProgress() { return [...this.leetcodeProgress.values()].map(clone) }

  async saveLeetcodeProgress(progress) { this.leetcodeProgress.set(progress.slug, clone(progress)) }
}

export function applicationFixture() {
  const repository = new InMemoryInterviewRepository()
  const published = []
  const exported = []
  let now = 100
  let sequence = 0
  const application = new InterviewApplication({
    repository,
    events: { async publish(events) { published.push(...clone(events)) } },
    exporter: { async export(practices) { exported.push(...clone(practices)); return practices.map((practice) => ({ practiceId: practice.id, name: `${practice.topic}.md`, token: `download-${practice.id}` })) } },
    clock: { now() { return ++now } },
    ids: { next(prefix) { return `${prefix}-${++sequence}` } },
    random: { next() { return 0 } },
  })
  return { application, repository, published, exported }
}
