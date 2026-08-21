import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { INTERVIEW_TOOL_NAMES } from '../../src/protocol/interview-tool-names.js'
import { createLeetcodeCardStack, upsertLeetcodeCard } from '../../src/client/features/leetcode-card-stack.js'

function loadPlugin() {
  const source = readFileSync(new URL('../../client/client.js', import.meta.url), 'utf8')
  let plugin = null
  const appended = []
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
    document: {
      getElementById: () => null,
      createElement: () => ({}),
      head: { appendChild: (node) => appended.push(node) },
    },
    window: { __ModuleLoader__: { load(definition) { plugin = definition.factory((name) => name === 'react' ? fakeReact : {}) } } },
  })
  return { plugin, appended }
}

function settled(interaction, extra = {}) {
  return {
    kind: 'tool-result',
    content: [{ type: 'text', text: JSON.stringify({ protocol: 'dsh-interview/interaction-v1', ...interaction }) }],
    ...extra,
  }
}

test('构建后的 Client 注册全部原子工具视图和时间轴槽位', () => {
  const { plugin, appended } = loadPlugin()
  const registrations = []
  const slots = {
    inject(_name, callback) { callback() },
    register(config) { registrations.push(config); return () => {} },
  }
  plugin.apply({ get: () => slots })

  assert.equal(appended.length, 1)
  assert.deepEqual(
    registrations.filter((item) => item.name === 'tool.call.toolview').map((item) => item.key),
    INTERVIEW_TOOL_NAMES,
  )
  const dockIds = registrations.filter((item) => item.name === 'conversation.input.dock').map((item) => item.id)
  assert.deepEqual(dockIds, ['interview-workspace', 'interview-timeline'])
})

test('Client 只使用 DSH 当前会话身份且不共享练习游标', () => {
  const source = readFileSync(new URL('../../src/client/index.js', import.meta.url), 'utf8')
  const leetcode = readFileSync(new URL('../../src/client/features/leetcode.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /sessionId\s*\|\|\s*['"]global['"]/)
  assert.doesNotMatch(leetcode, /sessionId\s*=\s*['"]global['"]/)
  assert.match(source, /sessionId: props\.sessionId/)
})

test('工具视图只按结构化 presentation 渲染用户可见卡片', () => {
  const { plugin } = loadPlugin()
  assert.equal(plugin.resolveToolView('interview_start_practice', { argsRaw: '{}' }).kind, 'hidden')
  assert.equal(plugin.resolveToolView('interview_start_practice', settled({ revision: 1, presentation: null })).kind, 'hidden')

  const question = plugin.resolveToolView('interview_present_question', settled({
    revision: 2,
    presentation: { kind: 'question', practiceId: 'p1', questionId: 'q1' },
  }))
  assert.deepEqual(JSON.parse(JSON.stringify(question)), {
    kind: 'question', practiceId: 'p1', questionId: 'q1', revision: 2, toolName: 'interview_present_question',
  })

  const review = plugin.resolveToolView('interview_complete_review', settled({
    revision: 5,
    presentation: { kind: 'review', practiceId: 'p1', questionId: 'q1', attemptId: 'a1' },
  }))
  assert.deepEqual(JSON.parse(JSON.stringify(review)), {
    kind: 'review', practiceId: 'p1', questionId: 'q1', attemptId: 'a1', revision: 5, toolName: 'interview_complete_review',
  })

  const recoverable = plugin.resolveToolView('interview_present_question', settled({
    revision: 0,
    presentation: null,
    error: { audience: 'agent', recoverable: true },
  }))
  assert.equal(recoverable.kind, 'hidden')

  const failed = plugin.resolveToolView('interview_present_question', {
    kind: 'tool-result', isError: true, content: [{ type: 'text', text: 'schema validation failed' }],
  })
  assert.equal(failed.kind, 'error')

  const invalidArguments = plugin.resolveToolView('interview_present_question', {
    kind: 'tool-result',
    isError: true,
    error: { code: 'INVALID_ARGS' },
    content: [{ type: 'text', text: 'Error: invalid arguments: prompt is required' }],
  })
  assert.equal(invalidArguments.kind, 'hidden')
})

test('界面只对主标题使用粗体且不渲染装饰性副标题', () => {
  const featureFiles = [
    '../../src/client/features/leetcode.js',
    '../../src/client/features/live-interview.js',
    '../../src/client/features/practice-library.js',
    '../../src/client/features/timeline.js',
    '../../src/client/features/workspace-dock.js',
    '../../src/client/shared/ui.js',
  ]
  const components = featureFiles
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n')
  const styles = readFileSync(new URL('../../src/client/shared/styles.js', import.meta.url), 'utf8')

  assert.doesNotMatch(components, /di-(?:eyebrow|subtitle)/)
  assert.doesNotMatch(components, /h\('strong'/)
  assert.doesNotMatch(styles, /font-weight:\s*[5-9]\d{2}/)
  assert.match(styles, /--di-weight-text:400/)
  assert.match(styles, /--di-weight-title:600/)
})

test('工作台按进行中与已结束状态分离练习', () => {
  const workspace = readFileSync(new URL('../../src/client/features/workspace-dock.js', import.meta.url), 'utf8')
  const library = readFileSync(new URL('../../src/client/features/practice-library.js', import.meta.url), 'utf8')

  assert.match(workspace, /id: 'active', label: '进行中'/)
  assert.match(workspace, /statusScope: 'active'/)
  assert.match(workspace, /statusScope: 'completed'/)
  assert.doesNotMatch(workspace, /label: '当前练习'/)
  assert.doesNotMatch(workspace, /LiveInterviewCard/)
  assert.match(library, /statusScope = 'completed'/)
  assert.match(library, /statusScope === 'active' \? 'active' : 'completed'/)
  assert.doesNotMatch(library, /全部状态/)
})

test('力扣题目卡使用讲解入口且不重复展示题目列表入口', () => {
  const leetcode = readFileSync(new URL('../../src/client/features/leetcode.js', import.meta.url), 'utf8')
  const liveInterview = readFileSync(new URL('../../src/client/features/live-interview.js', import.meta.url), 'utf8')
  assert.doesNotMatch(leetcode, /查看题目列表|收起题目列表/)
  assert.match(leetcode, /run\('question\.reveal'/)
  assert.match(leetcode, /}, '讲解'\)/)
  assert.match(leetcode, /'解题要点'/)
  assert.match(liveInterview, /isLeetcode \? '解题要点' : '直接背'/)
  assert.match(liveInterview, /!isLeetcode \? h\(Button/)
})

test('切换力扣题目时追加新卡片且保留旧题内容', () => {
  const first = { id: 'q1', prompt: '两数之和', leetcode: { slug: 'two-sum' } }
  const second = { id: 'q2', prompt: '三数之和', leetcode: { slug: '3sum' } }
  const reviewedFirst = { ...first, explanation: { detail: '使用哈希表' } }

  const initial = createLeetcodeCardStack(first)
  const switched = upsertLeetcodeCard(initial, second)
  const reviewed = upsertLeetcodeCard(switched, reviewedFirst)

  assert.deepEqual(switched, [first, second])
  assert.deepEqual(reviewed, [reviewedFirst, second])
  assert.equal(reviewed.length, 2)

  const source = readFileSync(new URL('../../src/client/features/leetcode.js', import.meta.url), 'utf8')
  assert.match(source, /className: 'di-lc-card-stack'/)
  assert.match(source, /result\.resource\.data/)
  assert.doesNotMatch(source, /session\?\.currentQuestion\?\.leetcode \? session\.currentQuestion : initialQuestion/)
})
