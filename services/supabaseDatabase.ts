import { createClient } from '@supabase/supabase-js';
import * as localDB from './localDatabase';
import { getOfflinePremiumValidUntil } from './premiumAccess';

// Initialize Supabase client
// Replace with your actual Supabase URL and key
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const parseFunctionErrorMessage = async (error: any) => {
  let errorMessage = error?.message || 'Request failed.';

  try {
    const responseText = await error?.context?.text?.();
    if (responseText) {
      const parsed = JSON.parse(responseText);
      if (typeof parsed?.error === 'string') errorMessage = parsed.error;
      else if (typeof parsed?.message === 'string') errorMessage = parsed.message;
    }
  } catch (_) {
    // Fall back to the SDK error message when the response body is not JSON.
  }

  return errorMessage;
};

const ensureAuthenticatedSession = async () => {
  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  if (sessionData.session?.access_token && userData.user) {
    return sessionData.session;
  }

  const cachedUser = await localDB.getCurrentUser();
  const email = (cachedUser as any)?.email;
  const password = (cachedUser as any)?.password;

  if (!email || !password) {
    throw new Error('Please sign in again before deleting your account.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new Error(error?.message || 'Unable to re-authenticate your account.');
  }

  return data.session;
};

// ============================================
// AUTH OPERATIONS
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';
  is_paid: boolean;
  expiry_date?: string;
  assigned_view?: string | null;
  created_at: string;
  referred_by?: string;
  referral_balance?: number;
  active_premium_device_id?: string | null;
  active_premium_device_name?: string | null;
  current_device_id?: string | null;
  current_device_name?: string | null;
  current_device_has_premium?: boolean;
  premium_revoked_permanently?: boolean;
  device_access_state?: 'active' | 'switch_required' | 'payment_required' | 'inactive' | 'unpaid';
  premium_checked_at?: string;
  premium_offline_valid_until?: string;
}

const mergeProfileWithDeviceState = (profile: UserProfile) => {
  const premiumCheckedAt = new Date().toISOString();

  return {
    ...profile,
    current_device_has_premium: Boolean(profile.is_paid),
    premium_revoked_permanently: false,
    device_access_state: profile.is_paid ? 'active' : 'unpaid',
    premium_checked_at: premiumCheckedAt,
    premium_offline_valid_until: profile.is_paid ? getOfflinePremiumValidUntil() : premiumCheckedAt,
  } as UserProfile;
};

/**
 * Sign up a new user and create a profile
 */
export const signUpUser = async (email: string, password: string, name: string, referralEmail?: string) => {
  try {
    let referredById = null;

    // 1. Pre-validate Referral Email (Before creating Auth user)
    if (referralEmail && referralEmail.trim() !== "") {
      const cleanReferralEmail = referralEmail.trim().toLowerCase();

      // Prevent self-referral
      if (cleanReferralEmail === email.toLowerCase()) {
        throw new Error('You cannot refer yourself.');
      }

      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('id')
        .eq('email', cleanReferralEmail)
        .single();

      if (referrerError || !referrer) {
        throw new Error('The referral email has not been registered.');
      }

      referredById = referrer.id;
    }

    // 2. Sign Up Online (Only if pre-checks pass)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Signup failed: No user data');

    // Create profile in users table
    const profile: UserProfile = {
      id: authData.user.id,
      email: email,
      name: name,
      role: 'user', // Default role
      is_paid: false,
      created_at: new Date().toISOString(),
      referred_by: referredById || undefined,
      referral_balance: 0
    };

    const { error: profileError } = await supabase
      .from('users')
      .insert([profile]);

    if (profileError) {
      console.warn('Profile creation failed, but auth succeeded:', profileError);
    }

    // If there's a referrer, create a record in the referrals table
    if (referredById) {
      const { error: referralLinkError } = await supabase
        .from('referrals')
        .insert([{
          referrer_id: referredById,
          referee_id: authData.user.id,
          has_paid: false,
          commission_earned: 0
        }]);

      if (referralLinkError) {
        console.warn('Failed to create referral link record:', referralLinkError);
      }
    }

    return profile;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

/**
 * Sign in user and fetch profile
 */
export const signInUser = async (email: string, password: string) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw authError;

    // Fetch profile for role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      // Fallback if profile not found
      const fallbackProfile = {
        id: authData.user.id,
        email: email,
        name: authData.user.user_metadata?.full_name || null,
        role: 'user',
        is_paid: false,
        created_at: authData.user.created_at
      } as UserProfile;

      return mergeProfileWithDeviceState(fallbackProfile);
    }

    // Ensure name is present from metadata if missing in profile
    if (!profile.name && authData.user.user_metadata?.full_name) {
      profile.name = authData.user.user_metadata.full_name;
    }

    const userProfile = profile as UserProfile;
    if (userProfile.role === 'admin') {
      const { data: assignment, error: assignmentError } = await supabase
        .from('admin_assignments')
        .select('assigned_view')
        .eq('user_id', authData.user.id)
        .single();

      if (assignment && assignment.assigned_view) {
        userProfile.assigned_view = assignment.assigned_view;
      }
    }

    return mergeProfileWithDeviceState(userProfile);
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }

};

/**
 * Send password reset email
 */
export const resetPasswordForEmail = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw error;
  }
};

/**
 * Verify the OTP sent to email
 */
export const verifyRecoveryOtp = async (email: string, token: string) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Update authenticated user's password
 */
export const updateUserPassword = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

/**
 * Delete the currently authenticated user's account through a secure Edge Function.
 */
export const deleteCurrentUserAccount = async () => {
  try {
    const session = await ensureAuthenticatedSession();

    const { data, error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw new Error(await parseFunctionErrorMessage(error));
    }

    return data;
  } catch (error) {
    console.error('Error deleting current user account:', error);
    throw error;
  }
};

// ============================================
// EXAM OPERATIONS
// ============================================

/**
 * Get all exams or create if doesn't exist
 * Used for syncing exam list from API
 */
export const upsertExam = async (examName: string) => {
  try {
    // Check if exam already exists
    const { data: existingExam, error: selectError } = await supabase
      .from('exams')
      .select('id')
      .eq('name', examName)
      .single();

    if (existingExam) {
      return existingExam;
    }

    // Create new exam if it doesn't exist
    const { data, error } = await supabase
      .from('exams')
      .insert([{ name: examName }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting exam:', error);
    throw error;
  }
};

/**
 * Get all exams
 */
export const getExams = async () => {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching exams:', error);
    throw error;
  }
};

// ============================================
// EXAM YEAR OPERATIONS
// ============================================

/**
 * Get or create exam year
 * Prevents duplicates using exam_id and year combination
 */
export const upsertExamYear = async (examId: string, year: string) => {
  try {
    // Check if already exists
    const { data: existingYear } = await supabase
      .from('exam_years')
      .select('id')
      .eq('exam_id', examId)
      .eq('year', year)
      .single();

    if (existingYear) {
      return existingYear;
    }

    // Create new exam year
    const { data, error } = await supabase
      .from('exam_years')
      .insert([{ exam_id: examId, year }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting exam year:', error);
    throw error;
  }
};

/**
 * Get ALL exam years (for sync)
 */
export const getAllExamYears = async () => {
  try {
    const { data, error } = await supabase
      .from('exam_years')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all exam years:', error);
    throw error;
  }
};

export const getAdminAssignmentByUserId = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('admin_assignments')
      .select('assigned_view')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data as { assigned_view: string } | null;
  } catch (error) {
    console.error('Error fetching admin assignment:', error);
    throw error;
  }
};

export const createAdminAssignment = async (userId: string, assignedView: string) => {
  try {
    const { data, error } = await supabase
      .from('admin_assignments')
      .insert([{ user_id: userId, assigned_view: assignedView }])
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating admin assignment:', error);
    throw error;
  }
};

// export const signUpAdminUser = async (
//   email: string,
//   password: string,
//   name: string,
//   assignedView: string
// ) => {
//   try {
//     const { data: authData, error: authError } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: { full_name: name },
//       },
//     });

//     if (authError) throw authError;
//     if (!authData.user) throw new Error('Signup failed: No user data');

//     const profile: UserProfile = {
//       id: authData.user.id,
//       email,
//       name,
//       role: 'admin',
//       is_paid: false,
//       created_at: new Date().toISOString(),
//     };

//     const { error: profileError } = await supabase.from('users').insert([profile]);
//     if (profileError) throw profileError;

//     await createAdminAssignment(authData.user.id, assignedView);

//     return profile;
//   } catch (error) {
//     console.error('Error signing up admin:', error);
//     throw error;
//   }
// };

export const signUpAdminUser = async (
  email: string,
  password: string,
  name: string
) => {
  try {
    // Step 1: Sign up in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Signup failed: No user data returned');

    const userId = authData.user.id;

    // Step 2: Check if user already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    // Step 3: Insert into users table only if not already there
    if (!existingUser) {
      const { error: profileError } = await supabase.from('users').insert([{
        id: userId,
        email,
        name,
        role: 'admin',         // ✅ correctly set to admin
        is_paid: false,
        created_at: new Date().toISOString(),
      }]);
      if (profileError) throw profileError;
    } else {
      // Update role to admin if user already exists
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'admin', name })
        .eq('id', userId);
      if (updateError) throw updateError;
    }

    return { id: userId, email, name, role: 'admin' };

  } catch (error) {
    console.error('Error signing up admin:', error);
    throw error;
  }
};

export const getAdminUsers = async () => {
  try {
    const { data: adminProfiles, error: profileError } = await supabase
      .from('users')
      .select('id,email,name,created_at')
      .eq('role', 'admin');

    if (profileError) throw profileError;

    const { data: assignments, error: assignmentError } = await supabase
      .from('admin_assignments')
      .select('user_id,assigned_view');

    if (assignmentError) throw assignmentError;

    const assignmentMap = new Map<string, string>();
    (assignments || []).forEach((item: any) => {
      if (item.user_id) {
        assignmentMap.set(item.user_id, item.assigned_view);
      }
    });

    return (adminProfiles || []).map((profile: any) => ({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      created_at: profile.created_at,
      assigned_view: assignmentMap.get(profile.id) || null,
    }));
  } catch (error) {
    console.error('Error fetching admin users:', error);
    throw error;
  }
};

// ============================================
// SUBJECT OPERATIONS
// ============================================

/**
 * Get or create subject
 * Prevents duplicates using exam_id, exam_year_id, and name combination
 */
export const upsertSubject = async (
  examId: string,
  examYearId: string,
  subjectName: string
) => {
  try {
    // Check if already exists
    const { data: existingSubject } = await supabase
      .from('subjects')
      .select('id')
      .eq('exam_id', examId)
      .eq('exam_year_id', examYearId)
      .eq('name', subjectName)
      .single();

    if (existingSubject) {
      return existingSubject;
    }

    // Create new subject
    const { data, error } = await supabase
      .from('subjects')
      .insert([
        {
          exam_id: examId,
          exam_year_id: examYearId,
          name: subjectName,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting subject:', error);
    throw error;
  }
};

/**
 * Get ALL subjects (for sync)
 */
export const getAllSubjectsSync = async () => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        questions:questions(count)
      `);

    if (error) throw error;

    // Flatten count structure
    return data?.map(s => ({
      ...s,
      questionCount: (s.questions as any)?.[0]?.count || 0
    })) || [];
  } catch (error) {
    console.error('Error fetching all subjects:', error);
    throw error;
  }
};

/**
 * Get admin note subject options directly from the subjects table.
 * This intentionally avoids local DB. The list label is read only from
 * subjects.name, and subjects linked to pdf_resources are excluded.
 */
export const getAdminNoteSubjects = async () => {
  try {
    const [{ data, error }, { data: pdfRows, error: pdfError }] = await Promise.all([
      supabase
      .from('subjects')
      .select(`
        id,
        name,
        exams!inner(name)
      `)
        .order('name', { ascending: true }),
      supabase
        .from('pdf_resources')
        .select('subject_id')
        .not('subject_id', 'is', null),
    ]);

    if (error) throw error;
    if (pdfError) throw pdfError;

    const pdfSubjectIds = new Set((pdfRows || []).map((row: any) => row.subject_id).filter(Boolean));

    return (data || [])
      .map((subject: any) => ({
        id: subject.id,
        name: String(subject.name || '').trim(),
        exam: subject.exams?.name,
      }))
      .filter((subject: any) => subject.id && subject.name && !pdfSubjectIds.has(subject.id) && subject.exam !== 'GST' && subject.exam !== 'POSTUTME');
  } catch (error) {
    console.error('Error fetching admin note subjects:', error);
    throw error;
  }
};

/**
 * Get ALL Papers (Subjects) with Exam and Year names
 * This is used to list all imported content in the admin view
 */
export const getAllPapers = async () => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
                *,
                exams (name),
                exam_years (year),
                questions (count)
            `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform for easier consumption
    return data?.map(subject => ({
      id: subject.id,
      name: subject.name,
      exam: (subject.exams as any)?.name,
      year: (subject.exam_years as any)?.year,
      questionCount: (subject.questions as any)?.[0]?.count || 0
    })) || [];
  } catch (error) {
    console.error('Error fetching all papers:', error);
    throw error;
  }
};

export const deleteSubject = async (subjectId: string) => {
  try {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting subject:', error);
    throw error;
  }
};

/**
 * Get imported subjects for a specific exam and year
 */
export const getImportedSubjects = async (examName: string, year: string) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('name, exams!inner(name), exam_years!inner(year)')
      .eq('exams.name', examName)
      .eq('exam_years.year', year);

    if (error) throw error;
    return (data as any[]).map(s => s.name);
  } catch (error) {
    console.error('Error fetching imported subjects:', error);
    return [];
  }
};

// ============================================
// QUESTION OPERATIONS
// ============================================

/**
 * Insert a single question (manual entry)
 */
export const insertQuestion = async (question: {
  examId: string;
  examYearId: string;
  subjectId: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'a' | 'b' | 'c' | 'd';
  explanation?: string;
  source: 'api' | 'manual';
  api_question_id?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .insert([
        {
          exam_id: question.examId,
          exam_year_id: question.examYearId,
          subject_id: question.subjectId,
          question: question.question,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          correct_answer: question.correct_answer,
          explanation: question.explanation || null,
          source: question.source,
          api_question_id: question.api_question_id || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inserting question:', error);
    throw error;
  }
};

/**
 * Insert multiple questions in batch (used for API imports)
 * More efficient than inserting one by one
 */
export const insertQuestionsInBatch = async (
  questions: Array<{
    examId: string;
    examYearId: string;
    subjectId: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: 'a' | 'b' | 'c' | 'd';
    explanation?: string;
    api_question_id?: string;
  }>
) => {
  try {
    // Prepare data for insertion
    const formattedQuestions = questions.map((q) => ({
      exam_id: q.examId,
      exam_year_id: q.examYearId,
      subject_id: q.subjectId,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      source: 'api' as const,
      api_question_id: q.api_question_id || null,
    }));

    // Insert in batches of 100 to avoid size limits
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < formattedQuestions.length; i += batchSize) {
      const batch = formattedQuestions.slice(
        i,
        Math.min(i + batchSize, formattedQuestions.length)
      );

      const { data, error } = await supabase
        .from('questions')
        .insert(batch)
        .select();

      if (error) throw error;
      insertedCount += (data?.length || 0);
    }

    return insertedCount;
  } catch (error) {
    console.error('Error inserting questions in batch:', error);
    throw error;
  }
};

/**
 * Get questions for a specific subject
 */
export const getQuestions = async (subjectId: string, page: number = 1, limit: number = 20) => {
  try {
    const start = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('questions')
      .select('*', { count: 'exact' })
      .eq('subject_id', subjectId)
      .range(start, start + limit - 1)
      .order('created_at', { ascending: true }); // Ordered by creation (import order)

    if (error) throw error;

    return {
      questions: data || [],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

/**
 * Get ALL questions for sync (with batching support)
 */
export const getAllQuestionsSync = async (lastId?: string) => {
  try {
    let query = supabase
      .from('questions')
      .select('*')
      .order('id', { ascending: true })
      .limit(1000);

    if (lastId) {
      query = query.gt('id', lastId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all questions sync:', error);
    throw error;
  }
};

/**
 * Get total questions count for a subject
 */
export const getQuestionsCount = async (subjectId: string) => {
  try {
    const { count, error } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subjectId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching questions count:', error);
    throw error;
  }
};

/**
 * Check if question already exists (prevent duplicates from API)
 */
export const questionExists = async (
  examId: string,
  examYearId: string,
  subjectId: string,
  apiQuestionId: string
) => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('id')
      .eq('exam_id', examId)
      .eq('exam_year_id', examYearId)
      .eq('subject_id', subjectId)
      .eq('api_question_id', apiQuestionId)
      .single();

    return !!data;
  } catch (error) {
    // Not found error is expected, return false
    if ((error as any)?.code === 'PGRST116') {
      return false;
    }
    console.error('Error checking if question exists:', error);
    return false;
  }
};

/**
 * Get all existing api_question_id values for a specific subject
 */
export const getExistingApiQuestionIds = async (
  examId: string,
  examYearId: string,
  subjectId: string
) => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('api_question_id')
      .eq('exam_id', examId)
      .eq('exam_year_id', examYearId)
      .eq('subject_id', subjectId)
      .not('api_question_id', 'is', null);

    if (error) throw error;
    return (data as any[]).map(q => q.api_question_id);
  } catch (error) {
    console.error('Error fetching existing question IDs:', error);
    return [];
  }
};

/**
 * Delete a question
 */
export const deleteQuestion = async (questionId: string) => {
  try {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};

/**
 * Update a question
 */
export const updateQuestion = async (
  questionId: string,
  updates: {
    question?: string;
    option_a?: string;
    option_b?: string;
    option_c?: string;
    option_d?: string;
    correct_answer?: 'a' | 'b' | 'c' | 'd';
    explanation?: string;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
};

// ============================================
// NOTE OPERATIONS
// ============================================

export interface NoteData {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  content: string;
  created_at: string;
  quiz?: any;
}

/**
 * Get all notes
 */
/**
 * Get all notes (optionally limited)
 */
export const getNotes = async (limit?: number) => {
  try {
    let query = supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }
};

/**
 * Add a new note
 */
/**
 * Get single note by ID
 */
export const getNoteById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching note:', error);
    throw error;
  }
};

/**
 * Add a new note
 */
const makeClientId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const normalizeNoteLabel = (value?: string) => (value || '').trim().toLowerCase();

type NoteHierarchyIds = {
  topic_id?: string | null;
  subtopic_id?: string | null;
};

const resolveNoteHierarchyIds = async (subjectId: string | null | undefined, topic: string, subtopic: string, existing?: NoteHierarchyIds) => {
  const cleanTopic = topic.trim();
  const cleanSubtopic = subtopic.trim();
  let topicId = existing?.topic_id || '';
  let subtopicId = existing?.subtopic_id || '';

  if (subjectId && cleanTopic && !topicId) {
    const { data } = await supabase
      .from('notes')
      .select('topic_id, topic')
      .eq('subject_id', subjectId)
      .not('topic_id', 'is', null);

    const match = data?.find((row: any) => normalizeNoteLabel(row.topic) === normalizeNoteLabel(cleanTopic));
    topicId = match?.topic_id || makeClientId('topic');
  }

  if (subjectId && topicId && cleanSubtopic && !subtopicId) {
    const { data } = await supabase
      .from('notes')
      .select('subtopic_id, subtopic')
      .eq('subject_id', subjectId)
      .eq('topic_id', topicId)
      .not('subtopic_id', 'is', null);

    const match = data?.find((row: any) => normalizeNoteLabel(row.subtopic) === normalizeNoteLabel(cleanSubtopic));
    subtopicId = match?.subtopic_id || makeClientId('subtopic');
  }

  return {
    topic_id: topicId || null,
    subtopic_id: subtopicId || null,
  };
};

export const addNote = async (title: string, subject: string, topic: string, content: string, quiz?: any, hierarchy?: { subject_id?: string | null; topic_id?: string | null; subtopic_id?: string | null; subtopic?: string; is_default?: boolean }) => {
  try {
    const ids = await resolveNoteHierarchyIds(hierarchy?.subject_id, topic, hierarchy?.subtopic || '', hierarchy);
    const { data, error } = await supabase
      .from('notes')
      .insert([{
        title,
        subject_id: hierarchy?.subject_id || null,
        subject,
        topic_id: ids.topic_id,
        topic,
        subtopic_id: ids.subtopic_id,
        subtopic: hierarchy?.subtopic || null,
        content,
        quiz,
        is_default: Boolean(hierarchy?.is_default)
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
};

/**
 * Update a note
 */
type NoteUpdatePayload = {
  title?: string;
  subject_id?: string | null;
  subject?: string;
  topic_id?: string | null;
  topic?: string;
  subtopic_id?: string | null;
  subtopic?: string;
  content?: string;
  quiz?: any;
  is_default?: boolean;
};

export const updateNote = async (id: string, updates: NoteUpdatePayload) => {
  try {
    const normalizedUpdates: NoteUpdatePayload = { ...updates };
    if ('subject_id' in updates || 'topic' in updates || 'subtopic' in updates || 'topic_id' in updates || 'subtopic_id' in updates) {
      const ids = await resolveNoteHierarchyIds(updates.subject_id, updates.topic || '', updates.subtopic || '', {
        topic_id: updates.topic_id,
        subtopic_id: updates.subtopic_id,
      });
      normalizedUpdates.topic_id = ids.topic_id;
      normalizedUpdates.subtopic_id = ids.subtopic_id;
    }

    const { data, error } = await supabase
      .from('notes')
      .update(normalizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
};

/**
 * Delete a note
 */
export const deleteNote = async (id: string) => {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
};

// ============================================
// STORAGE & PDF OPERATIONS
// ============================================

/**
 * Upload PDF File to Supabase Storage
 * Note: For React Native Expo, we typically use FormData
 */
export const uploadPdfFile = async (file: any) => {
  try {
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const formData = new FormData();

    // Append file data as expected by Supabase/Multipart
    // @ts-ignore
    formData.append('file', {
      uri: file.uri,
      name: fileName,
      type: file.mimeType || 'application/pdf',
    });

    const { data, error } = await supabase.storage
      .from('pdfs')
      .upload(fileName, formData, {
        contentType: 'application/pdf',
      });

    if (error) throw error;

    // Get Public URL
    const { data: urlData } = supabase.storage
      .from('pdfs')
      .getPublicUrl(fileName);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Save PDF Resource Metadata
 */
export const createPdfResource = async (metadata: {
  examId: string;
  examYearId: string;
  subjectId: string;
  fileUrl: string;
  fileName: string;
  sizeKb: number;
}) => {
  try {
    const { data, error } = await supabase
      .from('pdf_resources')
      .insert([{
        exam_id: metadata.examId,
        exam_year_id: metadata.examYearId,
        subject_id: metadata.subjectId,
        file_url: metadata.fileUrl,
        file_name: metadata.fileName,
        size_kb: metadata.sizeKb
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error create pdf resource:', error);
    throw error;
  }
};

/**
 * GetAll PDF Resources (optionally limited)
 */
export const getAllPdfResources = async (limit?: number) => {
  try {
    let query = supabase
      .from('pdf_resources')
      .select(`
    *,
    exams (name),
    exam_years (year),
    subjects (name)
  `)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.map((item) => ({
      id: item.id,
      exam_id: item.exam_id,
      exam_year_id: item.exam_year_id,
      subject_id: item.subject_id,
      exam: (item.exams as any)?.name,
      year: (item.exam_years as any)?.year,
      subject: (item.subjects as any)?.name,
      fileName: item.file_name,
      fileUrl: item.file_url,
      sizeKb: item.size_kb,
      createdAt: item.created_at,
    })) || [];
  } catch (error) {
    console.error('Error fetching PDF resources:', error);
    throw error;
  }
};

/**
 * Update PDF Resource Metadata
 */
export const updatePdfResource = async (id: string, metadata: {
  examId: string;
  examYearId: string;
  subjectId: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('pdf_resources')
      .update({
        exam_id: metadata.examId,
        exam_year_id: metadata.examYearId,
        subject_id: metadata.subjectId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating PDF resource:', error);
    throw error;
  }
};

/**
 * Delete PDF Resource
 */
export const deletePdfResource = async (id: string) => {
  try {
    // 1. Get the file path/url to delete from storage if possible
    // For now we will just delete the record. Ideally we delete the file from storage bucket too.

    // 2. Delete the record
    const { error } = await supabase
      .from('pdf_resources')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting PDF resource:', error);
    throw error;
  }
};

/**
 * Get Recent Subjects
 */
export const getRecentSubjects = async (limit: number = 5) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        exams (name),
        exam_years (year)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data?.map((item) => ({
      id: item.id,
      name: item.name,
      exam: (item.exams as any)?.name,
      year: (item.exam_years as any)?.year,
      createdAt: item.created_at
    })) || [];
  } catch (error) {
    console.error('Error fetching recent subjects:', error);
    throw error;
  }
};

// ============================================
// JAMB TEXT OPERATIONS
// ============================================

/**
 * Get JAMB Texts by type
 */
export const getJambTexts = async (type?: 'literature' | 'english') => {
  try {
    let query = supabase
      .from('jamb_texts')
      .select('*')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching JAMB texts:', error);
    throw error;
  }
};

/**
 * Get single JAMB text by ID
 */
export const getJambTextById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('jamb_texts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching JAMB text:', error);
    throw error;
  }
};

/**
 * Add a new JAMB text
 */
export const addJambText = async (
  type: 'literature' | 'english',
  title: string,
  content: string,
  author?: string,
  quiz?: any[],
  category?: string,
  thumbnail_url?: string,
  extra?: { subheading_id?: string; subheading?: string; is_default?: boolean }
) => {
  try {
    const { data, error } = await supabase
      .from('jamb_texts')
      .insert([{
        type,
        title,
        content,
        author,
        quiz,
        category,
        thumbnail_url,
        subheading_id: extra?.subheading_id || null,
        subheading: extra?.subheading || null,
        is_default: extra?.is_default ?? false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding JAMB text:', error);
    throw error;
  }
};

/**
 * Update a JAMB text
 */
export const updateJambText = async (
  id: string,
  updates: {
    title?: string;
    content?: string;
    author?: string;
    type?: 'literature' | 'english';
    quiz?: any[];
    category?: string;
    thumbnail_url?: string;
    subheading_id?: string;
    subheading?: string;
    is_default?: boolean;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('jamb_texts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating JAMB text:', error);
    throw error;
  }
};

/**
 * Delete a JAMB text
 */
export const deleteJambText = async (id: string) => {
  try {
    const { error } = await supabase
      .from('jamb_texts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting JAMB text:', error);
    throw error;
  }
};

// ============================================
// DASHBOARD STATS & ACTIVITY
// ============================================

/**
 * Get aggregated counts for admin dashboard
 */
export const getDashboardStats = async () => {
  try {
    const [subjects, questions, notes, pdfs] = await Promise.all([
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('notes').select('*', { count: 'exact', head: true }),
      supabase.from('pdf_resources').select('*', { count: 'exact', head: true }),
    ]);

    return {
      subjects: subjects.count || 0,
      questions: questions.count || 0,
      notes: notes.count || 0,
      pdfs: pdfs.count || 0
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { subjects: 0, questions: 0, notes: 0, pdfs: 0 };
  }
};

/**
 * Get unified recent activity timeline
 */
export const getRecentActivity = async (limit: number = 50) => {
  try {
    const [q, n, p, s, c, j, cc] = await Promise.all([
      supabase.from('questions').select('question, created_at, exams(name), subjects(name)').order('created_at', { ascending: false }).limit(limit),
      supabase.from('notes').select('title, created_at, subject, content').order('created_at', { ascending: false }).limit(limit),
      supabase.from('pdf_resources').select('file_name, created_at, exams(name), subjects(name), size_kb').order('created_at', { ascending: false }).limit(limit),
      supabase.from('subjects').select('name, created_at, exams(name), exam_years(year)').order('created_at', { ascending: false }).limit(limit),
      supabase.from('competitions').select('title, created_at, start_time').order('created_at', { ascending: false }).limit(limit),
      supabase.from('jamb_texts').select('title, created_at, type').order('created_at', { ascending: false }).limit(limit),
      supabase.from('career_courses').select('name, created_at, career_departments(name)').order('created_at', { ascending: false }).limit(limit),
    ]);

    const activities: any[] = [];

    q.data?.forEach(x => activities.push({
      id: `q-${x.created_at}-${Math.random()}`,
      text: `Added question: "${x.question.substring(0, 40)}..."`,
      time: x.created_at,
      icon: 'add-circle-outline',
      type: 'content',
      color: '#F59E0B',
      user: 'Admin',
      details: `Exam: ${(x.exams as any)?.name}\nSubject: ${(x.subjects as any)?.name}\n\nQuestion text: ${x.question}`
    }));

    n.data?.forEach(x => activities.push({
      id: `n-${x.created_at}-${Math.random()}`,
      text: `Updated note: "${x.title}"`,
      time: x.created_at,
      icon: 'create-outline',
      type: 'content',
      color: '#D946EF',
      user: 'Admin',
      details: `Subject: ${x.subject}\n\nContent:\n${x.content.substring(0, 500)}...`
    }));

    p.data?.forEach(x => activities.push({
      id: `p-${x.created_at}-${Math.random()}`,
      text: `Uploaded PDF: "${x.file_name}"`,
      time: x.created_at,
      icon: 'cloud-upload-outline',
      type: 'content',
      color: '#3B82F6',
      user: 'Admin',
      details: `FileName: ${x.file_name}\nSize: ${x.size_kb}KB\nExam: ${(x.exams as any)?.name}\nSubject: ${(x.subjects as any)?.name}`
    }));

    s.data?.forEach(x => activities.push({
      id: `s-${x.created_at}-${Math.random()}`,
      text: `New Subject: ${x.name}`,
      time: x.created_at,
      icon: 'library-outline',
      type: 'admin',
      color: '#10B981',
      user: 'Admin',
      details: `Exam: ${(x.exams as any)?.name}\nYear: ${(x.exam_years as any)?.year}`
    }));

    c.data?.forEach(x => activities.push({
      id: `c-${x.created_at}-${Math.random()}`,
      text: `Competition Saved: ${x.title}`,
      time: x.created_at,
      icon: 'trophy-outline',
      type: 'admin',
      color: '#864b03',
      user: 'Admin',
      details: `Title: ${x.title}\nStart Time: ${new Date(x.start_time).toLocaleString()}`
    }));

    j.data?.forEach(x => activities.push({
      id: `j-${x.created_at}-${Math.random()}`,
      text: `JAMB Text added: ${x.title}`,
      time: x.created_at,
      icon: 'book-outline',
      type: 'content',
      color: '#6366F1',
      user: 'Admin',
      details: `Title: ${x.title}\nType: ${x.type}`
    }));

    cc.data?.forEach(x => activities.push({
      id: `cc-${x.created_at}-${Math.random()}`,
      text: `Course Updated: ${x.name}`,
      time: x.created_at,
      icon: 'school-outline',
      type: 'admin',
      color: '#EC4899',
      user: 'Admin',
      details: `Course: ${x.name}\nDepartment: ${(x.career_departments as any)?.name}`
    }));

    // Sort by time descending and limit
    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
};

// ============================================
// ADVERTISEMENT OPERATIONS
// ============================================

/**
 * Filter ads based on priority frequency
 * Priority 3+ (Urgent) = 100% (always shown)
 * Priority 2 (High) = 75% chance
 * Priority 1 (Normal) = 50% chance
 * Priority 0 (Low) = 25% chance
 */
const filterAdsByFrequency = (ads: any[]) => {
  return ads.filter(ad => {
    const priority = ad.priority || 0;

    // Urgent: Always show (100%)
    if (priority >= 3) return true;

    // High: 75% chance
    if (priority === 2) return Math.random() < 0.75;

    // Normal: 50% chance
    if (priority === 1) return Math.random() < 0.50;

    // Low: 25% chance
    return Math.random() < 0.25;
  });
};

/**
 * Get active ads for a specific placement
 * Ads are filtered based on priority frequency:
 * - Urgent (3+): 100% shown
 * - High (2): 75% shown
 * - Normal (1): 50% shown
 * - Low (0): 25% shown
 *
 * @param placement - The placement identifier (e.g., 'exam', 'home')
 * @param priorities - Optional array of priority levels to filter by (e.g., [2, 3] for High/Urgent)
 */
export const getActiveAds = async (placement: string, priorities?: number[], size?: string) => {
  try {
    let query = supabase
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .or(`placement.eq.${placement},placement.eq.all`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (priorities && priorities.length > 0) {
      query = query.in('priority', priorities);
    }

    if (size) {
      query = query.eq('size', size);
    }

    const { data, error } = await query;

    if (error) throw error;

    // In strict rotation mode, we return all matching priority ads
    // and let the client handle random selection
    return data || [];
  } catch (error) {
    console.error('Error fetching active ads:', error);
    return [];
  }
};

/**
 * Get all ads (admin view)
 */
export const getAllAds = async () => {
  try {
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all ads:', error);
    return [];
  }
};

/**
 * Create new advertisement
 */
export const createAd = async (ad: {
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  placement: string;
  priority?: number;
  size?: 'medium' | 'large' | 'option' | 'square';
}) => {
  try {
    const { data, error } = await supabase
      .from('advertisements')
      .insert([{
        title: ad.title,
        description: ad.description,
        image_url: ad.imageUrl || null,
        link_url: ad.linkUrl || null,
        button_text: ad.buttonText || 'Learn More',
        placement: ad.placement,
        priority: ad.priority || 0,
        size: ad.size || 'medium',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating ad:', error);
    throw error;
  }
};

/**
 * Update advertisement
 */
export const updateAd = async (id: string, updates: {
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  placement?: string;
  priority?: number;
  size?: 'medium' | 'large' | 'option' | 'square';
  isActive?: boolean;
}) => {
  try {
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;
    if (updates.linkUrl !== undefined) updateData.link_url = updates.linkUrl;
    if (updates.buttonText !== undefined) updateData.button_text = updates.buttonText;
    if (updates.placement !== undefined) updateData.placement = updates.placement;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.size !== undefined) updateData.size = updates.size;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('advertisements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating ad:', error);
    throw error;
  }
};

/**
 * Delete advertisement
 */
export const deleteAd = async (id: string) => {
  try {
    const { error } = await supabase
      .from('advertisements')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting ad:', error);
    throw error;
  }
};

/**
 * Toggle ad active status
 */
export const toggleAdStatus = async (id: string, isActive: boolean) => {
  try {
    const { data, error } = await supabase
      .from('advertisements')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error toggling ad status:', error);
    throw error;
  }
};

/**
 * Track ad impression
 */
export const trackAdImpression = async (id: string) => {
  try {
    const { error } = await supabase.rpc('increment_ad_impressions', { ad_id: id });
    if (error) throw error;
  } catch (error) {
    console.error('Error tracking impression:', error);
  }
};

/**
 * Track ad click
 */
export const trackAdClick = async (id: string) => {
  try {
    const { error } = await supabase.rpc('increment_ad_clicks', { ad_id: id });
    if (error) throw error;
  } catch (error) {
    console.error('Error tracking click:', error);
  }
};

/**
 * Upload ad image to Supabase Storage
 */
/**
 * Upload ad image to Supabase Storage
 */
export const uploadAdImage = async (file: any) => {
  try {
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;

    // Convert to array buffer for reliable upload in RN
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { data, error } = await supabase.storage
      .from('ad-images')
      .upload(fileName, arrayBuffer, {
        contentType: file.mimeType || 'image/jpeg',
        upsert: false
      });

    if (error) throw error;

    // Get Public URL
    const { data: urlData } = supabase.storage
      .from('ad-images')
      .getPublicUrl(fileName);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error uploading ad image:', error);
    throw error;
  }
};

/**
 * Upload book cover image to Supabase Storage
 */
export const uploadBookCover = async (file: any) => {
  try {
    const fileName = `${Date.now()}_cover_${file.name.replace(/\s/g, '_')}`;

    const response = await fetch(file.uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { data, error } = await supabase.storage
      .from('book-covers')
      .upload(fileName, arrayBuffer, {
        contentType: file.mimeType || 'image/jpeg',
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('book-covers')
      .getPublicUrl(fileName);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error uploading book cover:', error);
    throw error;
  }
};

// ============================================
// COMPETITION OPERATIONS
// ============================================

/**
 * Get all competitions
 */
export const getCompetitions = async () => {
  try {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching competitions:', error);
    throw error;
  }
};

/**
 * Create or Update a competition
 */
export const saveCompetition = async (competition: any) => {
  try {
    const { data, error } = await supabase
      .from('competitions')
      .upsert([competition])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving competition:', error);
    throw error;
  }
};

/**
 * Delete competition
 */
export const deleteCompetition = async (id: string) => {
  try {
    const { error } = await supabase
      .from('competitions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting competition:', error);
    throw error;
  }
};

/**
 * Get competition results/leaderboard
 */
export const getCompetitionResults = async (competitionId: string) => {
  try {
    const { data, error } = await supabase
      .from('competition_results')
      .select(`
        *,
        registration:competition_registrations(full_name)
      `)
      .eq('competition_id', competitionId)
      .order('score', { ascending: false })
      .order('time_taken', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching competition results:', error);
    throw error;
  }
};

/**
 * Get a single competition registration by id
 */
export const getCompetitionRegistrationById = async (registrationId: string) => {
  try {
    const { data, error } = await supabase
      .from('competition_registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error fetching registration:', error);
    throw error;
  }
};

/**
 * Register a user for a competition
 */
export const registerForCompetition = async (registration: {
  competition_id: string,
  user_id: string,
  full_name: string,
  phone: string,
  email: string
}) => {
  try {
    const { data, error } = await supabase
      .from('competition_registrations')
      .upsert([registration])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error registering for competition:', error);
    throw error;
  }
};

/**
 * Check if a user is registered for a competition
 */
export const checkCompetitionRegistration = async (competitionId: string, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('competition_registrations')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data || null;
  } catch (error) {
    console.error('Error checking registration:', error);
    throw error;
  }
};

/**
 * Save competition result
 */
export const saveCompetitionResult = async (result: {
  competition_id: string,
  user_id: string,
  registration_id: string,
  score: number,
  time_taken: number,
  answers: any
}) => {
  try {
    const { data, error } = await supabase
      .from('competition_results')
      .upsert([result])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving competition result:', error);
    throw error;
  }
};

// ============================================
// CAREER & INSTITUTIONS OPERATIONS
// ============================================

/**
 * Get all career departments
 */
export const getCareerDepartments = async () => {
  try {
    const { data, error } = await supabase
      .from('career_departments')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching career departments:', error);
    throw error;
  }
};

/**
 * Get courses for a department
 */
export const getCareerCourses = async (departmentId?: string) => {
  try {
    let query = supabase
      .from('career_courses')
      .select('*')
      .order('name', { ascending: true });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching career courses:', error);
    throw error;
  }
};

/**
 * Get single career course by ID
 */
export const getCareerCourseById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('career_courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching career course:', error);
    throw error;
  }
};

/**
 * Add or update a career course
 */
export const saveCareerCourse = async (course: {
  id?: string;
  department_id: string;
  name: string;
  content: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('career_courses')
      .upsert([course])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving career course:', error);
    throw error;
  }
};

/**
 * Delete a career course
 */
export const deleteCareerCourse = async (id: string) => {
  try {
    const { error } = await supabase
      .from('career_courses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting career course:', error);
    throw error;
  }
};
