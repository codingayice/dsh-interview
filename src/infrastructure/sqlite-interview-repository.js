import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { defaultDatabasePath } from './paths.js'

function parseJson(value, fallback) {
  if (typeof value !== 'string' || !value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}

export class SqliteInterviewRepository {
  constructor(filePath = defaultDatabasePath()) {
    this.filePath = filePath
    if (filePath !== ':memory:') mkdirSync(dirname(filePath), { recursive: true })
    this.database = new DatabaseSync(filePath)
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
    this.#migrate()
  }

  #migrate() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS practices (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        topic TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        source_content TEXT NOT NULL,
        config_json TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        practice_id TEXT NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
        sequence INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        explanation_detail TEXT,
        explanation_memo TEXT,
        explained_at INTEGER,
        UNIQUE (practice_id, sequence)
      );

      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        sequence INTEGER NOT NULL,
        answer TEXT NOT NULL,
        submitted_at INTEGER NOT NULL,
        evaluation_score REAL,
        evaluation_feedback TEXT,
        evaluation_dimensions_json TEXT,
        evaluated_at INTEGER,
        UNIQUE (question_id, sequence)
      );

      CREATE TABLE IF NOT EXISTS session_cursors (
        session_id TEXT PRIMARY KEY,
        practice_id TEXT NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
        question_id TEXT,
        attempt_id TEXT,
        phase TEXT NOT NULL,
        revision INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_practices_updated_at ON practices(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_practices_mode_status ON practices(mode, status);
      CREATE INDEX IF NOT EXISTS idx_questions_practice ON questions(practice_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id, sequence);
    `)
  }

  #readQuestion(row) {
    const attemptRows = this.database.prepare(`
      SELECT * FROM attempts WHERE question_id = ? ORDER BY sequence ASC
    `).all(row.id)
    return {
      id: row.id,
      sequence: row.sequence,
      prompt: row.prompt,
      createdAt: row.created_at,
      attempts: attemptRows.map((attempt) => ({
        id: attempt.id,
        sequence: attempt.sequence,
        answer: attempt.answer,
        submittedAt: attempt.submitted_at,
        evaluation: attempt.evaluation_score === null ? null : {
          score: attempt.evaluation_score,
          feedback: attempt.evaluation_feedback || '',
          dimensions: parseJson(attempt.evaluation_dimensions_json, {}),
          evaluatedAt: attempt.evaluated_at,
        },
      })),
      explanation: row.explanation_detail === null ? null : {
        detail: row.explanation_detail,
        memorizationPoints: row.explanation_memo || '',
        createdAt: row.explained_at,
      },
    }
  }

  async getPractice(id) {
    const row = this.database.prepare('SELECT * FROM practices WHERE id = ?').get(id)
    if (!row) return null
    const questionRows = this.database.prepare(`
      SELECT * FROM questions WHERE practice_id = ? ORDER BY sequence ASC
    `).all(id)
    return {
      id: row.id,
      mode: row.mode,
      topic: row.topic,
      source: { kind: row.source_kind, content: row.source_content },
      config: parseJson(row.config_json, {}),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      questions: questionRows.map((question) => this.#readQuestion(question)),
    }
  }

  async listPractices(filters = {}) {
    const clauses = []
    const values = []
    if (filters.mode) { clauses.push('mode = ?'); values.push(filters.mode) }
    if (filters.status) { clauses.push('status = ?'); values.push(filters.status) }
    if (filters.query) { clauses.push('LOWER(topic) LIKE ?'); values.push(`%${String(filters.query).toLowerCase()}%`) }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = this.database.prepare(`SELECT id FROM practices ${where} ORDER BY updated_at DESC`).all(...values)
    return Promise.all(rows.map((row) => this.getPractice(row.id)))
  }

  async getCursor(sessionId) {
    const row = this.database.prepare('SELECT * FROM session_cursors WHERE session_id = ?').get(sessionId)
    return row ? {
      sessionId: row.session_id,
      practiceId: row.practice_id,
      questionId: row.question_id,
      attemptId: row.attempt_id,
      phase: row.phase,
      revision: row.revision,
      updatedAt: row.updated_at,
    } : null
  }

  #writePractice(practice) {
    this.database.prepare(`
      INSERT INTO practices (
        id, mode, topic, source_kind, source_content, config_json, status,
        created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        mode = excluded.mode,
        topic = excluded.topic,
        source_kind = excluded.source_kind,
        source_content = excluded.source_content,
        config_json = excluded.config_json,
        status = excluded.status,
        updated_at = excluded.updated_at,
        completed_at = excluded.completed_at
    `).run(
      practice.id,
      practice.mode,
      practice.topic,
      practice.source.kind,
      practice.source.content,
      JSON.stringify(practice.config),
      practice.status,
      practice.createdAt,
      practice.updatedAt,
      practice.completedAt,
    )
    this.database.prepare('DELETE FROM questions WHERE practice_id = ?').run(practice.id)
    const insertQuestion = this.database.prepare(`
      INSERT INTO questions (
        id, practice_id, sequence, prompt, created_at,
        explanation_detail, explanation_memo, explained_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertAttempt = this.database.prepare(`
      INSERT INTO attempts (
        id, question_id, sequence, answer, submitted_at,
        evaluation_score, evaluation_feedback, evaluation_dimensions_json, evaluated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const question of practice.questions) {
      insertQuestion.run(
        question.id,
        practice.id,
        question.sequence,
        question.prompt,
        question.createdAt,
        question.explanation?.detail ?? null,
        question.explanation?.memorizationPoints ?? null,
        question.explanation?.createdAt ?? null,
      )
      for (const attempt of question.attempts) {
        insertAttempt.run(
          attempt.id,
          question.id,
          attempt.sequence,
          attempt.answer,
          attempt.submittedAt,
          attempt.evaluation?.score ?? null,
          attempt.evaluation?.feedback ?? null,
          attempt.evaluation ? JSON.stringify(attempt.evaluation.dimensions) : null,
          attempt.evaluation?.evaluatedAt ?? null,
        )
      }
    }
  }

  #writeCursor(cursor) {
    this.database.prepare(`
      INSERT INTO session_cursors (
        session_id, practice_id, question_id, attempt_id, phase, revision, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        practice_id = excluded.practice_id,
        question_id = excluded.question_id,
        attempt_id = excluded.attempt_id,
        phase = excluded.phase,
        revision = excluded.revision,
        updated_at = excluded.updated_at
    `).run(
      cursor.sessionId,
      cursor.practiceId,
      cursor.questionId,
      cursor.attemptId,
      cursor.phase,
      cursor.revision,
      cursor.updatedAt,
    )
  }

  async commit({ practice, cursor }) {
    this.database.exec('BEGIN IMMEDIATE')
    try {
      if (practice) this.#writePractice(practice)
      if (cursor) this.#writeCursor(cursor)
      this.database.exec('COMMIT')
    } catch (error) {
      this.database.exec('ROLLBACK')
      throw error
    }
  }

  async deletePractice(id) {
    this.database.prepare('DELETE FROM practices WHERE id = ?').run(id)
  }

  async clearCursor(sessionId) {
    this.database.prepare('DELETE FROM session_cursors WHERE session_id = ?').run(sessionId)
  }

  close() {
    this.database.close()
  }
}
