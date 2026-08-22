import test from 'node:test'
import assert from 'node:assert/strict'
import { createSingleFlight } from '../../src/client/shared/single-flight.js'

test('执行中的命令会忽略重复调用并在完成后重新开放', async () => {
  let calls = 0
  let finish
  const firstResult = new Promise((resolve) => { finish = resolve })
  const run = createSingleFlight(async (value) => {
    calls += 1
    if (value === 'first') return firstResult
    return value
  })

  const first = run('first')
  assert.equal(await run('duplicate'), null)
  assert.equal(calls, 1)

  finish('done')
  assert.equal(await first, 'done')
  assert.equal(await run('next'), 'next')
  assert.equal(calls, 2)
})

test('命令失败后会释放执行锁', async () => {
  let calls = 0
  const run = createSingleFlight(async () => {
    calls += 1
    if (calls === 1) throw new Error('失败')
    return '重试成功'
  })

  await assert.rejects(run(), /失败/)
  assert.equal(await run(), '重试成功')
})
