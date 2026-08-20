import { assertDomain } from './errors.js'
import { modeDefinition } from './modes.js'

const DIFFICULTIES = new Set(['junior', 'intermediate', 'senior'])

function requiredText(value, code, message) {
  const text = typeof value === 'string' ? value.trim() : ''
  assertDomain(text, code, message)
  return text
}

function activePractice(practice) {
  assertDomain(practice?.status === 'active', 'PRACTICE_NOT_ACTIVE', '练习未处于进行中状态')
}

function withUpdatedAt(practice, now, patch = {}) {
  return { ...practice, ...patch, updatedAt: now }
}

function normalizeConfiguration(definition, config) {
  assertDomain(config && typeof config === 'object' && !Array.isArray(config), 'CONFIGURATION_REQUIRED', '必须明确提供练习配置')
  if (definition.configuration === 'topic') {
    return { topic: requiredText(config.topic, 'INVALID_TOPIC', '必须明确提供练习主题') }
  }

  const resume = requiredText(config.resume, 'RESUME_REQUIRED', '模拟面试必须明确提供简历内容')
  const interviewerStyle = requiredText(config.interviewerStyle, 'INTERVIEWER_STYLE_REQUIRED', '模拟面试必须明确选择面试官风格')
  assertDomain(typeof config.coding === 'boolean', 'CODING_REQUIRED', '模拟面试必须明确选择是否手撕代码')
  const difficulty = requiredText(config.difficulty, 'DIFFICULTY_REQUIRED', '模拟面试必须明确选择面试难度')
  assertDomain(DIFFICULTIES.has(difficulty), 'INVALID_DIFFICULTY', `不支持的难度：${difficulty}`)
  return { resume, interviewerStyle, coding: config.coding, difficulty }
}

export function createPractice({ id, mode, config, now }) {
  const definition = modeDefinition(mode)
  const normalizedConfig = normalizeConfiguration(definition, config)
  const topic = definition.configuration === 'topic' ? normalizedConfig.topic : definition.label

  return {
    id: requiredText(id, 'INVALID_PRACTICE_ID', '练习 ID 不能为空'),
    mode,
    topic,
    source: definition.configuration === 'topic'
      ? { kind: 'topic', content: normalizedConfig.topic }
      : { kind: 'resume', content: normalizedConfig.resume },
    config: normalizedConfig,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    questions: [],
  }
}

export function findQuestion(practice, questionId) {
  const question = practice?.questions?.find((item) => item.id === questionId)
  assertDomain(question, 'QUESTION_NOT_FOUND', `找不到题目：${String(questionId)}`)
  return question
}

export function findAttempt(question, attemptId) {
  const attempt = question?.attempts?.find((item) => item.id === attemptId)
  assertDomain(attempt, 'ATTEMPT_NOT_FOUND', `找不到作答：${String(attemptId)}`)
  return attempt
}

export function askQuestion(practice, { id, prompt, now }) {
  activePractice(practice)
  const questionId = requiredText(id, 'INVALID_QUESTION_ID', '题目 ID 不能为空')
  const normalizedPrompt = requiredText(prompt, 'INVALID_QUESTION', '题目内容不能为空')
  assertDomain(normalizedPrompt.length <= 120, 'QUESTION_TOO_LONG', '题目必须简单扼要，长度不能超过 120 个字符')
  const questionMarkCount = (normalizedPrompt.match(/[?？]/g) || []).length
  assertDomain(questionMarkCount <= 1 && !/[\r\n]/.test(normalizedPrompt), 'MULTI_PART_QUESTION', '每轮只能提出一道问题，不能拼接多个子问题')
  assertDomain(!practice.questions.some((item) => item.id === questionId), 'DUPLICATE_QUESTION', `题目已存在：${questionId}`)
  const question = {
    id: questionId,
    sequence: practice.questions.length + 1,
    prompt: normalizedPrompt,
    createdAt: now,
    attempts: [],
    explanation: null,
  }
  return {
    practice: withUpdatedAt(practice, now, { questions: [...practice.questions, question] }),
    question,
  }
}

export function submitAnswer(practice, { questionId, attemptId, answer, now }) {
  activePractice(practice)
  const target = findQuestion(practice, questionId)
  const id = requiredText(attemptId, 'INVALID_ATTEMPT_ID', '作答 ID 不能为空')
  assertDomain(!target.attempts.some((item) => item.id === id), 'DUPLICATE_ATTEMPT', `作答已存在：${id}`)
  const attempt = {
    id,
    sequence: target.attempts.length + 1,
    answer: requiredText(answer, 'INVALID_ANSWER', '回答不能为空'),
    submittedAt: now,
    evaluation: null,
  }
  const questions = practice.questions.map((question) => question.id === target.id
    ? { ...question, attempts: [...question.attempts, attempt] }
    : question)
  return { practice: withUpdatedAt(practice, now, { questions }), attempt }
}

export function evaluateAnswer(practice, { questionId, attemptId, score, feedback, dimensions = {}, now }) {
  activePractice(practice)
  const targetQuestion = findQuestion(practice, questionId)
  const targetAttempt = findAttempt(targetQuestion, attemptId)
  assertDomain(!targetAttempt.evaluation, 'ATTEMPT_ALREADY_EVALUATED', '该作答已经评价，重新回答会创建新的作答记录')
  const normalizedScore = Number(score)
  assertDomain(Number.isFinite(normalizedScore) && normalizedScore >= 0 && normalizedScore <= 10, 'INVALID_SCORE', '评分必须在 0–10 之间')
  const normalizedDimensions = Object.fromEntries(Object.entries(dimensions || {}).map(([key, value]) => {
    const dimensionScore = Number(value)
    assertDomain(Number.isFinite(dimensionScore) && dimensionScore >= 0 && dimensionScore <= 10, 'INVALID_DIMENSION_SCORE', `维度 ${key} 的评分必须在 0–10 之间`)
    return [key, dimensionScore]
  }))
  const evaluation = {
    score: normalizedScore,
    feedback: requiredText(feedback, 'INVALID_FEEDBACK', '评价内容不能为空'),
    dimensions: normalizedDimensions,
    evaluatedAt: now,
  }
  const questions = practice.questions.map((question) => question.id !== targetQuestion.id ? question : {
    ...question,
    attempts: question.attempts.map((attempt) => attempt.id === targetAttempt.id
      ? { ...attempt, evaluation }
      : attempt),
  })
  return { practice: withUpdatedAt(practice, now, { questions }), evaluation }
}

export function saveExplanation(practice, { questionId, detail, memorizationPoints, now }) {
  activePractice(practice)
  const target = findQuestion(practice, questionId)
  assertDomain(!target.explanation, 'EXPLANATION_ALREADY_EXISTS', '该题已经存在讲解')
  const explanation = {
    detail: requiredText(detail, 'INVALID_EXPLANATION', '讲解内容不能为空'),
    memorizationPoints: requiredText(memorizationPoints, 'INVALID_MEMORIZATION_POINTS', '直接背内容不能为空'),
    createdAt: now,
  }
  const questions = practice.questions.map((question) => question.id === target.id
    ? { ...question, explanation }
    : question)
  return { practice: withUpdatedAt(practice, now, { questions }), explanation }
}

export function completePractice(practice, now) {
  activePractice(practice)
  return withUpdatedAt(practice, now, { status: 'completed', completedAt: now })
}

export function reopenPractice(practice, now) {
  assertDomain(practice?.status === 'completed', 'PRACTICE_NOT_COMPLETED', '只有已结束练习可以重新打开')
  return withUpdatedAt(practice, now, { status: 'active', completedAt: null })
}

export function summarizePractice(practice) {
  const attempts = practice.questions.flatMap((question) => question.attempts)
  const evaluated = attempts.filter((attempt) => attempt.evaluation)
  const averageScore = evaluated.length
    ? Math.round((evaluated.reduce((sum, attempt) => sum + attempt.evaluation.score, 0) / evaluated.length) * 10) / 10
    : null
  return {
    questionCount: practice.questions.length,
    attemptCount: attempts.length,
    evaluatedCount: evaluated.length,
    averageScore,
    verdict: averageScore === null ? '未评分' : averageScore >= 8 ? '优秀' : averageScore >= 6 ? '合格' : '需要加强',
  }
}
