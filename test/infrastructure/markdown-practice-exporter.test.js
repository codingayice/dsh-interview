import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { askQuestion, completeLeetcodePractice, createPractice, evaluateAnswer, saveExplanation, submitAnswer } from '../../src/domain/practice.js'
import { MarkdownPracticeExporter, renderPracticeMarkdown } from '../../src/infrastructure/markdown-practice-exporter.js'

function practiceFixture() {
  let practice = createPractice({ id: 'practice-1', mode: 'mock', config: { resume: 'Java/后端简历', interviewerStyle: '深挖项目', coding: true, difficulty: 'intermediate' }, now: 1 })
  practice = askQuestion(practice, { id: 'question-1', prompt: '什么是 JMM？', now: 2 }).practice
  practice = submitAnswer(practice, { questionId: 'question-1', attemptId: 'attempt-1', answer: 'Java 内存模型。', now: 3 }).practice
  practice = evaluateAnswer(practice, { questionId: 'question-1', attemptId: 'attempt-1', score: 8, feedback: '基本正确。', dimensions: { accuracy: 8 }, now: 4 }).practice
  return saveExplanation(practice, { questionId: 'question-1', detail: 'JMM 定义线程间可见性规则。', memorizationPoints: '原子性、可见性、有序性。', now: 5 }).practice
}

test('Markdown 报告包含完整作答、评价、讲解和总结', () => {
  const result = renderPracticeMarkdown(practiceFixture())
  assert.match(result.markdown, /第 1 次作答/)
  assert.match(result.markdown, /评分：8\/10/)
  assert.match(result.markdown, /参考讲解/)
  assert.match(result.markdown, /平均分：8/)
})

test('Markdown 导出支持内容筛选', () => {
  const result = renderPracticeMarkdown(practiceFixture(), ['questions', 'answers'])
  assert.match(result.markdown, /什么是 JMM/)
  assert.doesNotMatch(result.markdown, /评分：/)
  assert.doesNotMatch(result.markdown, /参考讲解/)
})

test('Markdown 导出力扣题目地址、题型和难度', () => {
  let practice = createPractice({ id: 'leetcode-1', mode: 'leetcode', config: { language: 'cpp' }, now: 1 })
  practice = askQuestion(practice, {
    id: 'question-1', prompt: '1. 两数之和', leetcode: { slug: 'two-sum' }, now: 2,
  }).practice
  practice = saveExplanation(practice, {
    questionId: 'question-1',
    detail: [
      '使用哈希表一次遍历。',
      '```cpp\nvector<int> twoSum() { return {}; }\n```',
    ].join('\n\n'),
    memorizationPoints: '查找 target - x，时间 O(n)，空间 O(n)。',
    now: 3,
  }).practice
  practice = completeLeetcodePractice(practice, { now: 4 })
  const markdown = renderPracticeMarkdown(practice).markdown
  assert.match(markdown, /编程语言：C\+\+/)
  assert.match(markdown, /题目地址：https:\/\/leetcode\.cn\/problems\/two-sum\//)
  assert.match(markdown, /\[1\. 两数之和\]\(https:\/\/leetcode\.cn\/problems\/two-sum\/\) · 哈希 · 简单/)
  assert.match(markdown, /### 算法讲解/)
  assert.match(markdown, /### 解题要点/)
  assert.doesNotMatch(markdown, /### 直接背/)
  assert.doesNotMatch(markdown, /平均分：未评分/)
  assert.doesNotMatch(markdown, /表现亮点|改进建议/)
})

test('导出器返回受控下载令牌并清理非法文件名字符', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-interview-export-'))
  try {
    const exporter = new MarkdownPracticeExporter({ outputDirectory: directory, tokenFactory: () => 'token-1' })
    const [result] = await exporter.export([practiceFixture()])
    const download = exporter.resolveDownload(result.token)
    assert.equal(result.token, 'token-1')
    assert.doesNotMatch(result.name, /\//)
    assert.match(readFileSync(download.filePath, 'utf8'), /Java\/后端/)
    assert.equal(exporter.resolveDownload('unknown'), null)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
