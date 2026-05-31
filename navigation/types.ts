import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ExamMode } from '../types';

export type MainTabParamList = {
  HomeTab: undefined;
  PastQuestionsTab: undefined;
  NotesTab: undefined;
  JambTextsTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  AdminDashboard: undefined;
  MainTabs: undefined; // The container for bottom tabs
  SubjectSelect: { nextScreen?: string };
  PastQuestions: undefined;
  ExamConfig: { initialSubjectId?: string; mode?: ExamMode };
  PractiseSelection: undefined;
  Exam: undefined;
  Result: undefined;
  Analysis: undefined;
  Review: { resultId: string; questions?: any[] };
  HistoryDetail: { resultId: string };
  PastQuestionsPractice: { paperId: string };
  PdfView: { url: string; title: string; isLocal?: boolean };
  NoteDetail: { noteId: string; noteIds?: string[] };
  NoteQuiz: { noteId: string };
  JambTextContent: { textId: string };
  JambTextQuiz: { textId: string };
  UtmeCompetition: undefined;
  UtmeCompetitionExam: { competitionId: string; registrationId: string };
  Profile: undefined;
  Appearance: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  About: undefined;
  EduGame: { initialSubjectId?: string };
  EduGameResult: { result: any };
  CareerGuidance: undefined;
  CourseList: { departmentId: string; departmentName: string };
  CourseDetail: { courseId: string };
  Referral: undefined;
  ProgressTracker: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;
