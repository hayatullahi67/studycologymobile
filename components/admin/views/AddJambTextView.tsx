import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StatusBar, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';
import { RichTextEditor } from '../../RichTextEditor';

interface AddJambTextViewProps {
    type: 'literature' | 'english';
    textId?: string | null;
    onBack: () => void;
    onSave: () => void;
}

export function AddJambTextView({ type, textId, onBack, onSave }: AddJambTextViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [content, setContent] = useState('');
    const [quiz, setQuiz] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (textId) {
            loadText();
        }
    }, [textId]);

    const loadText = async () => {
        try {
            setFetching(true);
            const data = await supabaseDB.getJambTextById(textId!);
            if (data) {
                setTitle(data.title);
                setAuthor(data.author || '');
                setCategory(data.category || '');
                setThumbnailUrl(data.thumbnail_url || '');
                setContent(data.content);
                setQuiz(data.quiz || []);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to load text details");
        } finally {
            setFetching(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setSelectedFile(result.assets[0]);
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            Alert.alert("Validation Error", "Title and Content are required");
            return;
        }

        try {
            setLoading(true);
            let currentThumbnail = thumbnailUrl;

            // Upload image if selected
            if (selectedFile) {
                setUploading(true);
                const uploadRes = await supabaseDB.uploadBookCover(selectedFile);
                currentThumbnail = uploadRes.publicUrl;
                setUploading(false);
            }

            const textData = {
                title,
                author,
                category,
                thumbnail_url: currentThumbnail,
                content,
                quiz
            };

            if (textId) {
                await supabaseDB.updateJambText(textId, textData);
                Alert.alert("Success", "Updated successfully!");
            } else {
                await supabaseDB.addJambText(type, title, content, author, quiz, category, currentThumbnail);
                Alert.alert("Success", "Created successfully!");
            }
            onSave();
        } catch (error) {
            Alert.alert("Error", "Failed to save");
            console.error(error);
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const addQuizQuestion = () => {
        setQuiz([...quiz, {
            id: Date.now().toString(),
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 'A',
            explanation: ''
        }]);
    };

    const updateQuizQuestion = (index: number, field: string, value: any) => {
        const newQuiz = [...quiz];
        newQuiz[index] = { ...newQuiz[index], [field]: value };
        setQuiz(newQuiz);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuiz = [...quiz];
        newQuiz[qIndex].options[oIndex] = value;
        setQuiz(newQuiz);
    };

    const removeQuizQuestion = (index: number) => {
        setQuiz(quiz.filter((_, i) => i !== index));
    };

    if (fetching) return (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 16, color: colors.textSecondary, fontWeight: '700' }}>Loading material...</Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.background }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {textId ? 'Edit' : 'Add'} {type === 'literature' ? 'Literature' : 'English'}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleSave} style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Text style={styles.saveText}>{textId ? 'Update' : 'Save'}</Text>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.form}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{type === 'literature' ? 'BOOK TITLE' : 'TITLE / TOPIC'}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                value={title}
                                onChangeText={setTitle}
                                placeholder={type === 'literature' ? "e.g. Life Changer" : "e.g. In Dependence"}
                                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>AUTHOR NAME (OPTIONAL)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                value={author}
                                onChangeText={setAuthor}
                                placeholder="Enter author's name"
                                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                value={category}
                                onChangeText={setCategory}
                                placeholder="e.g. Jamb Prose, African Prose"
                                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>BOOK COVER (THUMBNAIL)</Text>
                            <View style={styles.uploadContainer}>
                                <TouchableOpacity
                                    style={[styles.uploadBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                                    onPress={pickImage}
                                >
                                    <Ionicons name="image-outline" size={24} color={colors.primary} />
                                    <Text style={[styles.uploadBtnText, { color: colors.textSecondary }]}>
                                        {selectedFile ? selectedFile.name : (thumbnailUrl ? 'Change Cover' : 'Upload Cover')}
                                    </Text>
                                </TouchableOpacity>

                                {(selectedFile || thumbnailUrl) && (
                                    <View style={[styles.previewContainer, { borderColor: colors.border }]}>
                                        <Image
                                            source={{ uri: selectedFile ? selectedFile.uri : thumbnailUrl }}
                                            style={styles.previewImage}
                                            resizeMode="cover"
                                        />
                                        {uploading && (
                                            <View style={styles.uploadOverlay}>
                                                <ActivityIndicator size="small" color="#FFF" />
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>CONTENT / SUMMARY</Text>
                            <RichTextEditor
                                initialValue={content}
                                onChange={setContent}
                                isDark={isDark}
                                placeholder="Write or paste rich content here..."
                                height={350}
                            />
                        </View>
                    </View>

                    {/* Quiz Section */}
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 24 }]}>
                        <View style={styles.quizHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quiz Questions ({quiz.length})</Text>
                            <TouchableOpacity onPress={addQuizQuestion} style={styles.addBtn}>
                                <Ionicons name="add-circle" size={24} color={colors.primary} />
                                <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Question</Text>
                            </TouchableOpacity>
                        </View>

                        {quiz.map((q, qIndex) => (
                            <View key={q.id} style={[styles.questionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <View style={styles.qHeader}>
                                    <Text style={[styles.qLabel, { color: colors.text }]}>Question {qIndex + 1}</Text>
                                    <TouchableOpacity onPress={() => removeQuizQuestion(qIndex)}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginBottom: 12 }]}
                                    value={q.question}
                                    onChangeText={(v) => updateQuizQuestion(qIndex, 'question', v)}
                                    placeholder="Enter question..."
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                    multiline
                                />

                                <View style={styles.optionsGrid}>
                                    {['A', 'B', 'C', 'D'].map((opt, oIndex) => (
                                        <View key={opt} style={styles.optionRow}>
                                            <TouchableOpacity
                                                onPress={() => updateQuizQuestion(qIndex, 'correctAnswer', opt)}
                                                style={[
                                                    styles.radio,
                                                    q.correctAnswer === opt && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                            >
                                                {q.correctAnswer === opt && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                            </TouchableOpacity>
                                            <TextInput
                                                style={[styles.optionInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                                value={q.options[oIndex]}
                                                onChangeText={(v) => updateOption(qIndex, oIndex, v)}
                                                placeholder={`Option ${opt}`}
                                                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                            />
                                        </View>
                                    ))}
                                </View>

                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>EXPLANATION</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                    value={q.explanation}
                                    onChangeText={(v) => updateQuizQuestion(qIndex, 'explanation', v)}
                                    placeholder="Mandatory explanation..."
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                />
                            </View>
                        ))}
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
    headerInfo: { flex: 1, marginLeft: 16 },
    headerTitle: { fontSize: 20, fontWeight: '900' },
    saveHeaderBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, minWidth: 100, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', elevation: 4 },
    saveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
    form: { padding: 16 },
    card: { padding: 20, borderRadius: 24, borderWidth: 1, elevation: 2 },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 11, fontWeight: '900', marginBottom: 10, marginLeft: 4, letterSpacing: 1 },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 14,
        fontSize: 16,
        fontWeight: '600'
    },
    textAreaContainer: {
        borderWidth: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    textArea: {
        minHeight: 250,
        paddingHorizontal: 18,
        paddingVertical: 18,
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '500'
    },
    uploadContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    uploadBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 12,
        gap: 8,
    },
    uploadBtnText: { fontSize: 13, fontWeight: '600' },
    previewContainer: {
        width: 60,
        height: 80,
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative'
    },
    previewImage: { width: '100%', height: '100%' },
    uploadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    quizHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '900' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    addBtnText: { fontWeight: '800', fontSize: 14 },
    questionCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    qLabel: { fontWeight: '900', fontSize: 14 },
    optionsGrid: { gap: 12 },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    optionInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontWeight: '600' }
});
