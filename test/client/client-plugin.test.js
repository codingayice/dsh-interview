import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

test('构建后的 Client 注册四种工具视图和一个时间轴槽位', () => {
  const source = readFileSync(new URL('../../client/client.js', import.meta.url), 'utf8')
  let plugin = null
  const appended = []
  const registrations = []
  const fakeReact = {
    Fragment: Symbol('Fragment'),
    createElement: (...args) => ({ args }),
    useState: () => [null, () => {}],
    useEffect: () => {},
    useCallback: (callback) => callback,
  }
  const context = {
    console,
    URLSearchParams,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    setTimeout,
    clearTimeout,
    document: {
      getElementById: () => null,
      createElement: () => ({}),
      head: { appendChild: (node) => appended.push(node) },
    },
    window: {
      __ModuleLoader__: {
        load(definition) {
          plugin = definition.factory((name) => name === 'react' ? fakeReact : {})
        },
      },
    },
  }
  vm.runInNewContext(source, context)
  const slots = {
    inject(_name, callback) { callback() },
    register(config) { registrations.push(config); return () => {} },
  }
  plugin.apply({ get: () => slots })

  assert.equal(appended.length, 1)
  assert.deepEqual(
    registrations.filter((item) => item.name === 'tool.call.toolview').map((item) => item.key),
    ['interview_session', 'interview_question', 'interview_answer', 'interview_library'],
  )
  assert.equal(registrations.find((item) => item.name === 'conversation.input.dock').id, 'interview-timeline')
})

test('工具视图只为用户可见结果生成对应卡片', () => {
  const source = readFileSync(new URL('../../client/client.js', import.meta.url), 'utf8')
  let plugin = null
  const fakeReact = {
    Fragment: Symbol('Fragment'),
    createElement: (...args) => ({ args }),
    useState: () => [null, () => {}],
    useEffect: () => {},
    useCallback: (callback) => callback,
  }
  vm.runInNewContext(source, {
    console,
    URLSearchParams,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    setTimeout,
    clearTimeout,
    document: { getElementById: () => null, createElement: () => ({}), head: { appendChild: () => {} } },
    window: { __ModuleLoader__: { load(definition) { plugin = definition.factory((name) => name === 'react' ? fakeReact : {}) } } },
  })

  const settled = (command, kind, data, extra = {}) => ({
    kind: 'tool-result',
    call: { argsRaw: JSON.stringify({ command }) },
    content: [{ type: 'text', text: `resource_kind: ${kind}\nrevision: 2\nresource_data:\n${JSON.stringify(data)}\nevents:\n[]` }],
    ...extra,
  })
  const question = { id: 'q1', sequence: 1, prompt: '什么是 JMM？' }

  assert.equal(plugin.resolveToolView('interview_session', { argsRaw: '{"command":"start"}' }).kind, 'hidden')
  assert.equal(plugin.resolveToolView('interview_session', settled('start', 'practice-started', {})).kind, 'hidden')
  assert.equal(plugin.resolveToolView('interview_question', settled('next', 'question-requested', {})).kind, 'hidden')
  assert.equal(plugin.resolveToolView('interview_answer', settled('submit', 'attempt', {})).kind, 'hidden')
  assert.deepEqual(
    JSON.parse(JSON.stringify(plugin.resolveToolView('interview_question', settled('ask', 'question', question)))),
    { kind: 'question', data: question },
  )
  assert.equal(plugin.resolveToolView('interview_answer', settled('evaluate', 'evaluation', { score: 8 })).kind, 'evaluation')
  assert.equal(plugin.resolveToolView('interview_question', settled('ask', 'unknown', null, { isError: true })).kind, 'error')
})
