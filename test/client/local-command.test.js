import test from 'node:test'
import assert from 'node:assert/strict'
import { parseLocalCommand } from '../../src/client/shared/local-command.js'

test('本地命令解析工作台导航且不产生应用命令', () => {
  assert.deepEqual(parseLocalCommand('/练习列表'), { type: 'navigate', tab: 'library' })
  assert.deepEqual(parseLocalCommand('/interview current'), { type: 'navigate', tab: 'current' })
  assert.deepEqual(parseLocalCommand('/leetcode list'), { type: 'navigate', tab: 'leetcode' })
})

test('本地命令只解析确定性的切换与力扣进度操作', () => {
  assert.deepEqual(parseLocalCommand('/切换 practice-1'), {
    type: 'execute', command: 'session.select', payload: { practiceId: 'practice-1' }, tab: 'current',
  })
  assert.deepEqual(parseLocalCommand('/leetcode done two-sum'), {
    type: 'execute', command: 'leetcode.set-completion', payload: { slug: 'two-sum', completed: true }, tab: 'leetcode',
  })
  assert.deepEqual(parseLocalCommand('/未完成 two-sum'), {
    type: 'execute', command: 'leetcode.set-completion', payload: { slug: 'two-sum', completed: false }, tab: 'leetcode',
  })
})

test('本地命令拒绝任意自然语言、缺失参数和高风险删除', () => {
  assert.throws(() => parseLocalCommand('查看练习'), /必须以 \/ 开头/)
  assert.throws(() => parseLocalCommand('/切换 '), /不支持该本地命令/)
  assert.throws(() => parseLocalCommand('/删除练习 practice-1'), /不支持该本地命令/)
})

