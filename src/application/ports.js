const REQUIRED_REPOSITORY_METHODS = [
  'getPractice',
  'listPractices',
  'getCursor',
  'commit',
  'deletePractice',
  'clearCursor',
  'listLeetcodeProgress',
  'saveLeetcodeProgress',
]

export function validateApplicationPorts(ports) {
  for (const method of REQUIRED_REPOSITORY_METHODS) {
    if (typeof ports.repository?.[method] !== 'function') throw new TypeError(`repository.${method} 必须是函数`)
  }
  if (typeof ports.events?.publish !== 'function') throw new TypeError('events.publish 必须是函数')
  if (typeof ports.exporter?.export !== 'function') throw new TypeError('exporter.export 必须是函数')
  if (typeof ports.clock?.now !== 'function') throw new TypeError('clock.now 必须是函数')
  if (typeof ports.ids?.next !== 'function') throw new TypeError('ids.next 必须是函数')
  if (typeof ports.random?.next !== 'function') throw new TypeError('random.next 必须是函数')
  return ports
}
