import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, FlatList, Linking, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';
import { AppNavigationProp } from '../../../navigation/types';

interface UploadPdfViewProps {
    onBack?: () => void;
}

interface PdfResource {
    id: string;
    exam_id: string;
    exam_year_id: string;
    subject_id: string;
    exam: string;
    year: string;
    subject: string;
    fileUrl: string;
    fileName: string;
    sizeKb: number;
    createdAt: string;
}

const normalizeExamName = (exam: string): string => {
    const normalized = exam?.toUpperCase().trim() || '';
    if (normalized.includes('WAEC')) return 'WAEC';
    if (normalized.includes('JAMB')) return 'JAMB';
    if (normalized.includes('POST') || normalized.includes('UTME')) return 'POST UTME';
    return normalized;
};

export function UploadPdfView({ onBack }: UploadPdfViewProps) {
    const navigation = useNavigation<AppNavigationProp>();
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const [viewMode, setViewMode] = useState<'upload' | 'list'>('upload');

    // Upload State
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [exam, setExam] = useState('WAEC');
    const [year, setYear] = useState('');
    const [subject, setSubject] = useState('');

    // List State
    const [pdfResources, setPdfResources] = useState<PdfResource[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [selectedTab, setSelectedTab] = useState('WAEC');

    // Edit State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentEditingPdf, setCurrentEditingPdf] = useState<PdfResource | null>(null);
    const [editExam, setEditExam] = useState('');
    const [editYear, setEditYear] = useState('');
    const [editSubject, setEditSubject] = useState('');
    const [updatingEdit, setUpdatingEdit] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (viewMode === 'list') {
                loadPdfResources();
            }
        }, [viewMode])
    );

    const loadPdfResources = async () => {
        try {
            setLoadingList(true);
            const data = await supabaseDB.getAllPdfResources();
            const normalizedData = (data as any[]).map(pdf => ({
                ...pdf,
                exam: normalizeExamName(pdf.exam)
            }));
            setPdfResources(normalizedData as any);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load PDF resources');
        } finally {
            setLoadingList(false);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.assets && result.assets.length > 0) {
                setSelectedFile(result.assets[0]);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            Alert.alert('Error', 'Please select a PDF file');
            return;
        }

        if (!exam.trim() || !year.trim() || !subject.trim()) {
            Alert.alert('Validation', 'Please enter Exam, Year, and Subject');
            return;
        }

        try {
            setUploading(true);

            // 1. Ensure Metadata Exists
            const examRec = await supabaseDB.upsertExam(exam.trim());
            const yearRec = await supabaseDB.upsertExamYear(examRec.id, year.trim());
            const subjectRec = await supabaseDB.upsertSubject(examRec.id, yearRec.id, subject.trim());

            // 2. Upload File
            const uploadResult = await supabaseDB.uploadPdfFile(selectedFile);

            // 3. Save Record
            await supabaseDB.createPdfResource({
                examId: examRec.id,
                examYearId: yearRec.id,
                subjectId: subjectRec.id,
                fileUrl: uploadResult.publicUrl,
                fileName: selectedFile.name,
                sizeKb: selectedFile.size ? selectedFile.size / 1024 : 0
            });

            Alert.alert('Success', 'PDF Uploaded and Saved!');
            setSelectedFile(null);
            setExam('');
            setYear('');
            setSubject('');

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to upload PDF. Check your connection or policies.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePdf = (pdf: PdfResource) => {
        Alert.alert(
            'Delete PDF',
            `Are you sure you want to delete this PDF?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoadingList(true);
                            await supabaseDB.deletePdfResource(pdf.id);
                            loadPdfResources();
                            Alert.alert('Success', 'PDF deleted successfully');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete PDF');
                        } finally {
                            setLoadingList(false);
                        }
                    },
                },
            ]
        );
    };

    const openEditModal = (pdf: PdfResource) => {
        setCurrentEditingPdf(pdf);
        setEditExam(pdf.exam);
        setEditYear(pdf.year);
        setEditSubject(pdf.subject);
        setEditModalVisible(true);
    };

    const handleUpdateMetadata = async () => {
        if (!editExam.trim() || !editYear.trim() || !editSubject.trim()) {
            Alert.alert('Validation', 'Fields cannot be empty');
            return;
        }

        if (!currentEditingPdf) return;

        try {
            setUpdatingEdit(true);

            // 1. Ensure new Metadata entities exist
            const examRec = await supabaseDB.upsertExam(editExam.trim());
            const yearRec = await supabaseDB.upsertExamYear(examRec.id, editYear.trim());
            const subjectRec = await supabaseDB.upsertSubject(examRec.id, yearRec.id, editSubject.trim());

            // 2. Update resource linkage
            await supabaseDB.updatePdfResource(currentEditingPdf.id, {
                examId: examRec.id,
                examYearId: yearRec.id,
                subjectId: subjectRec.id
            });

            Alert.alert('Success', 'PDF metadata updated!');
            setEditModalVisible(false);
            loadPdfResources();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update metadata');
        } finally {
            setUpdatingEdit(false);
        }
    };

    const renderPdfItem = ({ item }: { item: PdfResource }) => (
        <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
            <View style={[styles.iconBoxList, { backgroundColor: '#FFF8F6' }]}>
                <Ionicons name="document-text" size={24} color="#864b03" />
            </View>
            <View style={styles.cardInfo}>
                <Text style={[styles.title, { color: '#3E2723' }]}>{item.exam} {item.year}</Text>
                <Text style={[styles.subtitle, { color: '#64748B' }]}>{item.subject} • {Math.round(item.sizeKb)}KB</Text>
                <Text style={[styles.subtitle, { fontSize: 10, marginTop: 4, color: '#94A3B8' }]} numberOfLines={1}>{item.fileName}</Text>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.viewBtn, { backgroundColor: '#FFFBEB' }]}
                    onPress={() => navigation.navigate('PdfView', { url: item.fileUrl, title: item.subject })}
                >
                    <Ionicons name="eye-outline" size={18} color="#864b03" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.viewBtn, { backgroundColor: '#EFEBE9' }]}
                    onPress={() => openEditModal(item)}
                >
                    <Ionicons name="create-outline" size={18} color="#4E342E" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: '#FEF2F2' }]}
                    onPress={() => handleDeletePdf(item)}
                >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {onBack && (
                        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#000000" />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.headerTitle, { color: '#000000' }]}>Study Resources (PDF)</Text>
                </View>
            </View>

            <View style={[styles.toggleWrapper, { backgroundColor: '#FFF8F6' }]}>
                <View style={[styles.toggleContainer, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'upload' && { backgroundColor: '#FFF8F6', borderRightWidth: 1, borderRightColor: '#D7CCC8' }]}
                        onPress={() => setViewMode('upload')}
                    >
                        <Text style={[styles.toggleText, { color: viewMode === 'upload' ? '#3E2723' : '#64748B' }]}>Upload New</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: '#FFF8F6' }]}
                        onPress={() => setViewMode('list')}
                    >
                        <Text style={[styles.toggleText, { color: viewMode === 'list' ? '#3E2723' : '#64748B' }]}>Library</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {viewMode === 'upload' ? (
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                >
                    <ScrollView
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={[styles.uploadCard, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                            <TouchableOpacity style={styles.uploadZone} onPress={pickDocument}>
                                <View style={[styles.iconCircle, { backgroundColor: '#FFF8F6' }]}>
                                    <Ionicons name={selectedFile ? "document-text" : "cloud-upload-outline"} size={32} color="#864b03" />
                                </View>
                                <Text style={[styles.uploadTitle, { color: '#3E2723' }]}>
                                    {selectedFile ? selectedFile.name : "Tap to upload PDF"}
                                </Text>
                                <Text style={[styles.uploadSubtitle, { color: '#64748B' }]}>
                                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Max file size: 10MB"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.formContainer, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                            <Text style={[styles.label, { color: '#8D6E63' }]}>EXAM NAME</Text>
                            <View style={[styles.inputt, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                                <Picker
                                    selectedValue={exam}
                                    onValueChange={(itemValue) => setExam(itemValue)}
                                    style={{ color: '#3E2723' }}
                                >
                                    <Picker.Item label="WAEC" value="WAEC" />
                                    <Picker.Item label="JAMB" value="JAMB" />
                                    <Picker.Item label="POST UTME" value="POST UTME" />
                                </Picker>
                            </View>

                            <Text style={[styles.label, { color: '#8D6E63' }]}>YEAR</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8', color: '#3E2723' }]}
                                placeholder="e.g. 2024"
                                placeholderTextColor="#BCAAA4"
                                value={year}
                                onChangeText={setYear}
                                keyboardType="numeric"
                            />

                            <Text style={[styles.label, { color: '#8D6E63' }]}>SUBJECT</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8', color: '#3E2723' }]}
                                placeholder="e.g. Mathematics"
                                placeholderTextColor="#BCAAA4"
                                value={subject}
                                onChangeText={setSubject}
                            />

                            <TouchableOpacity
                                style={[styles.webUploadBtn, { backgroundColor: '#864b03', opacity: (!selectedFile || uploading) ? 0.7 : 1 }]}
                                onPress={handleUpload}
                                disabled={!selectedFile || uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.webUploadText}>Confirm Upload</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#F1F5F9' }]}>
                            <Ionicons name="information-circle" size={20} color={colors.text} />
                            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                This PDF will be uploaded to the server as a study resource. It will be available for students to download in the app library.
                            </Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <View style={{ flex: 1 }}>
                    {loadingList ? (
                        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
                    ) : pdfResources.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
                                <Ionicons name="document-text-outline" size={48} color={isDark ? colors.border : '#CBD5E1'} />
                            </View>
                            <Text style={[styles.emptyStateText, { color: colors.text }]}>No uploaded papers yet</Text>
                            <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>Go to "Upload New" to add your first resource</Text>
                        </View>
                    ) : (
                        <View>
                            <View style={styles.tabContainer}>
                                {['WAEC', 'JAMB', 'POST UTME'].map((tab) => (
                                    <TouchableOpacity
                                        key={tab}
                                        style={[styles.tabBtn, selectedTab === tab && styles.activeTab]}
                                        onPress={() => setSelectedTab(tab)}
                                    >
                                        <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <FlatList
                                data={pdfResources.filter(p => p.exam === selectedTab)}
                                keyExtractor={(item) => item.id}
                                renderItem={renderPdfItem}
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                            />
                        </View>
                    )}
                </View>
            )}

            {/* Edit Metadata Modal */}
            <Modal
                visible={editModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: '#FFFFFF' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Metadata</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000000" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.editLabel}>EXAM</Text>
                        <View style={styles.editInput}>
                            <Picker
                                selectedValue={editExam}
                                onValueChange={(itemValue) => setEditExam(itemValue)}
                                style={{ color: '#3E2723' }}
                            >
                                <Picker.Item label="WAEC" value="WAEC" />
                                <Picker.Item label="JAMB" value="JAMB" />
                                <Picker.Item label="POST UTME" value="POST UTME" />
                            </Picker>
                        </View>

                        <Text style={styles.editLabel}>YEAR</Text>
                        <TextInput
                            style={styles.editInput}
                            value={editYear}
                            onChangeText={setEditYear}
                            keyboardType="numeric"
                        />

                        <Text style={styles.editLabel}>SUBJECT</Text>
                        <TextInput
                            style={styles.editInput}
                            value={editSubject}
                            onChangeText={setEditSubject}
                        />

                        <TouchableOpacity 
                            style={[styles.saveBtn, { backgroundColor: '#864b03' }]}
                            onPress={handleUpdateMetadata}
                            disabled={updatingEdit}
                        >
                            {updatingEdit ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { padding: 20, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '900' },
    toggleWrapper: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    toggleContainer: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    toggleText: { fontSize: 13, fontWeight: '800' },
    content: { padding: 20, paddingBottom: 40 },
    uploadCard: { borderRadius: 24, padding: 32, marginBottom: 24, borderWidth: 2, borderStyle: 'dashed' },
    uploadZone: { alignItems: 'center', justifyContent: 'center' },
    iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    uploadTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
    uploadSubtitle: { fontSize: 13, fontWeight: '600' },
    formContainer: { borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1 },
    label: { fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20, fontSize: 14, fontWeight: '600' },
    inputt: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 1, marginBottom: 20, fontSize: 14, fontWeight: '600' },
    webUploadBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, elevation: 2 },
    webUploadText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    infoBox: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 20, alignItems: 'center' },
    infoText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 20 },
    listContent: { padding: 20, paddingBottom: 100 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 16, borderWidth: 1, elevation: 2 },
    iconBoxList: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    cardInfo: { flex: 1 },
    title: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
    subtitle: { fontSize: 12, fontWeight: '700' },
    actionButtons: { flexDirection: 'row', gap: 10 },
    viewBtn: { padding: 10, borderRadius: 12 },
    deleteBtn: { padding: 10, borderRadius: 12 },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, padding: 20 },
    emptyStateText: { fontSize: 18, fontWeight: '900', marginBottom: 8 },
    emptyStateSubtext: { fontSize: 14, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', borderRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '900' },
    editLabel: { fontSize: 10, fontWeight: '900', marginBottom: 8, color: '#8D6E63' },
    editInput: { borderWidth: 1, borderColor: '#D7CCC8', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 14, fontWeight: '600' },
    saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, marginHorizontal: 2 },
    activeTab: { backgroundColor: '#864b03' },
    tabText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
    activeTabText: { color: '#FFFFFF' }
});
