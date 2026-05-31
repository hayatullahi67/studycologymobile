import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subject, Question, ExamResult, Note, ExamMode } from '../types';
import * as localDB from '../services/localDatabase';
import { signInUser } from '../services/supabaseDatabase';
import * as syncService from '../services/syncService';

// Mobile storage abstraction using AsyncStorage
const Storage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error('Error reading storage', e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('Error writing storage', e);
    }
  }
};

interface AppState {
  isInitialized: boolean;
  isDataDownloaded: boolean;
  syncStatus: syncService.SyncStatus;
  subjects: Subject[];
  results: ExamResult[];
  noteQuizResults: any[];
  jambTextQuizResults: any[];
  notes: Note[];
  activeSubject: Subject | null;
  activeMode: ExamMode | null;
  activeQuestions: any[];
  activeExamMeta: { title: string; year: number | string } | null;
  selectedSubjectIds: string[];
  userAnswers: Record<string, string>;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'extra large';
  userProfile: any | null;
  // Time tracking
  totalTimeSeconds: number;
  currentStage: string;

  initialize: () => Promise<void>;
  startSync: (force?: boolean) => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  setExamConfig: (subjectIds: string[], mode: ExamMode, questions: any[], meta?: { title: string; year: number | string } | null) => void;
  setAnswer: (questionId: string, optionId: string) => void;
  submitExam: (timeSpent: number) => ExamResult;
  addResult: (result: ExamResult) => Promise<void>;
  clearActiveExam: () => void;
  deleteResult: (resultId: string) => Promise<void>;
  deleteNoteQuizResult: (id: string) => Promise<void>;
  deleteJambTextQuizResult: (id: string) => Promise<void>;
  addJambTextQuizResult: (textId: string, score: number, total: number, title: string) => Promise<void>;
  setUserProfile: (profile: any) => void;
  logout: () => Promise<void>;
  // Time tracking
  updateTimeTracking: (totalSeconds: number, currentStage: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isInitialized: false,
  isDataDownloaded: false,
  syncStatus: { isSyncing: false, progress: 0, lastSync: null, error: null },
  subjects: [],
  results: [],
  noteQuizResults: [],
  jambTextQuizResults: [],
  notes: [],
  activeSubject: null,
  activeMode: null,
  activeQuestions: [],
  activeExamMeta: null,
  selectedSubjectIds: [],
  userAnswers: {},
  theme: 'dark',
  fontSize: 'medium',
  userProfile: null,
  // Time tracking
  totalTimeSeconds: 0,
  currentStage: 'Greenhorn',

  initialize: async () => {
    const isComplete = await syncService.isInitialSyncComplete();

    // Load initial data from SQLite
    let localSubjects: any[] = [];
    let localNotes: any[] = [];
    let localResults: any[] = [];
    let localQuizResults: any[] = [];
    let localJambQuizResults: any[] = [];
    let localSettings: Record<string, string> = {};
    let localUser: any = null;

    [localResults, localQuizResults, localJambQuizResults, localSubjects, localNotes, localSettings, localUser] = await Promise.all([
      localDB.getLocalExamResults(),
      localDB.getAllNoteQuizResults(),
      localDB.getAllJambTextQuizResults(),
      localDB.getLocalSubjects(),
      localDB.getLocalNotes(),
      localDB.getSettings(),
      localDB.getCurrentUser(),
    ]);

    // Subscribe to sync updates
    syncService.subscribeToSyncStatus((status) => {
      set({ syncStatus: status });
      if (status.progress === 1) {
        // Refresh metadata when sync finishes
        Promise.all([
          localDB.getLocalSubjects(),
          localDB.getLocalNotes()
        ]).then(([subs, notes]) => {
          set({ subjects: subs as any, notes: notes as any });
        });
      }
    });


    set({
      results: localResults as any[],
      noteQuizResults: localQuizResults as any[],
      jambTextQuizResults: localJambQuizResults as any[],
      isDataDownloaded: isComplete,
      subjects: localSubjects as any[],
      notes: localNotes as any[],
      theme: (localSettings.theme as any) || 'dark',
      fontSize: (localSettings.fontSize as any) || 'medium',
      userProfile: localUser,
      isInitialized: true,
    });

    // Refresh user profile online to sync subscription status
    if (localUser && localUser.email && localUser.password) {
      signInUser(localUser.email, localUser.password).then(freshProfile => {
        // CRITICAL FIX: Ensure we don't accidentally downgrade a paid user due to network glitches
        // If local says paid, but remote says unpaid, we might want to trust local temporarily or double check.
        // For now, let's just make sure we capture the latest state.
        const mergedProfile = { ...freshProfile };

        // If the server returns a valid profile, we update. 
        // We explicitly save the 'is_paid' status to local DB immediately.
        set({ userProfile: { ...mergedProfile, password: localUser.password } });

        localDB.saveUserLocal({
          ...mergedProfile,
          password: localUser.password, // Keep the password for next auto-login
          is_paid: mergedProfile.is_paid ? 1 : 0,
          current_device_has_premium: mergedProfile.current_device_has_premium ? 1 : 0,
          premium_revoked_permanently: mergedProfile.premium_revoked_permanently ? 1 : 0,
        });
      }).catch(err => {
        console.warn('[Store] Online profile sync failed, falling back to local profile:', err);
        // If online fails, we already have localUser set in state from lines 118-129.
        // We do NOTHING here to avoid overwriting the valid local state with null.
      });
    }

    // Trigger background sync
    syncService.startFullSync();

    // Log stats for debugging
    localDB.getLocalDatabaseStats();
  },

  deleteNoteQuizResult: async (id) => {
    const { noteQuizResults } = get();
    const newResults = noteQuizResults.filter(r => r.id !== id);
    set({ noteQuizResults: newResults });
    await localDB.deleteNoteQuizResultLocal(id);
  },

  deleteJambTextQuizResult: async (id) => {
    const { jambTextQuizResults } = get();
    const newResults = jambTextQuizResults.filter(r => r.id !== id);
    set({ jambTextQuizResults: newResults });
    await localDB.deleteJambTextQuizResultLocal(id);
  },

  addJambTextQuizResult: async (textId, score, total, title) => {
    const result = await localDB.saveJambTextQuizResult(textId, score, total);
    const { jambTextQuizResults } = get();
    set({ jambTextQuizResults: [{ ...result, textTitle: title }, ...jambTextQuizResults] });
  },

  startSync: async (force = false) => {
    await syncService.startFullSync(force);
    const isComplete = await syncService.isInitialSyncComplete();
    set({ isDataDownloaded: isComplete });
    localDB.getLocalDatabaseStats();
  },

  updateSetting: async (key, value) => {
    set({ [key]: value } as any);
    await localDB.saveSetting(key, value);
  },

  setExamConfig: (subjectIds, mode, questions, meta: { title: string; year: number | string } | null = null) => {
    const { subjects } = get();
    set({
      activeSubject: subjects.find(s => s.id === subjectIds[0]) || subjects[0] || null,
      selectedSubjectIds: subjectIds,
      activeMode: mode,
      activeQuestions: questions,
      activeExamMeta: meta,
      userAnswers: {},
    });
  },

  setAnswer: (questionId, optionId) => {
    set((state) => ({
      userAnswers: { ...state.userAnswers, [questionId]: optionId },
    }));
  },

  submitExam: (timeSpent) => {
    const { activeQuestions, userAnswers, results, subjects, selectedSubjectIds, activeMode } = get();
    if (!activeMode) throw new Error("No active exam");

    const subjectResults = selectedSubjectIds.map(subId => {
      const subQuestions = activeQuestions.filter(q => q.subject_id === subId);
      const correct = subQuestions.reduce((acc, q) =>
        userAnswers[q.id] === q.correct_answer ? acc + 1 : acc, 0);

      return {
        subjectId: subId,
        name: subjects.find(s => s.id === subId)?.name || subId,
        score: subQuestions.length > 0 ? (correct / subQuestions.length) * 100 : 0,
        totalQuestions: subQuestions.length,
        correctAnswers: correct,
        wrongAnswers: subQuestions.length - correct,
      };
    });

    const totalCorrect = subjectResults.reduce((acc, r) => acc + r.correctAnswers, 0);
    const totalQuestions = activeQuestions.length;

    const result: ExamResult = {
      id: `res-${Date.now()}`,
      totalScore: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
      totalQuestions,
      totalCorrect,
      totalWrong: totalQuestions - totalCorrect,
      subjectResults,
      timeSpent,
      date: new Date().toISOString(),
      mode: activeMode,
      userAnswers,
    };

    const newResults = [result, ...results];
    set({ results: newResults });
    localDB.saveExamResult(result); // Save to SQLite
    return result;
  },

  addResult: async (result) => {
    const { results } = get();
    const newResults = [result, ...results];
    set({ results: newResults });
    await localDB.saveExamResult(result);
  },

  deleteResult: async (resultId) => {
    const { results } = get();
    const newResults = results.filter(r => r.id !== resultId);
    set({ results: newResults });
    await localDB.deleteExamResultLocal(resultId);
  },

  clearActiveExam: () => set({
    activeSubject: null,
    activeMode: null,
    activeQuestions: [],
    activeExamMeta: null,
    selectedSubjectIds: [],
    userAnswers: {},
  }),

  setUserProfile: (profile) => set({ userProfile: profile }),

  logout: async () => {
    set({ userProfile: null, totalTimeSeconds: 0, currentStage: 'Greenhorn' });
    await localDB.clearUserLocal();
    await localDB.saveSetting('pending_paystack_ref', ''); // Clear payment ref on logout
  },

  // Time tracking actions
  updateTimeTracking: (totalSeconds: number, currentStage: string) => {
    set({ totalTimeSeconds: totalSeconds, currentStage });
  },
}));
