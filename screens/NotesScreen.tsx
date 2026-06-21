import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { Header, Screen } from '../components/Layout';
import { COLORS } from '../theme/colors';
import { AdBanner } from '../components/AdBanner';
import { useAppStore } from '../store/useAppStore';
import * as localDB from '../services/localDatabase';

export function NotesScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { notes, syncStatus, subjects: storedSubjects } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [pdfSubjectIds, setPdfSubjectIds] = useState<Set<string>>(new Set());
  const [subjects, setSubjects] = useState<any[]>([]);

  const syncing = syncStatus.isSyncing && syncStatus.progress < 0.5;

  const getNoteSubject = (note: any) => (note.subject || note.subjectId || note.subject_id || '');

  useEffect(() => {
    localDB.getPdfResourceSubjectIds()
      .then((ids) => setPdfSubjectIds(new Set(ids)))
      .catch((error) => console.error('Error loading PDF subject ids:', error));

    localDB.getLocalSubjects()
      .then((items) => setSubjects(items.filter((item: any) => {
        const name = (item.name || '').trim().toLowerCase();
        return item.exam_name !== 'GST' && item.exam_name !== 'POSTUTME' && name !== 'crs' && name !== 'crk';
      })))
      .catch((error) => console.error('Error loading subjects:', error));
  }, []);

  useEffect(() => {
    if (storedSubjects.length > 0) {
      setSubjects(storedSubjects.filter((item: any) => {
        const name = (item.name || '').trim().toLowerCase();
        return item.exam_name !== 'GST' && item.exam_name !== 'POSTUTME' && name !== 'crs' && name !== 'crk';
      }));
    }
  }, [storedSubjects]);

  const normalizeSubjectName = (name: string) => (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const getSubjectKey = (note: any) => {
    const subject = getNoteSubject(note) || 'General';
    return `subject-${normalizeSubjectName(subject)}`;
  };
  const getTopicKey = (note: any) => note.topic_id || `legacy-topic-${getSubjectKey(note)}-${(note.topic || 'General').toLowerCase()}`;

  const query = search.trim().toLowerCase();
  const subjectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject: any) => {
      const name = normalizeSubjectName(subject.name);
      if (name && subject.id) {
        map.set(name, subject.id);
      }
    });
    return map;
  }, [subjects]);

  const subjectIdToName = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject: any) => {
      if (!subject.id) return;
      const name = normalizeSubjectName(subject.name);
      if (name) {
        map.set(subject.id, name);
      }
    });
    return map;
  }, [subjects]);

  const visibleNotes = useMemo(() => notes.filter((note: any) => {
    const resolvedSubjectId = note.subject_id || subjectNameMap.get(normalizeSubjectName(note.subject));
    return !resolvedSubjectId || !pdfSubjectIds.has(resolvedSubjectId);
  }), [notes, pdfSubjectIds, subjectNameMap]);

  const notesBySubjectName = useMemo(() => {
    const map = new Map<string, any[]>();
    visibleNotes.forEach((note: any) => {
      let subjectName = normalizeSubjectName(note.subject);
      let subjectId = note.subject_id || subjectNameMap.get(subjectName);
      if (subjectId && pdfSubjectIds.has(subjectId)) return;
      if (!subjectName && subjectId) {
        subjectName = subjectIdToName.get(subjectId) || '';
      }
      if (!subjectName) return;
      const list = map.get(subjectName) || [];
      list.push(note);
      map.set(subjectName, list);
    });
    return map;
  }, [visibleNotes, pdfSubjectIds, subjectNameMap, subjectIdToName]);

  const visibleSubjects = useMemo(() => {
    const map = new Map<string, any>();
    subjects.forEach((subject: any) => {
      if (!subject.id || pdfSubjectIds.has(subject.id)) return;
      const normalizedName = normalizeSubjectName(subject.name);
      if (!normalizedName) return;
      if (!map.has(normalizedName)) {
        map.set(normalizedName, subject);
      }
    });
    return Array.from(map.values());
  }, [subjects, pdfSubjectIds]);

  const makeGroups = (items: any[], getKey: (note: any) => string, getTitle: (note: any) => string, getSubtitle?: (notes: any[]) => string) => {
    const groups = new Map<string, any>();
    items.forEach(note => {
      const key = getKey(note);
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          title: getTitle(note),
          subtitle: '',
          notes: [],
        });
      }
      groups.get(key).notes.push(note);
    });

    return Array.from(groups.values())
      .map(group => {
        const sortedNotes = [...group.notes].sort((a: any, b: any) => {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });
        return {
          ...group,
          notes: sortedNotes,
          subtitle: getSubtitle ? getSubtitle(sortedNotes) : `${sortedNotes.length} note${sortedNotes.length === 1 ? '' : 's'}`,
        };
      })
      .filter(group => !query || group.title.toLowerCase().includes(query) || group.subtitle.toLowerCase().includes(query))
      .sort((a, b) => {
        const aTime = a.notes.length > 0 ? new Date(a.notes[0].created_at || 0).getTime() : 0;
        const bTime = b.notes.length > 0 ? new Date(b.notes[0].created_at || 0).getTime() : 0;
        return aTime - bTime;
      });
  };

  const countGroups = (items: any[], getKey: (note: any) => string) => new Set(items.map(getKey)).size;

  const subjectGroups = useMemo(() => visibleSubjects
    .map((subject: any) => {
      const normalizedName = normalizeSubjectName(subject.name);
      const notesForSubject = notesBySubjectName.get(normalizedName) || [];
      const topicCount = notesForSubject.length ? countGroups(notesForSubject, getTopicKey) : 0;
      return {
        id: normalizedName,
        title: subject.name || 'Untitled Subject',
        subtitle: notesForSubject.length > 0
          ? `${topicCount} topic${topicCount === 1 ? '' : 's'}`
          : 'Not available at the moment',
        notes: notesForSubject,
        hasNotes: notesForSubject.length > 0,
      };
    })
    .filter(group => normalizeSubjectName(group.title) !== 'arabic')
    .filter(group => !query || group.title.toLowerCase().includes(query) || group.subtitle.toLowerCase().includes(query))
    .sort((a, b) => {
      // Subjects without notes always go to the bottom
      if (a.hasNotes !== b.hasNotes) return a.hasNotes ? -1 : 1;
      // Both have no notes — alphabetical
      if (!a.hasNotes) return a.title.localeCompare(b.title);
      // Both have notes — oldest note first (ascending created_at)
      const aOldest = Math.min(...a.notes.map((n: any) => new Date(n.created_at || 0).getTime()));
      const bOldest = Math.min(...b.notes.map((n: any) => new Date(n.created_at || 0).getTime()));
      return aOldest - bOldest;
    })
    , [visibleSubjects, notesBySubjectName, getTopicKey, query]);

  const topicGroups = selectedSubject ? makeGroups(
    selectedSubject.notes,
    getTopicKey,
    (note) => note.topic || 'General',
    (groupNotes) => `${groupNotes.length} subtopic${groupNotes.length === 1 ? '' : 's'}`
  ) : [];

  const getLevelTitle = () => {
    if (selectedSubject) return `${selectedSubject.title} Topics`;
    return 'Study Notes';
  };

  const getPlaceholder = () => {
    if (selectedSubject) return 'Search topics...';
    return 'Search subjects...';
  };

  const handleBack = () => {
    if (selectedSubject) {
      setSelectedSubject(null);
      setSearch('');
      return;
    }
    navigation.goBack();
  };

  const openSubject = (group: any) => {
    setSelectedSubject(group);
    setSearch('');
  };

  const openTopic = (group: any) => {
    setSearch('');
    navigation.navigate('NoteDetail', {
      noteId: group.notes[0].id,
      noteIds: group.notes.map((note: any) => note.id),
    });
  };

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
        title={getLevelTitle()}
        onBack={handleBack}
        style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
        titleStyle={{ color: '#000000' }}
        iconColor="#000000"
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: '#EFEBE9', borderColor: '#D7CCC8' }]}>
          <Ionicons name="search-outline" size={18} color="#5D4037" />
          <TextInput
            placeholder={getPlaceholder()}
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

        {!selectedSubject && subjectGroups.length > 0 && (
          subjectGroups.map((group, index) => (
            <React.Fragment key={group.id}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.noteCard, { backgroundColor: '#864b03', borderColor: '#864b03' }]}
                onPress={() => openSubject(group)}
              >
                <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.iconText, { color: '#FFFFFF' }]}>{group.title.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.noteInfo}>
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.subjectBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Text style={[styles.subjectText, { color: '#FFFFFF' }]}>
                          SUBJECT
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
                  </View>

                  <Text style={[styles.noteTitle, { color: '#FFFFFF' }]}>{group.title}</Text>
                  <Text style={[styles.noteSnippet, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
                    {group.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
              {index === 1 && <AdBanner placement="notes" />}
            </React.Fragment>
          ))
        )}

        {selectedSubject && topicGroups.length > 0 && (
          topicGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              activeOpacity={0.7}
              style={[styles.noteCard, { backgroundColor: '#864b03', borderColor: '#864b03' }]}
              onPress={() => openTopic(group)}
            >
              <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="albums-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.noteInfo}>
                <Text style={[styles.noteTitle, { color: '#FFFFFF' }]}>{group.title}</Text>
                <Text style={[styles.noteSnippet, { color: 'rgba(255,255,255,0.7)' }]}>{group.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          ))
        )}

        {!selectedSubject && subjectGroups.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color="#1E293B" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No study notes found</Text>
            <Text style={styles.emptySubtext}>Admin's new notes will appear here automatically.</Text>
          </View>
        )}

        {selectedSubject && topicGroups.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color="#1E293B" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No notes available for {selectedSubject.title}</Text>
            <Text style={styles.emptySubtext}>This subject has no study notes at the moment.</Text>
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
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#3E2723',
    borderWidth: 1,
    borderColor: '#3E2723'
  },
  quizIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quizTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  quizSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700' },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
  emptySubtext: { fontSize: 12, color: '#64748B', fontWeight: '600', textAlign: 'center' }
});