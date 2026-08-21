const NAVIGATION_COMMANDS = Object.freeze(new Map([
  ['/练习列表', 'library'],
  ['/当前练习', 'current'],
  ['/力扣列表', 'leetcode'],
  ['/interview list', 'library'],
  ['/interview current', 'current'],
  ['/leetcode list', 'leetcode'],
]))

function argumentAfter(input, prefix) {
  const value = input.slice(prefix.length).trim()
  if (!value || /\s/.test(value)) throw new TypeError(`${prefix} 后必须提供一个有效标识`)
  return value
}

export function parseLocalCommand(value) {
  const input = String(value || '').trim()
  if (!input.startsWith('/')) throw new TypeError('本地命令必须以 / 开头')
  const tab = NAVIGATION_COMMANDS.get(input.toLowerCase())
  if (tab) return { type: 'navigate', tab }

  for (const prefix of ['/切换 ', '/interview switch ']) {
    if (input.toLowerCase().startsWith(prefix.toLowerCase())) {
      return { type: 'execute', command: 'session.select', payload: { practiceId: argumentAfter(input, prefix) }, tab: 'current' }
    }
  }
  for (const [prefix, completed] of [
    ['/完成 ', true], ['/leetcode done ', true],
    ['/未完成 ', false], ['/leetcode undo ', false],
  ]) {
    if (input.toLowerCase().startsWith(prefix.toLowerCase())) {
      return { type: 'execute', command: 'leetcode.set-completion', payload: { slug: argumentAfter(input, prefix), completed }, tab: 'leetcode' }
    }
  }

  throw new TypeError('不支持该本地命令，可使用 /练习列表、/当前练习、/力扣列表、/切换、/完成 或 /未完成')
}

export const LOCAL_COMMAND_EXAMPLE = '/练习列表  /切换 <练习ID>  /完成 <题目标识>'

