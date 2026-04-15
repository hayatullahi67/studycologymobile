import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { Header, Screen } from '../components/Layout';
import { COLORS } from '../theme/colors';
import { AdBanner } from '../components/AdBanner';
import { useAppStore } from '../store/useAppStore';
import * as localDB from '../services/localDatabase';

const stripHtml = (html: string) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
};

export function NotesScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { notes, syncStatus, theme } = useAppStore();
  const [search, setSearch] = useState('');

  const isDark = theme === 'dark';
  const syncing = syncStatus.isSyncing && syncStatus.progress < 0.5;

  const getNoteSubject = (note: any) => (note.subject || note.subjectId || '');

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(search.toLowerCase()) ||
    (getNoteSubject(note) && getNoteSubject(note).toLowerCase().includes(search.toLowerCase())) ||
    ((note as any).topic && (note as any).topic.toLowerCase().includes(search.toLowerCase()))
  );

  if (syncing && notes.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: '#101920' }]}>
        <ActivityIndicator color={COLORS.primary[600]} size="large" />
        <Text style={[styles.syncText, { color: '#F1F5F9' }]}>Downloading study library...</Text>
        <Text style={styles.syncSubtext}>This will take just a moment.</Text>
      </View>
    );
  }

  return (
    <Screen scrollable={false} style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
      <Header
        title="Study Notes"
        onBack={() => navigation.goBack()}
        style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
        titleStyle={{ color: '#000000' }}
        iconColor="#000000"
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: '#EFEBE9', borderColor: '#D7CCC8' }]}>
          <Ionicons name="search-outline" size={18} color="#5D4037" />
          <TextInput
            placeholder="Search notes, subjects, or topics..."
            placeholderTextColor="#8D6E63"
            style={[styles.searchInput, { color: '#3E2723' }]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {syncStatus.isSyncing && (
          <View style={styles.miniSync}>
            <ActivityIndicator color={COLORS.primary[600]} size="small" />
            <Text style={styles.miniSyncText}>Updating library in background...</Text>
          </View>
        )}

        {filteredNotes.length > 0 ? (
          filteredNotes.map((note, index) => {
            return (
            <React.Fragment key={note.id}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.noteCard, { backgroundColor: '#864b03', borderColor: '#864b03' }]}
                onPress={() => navigation.navigate('NoteDetail', { noteId: note.id })}
              >
                <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.iconText, { color: '#FFFFFF' }]}>{(getNoteSubject(note) || 'G').charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.noteInfo}>
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.subjectBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Text style={[styles.subjectText, { color: '#FFFFFF' }]}>
                          {(getNoteSubject(note) || 'General').toUpperCase()}
                        </Text>
                      </View>
                      {note.quiz && note.quiz.length > 0 && (
                        <View style={[styles.subjectBadge, { backgroundColor: '#FF8C00' }]}>
                          <Text style={[styles.subjectText, { color: '#FFFFFF' }]}>QUIZ</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
                  </View>

                  <Text style={[styles.noteTitle, { color: '#FFFFFF' }]}>{note.title}</Text>
                  {(note as any).topic && (
                    <Text style={[styles.topicText, { color: '#FFD180' }]}>{(note as any).topic}</Text>
                  )}
                  <Text style={[styles.noteSnippet, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
                    {stripHtml(note.content)}
                  </Text>
                </View>
              </TouchableOpacity>
              {index === 1 && <AdBanner placement="notes" />}
            </React.Fragment>
          )})
        ) : (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color="#1E293B" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No study notes found</Text>
            <Text style={styles.emptySubtext}>Admin's new notes will appear here automatically.</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 30 },
  syncText: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  syncSubtext: { fontSize: 13, color: '#64748B', textAlign: 'center', fontWeight: '500' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)'
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  miniSync: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 8, backgroundColor: 'rgba(255,140,0,0.1)', borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)' },
  miniSyncText: { fontSize: 10, fontWeight: '800', color: COLORS.primary[600], textTransform: 'uppercase', letterSpacing: 0.5 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderRadius: 14,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconText: {
    color: COLORS.primary[600],
    fontSize: 16,
    fontWeight: '900',
  },
  noteInfo: { flex: 1, paddingVertical: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  subjectBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  subjectText: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.5 },
  noteTitle: { fontSize: 13, fontWeight: '800', marginBottom: 0 },
  topicText: { fontSize: 10, color: COLORS.primary[600], fontWeight: '700', marginBottom: 1 },
  noteSnippet: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
  emptySubtext: { fontSize: 12, color: '#64748B', fontWeight: '600', textAlign: 'center' }
});
