import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let isSyncing = false;

// Database operation queue to prevent concurrent access
let dbQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;

const processQueue = async () => {
  if (isProcessingQueue || dbQueue.length === 0) return;
  
  isProcessingQueue = true;
  while (dbQueue.length > 0) {
    const operation = dbQueue.shift();
    if (operation) {
      try {
        await operation();
      } catch (error) {
        console.error('[DB] Queue operation failed:', error);
      }
    }
  }
  isProcessingQueue = false;
};

const enqueueDbOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    const wrappedOperation = async () => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    dbQueue.push(wrappedOperation);
    processQueue();
  });
};

/**
 * Core DB Initialization
 * Simplified to prevent transaction nesting errors
 */
export const initLocalDatabase = async () => {
    if (db) return db;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            console.log('[DB] Initializing AceCBT storage...');
            const database = await SQLite.openDatabaseAsync('acecbt_v2.db'); // New DB version to ensure clean slate

            // Sequential initialization
            await database.execAsync('PRAGMA foreign_keys = ON;');

            await database.execAsync(`
                CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT);
                CREATE TABLE IF NOT EXISTS exam_years (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, year INTEGER NOT NULL, created_at TEXT);
                CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, exam_year_id TEXT NOT NULL, name TEXT NOT NULL, question_count INTEGER DEFAULT 0, created_at TEXT);
                CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, exam_year_id TEXT NOT NULL, subject_id TEXT NOT NULL, question TEXT NOT NULL, option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT NOT NULL, option_d TEXT NOT NULL, correct_answer TEXT NOT NULL, explanation TEXT, image_url TEXT, created_at TEXT);
                CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, subject_id TEXT, subject TEXT, topic_id TEXT, topic TEXT, subtopic_id TEXT, subtopic TEXT, content TEXT NOT NULL, quiz TEXT, is_default INTEGER DEFAULT 0, created_at TEXT);
                CREATE TABLE IF NOT EXISTS pdf_resources (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, exam_year_id TEXT NOT NULL, subject_id TEXT NOT NULL, file_url TEXT NOT NULL, file_name TEXT NOT NULL, size_kb REAL, created_at TEXT);
                CREATE TABLE IF NOT EXISTS exam_results (id TEXT PRIMARY KEY, total_score REAL, total_questions INTEGER, total_correct INTEGER, total_wrong INTEGER, time_spent INTEGER, date TEXT, mode TEXT, subject_id TEXT, subject_results TEXT, user_answers TEXT);
                CREATE TABLE IF NOT EXISTS jamb_texts (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, author TEXT, thumbnail_url TEXT, category TEXT, content TEXT NOT NULL, quiz TEXT, subheading_id TEXT, subheading TEXT, is_default INTEGER DEFAULT 0, created_at TEXT);
                CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS sync_status (key TEXT PRIMARY KEY, last_sync TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT, role TEXT NOT NULL DEFAULT 'user', assigned_view TEXT, is_paid INTEGER DEFAULT 0, expiry_date TEXT, created_at TEXT NOT NULL, active_premium_device_id TEXT, active_premium_device_name TEXT, current_device_id TEXT, current_device_name TEXT, current_device_has_premium INTEGER DEFAULT 0, premium_revoked_permanently INTEGER DEFAULT 0, device_access_state TEXT, premium_checked_at TEXT, premium_offline_valid_until TEXT);
                CREATE TABLE IF NOT EXISTS note_quiz_results (id TEXT PRIMARY KEY, note_id TEXT, score INTEGER, total INTEGER, date TEXT);
                CREATE TABLE IF NOT EXISTS jamb_text_quiz_results (id TEXT PRIMARY KEY, text_id TEXT, score INTEGER, total INTEGER, date TEXT);
                CREATE TABLE IF NOT EXISTS note_read_progress (note_id TEXT PRIMARY KEY, progress REAL DEFAULT 0, updated_at TEXT);
                CREATE TABLE IF NOT EXISTS career_departments (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
                CREATE TABLE IF NOT EXISTS career_courses (id TEXT PRIMARY KEY, department_id TEXT NOT NULL, name TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT, FOREIGN KEY (department_id) REFERENCES career_departments (id));
            `);

            // Seed default career departments if empty
            try {
                const deptCount = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM career_departments;');
                if (deptCount && deptCount.count === 0) {
                    await database.runAsync("INSERT INTO career_departments (id, name) VALUES ('sci', 'Science'), ('art', 'Art'), ('com', 'Commercial');");
                    console.log('[DB] Seeded career departments.');
                }
            } catch (seedError) {
                console.error('[DB] Error seeding departments:', seedError);
            }

            // Migration: Add quiz column to notes if it was created in an older version of the app
            try {
                await database.execAsync('ALTER TABLE notes ADD COLUMN quiz TEXT;');
                console.log('[DB] Migration: Added quiz column to notes table.');
            } catch (e) {
                // Column likely already exists or table doesn't exist yet (handled by CREATE TABLE above)
            }

            const noteColumnMigrations = [
                'ALTER TABLE notes ADD COLUMN subject_id TEXT;',
                'ALTER TABLE notes ADD COLUMN topic_id TEXT;',
                'ALTER TABLE notes ADD COLUMN subtopic_id TEXT;',
                'ALTER TABLE notes ADD COLUMN subtopic TEXT;',
                'ALTER TABLE notes ADD COLUMN is_default INTEGER DEFAULT 0;',
            ];
            for (const migration of noteColumnMigrations) {
                try {
                    await database.execAsync(migration);
                } catch (e) {
                    // Column likely already exists.
                }
            }

            try {
                await database.execAsync('ALTER TABLE users ADD COLUMN assigned_view TEXT;');
            } catch (e) {
                // Column likely already exists or users table is newly created.
            }

            // Migration: Add columns to jamb_texts
            try {
                await database.execAsync('ALTER TABLE jamb_texts ADD COLUMN quiz TEXT;');
            } catch (e) { }
            try {
                await database.execAsync('ALTER TABLE jamb_texts ADD COLUMN category TEXT;');
            } catch (e) { }
            try {
                await database.execAsync('ALTER TABLE jamb_texts ADD COLUMN thumbnail_url TEXT;');
            } catch (e) { }
            try {
                await database.execAsync('ALTER TABLE jamb_texts ADD COLUMN subheading_id TEXT;');
            } catch (e) { }
            try {
                await database.execAsync('ALTER TABLE jamb_texts ADD COLUMN subheading TEXT;');
            } catch (e) { }
            try {
                await database.execAsync('ALTER TABLE jamb_texts ADD COLUMN is_default INTEGER DEFAULT 0;');
                console.log('[DB] Migration: Added new columns and subheading support to jamb_texts table.');
            } catch (e) {
                // Column likely already exists
            }

            try {
                await database.execAsync('ALTER TABLE users ADD COLUMN is_paid INTEGER DEFAULT 0;');
                await database.execAsync('ALTER TABLE users ADD COLUMN expiry_date TEXT;');
                console.log('[DB] Migration: Added subscription columns to users table.');
            } catch (e) {
                // Column likely already exists
            }

            const userColumnMigrations = [
                'ALTER TABLE users ADD COLUMN active_premium_device_id TEXT;',
                'ALTER TABLE users ADD COLUMN active_premium_device_name TEXT;',
                'ALTER TABLE users ADD COLUMN current_device_id TEXT;',
                'ALTER TABLE users ADD COLUMN current_device_name TEXT;',
                'ALTER TABLE users ADD COLUMN current_device_has_premium INTEGER DEFAULT 0;',
                'ALTER TABLE users ADD COLUMN premium_revoked_permanently INTEGER DEFAULT 0;',
                'ALTER TABLE users ADD COLUMN device_access_state TEXT;',
                'ALTER TABLE users ADD COLUMN premium_checked_at TEXT;',
                'ALTER TABLE users ADD COLUMN premium_offline_valid_until TEXT;',
            ];

            for (const statement of userColumnMigrations) {
                try {
                    await database.execAsync(statement);
                } catch (e) {
                    // Column likely already exists
                }
            }

            db = database;
            console.log('[DB] Storage ready.');
            return database;
        } catch (error) {
            initPromise = null;
            console.error('[DB] Critical Init Fail:', error);
            throw error;
        }
    })();

    return initPromise;
};

/**
 * Robust Parameter Sanitizer
 */
const clean = (val: any) => val ?? null;

/**
 * ATOMIC REWRITE: Simple sequential savers for metadata
 * We avoid complex transactions for small lists to prevent driver lockups
 */

export const saveExams = async (exams: any[]) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        for (const e of exams) {
            await database.runAsync('INSERT OR REPLACE INTO exams (id, name, created_at) VALUES (?, ?, ?)', clean(e.id), clean(e.name), clean(e.created_at));
        }
    });
};

export const saveExamYears = async (years: any[]) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        for (const y of years) {
            await database.runAsync('INSERT OR REPLACE INTO exam_years (id, exam_id, year, created_at) VALUES (?, ?, ?, ?)', clean(y.id), clean(y.exam_id), clean(y.year), clean(y.created_at));
        }
    });
};

export const saveSubjects = async (subjects: any[]) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        for (const s of subjects) {
            // Robust Naming Bridge
            const id = clean(s.id);
            const examId = clean(s.exam_id || s.examId);
            const yearId = clean(s.exam_year_id || s.examYearId);
            const name = clean(s.name);
            const count = clean(s.question_count || s.questionCount || 0);
            await database.runAsync('INSERT OR REPLACE INTO subjects (id, exam_id, exam_year_id, name, question_count, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, examId, yearId, name, count, clean(s.created_at || s.createdAt));
        }
    });
};

export const saveQuestions = async (questions: any[]) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        if (questions.length === 0) return;

        // Batch Transaction only for high volume questions
        try {
            await database.withTransactionAsync(async () => {
                for (const q of questions) {
                    const id = clean(q.id);
                    const exId = clean(q.exam_id || q.examId);
                    const yrId = clean(q.exam_year_id || q.examYearId);
                    const subId = clean(q.subject_id || q.subjectId);
                    const txt = clean(q.question) || "";
                    const oA = clean(q.option_a || q.optionA) || "";
                    const oB = clean(q.option_b || q.optionB) || "";
                    const oC = clean(q.option_c || q.optionC) || "";
                    const oD = clean(q.option_d || q.optionD) || "";
                    const ans = clean(q.correct_answer || q.correctAnswer) || "";
                    const expl = clean(q.explanation);
                    const img = clean(q.image_url || q.imageUrl);
                    const ts = clean(q.created_at || q.createdAt);

                    await database.runAsync(
                        'INSERT OR REPLACE INTO questions (id, exam_id, exam_year_id, subject_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        id, exId, yrId, subId, txt, oA, oB, oC, oD, ans, expl, img, ts
                    );
                }
            });
            console.log(`[DB] Saved ${questions.length} questions.`);
        } catch (e) {
            console.error('[DB] Batch save failed:', e);
            throw e;
        }
    });
};

export const saveNotes = async (notes: any[]) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        for (const n of notes) {
            await database.runAsync('INSERT OR REPLACE INTO notes (id, title, subject_id, subject, topic_id, topic, subtopic_id, subtopic, content, quiz, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                clean(n.id),
                clean(n.title),
                clean(n.subject_id || n.subjectId),
                clean(n.subject),
                clean(n.topic_id || n.topicId),
                clean(n.topic),
                clean(n.subtopic_id || n.subtopicId),
                clean(n.subtopic),
                clean(n.content),
                clean(typeof n.quiz === 'string' ? n.quiz : JSON.stringify(n.quiz)),
                n.is_default ? 1 : 0,
                clean(n.created_at)
            );
        }
    });
};

export const savePdfResources = async (res: any[]) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        for (const r of res) {
            await database.runAsync('INSERT OR REPLACE INTO pdf_resources (id, exam_id, exam_year_id, subject_id, file_url, file_name, size_kb, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', clean(r.id), clean(r.exam_id), clean(r.exam_year_id), clean(r.subject_id), clean(r.fileUrl || r.file_url), clean(r.fileName || r.file_name), clean(r.sizeKb || r.size_kb), clean(r.createdAt || r.created_at));
        }
    });
};

export const saveJambTexts = async (texts: any[]) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        for (const t of texts) {
            await database.runAsync('INSERT OR REPLACE INTO jamb_texts (id, type, title, author, thumbnail_url, category, content, quiz, subheading_id, subheading, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                clean(t.id),
                clean(t.type),
                clean(t.title),
                clean(t.author),
                clean(t.thumbnail_url || t.thumbnailUrl),
                clean(t.category),
                clean(t.content),
                clean(typeof t.quiz === 'string' ? t.quiz : JSON.stringify(t.quiz)),
                clean(t.subheading_id || t.subheadingId),
                clean(t.subheading),
                t.is_default ? 1 : 0,
                clean(t.created_at)
            );
        }
    });
};

export const saveExamResult = async (res: any) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        await database.runAsync(
            'INSERT OR REPLACE INTO exam_results (id, total_score, total_questions, total_correct, total_wrong, time_spent, date, mode, subject_id, subject_results, user_answers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            clean(res.id), clean(res.totalScore), clean(res.totalQuestions), clean(res.totalCorrect), clean(res.totalWrong), clean(res.timeSpent), clean(res.date), clean(res.mode), clean(res.subjectId), clean(JSON.stringify(res.subjectResults)), clean(JSON.stringify(res.userAnswers))
        );
    });
};

export const deleteExamResultLocal = async (id: string) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        await database.runAsync('DELETE FROM exam_results WHERE id = ?', id);
    });
};

// ============================================
// QUERIES
// ============================================

export const getLocalSubjects = async () => {
    const database = await initLocalDatabase();
    return await database.getAllAsync(`
        SELECT s.*, e.name as exam_name 
        FROM subjects s
        LEFT JOIN exams e ON s.exam_id = e.id
        ORDER BY s.name ASC
    `);
};

export const getLocalExams = async () => {
    const database = await initLocalDatabase();
    return await database.getAllAsync('SELECT * FROM exams ORDER BY name ASC');
};

export const getSubjectById = async (id: string) => {
    const database = await initLocalDatabase();
    return await database.getFirstAsync('SELECT * FROM subjects WHERE id = ?', id);
};

export const getRandomQuestionsBySubject = async (subjectId: string, limit: number = 20) => {
    const database = await initLocalDatabase();
    return await database.getAllAsync('SELECT * FROM questions WHERE subject_id = ? ORDER BY RANDOM() LIMIT ?', subjectId, limit);
};

export const getLocalNotes = async () => {
    const database = await initLocalDatabase();
    const rows = await database.getAllAsync('SELECT * FROM notes ORDER BY created_at DESC');
    return rows.map((r: any) => ({
        ...r,
        is_default: Boolean(r.is_default),
        quiz: r.quiz ? JSON.parse(r.quiz) : null
    }));
};

export const getNoteByIdLocal = async (id: string) => {
    const database = await initLocalDatabase();
    const row: any = await database.getFirstAsync('SELECT * FROM notes WHERE id = ?', id);
    if (row && row.quiz) {
        row.quiz = JSON.parse(row.quiz);
    }
    if (row) {
        row.is_default = Boolean(row.is_default);
    }
    return row;
};

// --- Note Reading Progress Operations ---
const ensureNoteReadProgressTable = async () => {
    const database = await initLocalDatabase();
    await database.execAsync(
        'CREATE TABLE IF NOT EXISTS note_read_progress (note_id TEXT PRIMARY KEY, progress REAL DEFAULT 0, updated_at TEXT);'
    );
    return database;
};

export const saveNoteReadProgress = async (noteId: string, progress: number) => {
    const database = await ensureNoteReadProgressTable();
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    await database.runAsync(
        'INSERT OR REPLACE INTO note_read_progress (note_id, progress, updated_at) VALUES (?, ?, ?)',
        noteId,
        clamped,
        new Date().toISOString()
    );
    return clamped;
};

export const getNoteReadProgress = async (noteId: string) => {
    const database = await ensureNoteReadProgressTable();
    const row: any = await database.getFirstAsync(
        'SELECT note_id, progress, updated_at FROM note_read_progress WHERE note_id = ?',
        noteId
    );
    if (!row) return null;
    return {
        noteId: row.note_id,
        progress: Number(row.progress || 0),
        updatedAt: row.updated_at
    };
};

export const getAllNoteReadProgress = async () => {
    const database = await ensureNoteReadProgressTable();
    const rows: any[] = await database.getAllAsync(
        'SELECT note_id, progress, updated_at FROM note_read_progress'
    );
    return rows.map((r: any) => ({
        noteId: r.note_id,
        progress: Number(r.progress || 0),
        updatedAt: r.updated_at
    }));
};

// --- Note Quiz Result Operations ---

export const saveNoteQuizResult = async (noteId: string, score: number, total: number) => {
    const database = await initLocalDatabase();
    const id = `qr-${Date.now()}`;
    const date = new Date().toISOString();
    await database.runAsync(
        'INSERT INTO note_quiz_results (id, note_id, score, total, date) VALUES (?, ?, ?, ?, ?)',
        id, noteId, score, total, date
    );
    return { id, noteId, score, total, date };
};

export const getNoteHighestScore = async (noteId: string) => {
    const database = await initLocalDatabase();
    const row: any = await database.getFirstAsync(
        'SELECT MAX(score) as maxScore, total FROM note_quiz_results WHERE note_id = ? GROUP BY note_id',
        noteId
    );
    return row ? { score: row.maxScore, total: row.total } : null;
};

export const getAllNoteQuizResults = async () => {
    const database = await initLocalDatabase();
    return await database.getAllAsync('SELECT r.*, n.title as noteTitle FROM note_quiz_results r LEFT JOIN notes n ON r.note_id = n.id ORDER BY r.date DESC');
};

export const deleteNoteQuizResultLocal = async (id: string) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        await database.runAsync('DELETE FROM note_quiz_results WHERE id = ?', id);
    });
};

export const saveJambTextQuizResult = async (textId: string, score: number, total: number) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        const id = `jqr-${Date.now()}`;
        const date = new Date().toISOString();
        await database.runAsync(
            'INSERT INTO jamb_text_quiz_results (id, text_id, score, total, date) VALUES (?, ?, ?, ?, ?)',
            id, textId, score, total, date
        );
        return { id, text_id: textId, score, total, date };
    });
};

export const getJambTextHighestScore = async (textId: string) => {
    const database = await initLocalDatabase();
    const row: any = await database.getFirstAsync(
        'SELECT MAX(score) as maxScore, total FROM jamb_text_quiz_results WHERE text_id = ? GROUP BY text_id',
        textId
    );
    return row ? { score: row.maxScore, total: row.total } : null;
};

export const getAllJambTextQuizResults = async () => {
    const database = await initLocalDatabase();
    return await database.getAllAsync('SELECT r.*, t.title as textTitle FROM jamb_text_quiz_results r LEFT JOIN jamb_texts t ON r.text_id = t.id ORDER BY r.date DESC');
};

export const deleteJambTextQuizResultLocal = async (id: string) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        await database.runAsync('DELETE FROM jamb_text_quiz_results WHERE id = ?', id);
    });
};

export const getLocalExamResults = async () => {
    const database = await initLocalDatabase();
    const rows = await database.getAllAsync('SELECT * FROM exam_results ORDER BY date DESC');
    return rows.map((r: any) => ({
        ...r,
        totalScore: r.total_score,
        totalQuestions: r.total_questions,
        totalCorrect: r.total_correct,
        totalWrong: r.total_wrong,
        timeSpent: r.time_spent,
        subjectId: r.subject_id,
        subjectResults: JSON.parse(r.subject_results),
        userAnswers: JSON.parse(r.user_answers)
    }));
};

export const getYearsForExam = async (examId: string) => {
    const database = await initLocalDatabase();
    return await database.getAllAsync('SELECT * FROM exam_years WHERE exam_id = ? ORDER BY year DESC', examId);
};

export const getSubjectsForYear = async (yearId: string) => {
    const database = await initLocalDatabase();
    return await database.getAllAsync('SELECT * FROM subjects WHERE exam_year_id = ? ORDER BY name ASC', yearId);
};

export const getSubjectsByExamId = async (examId: string) => {
    const database = await initLocalDatabase();
    return await database.getAllAsync('SELECT * FROM subjects WHERE exam_id = ? ORDER BY name ASC', examId);
};

export const getRandomYearSubjectByName = async (examId: string, subjectName: string) => {
    const database = await initLocalDatabase();
    return await database.getFirstAsync('SELECT * FROM subjects WHERE exam_id = ? AND name = ? ORDER BY RANDOM() LIMIT 1', [examId, subjectName]);
};

export const getLocalPdfResources = async () => {
    const database = await initLocalDatabase();
    return await database.getAllAsync(`
        SELECT pr.*, s.name as subject, s.question_count, e.name as exam, ey.year as year
        FROM pdf_resources pr
        JOIN subjects s ON pr.subject_id = s.id
        JOIN exams e ON pr.exam_id = e.id
        JOIN exam_years ey ON pr.exam_year_id = ey.id
    `);
};

export const hasQuestionsLoaded = async () => {
    const database = await initLocalDatabase();
    const res: any = await database.getFirstAsync('SELECT COUNT(*) as c FROM questions');
    return (res?.c || 0) > 0;
};

export const getJambExamId = async () => {
    const database = await initLocalDatabase();
    const res: any = await database.getFirstAsync("SELECT id FROM exams WHERE (UPPER(name) LIKE '%JAMB%' OR UPPER(name) LIKE '%UTME%') LIMIT 1");
    return res?.id || null;
};

export const getRandomYearForExam = async (examId: string) => {
    const database = await initLocalDatabase();
    return await database.getFirstAsync('SELECT id, year FROM exam_years WHERE exam_id = ? ORDER BY RANDOM() LIMIT 1', examId);
};

export const getYearByValue = async (examId: string, year: number) => {
    const database = await initLocalDatabase();
    return await database.getFirstAsync('SELECT id, year FROM exam_years WHERE exam_id = ? AND year = ? LIMIT 1', examId, year);
};

export const getRandomQuestionsBySubjectName = async (subjectName: string, limit: number = 40) => {
    const database = await initLocalDatabase();
    // 1. Get all subject IDs that match this name (case-insensitive, trimmed)
    const subjects: any[] = await database.getAllAsync('SELECT id, name, exam_id FROM subjects WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', subjectName);

    if (subjects.length === 0) {
        console.warn(`[DB] No subject IDs found for name: "${subjectName}"`);
        // Let's see what subjects WE DO HAVE
        const allSubs = await database.getAllAsync('SELECT name FROM subjects LIMIT 10');
        console.log('[DB] Sample subjects in DB:', allSubs.map((s: any) => s.name).join(', '));
        return [];
    }

    const ids = subjects.map(s => s.id);
    console.log(`[DB] Name "${subjectName}" resolved to ${ids.length} subject records.`);

    const placeholders = ids.map(() => '?').join(',');

    // 2. Fetch random questions for ANY of these subject IDs
    const query = `SELECT * FROM questions WHERE subject_id IN (${placeholders}) ORDER BY RANDOM() LIMIT ?`;
    const questions = await database.getAllAsync(query, ...ids, limit);
    console.log(`[DB] Query for subject IDs [${ids.join(',')}] found ${questions.length} questions.`);
    return questions;
};

export const getQuestionsDebug = async () => {
    const database = await initLocalDatabase();
    const qCount = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    const sCount = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM subjects');
    const samples = await database.getAllAsync('SELECT id, subject_id, exam_year_id FROM questions LIMIT 3');

    console.log('--- DATABASE DIAGNOSTICS ---');
    console.log('[DEBUG] Total Questions:', qCount?.count);
    console.log('[DEBUG] Total Subjects:', sCount?.count);
    if (samples.length > 0) {
        console.log('[DEBUG] Sample Questions:', JSON.stringify(samples, null, 2));
        // Check if the subject_id in the sample exists in subjects table
        const subId = (samples[0] as any).subject_id;
        const subCheck = await database.getFirstAsync('SELECT * FROM subjects WHERE id = ?', subId);
        console.log(`[DEBUG] Sample question's subject ID "${subId}" maps to:`, subCheck ? JSON.stringify(subCheck) : 'NOT FOUND IN SUBJECTS TABLE');
    }
    console.log('---------------------------');
};

export const getQuestionsForSubjects = async (subjectIds: string[], yearId: string, limit: number = 40) => {
    const database = await initLocalDatabase();
    let questions: any[] = [];
    for (const sid of subjectIds) {
        const qs = await database.getAllAsync('SELECT * FROM questions WHERE subject_id = ? AND exam_year_id = ? ORDER BY RANDOM() LIMIT ?', sid, yearId, limit);
        questions = [...questions, ...qs];
    }
    return questions;
};

export const getAllPapersLocal = async () => {
    const database = await initLocalDatabase();
    return await database.getAllAsync('SELECT s.id, s.name, s.question_count, e.name as exam_name, y.year as exam_year FROM subjects s JOIN exams e ON s.exam_id = e.id JOIN exam_years y ON s.exam_year_id = y.id ORDER BY e.name ASC, y.year DESC, s.name ASC');
};

export const getQuestionsForPaper = async (sid: string) => {
    const database = await initLocalDatabase();
    return await database.getAllAsync('SELECT * FROM questions WHERE subject_id = ? ORDER BY RANDOM()', sid);
};

export const getQuestionsByIds = async (ids: string[]) => {
    const database = await initLocalDatabase();
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    return await database.getAllAsync(`SELECT * FROM questions WHERE id IN (${placeholders})`, ids);
};

export const getLocalJambTexts = async (type: 'literature' | 'english') => {
    const database = await initLocalDatabase();
    const rows = await database.getAllAsync('SELECT * FROM jamb_texts WHERE type = ? ORDER BY category ASC, title ASC', [type]);
    
    // Group and keep unique books by title (case-insensitive)
    const uniqueMap = new Map<string, any>();
    rows.forEach((r: any) => {
        const key = (r.title || '').trim().toLowerCase();
        if (!uniqueMap.has(key) || r.is_default) {
            uniqueMap.set(key, r);
        }
    });
    const uniqueRows = Array.from(uniqueMap.values());

    return uniqueRows.map((r: any) => ({
        ...r,
        quiz: r.quiz ? JSON.parse(r.quiz) : null
    }));
};

export const saveSetting = async (key: string, value: string) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        await database.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', key, value);
    });
};

export const getSetting = async (key: string) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        const row: any = await database.getFirstAsync('SELECT value FROM app_settings WHERE key = ?', key);
        return row?.value || null;
    });
};

export const getSettings = async () => {
    const database = await initLocalDatabase();
    const rows = await database.getAllAsync('SELECT * FROM app_settings');
    const settings: Record<string, string> = {};
    rows.forEach((r: any) => {
        settings[r.key] = r.value;
    });
    return settings;
};

export const clearAllLocalData = async () => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        await database.execAsync(`
            DELETE FROM exam_results;
            DELETE FROM note_quiz_results;
            DELETE FROM jamb_text_quiz_results;
            DELETE FROM note_read_progress;
            DELETE FROM pdf_resources;
            DELETE FROM notes;
            DELETE FROM questions;
            DELETE FROM subjects;
            DELETE FROM exam_years;
            DELETE FROM exams;
            DELETE FROM jamb_texts;
            DELETE FROM career_courses;
            DELETE FROM app_settings;
            DELETE FROM sync_status;
            DELETE FROM users;
        `);
    });
};

export const getPdfResourceSubjectIds = async () => {
    const database = await initLocalDatabase();
    const rows = await database.getAllAsync('SELECT DISTINCT subject_id FROM pdf_resources WHERE subject_id IS NOT NULL');
    return rows.map((row: any) => row.subject_id).filter(Boolean);
};

/**
 * Reset Utils
 */
export const clearDatabase = async () => {
    const database = await initLocalDatabase();
    await database.execAsync('DELETE FROM exams; DELETE FROM exam_years; DELETE FROM subjects; DELETE FROM questions; DELETE FROM notes; DELETE FROM pdf_resources; DELETE FROM exam_results; DELETE FROM jamb_texts; DELETE FROM sync_status; DELETE FROM note_read_progress; DELETE FROM career_courses;');
};

/**
 * Career & Institutions Methods
 */
export const getCareerDepartments = async () => {
    const database = await initLocalDatabase();
    return await database.getAllAsync<any>('SELECT * FROM career_departments ORDER BY name ASC;');
};

export const getCareerCourses = async (departmentId?: string) => {
    const database = await initLocalDatabase();
    if (departmentId) {
        return await database.getAllAsync<any>('SELECT * FROM career_courses WHERE department_id = ? ORDER BY name ASC;', departmentId);
    }
    return await database.getAllAsync<any>('SELECT * FROM career_courses ORDER BY name ASC;');
};

export const saveCareerCourse = async (course: any) => {
    const database = await initLocalDatabase();
    await database.runAsync(
        'INSERT OR REPLACE INTO career_courses (id, department_id, name, content, created_at) VALUES (?, ?, ?, ?, ?)',
        clean(course.id), clean(course.author_id || course.department_id), clean(course.name), clean(course.content), clean(course.created_at)
    );
};

export const deleteCareerCourse = async (id: string) => {
    const database = await initLocalDatabase();
    await database.runAsync('DELETE FROM career_courses WHERE id = ?', id);
};

export const getCareerCourseById = async (id: string) => {
    const database = await initLocalDatabase();
    return await database.getFirstAsync<any>('SELECT * FROM career_courses WHERE id = ?', id);
};

export const getLocalDatabaseStats = async () => {
    const database = await initLocalDatabase();
    const qCount: any = await database.getFirstAsync('SELECT COUNT(*) as c FROM questions');
    const sCount: any = await database.getFirstAsync('SELECT COUNT(*) as c FROM subjects');
    console.log(`--- DB STATS: Q=${qCount?.c}, S=${sCount?.c} ---`);
    return { questions: qCount?.c, subjects: sCount?.c };
};

export const getMaxQuestionId = async () => {
    const database = await initLocalDatabase();
    const res: any = await database.getFirstAsync('SELECT MAX(id) as maxId FROM questions');
    return res?.maxId || null;
};

export const saveUserLocal = async (user: { id: string, email: string, password: string, name?: string, role: string, assigned_view?: string | null, is_paid?: number, expiry_date?: string, created_at: string, active_premium_device_id?: string | null, active_premium_device_name?: string | null, current_device_id?: string | null, current_device_name?: string | null, current_device_has_premium?: number | boolean | null, premium_revoked_permanently?: number | boolean | null, device_access_state?: string | null, premium_checked_at?: string | null, premium_offline_valid_until?: string | null }) => {
    return enqueueDbOperation(async () => {
        const database = await initLocalDatabase();
        await database.runAsync(
            'INSERT OR REPLACE INTO users (id, email, password, name, role, assigned_view, is_paid, expiry_date, created_at, active_premium_device_id, active_premium_device_name, current_device_id, current_device_name, current_device_has_premium, premium_revoked_permanently, device_access_state, premium_checked_at, premium_offline_valid_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            user.id,
            user.email.toLowerCase(),
            user.password,
            user.name || null,
            user.role,
            user.assigned_view || null,
            user.is_paid || 0,
            user.expiry_date || null,
            user.created_at,
            user.active_premium_device_id || null,
            user.active_premium_device_name || null,
            user.current_device_id || null,
            user.current_device_name || null,
            user.current_device_has_premium ? 1 : 0,
            user.premium_revoked_permanently ? 1 : 0,
            user.device_access_state || null,
            user.premium_checked_at || null,
            user.premium_offline_valid_until || null
        );
    });
};

export const getLocalUser = async (email: string, password?: string) => {
    const database = await initLocalDatabase();
    if (password) {
        return await database.getFirstAsync('SELECT * FROM users WHERE email = ? AND password = ?', email.toLowerCase(), password);
    }
    return await database.getFirstAsync('SELECT * FROM users WHERE email = ?', email.toLowerCase());
};

export const getCurrentUser = async () => {
    const database = await initLocalDatabase();
    // Assuming single-user session, get the most recent user or just the one row
    const user = await database.getFirstAsync('SELECT * FROM users ORDER BY created_at DESC LIMIT 1');
    console.log('[DB] getCurrentUser result:', user ? 'Found' : 'Null');
    return user;
};

export const clearUserLocal = async () => {
    const database = await initLocalDatabase();
    console.log('[DB] Clearing local user session...');
    await database.runAsync('DELETE FROM users');
    console.log('[DB] User session cleared.');
};

export const updateLocalUserPassword = async (email: string, newPassword: string) => {
    const database = await initLocalDatabase();
    await database.runAsync(
        'UPDATE users SET password = ? WHERE email = ?',
        newPassword, email.toLowerCase()
    );
    console.log('[DB] Local password updated.');
};
