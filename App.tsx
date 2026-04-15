import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './navigation/types';

import { SplashScreen } from './screens/SplashScreen';
import { MainTabNavigator } from './screens/MainTabNavigator';
import { SubjectSelectScreen } from './screens/SubjectSelectScreen';
import { ExamConfigScreen } from './screens/ExamConfigScreen';
import { PractiseSelectionScreen } from './screens/PractiseSelectionScreen';
import { ExamScreen } from './screens/ExamScreen';
import { ResultScreen } from './screens/ResultScreen';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { PastQuestionsScreen } from './screens/PastQuestionsScreen';
import { HistoryDetailScreen } from './screens/HistoryDetailScreen';
import { PastQuestionsPracticeScreen } from './screens/PastQuestionsPracticeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { AdminDashboardScreen } from './screens/admin/AdminDashboardScreen';
import { PdfViewScreen } from './screens/PdfViewScreen';
import { NoteDetailScreen } from './screens/NoteDetailScreen';
import { JambTextsScreen } from './screens/JambTextsScreen';
import { JambTextContentScreen } from './screens/JambTextContentScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AppearanceScreen } from './screens/AppearanceScreen';
import { AboutScreen } from './screens/AboutScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';

import { NoteQuizScreen } from './screens/NoteQuizScreen';
import { JambTextQuizScreen } from './screens/JambTextQuizScreen';
import { UtmeCompetitionScreen } from './screens/UtmeCompetitionScreen';
import { UtmeCompetitionExamScreen } from './screens/UtmeCompetitionExamScreen';
import { CareerGuidanceScreen } from './screens/CareerGuidanceScreen';
import { CourseListScreen } from './screens/CourseListScreen';
import { CourseDetailScreen } from './screens/CourseDetailScreen';
import { EduGameScreen } from './screens/EduGameScreen';
import { EduGameResultScreen } from './screens/EduGameResultScreen';
import { ReferralScreen } from './screens/ReferralScreen';
import { ProgressTrackerScreen } from './screens/ProgressTrackerScreen';
import { GlobalTimeTracker } from './components/GlobalTimeTracker';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <GlobalTimeTracker />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />

          {/* Main App Entry Point (with Tabs) */}
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />

          {/* Sub-flows and Modals */}
          <Stack.Screen name="SubjectSelect" component={SubjectSelectScreen} />
          <Stack.Screen name="ExamConfig" component={ExamConfigScreen} />
          <Stack.Screen name="PractiseSelection" component={PractiseSelectionScreen} />
          <Stack.Screen name="Exam" component={ExamScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
          <Stack.Screen name="Analysis" component={AnalysisScreen} />
          <Stack.Screen name="Review" component={ReviewScreen} />
          <Stack.Screen name="PastQuestions" component={PastQuestionsScreen} />
          <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
          <Stack.Screen name="PastQuestionsPractice" component={PastQuestionsPracticeScreen} />
          <Stack.Screen name="PdfView" component={PdfViewScreen} />
          <Stack.Screen name="NoteDetail" component={NoteDetailScreen} />
          <Stack.Screen name="NoteQuiz" component={NoteQuizScreen} />
          <Stack.Screen name="JambTextContent" component={JambTextContentScreen} />
          <Stack.Screen name="JambTextQuiz" component={JambTextQuizScreen} />
          <Stack.Screen name="UtmeCompetition" component={UtmeCompetitionScreen} />
          <Stack.Screen name="UtmeCompetitionExam" component={UtmeCompetitionExamScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Appearance" component={AppearanceScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="CareerGuidance" component={CareerGuidanceScreen} />
          <Stack.Screen name="CourseList" component={CourseListScreen} />
          <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
          <Stack.Screen name="EduGame" component={EduGameScreen} />
          <Stack.Screen name="EduGameResult" component={EduGameResultScreen} />
          <Stack.Screen name="Referral" component={ReferralScreen} />
          <Stack.Screen name="ProgressTracker" component={ProgressTrackerScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
