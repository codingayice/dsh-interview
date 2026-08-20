import { InterviewApplication } from '../../application/interview-application.js'
import { MarkdownPracticeExporter } from '../../infrastructure/markdown-practice-exporter.js'
import { SqliteInterviewRepository } from '../../infrastructure/sqlite-interview-repository.js'
import { createSystemPorts } from '../../infrastructure/system-ports.js'
import { registerApiRoutes } from '../http/api-routes.js'
import { AgentEventBridge } from './agent-event-bridge.js'
import { createToolDefinitions } from './tool-definitions.js'

export const name = 'dsh-interview'
export const inject = ['tools']

export function createRuntime(ctx, options = {}) {
  const repository = options.repository || new SqliteInterviewRepository(options.databasePath)
  const exporter = options.exporter || new MarkdownPracticeExporter({ outputDirectory: options.exportDirectory })
  const system = createSystemPorts()
  const application = options.application || new InterviewApplication({
    repository,
    exporter,
    events: options.events || system.events,
    clock: options.clock || system.clock,
    ids: options.ids || system.ids,
  })
  return {
    application,
    repository,
    exporter,
    eventBridge: new AgentEventBridge(ctx),
  }
}

export function apply(ctx) {
  const runtime = createRuntime(ctx)
  for (const tool of createToolDefinitions(runtime.application)) ctx.tools.register(tool)

  ctx.inject(['webServer'], (hostCtx) => {
    registerApiRoutes(hostCtx, runtime)
  })

  ctx.effect?.(() => () => runtime.repository.close?.())
}
