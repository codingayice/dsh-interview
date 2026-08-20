export class DomainError extends Error {
  constructor(code, message, details = undefined) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.details = details
  }
}

export function assertDomain(condition, code, message, details = undefined) {
  if (!condition) throw new DomainError(code, message, details)
}
