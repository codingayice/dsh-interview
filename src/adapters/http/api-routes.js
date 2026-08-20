import { existsSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { DomainError } from '../../domain/errors.js'
import { dispatchCommand } from './command-dispatcher.js'

function sendJson(response, status, data) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  response.end(JSON.stringify(data))
}

function readJsonBody(request, maximumBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (Buffer.byteLength(body, 'utf8') > maximumBytes) {
        reject(new DomainError('REQUEST_TOO_LARGE', '请求体超过大小限制'))
        request.destroy()
      }
    })
    request.on('end', () => {
      if (!body) return resolve({})
      try { resolve(JSON.parse(body)) } catch { reject(new DomainError('INVALID_JSON', '请求体不是有效 JSON')) }
    })
    request.on('error', reject)
  })
}

function errorResponse(error) {
  if (error instanceof DomainError) {
    return { status: 400, body: { error: { code: error.code, message: error.message, details: error.details } } }
  }
  if (error instanceof TypeError) {
    return { status: 400, body: { error: { code: 'INVALID_COMMAND', message: error.message } } }
  }
  return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: '面试插件内部错误' } } }
}

function query(request) {
  return new URL(request.url || '/', 'http://dsh.local').searchParams
}

export function registerApiRoutes(hostCtx, { application, coordinator, exporter }) {
  const register = (path, handler) => hostCtx.effect(() => hostCtx.webServer.register({ kind: 'exact', path, handler }))

  register('/interview/api/session', async (request, response) => {
    if (request.method !== 'GET') return sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET' } })
    try {
      sendJson(response, 200, await application.getSession(query(request).get('session') || 'global'))
    } catch (error) {
      const output = errorResponse(error); sendJson(response, output.status, output.body)
    }
  })

  register('/interview/api/practices', async (request, response) => {
    if (request.method !== 'GET') return sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET' } })
    try {
      const params = query(request)
      sendJson(response, 200, await application.listPractices({ query: params.get('query') || undefined, mode: params.get('mode') || undefined, status: params.get('status') || undefined }))
    } catch (error) {
      const output = errorResponse(error); sendJson(response, output.status, output.body)
    }
  })

  register('/interview/api/practice', async (request, response) => {
    if (request.method !== 'GET') return sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET' } })
    try {
      sendJson(response, 200, await application.getPractice(query(request).get('id')))
    } catch (error) {
      const output = errorResponse(error); sendJson(response, output.status, output.body)
    }
  })

  register('/interview/api/insights', async (request, response) => {
    if (request.method !== 'GET') return sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET' } })
    try {
      sendJson(response, 200, await application.getInsights())
    } catch (error) {
      const output = errorResponse(error); sendJson(response, output.status, output.body)
    }
  })

  register('/interview/api/leetcode', async (request, response) => {
    if (request.method !== 'GET') return sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET' } })
    try {
      sendJson(response, 200, await application.getLeetcodeCatalog())
    } catch (error) {
      const output = errorResponse(error); sendJson(response, output.status, output.body)
    }
  })

  register('/interview/api/command', async (request, response) => {
    if (request.method !== 'POST') return sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 POST' } })
    try {
      const body = await readJsonBody(request)
      const result = await dispatchCommand(coordinator, typeof body.session === 'string' ? body.session : 'global', body.command, body.payload)
      sendJson(response, 200, result)
    } catch (error) {
      const output = errorResponse(error); sendJson(response, output.status, output.body)
    }
  })

  register('/interview/api/download', async (request, response) => {
    if (request.method !== 'GET') return sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET' } })
    const download = exporter.resolveDownload(query(request).get('token'))
    if (!download || !existsSync(download.filePath)) return sendJson(response, 404, { error: { code: 'DOWNLOAD_NOT_FOUND', message: '导出文件不存在或下载令牌已失效' } })
    const fileName = encodeURIComponent(basename(download.name))
    response.writeHead(200, {
      'content-type': download.contentType,
      'content-disposition': `attachment; filename*=UTF-8''${fileName}`,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
    response.end(readFileSync(download.filePath))
  })
}

export { errorResponse, readJsonBody }
