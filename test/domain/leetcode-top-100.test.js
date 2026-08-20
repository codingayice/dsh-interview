import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LEETCODE_TOP_100,
  LEETCODE_TOP_100_GROUPS,
  LEETCODE_TOP_100_SOURCE,
  leetcodeTop100Problem,
} from '../../src/domain/leetcode-top-100.js'

test('力扣热题 100 快照保存官方分组、难度和题目地址', () => {
  assert.equal(LEETCODE_TOP_100.length, 100)
  assert.equal(LEETCODE_TOP_100_GROUPS.length, 17)
  assert.equal(new Set(LEETCODE_TOP_100.map((problem) => problem.slug)).size, 100)
  assert.ok(LEETCODE_TOP_100.every((problem) => ['easy', 'medium', 'hard'].includes(problem.difficulty)))
  assert.ok(LEETCODE_TOP_100.every((problem) => problem.url === `https://leetcode.cn/problems/${problem.slug}/`))
  assert.equal(LEETCODE_TOP_100_SOURCE.url, 'https://leetcode.cn/studyplan/top-100-liked/')
  assert.equal(leetcodeTop100Problem('two-sum').title, '两数之和')
  assert.equal(leetcodeTop100Problem('not-in-plan'), null)
})
