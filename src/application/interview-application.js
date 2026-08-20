import { DomainError, assertDomain } from '../domain/errors.js'
import {
  askQuestion as addQuestion,
  completePractice,
  createPractice,
  deleteQuestion as removeQuestion,
  evaluateAnswer as addEvaluation,
  findQuestion,
  reopenPractice,
  saveExplanation as addExplanation,
  submitAnswer as addAnswer,
  updatePractice as revisePractice,
  updateQuestion as reviseQuestion,
} from '../domain/practice.js'
import {
  createCursor,
  cursorForQuestion,
  markAnswerEvaluated,
  markAnswerRevealed,
  markAnswerSubmitted,
  markExplanationSaved,
  markNextRequested,
  markPracticeCompleted,
  markPracticeFinishRequested,
  markQuestionAsked,
  markQuestionRetried,
  WORKFLOW_PHASES,
} from '../domain/workflow.js'
import { buildInsights, toPracticeDetailDto, toPracticeSummaryDto, toQuestionDto, toSessionDto } from './dto.js'
import { validateApplicationPorts } from './ports.js'

function requiredId(value, name) {
  assertDomain(typeof value === 'string' && value.trim(), `INVALID_${name.toUpperCase()}`, `${name} 不能为空`)
  return value.trim()
}

export class InterviewApplication {
  constructor(ports) {
    const validated = validateApplicationPorts(ports)
    this.repository = validated.repository
    this.events = validated.events
    this.exporter = validated.exporter
    this.clock = validated.clock
    this.ids = validated.ids
  }

  async #practice(practiceId) {
    const practice = await this.repository.getPractice(requiredId(practiceId, 'practiceId'))
    if (!practice) throw new DomainError('PRACTICE_NOT_FOUND', `找不到练习：${practiceId}`)
    return practice
  }

  async #context(sessionId) {
    const cursor = await this.repository.getCursor(requiredId(sessionId, 'sessionId'))
    if (!cursor) throw new DomainError('SESSION_NOT_SELECTED', '当前会话未选择练习')
    const practice = await this.#practice(cursor.practiceId)
    return { cursor, practice }
  }

  async #publish(events) {
    if (events.length) await this.events.publish(events)
  }

  #result(kind, data, cursor, events = [], explicitReferences = {}) {
    const references = {
      ...(cursor?.practiceId ? { practiceId: cursor.practiceId } : {}),
      ...(cursor?.questionId ? { questionId: cursor.questionId } : {}),
      ...(cursor?.attemptId ? { attemptId: cursor.attemptId } : {}),
      ...explicitReferences,
    }
    return { resource: { kind, data }, references, events, revision: cursor?.revision ?? 0 }
  }

  async startPractice(sessionId, input) {
    const now = this.clock.now()
    const practice = createPractice({ ...input, id: this.ids.next('practice'), now })
    const cursor = createCursor({ sessionId, practiceId: practice.id, now })
    const events = [{
      type: 'question.generation_requested',
      sessionId,
      practiceId: practice.id,
      reason: 'practice_started',
    }]
    await this.repository.commit({ practice, cursor })
    await this.#publish(events)
    return this.#result('practice-started', toSessionDto(cursor, practice), cursor, events)
  }

  async updatePractice(practiceId, input) {
    const now = this.clock.now()
    const current = await this.#practice(practiceId)
    const practice = revisePractice(current, { ...input, now })
    await this.repository.commit({ practice })
    return this.#result('practice-detail', toPracticeDetailDto(practice), null, [], { practiceId: practice.id })
  }

  async getSession(sessionId) {
    const cursor = await this.repository.getCursor(requiredId(sessionId, 'sessionId'))
    const practice = cursor ? await this.repository.getPractice(cursor.practiceId) : null
    return this.#result('session', toSessionDto(cursor, practice), cursor)
  }

  async selectPractice(sessionId, practiceId) {
    const now = this.clock.now()
    const practice = await this.#practice(practiceId)
    let cursor = createCursor({ sessionId, practiceId: practice.id, now })
    const latestQuestion = practice.questions.at(-1) || null
    if (latestQuestion) cursor = cursorForQuestion(cursor, latestQuestion, now)
    if (practice.status === 'completed') cursor = { ...cursor, phase: WORKFLOW_PHASES.COMPLETED, revision: cursor.revision + 1 }
    await this.repository.commit({ cursor })
    return this.#result('session', toSessionDto(cursor, practice), cursor)
  }

  async askQuestion(sessionId, input) {
    const now = this.clock.now()
    const { cursor, practice } = await this.#context(sessionId)
    const added = addQuestion(practice, { id: this.ids.next('question'), prompt: input.prompt, now })
    const nextCursor = markQuestionAsked(cursor, added.question.id, now)
    const events = [{ type: 'question.asked', sessionId, practiceId: practice.id, questionId: added.question.id }]
    await this.repository.commit({ practice: added.practice, cursor: nextCursor })
    await this.#publish(events)
    return this.#result('question', toQuestionDto(added.question), nextCursor, events)
  }

  async openQuestion(sessionId, questionId) {
    const now = this.clock.now()
    const { cursor, practice } = await this.#context(sessionId)
    const question = findQuestion(practice, questionId)
    const nextCursor = practice.status === 'completed'
      ? { ...cursor, questionId: question.id, attemptId: question.attempts.at(-1)?.id || null, phase: WORKFLOW_PHASES.COMPLETED, revision: cursor.revision + 1, updatedAt: now }
      : cursorForQuestion(cursor, question, now)
    await this.repository.commit({ cursor: nextCursor })
    return this.#result('question', toQuestionDto(question), nextCursor)
  }

  async getQuestion(practiceId, questionId) {
    const practice = await this.#practice(practiceId)
    const question = findQuestion(practice, questionId)
    return this.#result('question-detail', toQuestionDto(question), null, [], { practiceId: practice.id, questionId: question.id })
  }

  async updateQuestion(practiceId, questionId, input) {
    const now = this.clock.now()
    const current = await this.#practice(practiceId)
    const updated = reviseQuestion(current, { questionId, prompt: input.prompt, now })
    await this.repository.commit({ practice: updated.practice })
    return this.#result('question-detail', toQuestionDto(updated.question), null, [], { practiceId: current.id, questionId: updated.question.id })
  }

  async deleteQuestion(practiceId, questionId, sessionId = null) {
    const now = this.clock.now()
    const current = await this.#practice(practiceId)
    const removed = removeQuestion(current, { questionId, now })
    let cursor = null
    if (sessionId) {
      const selected = await this.repository.getCursor(requiredId(sessionId, 'sessionId'))
      if (selected?.practiceId === current.id && selected.questionId === questionId) {
        cursor = createCursor({ sessionId, practiceId: current.id, now })
        const latestQuestion = removed.practice.questions.at(-1) || null
        if (latestQuestion) cursor = cursorForQuestion(cursor, latestQuestion, now)
        if (removed.practice.status === 'completed') cursor = { ...cursor, phase: WORKFLOW_PHASES.COMPLETED, revision: cursor.revision + 1 }
      }
    }
    await this.repository.commit({ practice: removed.practice, cursor })
    return this.#result('question-deleted', { practiceId: current.id, questionId }, cursor, [], { practiceId: current.id, questionId })
  }

  async submitAnswer(sessionId, input) {
    const now = this.clock.now()
    const { cursor, practice } = await this.#context(sessionId)
    const questionId = input.questionId || cursor.questionId
    assertDomain(Boolean(questionId) && questionId === cursor.questionId, 'QUESTION_NOT_FOCUSED', '只能回答当前题目')
    const added = addAnswer(practice, {
      questionId,
      attemptId: this.ids.next('attempt'),
      answer: input.answer,
      now,
    })
    const nextCursor = markAnswerSubmitted(cursor, added.attempt.id, now)
    const events = [{ type: 'answer.submitted', sessionId, practiceId: practice.id, questionId, attemptId: added.attempt.id }]
    await this.repository.commit({ practice: added.practice, cursor: nextCursor })
    await this.#publish(events)
    return this.#result('attempt', { questionId, ...added.attempt }, nextCursor, events)
  }

  async revealAnswer(sessionId, input = {}) {
    const now = this.clock.now()
    const { cursor, practice } = await this.#context(sessionId)
    const questionId = input.questionId || cursor.questionId
    assertDomain(Boolean(questionId) && questionId === cursor.questionId, 'QUESTION_NOT_FOCUSED', '只能查看当前题目的答案')
    const question = findQuestion(practice, questionId)
    const reviewReady = Boolean(question.explanation)
    const nextCursor = markAnswerRevealed(cursor, now, { reviewReady })
    const events = reviewReady ? [] : [{
      type: 'answer.reveal_requested', sessionId, practiceId: practice.id, questionId,
    }]
    await this.repository.commit({ cursor: nextCursor })
    await this.#publish(events)
    return this.#result('answer-revealed', { questionId, reviewReady }, nextCursor, events)
  }

  async evaluateAnswer(sessionId, input) {
    const now = this.clock.now()
    const { cursor, practice } = await this.#context(sessionId)
    const questionId = input.questionId || cursor.questionId
    const attemptId = input.attemptId || cursor.attemptId
    assertDomain(Boolean(questionId) && Boolean(attemptId) && questionId === cursor.questionId && attemptId === cursor.attemptId, 'ATTEMPT_NOT_FOCUSED', '只能评价当前作答')
    const reviewReady = Boolean(findQuestion(practice, questionId).explanation)
    const added = addEvaluation(practice, { ...input, questionId, attemptId, now })
    const nextCursor = markAnswerEvaluated(cursor, now, { reviewReady })
    const events = [{ type: 'answer.evaluated', sessionId, practiceId: practice.id, questionId, attemptId }]
    await this.repository.commit({ practice: added.practice, cursor: nextCursor })
    await this.#publish(events)
    return this.#result('evaluation', { questionId, attemptId, reviewReady, ...added.evaluation }, nextCursor, events)
  }

  async saveExplanation(sessionId, input) {
    const now = this.clock.now()
    const { cursor, practice } = await this.#context(sessionId)
    const questionId = input.questionId || cursor.questionId
    assertDomain(questionId === cursor.questionId, 'QUESTION_NOT_FOCUSED', '只能保存当前题目的讲解')
    const added = addExplanation(practice, { ...input, questionId, now })
    const nextCursor = markExplanationSaved(cursor, now)
    const events = [{ type: 'review.completed', sessionId, practiceId: practice.id, questionId, attemptId: cursor.attemptId }]
    await this.repository.commit({ practice: added.practice, cursor: nextCursor })
    await this.#publish(events)
    return this.#result('explanation', { questionId, ...added.explanation }, nextCursor, events)
  }

  async requestNextQuestion(sessionId) {
    const now = this.clock.now()
    const { cursor, practice } = await this.#context(sessionId)
    const nextCursor = markNextRequested(cursor, now)
    const events = [{ type: 'question.generation_requested', sessionId, practiceId: practice.id, reason: 'next_requested' }]
    await this.repository.commit({ cursor: nextCursor })
    await this.#publish(events)
    return this.#result('question-requested', toSessionDto(nextCursor, practice), nextCursor, events)
  }

  async retryQuestion(sessionId, questionId) {
    const now = this.clock.now()
    const { cursor, practice } = await this.#context(sessionId)
    assertDomain(practice.status === 'active', 'PRACTICE_NOT_ACTIVE', '已结束练习必须先重新打开')
    findQuestion(practice, questionId)
    const nextCursor = markQuestionRetried(cursor, questionId, now)
    const events = [{ type: 'question.retry_requested', sessionId, practiceId: practice.id, questionId }]
    await this.repository.commit({ cursor: nextCursor })
    await this.#publish(events)
    return this.#result('question-retried', toSessionDto(nextCursor, practice), nextCursor, events)
  }

  async requestPracticeSummary(sessionId) {
    const now = this.clock.now()
    const { cursor, practice } = await this.#context(sessionId)
    const nextCursor = markPracticeFinishRequested(cursor, now)
    const events = [{ type: 'practice.summary_requested', sessionId, practiceId: practice.id }]
    await this.repository.commit({ cursor: nextCursor })
    await this.#publish(events)
    return this.#result('summary-requested', toPracticeDetailDto(practice), nextCursor, events)
  }

  async completePractice(sessionId, input) {
    const now = this.clock.now()
    const { cursor, practice } = await this.#context(sessionId)
    const completed = completePractice(practice, { ...input, now })
    const nextCursor = markPracticeCompleted(cursor, now)
    const events = [{ type: 'practice.completed', sessionId, practiceId: practice.id }]
    await this.repository.commit({ practice: completed, cursor: nextCursor })
    await this.#publish(events)
    return this.#result('practice-summary', toPracticeDetailDto(completed), nextCursor, events)
  }

  async reopenPractice(sessionId, practiceId) {
    const now = this.clock.now()
    const practice = reopenPractice(await this.#practice(practiceId), now)
    let cursor = createCursor({ sessionId, practiceId: practice.id, now })
    const latestQuestion = practice.questions.at(-1) || null
    if (latestQuestion) cursor = cursorForQuestion(cursor, latestQuestion, now)
    const events = latestQuestion ? [] : [{ type: 'question.generation_requested', sessionId, practiceId: practice.id, reason: 'practice_reopened' }]
    await this.repository.commit({ practice, cursor })
    await this.#publish(events)
    return this.#result('practice-reopened', toSessionDto(cursor, practice), cursor, events)
  }

  async listPractices(filters = {}) {
    const practices = await this.repository.listPractices(filters)
    return this.#result('practice-list', practices.map(toPracticeSummaryDto), null)
  }

  async getPractice(practiceId) {
    const practice = await this.#practice(practiceId)
    return this.#result('practice-detail', toPracticeDetailDto(practice), null, [], { practiceId: practice.id })
  }

  async getInsights() {
    const practices = await this.repository.listPractices({})
    return this.#result('insights', buildInsights(practices), null)
  }

  async deletePractice(practiceId, sessionId = null) {
    const practice = await this.#practice(practiceId)
    await this.repository.deletePractice(practice.id)
    if (sessionId) {
      const cursor = await this.repository.getCursor(requiredId(sessionId, 'sessionId'))
      if (cursor?.practiceId === practice.id) await this.repository.clearCursor(sessionId)
    }
    return this.#result('practice-deleted', { practiceId: practice.id }, null, [], { practiceId: practice.id })
  }

  async exportPractices(input = {}) {
    const practices = input.practiceIds?.length
      ? await Promise.all(input.practiceIds.map((id) => this.#practice(id)))
      : await this.repository.listPractices(input.scope === 'all' ? {} : input.filters || {})
    assertDomain(practices.length > 0, 'NOTHING_TO_EXPORT', '没有可导出的练习')
    const files = await this.exporter.export(practices, input)
    return this.#result('export', files, null)
  }
}
