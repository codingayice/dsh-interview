import test from 'node:test'
import assert from 'node:assert/strict'
import { interviewApi } from '../../src/client/shared/api.js'

test('同一资源的一批版本请求合并为最高版本的一次加载', async () => {
  let oldLoads = 0
  let latestLoads = 0
  const key = `versioned-resource-${Date.now()}`
  const oldRequest = interviewApi.cached(key, async () => {
    oldLoads += 1
    return 'old'
  }, 1)
  const latestRequest = interviewApi.cached(key, async () => {
    latestLoads += 1
    return 'latest'
  }, 3)

  assert.equal(oldRequest, latestRequest)
  assert.equal(await latestRequest, 'latest')
  assert.equal(oldLoads, 0)
  assert.equal(latestLoads, 1)
})

test('低版本读取复用已有高版本资源', async () => {
  let loads = 0
  const key = `latest-resource-${Date.now()}`
  const latest = await interviewApi.cached(key, async () => {
    loads += 1
    return { revision: 5 }
  }, 5)
  const older = await interviewApi.cached(key, async () => {
    loads += 1
    return { revision: 2 }
  }, 2)

  assert.deepEqual(older, latest)
  assert.equal(loads, 1)
})

test('全部模式请求不会发送空的模式筛选条件', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = async (url) => {
    requestedUrl = String(url)
    return { ok: true, json: async () => ({ resource: { data: [] } }) }
  }
  try {
    await interviewApi.practices({ query: '', mode: '', status: 'active' })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.match(requestedUrl, /status=active/)
  assert.doesNotMatch(requestedUrl, /(?:\?|&)mode=/)
  assert.doesNotMatch(requestedUrl, /(?:\?|&)query=/)
})
