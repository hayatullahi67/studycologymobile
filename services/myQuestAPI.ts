const API_URL = 'https://api.myquest.com.ng/api/questions';
const API_KEY = process.env.EXPO_PUBLIC_MYQUEST_API_KEY || 'd28b92ddb3380305b79d636e2e4fd44e366b97b189a757221795a97fe73ae1c8';

// Types based on response structures
export interface Exam {
  id: string;
  name: string;
}

export interface Year {
  id: string;
  year: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface APIHealth {
  isAvailable: boolean;
  message?: string;
}

export interface APIQuestion {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'a' | 'b' | 'c' | 'd';
  explanation?: string;
  image?: string;
}

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`API Request failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data;
};

export const checkApiHealth = async (): Promise<APIHealth> => {
  try {
    const response = await fetch(`${API_URL}?get=exam`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    await handleResponse(response);
    return { isAvailable: true };
  } catch (error) {
    return {
      isAvailable: false,
      message: (error as any)?.message || 'API Unreachable'
    };
  }
};

export const getExams = async (): Promise<Exam[]> => {
  try {
    const response = await fetch(`${API_URL}?get=exam`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const data = await handleResponse(response);

    if (data.success && Array.isArray(data.data)) {
      return data.data.map((exam: string) => ({
        id: exam,
        name: exam
      }));
    }
    return [];
  } catch (error) {
    console.error('getExams error:', error);
    throw error;
  }
};

export const getExamYears = async (examName: string): Promise<Year[]> => {
  try {
    const response = await fetch(`${API_URL}?get=exam_year_id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        exam: examName
      })
    });

    const data = await handleResponse(response);

    if (data.success && Array.isArray(data.data)) {
      return data.data.map((year: string) => ({
        id: year,
        year: year
      }));
    }
    return [];
  } catch (error) {
    console.error('getExamYears error:', error);
    throw error;
  }
};

export const getSubjects = async (examName: string, yearId: string): Promise<Subject[]> => {
  try {
    const response = await fetch(`${API_URL}?get=subject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        exam: examName,
        exam_year_id: yearId
      })
    });

    const data = await handleResponse(response);

    if (data.success && Array.isArray(data.data)) {
      return data.data.map((subject: string) => ({
        id: subject,
        name: subject.charAt(0).toUpperCase() + subject.slice(1)
      }));
    }
    return [];
  } catch (error) {
    console.error('getSubjects error:', error);
    throw error;
  }
};

/**
 * Helper to extract option text from various possible formats
 */
const extractOption = (item: any, key: string): string => {
  // 1. explicit lower case (option_a)
  if (item[`option_${key}`]) return item[`option_${key}`];

  // 2. camelCase (optionA)
  if (item[`option${key.toUpperCase()}`]) return item[`option${key.toUpperCase()}`];

  // 3. PascalCase (OptionA)
  if (item[`Option${key.toUpperCase()}`]) return item[`Option${key.toUpperCase()}`];

  // 4. Nested options object { a: "..." } or { A: "..." }
  if (item.options && typeof item.options === 'object' && !Array.isArray(item.options)) {
    if (item.options[key]) return item.options[key];
    if (item.options[key.toUpperCase()]) return item.options[key.toUpperCase()];
  }

  // 5. Nested options array (assuming order a,b,c,d)
  if (item.options && Array.isArray(item.options)) {
    const index = ['a', 'b', 'c', 'd'].indexOf(key);
    if (index !== -1 && item.options[index]) {
      // Some arrays are strings, some are objects {id, text}
      if (typeof item.options[index] === 'string') return item.options[index];
      if (item.options[index].text) return item.options[index].text;
    }
  }

  // 6. Just the key 'a', 'b', etc (some APIs do this)
  if (item[key]) return item[key];
  if (item[key.toUpperCase()]) return item[key.toUpperCase()];

  return '';
};

const normalizeCorrectAnswer = (item: any): 'a' | 'b' | 'c' | 'd' => {
  let ans = item.correct_answer || item.correctOption || item.answer || 'a';
  ans = String(ans).toLowerCase();
  if (['a', 'b', 'c', 'd'].includes(ans)) return ans as 'a' | 'b' | 'c' | 'd';
  return 'a'; // Default fallback
};


export const getAllQuestions = async (examName: string, yearId: string, subjectSlug: string): Promise<APIQuestion[]> => {
  try {
    let allQuestions: APIQuestion[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exam: examName,
          exam_year_id: yearId,
          subject: subjectSlug,
          page: currentPage
        })
      });

      if (response.status === 404) {
        console.warn(`getAllQuestions: No data found for ${examName} ${yearId} ${subjectSlug} (404)`);
        break; // Return whatever we have so far (usually empty array)
      }

      const data = await handleResponse(response);

      if (data.success && data.data) {
        const { questions } = data.data;
        const { total_pages } = data.data.pagination;

        let rawQuestions: any[] = [];
        if (typeof questions === 'string') {
          try {
            rawQuestions = JSON.parse(questions);
          } catch (e) {
            console.error('Error parsing questions string', e);
          }
        } else if (Array.isArray(questions)) {
          rawQuestions = questions;
        }

        // Map and Normalize
        const mappedQuestions: APIQuestion[] = rawQuestions.map((q: any) => ({
          id: q.id || q.question_id || Math.random().toString(),
          question: q.question || q.text || '',
          option_a: extractOption(q, 'a'),
          option_b: extractOption(q, 'b'),
          option_c: extractOption(q, 'c'),
          option_d: extractOption(q, 'd'),
          correct_answer: normalizeCorrectAnswer(q),
          explanation: q.explanation || q.rationale || '',
          image: q.image || ''
        }));

        allQuestions = [...allQuestions, ...mappedQuestions];
        totalPages = total_pages;
        currentPage++;
      } else {
        break;
      }
    } while (currentPage <= totalPages);

    return allQuestions;

  } catch (error) {
    console.error('getAllQuestions error:', error);
    throw error;
  }
};
