import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { Header, Screen, Card } from '../components/Layout';
import { AdBanner } from '../components/AdBanner';
import { useAppStore } from '../store/useAppStore';
import { ExamMode } from '../types';

export function HistoryScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { results, noteQuizResults, jambTextQuizResults, subjects, deleteResult, deleteNoteQuizResult, deleteJambTextQuizResult, theme } = useAppStore();
  const isDark = theme === 'dark';

  // Combine and sort both types of results by date
  const combinedHistory = [
    ...results.map(r => ({ ...r, type: 'exam' })),
    ...noteQuizResults.map(r => ({
      ...r,
      type: 'quiz',
      totalScore: (r.score / r.total) * 100,
      totalQuestions: r.total,
      totalCorrect: r.score
    })),
    ...jambTextQuizResults.map(r => ({
      ...r,
      type: 'jamb_quiz',
      totalScore: (r.score / r.total) * 100,
      totalQuestions: r.total,
      totalCorrect: r.score
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = (id: string, type: string) => {
    let typeName = 'exam';
    if (type === 'quiz') typeName = 'note quiz';
    if (type === 'jamb_quiz') typeName = 'text quiz';

    Alert.alert(
      "Delete Record",
      `Are you sure you want to remove this ${typeName} record?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (type === 'exam') deleteResult(id);
            else if (type === 'quiz') deleteNoteQuizResult(id);
            else deleteJambTextQuizResult(id);
          }
        }
      ]
    );
  };

  return (
    <Screen scrollable={false} style={{ backgroundColor: '#FFF8F6' }}>
      <Header
        title="Performance History"
        onBack={() => navigation.goBack()}
        style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
        titleStyle={{ color: '#000000' }}
        iconColor="#000000"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {combinedHistory.length > 0 ? (
          combinedHistory.map((item, index) => {
            const dateObj = new Date(item.date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
            const isPass = item.totalScore >= 50;
            const isQuiz = (item as any).type === 'quiz' || (item as any).type === 'jamb_quiz';

            return (
              <React.Fragment key={item.id}>
                <Card style={styles.historyCard}>
                  <TouchableOpacity
                    style={styles.cardClickArea}
                    onPress={() => isQuiz ? null : navigation.navigate('HistoryDetail', { resultId: item.id })}
                    disabled={isQuiz}
                  >
                    <View style={[
                      styles.scoreBadge,
                      isPass ? { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: '#A7F3D0' } : { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: '#FECACA' }
                    ]}>
                      <Text style={[
                        styles.scoreText,
                        isPass ? { color: '#D1FAE5' } : { color: '#FECACA' }
                      ]}>{Math.round(item.totalScore)}</Text>
                    </View>

                    <View style={styles.cardInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.subjectName, { color: '#FFFFFF' }]}>
                          {isQuiz
                            ? (item as any).noteTitle || 'Study Note Quiz'
                            : (item as any).type === 'jamb_quiz'
                              ? (item as any).textTitle || 'JAMB Text Quiz'
                              : (item as any).mode === ExamMode.PAST_QUESTION
                                ? `${subjects.find(s => s.id === (item as any).subjectId)?.name || 'Subject'}`
                                : 'JAMB Simulation'}
                        </Text>
                        {((item as any).type === 'quiz' || (item as any).type === 'jamb_quiz') && (
                          <View style={{ backgroundColor: '#ff8c0020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#ff8c00', fontSize: 8, fontWeight: '900' }}>QUIZ</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.metaText}>
                        {formattedDate} • {item.totalCorrect}/{item.totalQuestions} CORRECT
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleDelete(item.id, (item as any).type)} style={styles.deleteBtn}>
                    <Ionicons name="close-circle-outline" size={24} color="#FFF" />
                  </TouchableOpacity>
                </Card>
                {index === 1 && <AdBanner placement="history" />}
              </React.Fragment>
            );
          })
        ) : (
          <View style={styles.empty}>
            <Ionicons name="stats-chart" size={60} color="#D7CCC8" style={{ marginBottom: 20 }} />
            <Text style={[styles.emptyText, { color: '#3E2723' }]}>No history available yet.</Text>
            <Text style={styles.emptySubtext}>Your exam results will appear here after you complete a practice session.</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  historyCard: { flexDirection: 'row', alignItems: 'center', padding: 0, marginBottom: 6, overflow: 'hidden', borderRadius: 12, backgroundColor: '#864b03' },
  cardClickArea: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 8 },
  scoreBadge: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' },
  scoreText: { fontSize: 13, fontWeight: '900', color: '#FFF' },
  cardInfo: { flex: 1 },
  subjectName: { fontSize: 13, fontWeight: '900', marginBottom: 1, color: '#FFF' },
  metaText: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, textTransform: 'uppercase' },
  deleteBtn: { padding: 6 },
  empty: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '900', marginBottom: 8, textAlign: 'center', color: '#3E2723' },
  emptySubtext: { fontSize: 13, color: '#5D4037', textAlign: 'center', lineHeight: 20 }
});