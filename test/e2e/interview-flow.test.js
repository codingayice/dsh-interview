import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { InterviewApplication } from '../../src/application/interview-application.js'
import { InterviewCoordinator } from '../../src/application/interview-coordinator.js'
import { createToolDefinitions } from '../../src/adapters/dsh/tool-definitions.js'
import { MarkdownPracticeExporter } from '../../src/infrastructure/markdown-practice-exporter.js'
import { SqliteInterviewRepository } from '../../src/infrastructure/sqlite-interview-repository.js'

test('真实 SQLite 下完成创建到复盘导出的端到端流程', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-interview-e2e-'))
  const databasePath = join(directory, 'interview.sqlite')
  const repository = new SqliteInterviewRepository(databasePath)
  const exporter = new MarkdownPracticeExporter({ outputDirectory: join(directory, 'exports'), tokenFactory: () => 'download-token' })
  let time = 1_700_000_000_000
  let sequence = 0
  const events = []
  const application = new InterviewApplication({
    repository,
    exporter,
    events: { async publish(batch) { events.push(...batch) } },
    clock: { now: () => ++time },
    ids: { next: (prefix) => `${prefix}-${++sequence}` },
    random: { next: () => 0 },
  })
  const coordinator = new InterviewCoordinator({ application })
  const tools = Object.fromEntries(createToolDefinitions(coordinator).map((tool) => [tool.name, tool]))
  const exec = { agent: { session: { id: 'session-e2e' } } }

  try {
    const started = await tools.interview_start_practice.execute({ mode: 'scenario', topic: 'Redis 高可用' }, exec)
    const practiceId = started.resource.data.practice.id
    await tools.interview_present_question.execute({ prompt: '缓存击穿时如何保护数据库？' }, exec)
    await tools.interview_submit_answer.execute({ answer: '使用互斥锁、逻辑过期并限制回源并发。' }, exec)
    await tools.interview_save_evaluation.execute({ score: 8.5, feedback: '方案完整，建议补充降级策略。', dimensions: { accuracy: 9, tradeoff: 8 } }, exec)
    await tools.interview_complete_review.execute({ detail: '互斥重建、逻辑过期和热点隔离需要结合业务选择。', memorization_points: '互斥重建、逻辑过期、限流降级。' }, exec)
    await tools.interview_request_next.execute({}, exec)
    await tools.interview_present_question.execute({ prompt: 'Redis 主从切换时如何避免数据丢失？' }, exec)
    await tools.interview_submit_answer.execute({ answer: '配置合理复制策略并评估一致性与可用性的权衡。' }, exec)
    await tools.interview_save_evaluation.execute({ score: 7.5, feedback: '需要补充复制积压缓冲区和故障转移条件。' }, exec)
    await tools.interview_complete_review.execute({ detail: '应结合复制偏移量、积压缓冲区和 Sentinel 故障转移分析数据安全。', memorization_points: '确认复制进度，保留积压缓冲，约束故障转移。' }, exec)
    await tools.interview_finish_practice.execute({}, exec)
    await tools.interview_complete_summary.execute({
      overall: 'Redis 高可用核心知识掌握较好。',
      strengths: ['能够识别缓存击穿与主从切换的关键风险。'],
      improvements: ['补充复制积压缓冲区和故障转移条件。'],
    }, exec)

    const detail = await tools.interview_get_practice.execute({ practice_id: practiceId }, exec)
    const insight = await tools.interview_get_insights.execute({}, exec)
    const exported = await tools.interview_export_practices.execute({ practice_ids: [practiceId] }, exec)
    const download = exporter.resolveDownload(exported.resource.data[0].token)

    assert.equal(detail.resource.data.status, 'completed')
    assert.equal(detail.resource.data.questions.length, 2)
    assert.equal(detail.resource.data.averageScore, 8)
    assert.equal(detail.resource.data.summary.overall, 'Redis 高可用核心知识掌握较好。')
    assert.equal(insight.resource.data.weakestTopic.topic, 'Redis 高可用')
    assert.match(readFileSync(download.filePath, 'utf8'), /互斥重建、逻辑过期、限流降级/)
    assert.equal(events.filter((event) => event.type === 'practice.started').length, 1)
    assert.equal(events.filter((event) => event.type === 'question.next_requested').length, 1)

    repository.close()
    const restoredRepository = new SqliteInterviewRepository(databasePath)
    try {
      const restored = await restoredRepository.getPractice(practiceId)
      assert.equal(restored.questions[0].attempts[0].evaluation.score, 8.5)
      assert.equal(restored.status, 'completed')
      assert.equal(restored.summary.strengths.length, 1)
    } finally {
      restoredRepository.close()
    }
  } finally {
    try { repository.close() } catch {}
    rmSync(directory, { recursive: true, force: true })
  }
})
