/**
 * Data Migration & Testing Utilities
 * 
 * Use this file to:
 * - Test API connectivity
 * - Perform initial data imports
 * - Verify data consistency
 * - Debug issues
 */

import * as myQuestAPI from './myQuestAPI';
import * as supabaseDB from './supabaseDatabase';

/**
 * Test data: Simulate small import for testing
 * Comment out and use real API with testRealImport()
 */
const MOCK_QUESTIONS = [
  {
    id: 'test-1',
    question: 'What is the capital of Nigeria?',
    option_a: 'Lagos',
    option_b: 'Abuja',
    option_c: 'Kano',
    option_d: 'Port Harcourt',
    correct_answer: 'b' as const,
    explanation: 'Abuja is the capital city of Nigeria since 1991.',
  },
  {
    id: 'test-2',
    question: 'Which element has the symbol Fe?',
    option_a: 'Fluorine',
    option_b: 'Francium',
    option_c: 'Iron',
    option_d: 'Fermium',
    correct_answer: 'c' as const,
    explanation: 'Fe is the chemical symbol for Iron.',
  },
];

// ============================================
// TESTING UTILITIES
// ============================================

/**
 * Test 1: API Health Check
 * Verifies API is online and API key is valid
 */
export const testApiHealth = async () => {
  console.log('🧪 Test 1: API Health Check');
  try {
    const health = await myQuestAPI.checkApiHealth();
    console.log('Result:', health);
    if (health.isAvailable) {
      console.log('✓ API is healthy\n');
      return true;
    } else {
      console.log('✗ API unavailable:', health.message, '\n');
      return false;
    }
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return false;
  }
};

/**
 * Test 2: Get Exams
 * Verifies API can return exam list
 */
export const testGetExams = async () => {
  console.log('🧪 Test 2: Get Exams from API');
  try {
    const exams = await myQuestAPI.getExams();
    console.log(`Found ${exams.length} exams:`, exams);
    console.log('✓ Successfully fetched exams\n');
    return exams;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return [];
  }
};

/**
 * Test 3: Get Years for Exam
 * Verifies cascading dropdown
 */
export const testGetYears = async (examId: string) => {
  console.log(`🧪 Test 3: Get Years for Exam ${examId}`);
  try {
    const years = await myQuestAPI.getExamYears(examId);
    console.log(`Found ${years.length} years:`, years);
    console.log('✓ Successfully fetched years\n');
    return years;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return [];
  }
};

/**
 * Test 4: Get Subjects for Year
 * Verifies cascading dropdown
 */
export const testGetSubjects = async (
  examId: string,
  yearId: string
) => {
  console.log(`🧪 Test 4: Get Subjects for Exam ${examId}, Year ${yearId}`);
  try {
    const subjects = await myQuestAPI.getSubjects(examId, yearId);
    console.log(`Found ${subjects.length} subjects:`, subjects);
    console.log('✓ Successfully fetched subjects\n');
    return subjects;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return [];
  }
};

/**
 * Test 5: Get Questions from API
 * Verifies question structure
 */
export const testGetQuestions = async (
  examId: string,
  yearId: string,
  subjectId: string,
  limit: number = 5
) => {
  console.log(
    `🧪 Test 5: Get ${limit} Questions from API`
  );
  try {
    const response = await myQuestAPI.getQuestions(
      examId,
      yearId,
      subjectId,
      1,
      limit
    );
    console.log(`Found ${response.questions.length} questions`);
    if (response.questions.length > 0) {
      console.log('First question:', response.questions[0]);
      console.log('Pagination:', response.pagination);
    }
    console.log('✓ Successfully fetched questions\n');
    return response.questions;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return [];
  }
};

/**
 * Test 6: Database Connection
 * Verifies Supabase is connected
 */
export const testDatabaseConnection = async () => {
  console.log('🧪 Test 6: Database Connection');
  try {
    const exams = await supabaseDB.getExams();
    console.log(`Connected to database. Found ${exams.length} exams`);
    console.log('✓ Database connection successful\n');
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return false;
  }
};

/**
 * Test 7: Insert Exam
 * Tests basic insert operation
 */
export const testInsertExam = async (examName: string = 'TEST_EXAM') => {
  console.log(`🧪 Test 7: Insert Exam (${examName})`);
  try {
    const exam = await supabaseDB.upsertExam(examName);
    console.log('Inserted exam:', exam);
    console.log('✓ Exam inserted successfully\n');
    return exam;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return null;
  }
};

/**
 * Test 8: Insert Year
 * Tests year upsert
 */
export const testInsertYear = async (examId: string, year: string = '2024') => {
  console.log(`🧪 Test 8: Insert Year (${year})`);
  try {
    const yearObj = await supabaseDB.upsertExamYear(examId, year);
    console.log('Inserted year:', yearObj);
    console.log('✓ Year inserted successfully\n');
    return yearObj;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return null;
  }
};

/**
 * Test 9: Insert Subject
 * Tests subject upsert
 */
export const testInsertSubject = async (
  examId: string,
  yearId: string,
  subjectName: string = 'Test_Subject'
) => {
  console.log(`🧪 Test 9: Insert Subject (${subjectName})`);
  try {
    const subject = await supabaseDB.upsertSubject(examId, yearId, subjectName);
    console.log('Inserted subject:', subject);
    console.log('✓ Subject inserted successfully\n');
    return subject;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return null;
  }
};

/**
 * Test 10: Insert Question
 * Tests manual question entry
 */
export const testInsertQuestion = async (
  examId: string,
  yearId: string,
  subjectId: string
) => {
  console.log('🧪 Test 10: Insert Question');
  try {
    const question = await supabaseDB.insertQuestion({
      examId,
      examYearId: yearId,
      subjectId,
      question: 'What is 2 + 2?',
      option_a: '3',
      option_b: '4',
      option_c: '5',
      option_d: '6',
      correct_answer: 'b',
      explanation: '2 + 2 equals 4',
      source: 'manual',
    });
    console.log('Inserted question:', question);
    console.log('✓ Question inserted successfully\n');
    return question;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return null;
  }
};

/**
 * Test 11: Batch Insert Questions
 * Tests efficient bulk import
 */
export const testBatchInsert = async (
  examId: string,
  yearId: string,
  subjectId: string,
  count: number = 5
) => {
  console.log(`🧪 Test 11: Batch Insert ${count} Questions`);
  try {
    const questions = Array(count)
      .fill(null)
      .map((_, i) => ({
        examId,
        examYearId: yearId,
        subjectId,
        question: `Test question ${i + 1}?`,
        option_a: 'Option A',
        option_b: 'Option B',
        option_c: 'Option C',
        option_d: 'Option D',
        correct_answer: 'a' as const,
        explanation: `This is explanation ${i + 1}`,
        api_question_id: `test-api-${i + 1}`,
      }));

    const inserted = await supabaseDB.insertQuestionsInBatch(questions);
    console.log(`Inserted ${inserted} questions`);
    console.log('✓ Batch insert successful\n');
    return inserted;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return 0;
  }
};

/**
 * Test 12: Check for Duplicates
 * Tests duplicate detection
 */
export const testDuplicateDetection = async (
  examId: string,
  yearId: string,
  subjectId: string,
  apiQuestionId: string = 'test-api-1'
) => {
  console.log('🧪 Test 12: Duplicate Detection');
  try {
    const exists = await supabaseDB.questionExists(
      examId,
      yearId,
      subjectId,
      apiQuestionId
    );
    console.log(`Question exists: ${exists}`);
    console.log('✓ Duplicate check successful\n');
    return exists;
  } catch (error) {
    console.error('✗ Test failed:', error, '\n');
    return false;
  }
};

// ============================================
// FULL TEST SUITES
// ============================================

/**
 * Run all API tests
 */
export const runAllApiTests = async () => {
  console.log('🚀 Running All API Tests\n');
  console.log('='.repeat(50));

  const healthOk = await testApiHealth();
  if (!healthOk) {
    console.log('❌ API not available. Skipping remaining tests.\n');
    return;
  }

  const exams = await testGetExams();
  if (exams.length === 0) {
    console.log('❌ No exams available. Cannot continue tests.\n');
    return;
  }

  const examId = exams[0].id;
  const years = await testGetYears(examId);

  if (years.length === 0) {
    console.log(`❌ No years found for exam ${examId}.\n`);
    return;
  }

  const yearId = years[0].id;
  const subjects = await testGetSubjects(examId, yearId);

  if (subjects.length === 0) {
    console.log(`❌ No subjects found for exam/year.\n`);
    return;
  }

  const subjectId = subjects[0].id;
  await testGetQuestions(examId, yearId, subjectId);

  console.log('='.repeat(50));
  console.log('✓ All API tests completed\n');
};

/**
 * Run all database tests
 */
export const runAllDatabaseTests = async () => {
  console.log('🚀 Running All Database Tests\n');
  console.log('='.repeat(50));

  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    console.log('❌ Database not available.\n');
    return;
  }

  const exam = await testInsertExam();
  if (!exam?.id) {
    console.log('❌ Failed to create exam.\n');
    return;
  }

  const year = await testInsertYear(exam.id);
  if (!year?.id) {
    console.log('❌ Failed to create year.\n');
    return;
  }

  const subject = await testInsertSubject(exam.id, year.id);
  if (!subject?.id) {
    console.log('❌ Failed to create subject.\n');
    return;
  }

  await testInsertQuestion(exam.id, year.id, subject.id);
  await testBatchInsert(exam.id, year.id, subject.id, 3);
  await testDuplicateDetection(exam.id, year.id, subject.id);

  console.log('='.repeat(50));
  console.log('✓ All database tests completed\n');
};

/**
 * Run full system test
 */
export const runFullSystemTest = async () => {
  console.log('\n🧪 FULL SYSTEM TEST\n');
  console.log('='.repeat(50));
  console.log('');

  await runAllApiTests();
  await runAllDatabaseTests();

  console.log('='.repeat(50));
  console.log('✓ Full system test completed\n');
};

/**
 * Real import test: Fetch and import actual questions from API
 * Be careful: This will actually insert data into your database
 */
export const testRealImport = async (
  examId: string,
  yearId: string,
  subjectId: string,
  limit: number = 5 // Small limit for testing
) => {
  console.log(`🚀 Test Real Import: ${limit} questions\n`);
  console.log('='.repeat(50));

  try {
    // Fetch questions from API
    console.log('Fetching questions from API...');
    const response = await myQuestAPI.getQuestions(
      examId,
      yearId,
      subjectId,
      1,
      limit
    );

    const apiQuestions = response.questions;
    console.log(`Fetched ${apiQuestions.length} questions\n`);

    if (apiQuestions.length === 0) {
      console.log('❌ No questions returned from API\n');
      return;
    }

    // Prepare for insertion
    console.log('Preparing questions for insertion...');
    const newQuestions = [];

    for (const apiQuestion of apiQuestions) {
      const exists = await supabaseDB.questionExists(
        examId,
        yearId,
        subjectId,
        apiQuestion.id
      );

      if (!exists) {
        newQuestions.push({
          examId,
          examYearId: yearId,
          subjectId,
          question: apiQuestion.question,
          option_a: apiQuestion.option_a,
          option_b: apiQuestion.option_b,
          option_c: apiQuestion.option_c,
          option_d: apiQuestion.option_d,
          correct_answer: apiQuestion.correct_answer,
          explanation: apiQuestion.explanation || '',
          api_question_id: apiQuestion.id,
        });
      }
    }

    console.log(
      `${newQuestions.length} questions are new, ${
        apiQuestions.length - newQuestions.length
      } are duplicates\n`
    );

    if (newQuestions.length === 0) {
      console.log('No new questions to insert');
      return;
    }

    // Insert questions
    console.log('Inserting questions into database...');
    const inserted = await supabaseDB.insertQuestionsInBatch(newQuestions);
    console.log(`✓ Inserted ${inserted} questions\n`);

    console.log('='.repeat(50));
    console.log('✓ Real import test completed successfully\n');
  } catch (error) {
    console.error('❌ Real import test failed:', error);
  }
};

export default {
  testApiHealth,
  testGetExams,
  testGetYears,
  testGetSubjects,
  testGetQuestions,
  testDatabaseConnection,
  testInsertExam,
  testInsertYear,
  testInsertSubject,
  testInsertQuestion,
  testBatchInsert,
  testDuplicateDetection,
  runAllApiTests,
  runAllDatabaseTests,
  runFullSystemTest,
  testRealImport,
};
