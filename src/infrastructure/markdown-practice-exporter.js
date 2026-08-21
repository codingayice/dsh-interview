import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { INTERVIEW_MODES } from '../domain/modes.js'
import { leetcodeDifficultyLabel } from '../domain/leetcode-top-100.js'
import { leetcodeLanguageLabel } from '../domain/leetcode-languages.js'
import { summarizePractice } from '../domain/practice.js'
import { defaultDataDirectory } from './paths.js'

const ALL_SECTIONS = ['metadata', 'questions', 'answers', 'evaluations', 'explanations', 'summary']

function timestamp(value) {
  const date = new Date(value)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-') + ' ' + [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join(':')
}

function safeFileName(value) {
  const normalized = String(value || '未指定主题')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
  return (normalized || '未指定主题').slice(0, 160)
}

function sectionsOf(input) {
  if (!input) return new Set(ALL_SECTIONS)
  if (!Array.isArray(input)) throw new TypeError('include 必须是数组')
  const unknown = input.filter((item) => !ALL_SECTIONS.includes(item))
  if (unknown.length) throw new TypeError(`不支持的导出内容：${unknown.join('、')}`)
  return new Set(input)
}

export function renderPracticeMarkdown(practice, include) {
  const sections = sectionsOf(include)
  const modeLabel = INTERVIEW_MODES[practice.mode]?.label || practice.mode
  const summary = summarizePractice(practice)
  const title = `${practice.topic} - ${timestamp(practice.createdAt)} - ${modeLabel}`
  const lines = [`# ${title}`]

  if (sections.has('metadata')) {
    lines.push(
      '',
      '## 练习信息',
      '',
      `- 模式：${modeLabel}`,
      `- 主题：${practice.topic}`,
      `- 状态：${practice.status === 'completed' ? '已结束' : '进行中'}`,
      `- 创建时间：${timestamp(practice.createdAt)}`,
    )
    if (practice.mode === 'mock') {
      lines.push(
        `- 简历：${practice.config.resume}`,
        `- 面试官风格：${practice.config.interviewerStyle}`,
        `- 是否手撕代码：${practice.config.coding ? '是' : '否'}`,
        `- 面试难度：${practice.config.difficulty}`,
      )
    }
    if (practice.mode === 'leetcode') lines.push(
      `- 编程语言：${leetcodeLanguageLabel(practice.config.language)}`,
      `- 官方题库：${practice.source.content}`,
    )
  }

  if (sections.has('summary')) {
    lines.push(
      '',
      '## 练习总结',
      '',
      `- 题目数：${summary.questionCount}`,
      ...(practice.mode === 'leetcode' ? [
        '- 记录说明：完成状态以本地“热题 100”题目列表为准',
      ] : [
        `- 作答数：${summary.attemptCount}`,
        `- 已评价：${summary.evaluatedCount}`,
        `- 平均分：${summary.averageScore ?? '未评分'}`,
        `- 结论：${summary.verdict}`,
      ]),
    )
    if (practice.summary) {
      lines.push(
        '',
        practice.summary.overall,
        '',
        '### 表现亮点',
        '',
        ...practice.summary.strengths.map((item) => `- ${item}`),
        '',
        '### 改进建议',
        '',
        ...practice.summary.improvements.map((item) => `- ${item}`),
      )
    }
  }

  for (const question of practice.questions) {
    if (!['questions', 'answers', 'evaluations', 'explanations'].some((section) => sections.has(section))) break
    lines.push('', `## 第 ${question.sequence} 题`)
    if (sections.has('questions')) {
      lines.push('', question.leetcode
        ? `[${question.prompt}](${question.leetcode.url}) · ${question.leetcode.category} · ${leetcodeDifficultyLabel(question.leetcode.difficulty)}`
        : question.prompt)
    }
    for (const attempt of question.attempts) {
      if (!sections.has('answers') && !sections.has('evaluations')) continue
      lines.push('', `### 第 ${attempt.sequence} 次作答`)
      if (sections.has('answers')) lines.push('', attempt.answer)
      if (sections.has('evaluations') && attempt.evaluation) {
        lines.push('', `评分：${attempt.evaluation.score}/10`, '', attempt.evaluation.feedback)
        const dimensions = Object.entries(attempt.evaluation.dimensions)
        if (dimensions.length) lines.push('', ...dimensions.map(([name, score]) => `- ${name}：${score}/10`))
      }
    }
    if (sections.has('explanations') && question.explanation) {
      lines.push('', question.leetcode ? '### 算法讲解' : '### 参考讲解', '', question.explanation.detail)
      if (question.explanation.memorizationPoints) {
        lines.push('', question.leetcode ? '### 解题要点' : '### 直接背', '', question.explanation.memorizationPoints)
      }
    }
  }

  return { title, markdown: `${lines.join('\n')}\n` }
}

export class MarkdownPracticeExporter {
  constructor({ outputDirectory = join(defaultDataDirectory(), 'exports'), tokenFactory = randomUUID } = {}) {
    this.outputDirectory = outputDirectory
    this.tokenFactory = tokenFactory
    this.downloads = new Map()
  }

  async export(practices, input = {}) {
    mkdirSync(this.outputDirectory, { recursive: true })
    const results = []
    for (const practice of practices) {
      const rendered = renderPracticeMarkdown(practice, input.include)
      const baseName = safeFileName(rendered.title)
      let name = `${baseName}.md`
      let filePath = join(this.outputDirectory, name)
      let suffix = 2
      while (existsSync(filePath)) {
        name = `${baseName} (${suffix++}).md`
        filePath = join(this.outputDirectory, name)
      }
      const temporaryPath = `${filePath}.tmp`
      writeFileSync(temporaryPath, rendered.markdown, 'utf8')
      renameSync(temporaryPath, filePath)
      const token = this.tokenFactory()
      const result = { practiceId: practice.id, name, token }
      this.downloads.set(token, { ...result, filePath, contentType: 'text/markdown; charset=utf-8' })
      results.push(result)
    }
    return results
  }

  resolveDownload(token) {
    return this.downloads.get(token) || null
  }
}
