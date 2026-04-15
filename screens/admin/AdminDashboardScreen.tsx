import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../navigation/types';
import { Screen } from '../../components/Layout';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { DashboardView } from '../../components/admin/views/DashboardView';
import { NotesView } from '../../components/admin/views/NotesView';
import { LibraryView } from '../../components/admin/views/LibraryView';
import { AddPastQuestionView } from '../../components/admin/views/AddPastQuestionView';
import { AddQuestionsWithListView } from '../../components/admin/views/AddQuestionsWithListView';
import { AddPaperView } from '../../components/admin/views/AddPaperView';
import { ActivityView } from '../../components/admin/views/ActivityView';
import { QuestionPaperDetailView } from '../../components/admin/views/QuestionPaperDetailView';
import { NoteDetailView } from '../../components/admin/views/NoteDetailView';
import { EditNoteView } from '../../components/admin/views/EditNoteView';
import { AddNoteView } from '../../components/admin/views/AddNoteView';
import { ImportQuestionsView } from '../../components/admin/views/ImportQuestionsView';
import { UploadPdfView } from '../../components/admin/views/UploadPdfView';
import { ManualEntryView } from '../../components/admin/views/ManualEntryView';
import { AddJambTextView } from '../../components/admin/views/AddJambTextView';
import { JambTextView } from '../../components/admin/views/JambTextView';
import { AdsView } from '../../components/admin/views/AdsView';
import { CompetitionManagementView } from '../../components/admin/views/CompetitionManagementView';
import { AddCompetitionView } from '../../components/admin/views/AddCompetitionView';
import { CompetitionResultView } from '../../components/admin/views/CompetitionResultView';
import { CareerManagementView } from '../../components/admin/views/CareerManagementView';
import { AddCareerCourseView } from '../../components/admin/views/AddCareerCourseView';
import { ReferralManagementView } from '../../components/admin/views/ReferralManagementView';
import { Alert } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { ThemeColors } from '../../theme/colors';

export function AdminDashboardScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for theme consistency
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [selectedJambTextId, setSelectedJambTextId] = useState<string | null>(null);
    const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
    const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [jambTextType, setJambTextType] = useState<'literature' | 'english'>('literature');

    const handleNavigate = (item: string) => {
        setActiveTab(item);
    };

    const handlePaperSelect = (paperId: string) => {
        setSelectedPaperId(paperId);
        setActiveTab('paper_detail');
    };

    const handleNoteSelect = (noteId: string) => {
        setSelectedNoteId(noteId);
        setActiveTab('note_detail');
    };

    const handleNoteEdit = (noteId: string) => {
        setSelectedNoteId(noteId);
        setActiveTab('edit_note');
    };

    const handleNoteDelete = (noteId: string) => {
        Alert.alert(
            "Delete Note",
            "Are you sure you want to delete this note? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert("Success", "Note deleted successfully");
                        setActiveTab('notes');
                    }
                }
            ]
        );
    };

    const handleJambTextAdd = (type: 'literature' | 'english') => {
        setJambTextType(type);
        setSelectedJambTextId(null);
        setActiveTab('add_jamb_text');
    };

    const handleJambTextEdit = (id: string) => {
        setSelectedJambTextId(id);
        setActiveTab('add_jamb_text');
    };

    const handleCareerAdd = (deptId: string) => {
        setSelectedDeptId(deptId);
        setSelectedCourseId(null);
        setActiveTab('add_career_course');
    };

    const handleCareerEdit = (courseId: string) => {
        setSelectedCourseId(courseId);
        setActiveTab('add_career_course');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardView onNavigate={setActiveTab} />;
            case 'library':
                return <LibraryView onNavigate={setActiveTab} onSelectPaper={handlePaperSelect} />;
            case 'paper_detail':
                return (
                    <QuestionPaperDetailView
                        paperId={selectedPaperId || ''}
                        onBack={() => setActiveTab('library')}
                    />
                );
            case 'add_paper':
                return <AddPaperView onBack={() => setActiveTab('library')} />;
            case 'add_question':
                return <AddQuestionsWithListView onBack={() => setActiveTab('dashboard')} />;
            case 'import_questions':
                return <ImportQuestionsView onNavigate={setActiveTab} onBackPress={() => setActiveTab('dashboard')} />;
            case 'upload_pq':
                return <UploadPdfView onBack={() => setActiveTab('dashboard')} />;
            case 'manual_entry':
                return <ManualEntryView onBack={() => setActiveTab('dashboard')} />;
            case 'add_past_question':
                return <AddPastQuestionView onBack={() => setActiveTab('library')} />;
            case 'activity':
                return <ActivityView />;
            case 'notes':
                return <NotesView onSelectNote={handleNoteSelect} onAddNote={() => setActiveTab('add_note')} />;
            case 'add_note':
                return (
                    <AddNoteView
                        onBack={() => setActiveTab('notes')}
                        onSave={() => setActiveTab('notes')}
                    />
                );
            case 'note_detail':
                return (
                    <NoteDetailView
                        noteId={selectedNoteId || ''}
                        onBack={() => setActiveTab('notes')}
                        onEdit={handleNoteEdit}
                        onDelete={handleNoteDelete}
                    />
                );
            case 'edit_note':
                return (
                    <EditNoteView
                        noteId={selectedNoteId || ''}
                        onBack={() => setActiveTab('note_detail')}
                        onSave={() => setActiveTab('note_detail')}
                    />
                );
            case 'jamb_text':
                return (
                    <JambTextView
                        onAdd={handleJambTextAdd}
                        onEdit={handleJambTextEdit}
                        onDelete={() => { }} // Handle internally or refresh
                    />
                );
            case 'add_jamb_text':
                return (
                    <AddJambTextView
                        type={jambTextType}
                        textId={selectedJambTextId}
                        onBack={() => setActiveTab('jamb_text')}
                        onSave={() => setActiveTab('jamb_text')}
                    />
                );
            // case 'settings':
            //     return <SettingsView />;
            case 'ads':
                return <AdsView onBack={() => setActiveTab('dashboard')} />;
            case 'career_inst':
                return (
                    <CareerManagementView
                        onAddCourse={handleCareerAdd}
                        onEditCourse={handleCareerEdit}
                    />
                );
            case 'add_career_course':
                return (
                    <AddCareerCourseView
                        departmentId={selectedDeptId || ''}
                        courseId={selectedCourseId}
                        onBack={() => setActiveTab('career_inst')}
                        onSave={() => setActiveTab('career_inst')}
                    />
                );
            case 'competitions':
                return (
                    <CompetitionManagementView
                        onAdd={() => { setSelectedCompetitionId(null); setActiveTab('add_competition'); }}
                        onEdit={(id) => { setSelectedCompetitionId(id); setActiveTab('add_competition'); }}
                        onViewLive={(id) => { setSelectedCompetitionId(id); setActiveTab('competition_results'); }}
                    />
                );
            case 'add_competition':
                return (
                    <AddCompetitionView
                        competitionId={selectedCompetitionId}
                        onBack={() => setActiveTab('competitions')}
                        onSave={() => setActiveTab('competitions')}
                    />
                );
            case 'competition_results':
                return (
                    <CompetitionResultView
                        competitionId={selectedCompetitionId || ''}
                        onBack={() => setActiveTab('competitions')}
                    />
                );
            case 'referrals':
                return <ReferralManagementView onNavigate={setActiveTab} />;
            default:
                return <DashboardView onNavigate={setActiveTab} />;
        }
    };

    return (
        <Screen scrollable={false} style={[styles.bg, { backgroundColor: colors.background }]}>
            <AdminHeader />
            <AdminSidebar activeItem={activeTab} onNavigate={handleNavigate} />

            <View style={styles.contentContainer}>
                {renderContent()}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    contentContainer: { flex: 1 },
});
