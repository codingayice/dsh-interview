import { homedir } from 'node:os'
import { join } from 'node:path'

export function dshProfileName(argv = process.argv) {
  const profileIndex = argv.indexOf('--profile')
  const candidate = profileIndex >= 0 ? argv[profileIndex + 1] : null
  return candidate && !candidate.startsWith('-') ? candidate : 'web'
}

export function defaultDataDirectory() {
  return join(homedir(), '.dsh', 'profiles', dshProfileName(), 'data', 'dsh-interview')
}

export function defaultDatabasePath() {
  return join(defaultDataDirectory(), 'interview.sqlite')
}
