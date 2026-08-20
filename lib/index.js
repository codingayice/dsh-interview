// dsh-interview host：持久化练习工具和题目卡片 HTTP 路由。
import { InterviewStore, applyControl, executeTool } from './state.js'
import { existsSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'

export const name = 'dsh-interview'
export const inject = ['tools']
const store = new InterviewStore()

function keyOfExec(exec) { return exec && exec.agent && exec.agent.session ? exec.agent.session.id : 'global' }
function makeMessage(text) {
  return { id: typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function' ? globalThis.crypto.randomUUID() : 'dsh-interview-' + Date.now(), role: 'user', content: [{ type: 'text', text }], source: { kind: 'plugin', plugin: 'dsh-interview' } }
}
function wakeAgent(ctx, key, text) {
  const agents = ctx.get('agents'); const agent = agents && typeof agents.get === 'function' ? agents.get(key) : undefined
  if (!agent || typeof agent.followup !== 'function') return false
  try { agent.followup(makeMessage(text)); return true } catch (error) { ctx.logger?.warn?.('dsh-interview: followup failed: ' + (error instanceof Error ? error.message : String(error))); return false }
}

export const INTERVIEW_ACTIONS = ['practice.create', 'practice.list', 'practice.get', 'practice.update', 'practice.delete', 'practice.finish', 'practice.reopen', 'practice.dashboard', 'practice.timeline', 'practice.summary', 'question.open', 'question.list', 'question.get', 'question.update', 'question.delete', 'attempt.create', 'attempt.list', 'attempt.get', 'attempt.update', 'attempt.delete', 'evaluation.create', 'evaluation.get', 'evaluation.update', 'evaluation.list', 'explanation.create', 'explanation.get', 'explanation.update', 'explanation.delete', 'session.get', 'session.select_practice', 'session.focus_question', 'session.clear_focus', 'export.create']
const UI_ACTIONS = new Set(['practice.list', 'practice.get', 'practice.finish', 'practice.dashboard', 'practice.timeline', 'practice.summary', 'question.open', 'question.list', 'question.get', 'attempt.list', 'attempt.get', 'evaluation.create', 'evaluation.get', 'evaluation.update', 'evaluation.list', 'explanation.create', 'explanation.get', 'explanation.update', 'export.create'])
export function renderToolSummary(args, value) {
  const action = args && args.action; const v = value || {}; const lines = []
  const practiceId = v.practiceId || v.practice?.id || v.session?.practiceId || null
  const questionId = v.questionId || v.question?.id || v.session?.questionId || null
  const attemptId = v.attemptId || v.attempt?.id || v.evaluation?.attemptId || v.session?.attemptId || null
  if (practiceId) lines.push('practice_id: ' + practiceId)
  if (questionId) lines.push('question_id: ' + questionId)
  if (attemptId) lines.push('attempt_id: ' + attemptId)
  if (action === 'session.get') {
    const session = v.session || v; lines.push('mode: ' + (session.mode || 'idle'), 'topic: ' + (session.topic || ''), 'ended: ' + Boolean(session.ended))
    if (Array.isArray(session.practices) && session.practices.length) lines.push('practices:\n' + session.practices.map((item) => item.index + '. ' + item.id + ' | ' + item.modeLabel + ' | ' + (item.topic || '未指定主题') + ' | ' + item.questionsCount + '题' + (item.ended ? ' | 已结束' : '')).join('\n'))
  } else if (UI_ACTIONS.has(action)) {
    lines.push('该 action 已由 Client 固定 UI 展示。不要在普通文本中复述、重排或补写其中内容。')
  } else {
    lines.push('操作已持久化。仅在用户需要时简短确认，不要复述资源内容。')
  }
  return [{ type: 'text', text: lines.join('\n') }]
}

const tool = {
  name: 'interview',
  description: '面试复习 CRUD 工作区。所有练习、题目、作答、评价和讲解都会独立持久化；不存在“正在练习/历史”两套流程。当目标 ID 不明确时先调用 session.get。所有读取和展示都必须调用对应 action，调用后由 Client 固定 UI 呈现，禁止在普通文本中复述、重排或自行生成卡片、表格、题目、评价、讲解、总结和导出列表。映射：练习列表用 practice.dashboard/list，详情用 practice.get，时间轴用 practice.timeline，题目详情用 question.get/list，作答对比用 attempt.get/list，评价记录用 evaluation.get/list，讲解用 explanation.get，结束报告用 practice.finish/summary，导出用 export.create。新建和恢复题目统一调用 question.open：新题传 practice_id+question，旧题传 practice_id+question_id 或 question_index。用户回答后调用 attempt.create，再调用 evaluation.create；禁止只在普通文本中点评。重新作答先 question.open 旧题再 attempt.create，不得覆盖旧 attempt。只有用户明确索要答案后才调用 explanation.create。评价 UI 没有下一题；只有讲解 UI 有下一题和结束。结束用 practice.finish，继续已结束练习用 practice.reopen。删除前必须确认。模式：baogu 背八股、mock 模拟面试、scenario 场景题、resume 简历出题。动态数据只放工具结果，保持本段固定。',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: INTERVIEW_ACTIONS, description: '资源动作' },
      practice_id: { type: 'string', description: '练习 ID' },
      question_id: { type: 'string', description: '题目 ID' },
      question_index: { type: 'number', description: '题目序号，1 为第一题' },
      attempt_id: { type: 'string', description: '作答 ID' },
      attempt_index: { type: 'number', description: '作答序号，1 为第一次作答' },
      index: { type: 'number', description: '练习序号：1=最近更新的练习' },
      mode: { type: 'string', enum: ['baogu', 'mock', 'scenario', 'resume'], description: '练习模式' },
      topic: { type: 'string', description: '主题' },
      resume: { type: 'string', description: '简历全文' },
      question: { type: 'string', description: '题目全文' },
      score: { type: 'number', description: '0-10 评分' },
      comment: { type: 'string', description: '评价：优点、遗漏、提升建议' },
      user_answer: { type: 'string', description: '用户回答' },
      explain: { type: 'string', description: '参考答案讲解' },
      memo: { type: 'string', description: '参考答案背诵要点' },
      answer: { type: 'string', description: '卡片提交的用户回答' },
      practice_ids: { type: 'array', items: { type: 'string' }, description: '导出的练习 ID 列表' },
      indexes: { type: 'array', items: { type: 'number' }, description: '导出的练习序号列表，1 为最近更新' },
      scope: { type: 'string', enum: ['current', 'selected', 'all'], description: '导出范围；默认当前选择，all 为全部练习' },
      include: { type: 'array', items: { type: 'string', enum: ['metadata', 'question', 'answer', 'evaluation', 'explanation', 'memo', 'summary'] }, description: '导出内容；默认全部' },
      output_dir: { type: 'string', description: '可选导出目录' },
    },
    required: ['action'],
  },
  output: { schema: { type: 'object', additionalProperties: true }, render: (args, value) => renderToolSummary(args, value) },
  async execute(args, exec) { return executeTool(store, keyOfExec(exec), args) },
}

function readJsonBody(request) {
  return new Promise((resolve) => {
    let body = ''
    request.on('data', (chunk) => { body += chunk; if (body.length > 1024 * 1024) { request.destroy(); resolve(null) } })
    request.on('end', () => { if (!body) return resolve({}); try { resolve(JSON.parse(body)) } catch { resolve(null) } })
    request.on('error', () => resolve(null))
  })
}
function sendJson(response, status, data) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(data)) }

export function apply(ctx) {
  ctx.tools.register(tool)
  ctx.on('session/event', (session, event) => {
    if (!event || event.type !== 'user/message') return
    const msg = event.data; if (!msg || !msg.content || msg.source?.kind === 'plugin') return
    const text = (Array.isArray(msg.content) ? msg.content : []).map((b) => b && b.type === 'text' ? b.text : '').join('').trim()
    if (!text || text.startsWith('/')) return
    store.noteUserMessage(session?.id || 'global', text)
  }, { global: true })

  ctx.inject(['webServer'], (hostCtx) => {
    hostCtx.effect(() => hostCtx.webServer.register({ kind: 'exact', path: '/interview/state', handler: async (request, response) => {
      if (request.method !== 'GET') { response.writeHead(405, { allow: 'GET' }); response.end(); return }
      const url = new URL(request.url ?? '/', 'http://x'); const key = url.searchParams.get('session') || 'global'
      sendJson(response, 200, url.searchParams.get('view') === 'dashboard' ? store.dashboardSnapshot(key) : store.snapshot(key, false))
    } }))
    hostCtx.effect(() => hostCtx.webServer.register({ kind: 'exact', path: '/interview/practice', handler: async (request, response) => {
      if (request.method !== 'GET') { response.writeHead(405, { allow: 'GET' }); response.end(); return }
      const url = new URL(request.url ?? '/', 'http://x'); const detail = store.practiceSnapshot(url.searchParams.get('practice_id'))
      if (!detail) { sendJson(response, 404, { error: 'practice not found' }); return }
      sendJson(response, 200, detail)
    } }))
    hostCtx.effect(() => hostCtx.webServer.register({ kind: 'exact', path: '/interview/export', handler: async (request, response) => {
      if (request.method !== 'GET') { response.writeHead(405, { allow: 'GET' }); response.end(); return }
      const url = new URL(request.url ?? '/', 'http://x'); const key = url.searchParams.get('session') || 'global'; const index = Number(url.searchParams.get('index'))
      const files = store.lastExports.get(key) || []; const file = Number.isInteger(index) && index >= 0 ? files[index] : null
      if (!file || !existsSync(file.path)) { sendJson(response, 404, { error: 'export not found' }); return }
      const filename = encodeURIComponent(basename(file.path)); response.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8', 'content-disposition': "inline; filename*=UTF-8''" + filename, 'cache-control': 'no-store' }); response.end(readFileSync(file.path))
    } }))
    hostCtx.effect(() => hostCtx.webServer.register({ kind: 'exact', path: '/interview/control', handler: async (request, response) => {
      if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }); response.end(); return }
      const payload = await readJsonBody(request); if (payload === null) { sendJson(response, 400, { error: 'invalid json body' }); return }
      const key = typeof payload.session === 'string' ? payload.session : 'global'; const action = payload.action
      const directActions = ['export.create', 'practice.delete', 'practice.reopen', 'session.select_practice']; let snapshot
      try { snapshot = directActions.includes(action) ? executeTool(store, key, payload) : applyControl(store, key, payload) } catch (error) { sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) }); return }
      const texts = {
        'session.select_practice': '（用户切换了练习。请调用 interview 的 session.get，根据当前持久化状态继续。）',
        'practice.reopen': '（用户重新打开了已结束练习。请调用 interview 的 session.get，根据当前持久化状态继续。）',
        reveal: '（用户请求当前题讲解。请调用 interview 的 session.get，再调用 explanation.create 保存并展示讲解与背诵要点。）',
        retry: '（用户请求重新作答当前题。请调用 interview 的 session.get，再调用 question.open 打开当前 questionId；不要新建题目，也不要在普通文本中重复题目。）',
        next: '（用户请求下一题。请调用 interview 的 session.get，再调用 question.open 创建一道新题；不要在普通文本中重复题目。）',
        end: '（用户结束了练习，状态已结束。请调用 interview 的 practice.summary，然后给出最终总结。）',
      }
      if (texts[action]) wakeAgent(ctx, key, texts[action]); sendJson(response, 200, snapshot)
    } }))
  })
}
