import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StatusBar, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
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

type QuizQuestionDraft = {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
};

type SubheadingDraft = {
    id: string;
    title: string;
    content: string;
    localAudioFile?: any;
    audioUrl: string;
    quiz: QuizQuestionDraft[];
};

const createSubheadingDraft = (): SubheadingDraft => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    title: '',
    content: '',
    audioUrl: '',
    quiz: [],
});

const createQuizDraft = (): QuizQuestionDraft => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 'A',
    explanation: '',
});

export function AddJambTextView({ type, textId, onBack, onSave }: AddJambTextViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const formScrollRef = useRef<ScrollView>(null);

    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<any>(null);

    const [subheadings, setSubheadings] = useState<SubheadingDraft[]>([createSubheadingDraft()]);
    const [defaultSubheadingId, setDefaultSubheadingId] = useState(subheadings[0].id);
    const [deletedSubheadingIds, setDeletedSubheadingIds] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [isRecording, setIsRecording] = useState<string | null>(null); // Stores subheading ID being recorded
    const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
    const [keyboardExtraSpace, setKeyboardExtraSpace] = useState(false);

    useEffect(() => {
        if (textId) {
            loadText();
        }
    }, [textId]);

    const loadText = async () => {
        try {
            setFetching(true);
            const selectedText = await supabaseDB.getJambTextById(textId!);
            if (selectedText) {
                setTitle(selectedText.title);
                setAuthor(selectedText.author || '');
                setCategory(selectedText.category || '');
                setThumbnailUrl(selectedText.thumbnail_url || '');

                // Fetch all database rows that share this book's title
                const allRows = await supabaseDB.getJambTexts(type);
                const bookRows = allRows
                    .filter((r: any) => r.title.trim().toLowerCase() === selectedText.title.trim().toLowerCase())
                    .sort((a: any, b: any) => {
                        if (a.is_default && !b.is_default) return -1;
                        if (!a.is_default && b.is_default) return 1;
                        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                    });

                if (bookRows.length > 0) {
                    const drafts = bookRows.map((r: any) => ({
                        id: r.id, // Maintain database row UUID
                        title: r.subheading || '',
                        content: r.content || '',
                        audioUrl: r.audio_url || '',
                        quiz: r.quiz ? (typeof r.quiz === 'string' ? JSON.parse(r.quiz) : r.quiz) : []
                    }));
                    setSubheadings(drafts);
                    const defaultRow = bookRows.find((r: any) => r.is_default);
                    setDefaultSubheadingId(defaultRow ? defaultRow.id : bookRows[0].id);
                } else {
                    // Fallback for books with no subheadings
                    setSubheadings([{
                        id: selectedText.id,
                        title: '',
                        content: selectedText.content || '',
                        audioUrl: selectedText.audio_url || '',
                        quiz: selectedText.quiz ? (typeof selectedText.quiz === 'string' ? JSON.parse(selectedText.quiz) : selectedText.quiz) : []
                    }]);
                    setDefaultSubheadingId(selectedText.id);
                }
            }
        } catch (error) {
            Alert.alert("Error", "Failed to load text details");
        } finally {
            setFetching(false);
        }
    };

    const startRecording = async (subheadingId: string) => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission Denied', 'Please allow microphone access to record voice notes.');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            
            setRecordingInstance(recording);
            setIsRecording(subheadingId);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Could not start recording');
        }
    };

    const stopRecording = async (index: number) => {
        if (!recordingInstance) return;
        
        try {
            setIsRecording(null);
            await recordingInstance.stopAndUnloadAsync();
            const uri = recordingInstance.getURI();
            setRecordingInstance(null);

            if (uri) {
                updateSubheading(index, 'localAudioFile', {
                    uri,
                    name: `recording_${Date.now()}.m4a`,
                    mimeType: 'audio/m4a'
                });
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
    };

    const pickAudio = async (index: number) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                updateSubheading(index, 'localAudioFile', {
                    uri: asset.uri,
                    name: asset.name,
                    mimeType: asset.mimeType
                });
            }
        } catch (err) {
            console.error('Error picking audio', err);
        }
    };

    const playAudio = async (draft: SubheadingDraft) => {
        try {
            const uri = draft.localAudioFile?.uri || draft.audioUrl;
            if (!uri) return;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

            const { sound } = await Audio.Sound.createAsync({ uri });
            await sound.playAsync();
        } catch (err) {
            Alert.alert('Error', 'Could not play audio');
        }
    };

    const removeAudio = (index: number) => {
        Alert.alert(
            "Remove Audio",
            "Are you sure you want to remove this voice note?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => {
                    updateSubheading(index, 'audioUrl', '');
                    updateSubheading(index, 'localAudioFile', null);
                }}
            ]
        );
    };

    const pickImage = async () => {
        try {
            // Request permission first (required on iOS)
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to your photo library to upload a cover image.');
                return;
            }

            // Use ImagePicker instead of DocumentPicker to avoid Android Activity reload bug
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.85,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                // Normalise to the same shape the rest of the code expects
                setSelectedFile({
                    uri: asset.uri,
                    name: asset.fileName || `cover_${Date.now()}.jpg`,
                    mimeType: asset.mimeType || 'image/jpeg',
                });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const updateSubheading = (index: number, field: keyof Omit<SubheadingDraft, 'quiz'>, value: any) => {
        setSubheadings((items) => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const addSubheading = () => {
        const nextSub = createSubheadingDraft();
        setSubheadings((items) => [...items, nextSub]);
    };

    const removeSubheading = (index: number) => {
        if (subheadings.length === 1) {
            Alert.alert('Validation', 'At least one subheading is required.');
            return;
        }
        const target = subheadings[index];
        // If it's a real database UUID, add to deleted list to delete from Supabase on save
        if (target.id.includes('-')) {
            setDeletedSubheadingIds((prev) => [...prev, target.id]);
        }
        const nextItems = subheadings.filter((_, i) => i !== index);
        setSubheadings(nextItems);
        if (defaultSubheadingId === target.id) {
            setDefaultSubheadingId(nextItems[0].id);
        }
    };

    const addQuizQuestion = (subheadingIndex: number) => {
        setSubheadings((items) => items.map((item, i) =>
            i === subheadingIndex ? { ...item, quiz: [...item.quiz, createQuizDraft()] } : item
        ));
    };

    const updateQuizQuestion = (subheadingIndex: number, qIndex: number, field: string, value: any) => {
        setSubheadings((items) => items.map((item, i) => {
            if (i !== subheadingIndex) return item;
            const newQuiz = item.quiz.map((q, qi) => qi === qIndex ? { ...q, [field]: value } : q);
            return { ...item, quiz: newQuiz };
        }));
    };

    const updateOption = (subheadingIndex: number, qIndex: number, oIndex: number, value: string) => {
        setSubheadings((items) => items.map((item, i) => {
            if (i !== subheadingIndex) return item;
            const newQuiz = item.quiz.map((q, qi) => {
                if (qi !== qIndex) return q;
                const options = [...q.options];
                options[oIndex] = value;
                return { ...q, options };
            });
            return { ...item, quiz: newQuiz };
        }));
    };

    const removeQuizQuestion = (subheadingIndex: number, qIndex: number) => {
        setSubheadings((items) => items.map((item, i) => {
            if (i !== subheadingIndex) return item;
            return { ...item, quiz: item.quiz.filter((_, qi) => qi !== qIndex) };
        }));
    };

    const handleExplanationFocus = () => {
        setKeyboardExtraSpace(true);
        setTimeout(() => {
            formScrollRef.current?.scrollToEnd({ animated: true });
        }, 180);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Validation Error", "Title is required");
            return;
        }

        const cleanSubheadings = subheadings.map((item) => ({
            ...item,
            title: item.title.trim(),
            content: item.content.trim(),
        }));

        if (cleanSubheadings.some((item) => !item.content)) {
            Alert.alert("Validation Error", "Content is required for each chapter/subheading.");
            return;
        }

        try {
            setLoading(true);
            let currentThumbnail = thumbnailUrl;

            // 1. Maintain cover image uploading perfectly
            if (selectedFile) {
                setUploading(true);
                const uploadRes = await supabaseDB.uploadBookCover(selectedFile);
                currentThumbnail = uploadRes.publicUrl;
                setUploading(false);
            }

            const cleanTitle = title.trim();
            const cleanAuthor = author.trim();
            const cleanCategory = category.trim();

            // 2. Perform deletions of removed chapters
            if (deletedSubheadingIds.length > 0) {
                for (const delId of deletedSubheadingIds) {
                    await supabaseDB.deleteJambText(delId);
                }
                setDeletedSubheadingIds([]);
            }

            // 3. Loop through subheadings and save (inserts new ones, updates existing ones)
            for (const item of cleanSubheadings) {
                let finalAudioUrl = item.audioUrl;
                if (item.localAudioFile) {
                    const audioRes = await supabaseDB.uploadAudioFile(item.localAudioFile, 'jamb-texts');
                    finalAudioUrl = audioRes.publicUrl;
                }

                const textData = {
                    type,
                    title: cleanTitle,
                    author: cleanAuthor,
                    category: cleanCategory,
                    thumbnail_url: currentThumbnail,
                    content: item.content,
                    quiz: item.quiz,
                    subheading: item.title || null,
                    subheading_id: item.id.includes('-') ? null : item.id, // Only send custom subheading_id if it's a new draft ID
                    is_default: item.id === defaultSubheadingId,
                    audio_url: finalAudioUrl || null
                };

                if (item.id.includes('-')) {
                    // It is a real Supabase UUID row, update it
                    await supabaseDB.updateJambText(item.id, textData);
                } else {
                    // It is a new subheading row, insert it
                    await supabaseDB.addJambText(
                        type,
                        cleanTitle,
                        item.content,
                        cleanAuthor,
                        item.quiz.length > 0 ? item.quiz : undefined,
                        cleanCategory,
                        currentThumbnail,
                        {
                            subheading_id: item.id,
                            subheading: item.title || undefined,
                            is_default: item.id === defaultSubheadingId,
                            audio_url: finalAudioUrl || undefined
                        }
                    );
                }
            }

            Alert.alert("Success", `${cleanSubheadings.length} outline sections saved successfully!`);
            onSave();
        } catch (error) {
            Alert.alert("Error", "Failed to save material");
            console.error(error);
        } finally {
            setLoading(false);
            setUploading(false);
        }
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
                    ref={formScrollRef}
                    contentContainerStyle={[styles.form, keyboardExtraSpace && styles.formKeyboardExtra]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Cover Photo and Book Info Card */}
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

                        {/* Maintain book cover uploading capabilities */}
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
                    </View>

                    {/* Subheading outline section */}
                    <View style={styles.subheadingHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Chapters & Outlines ({subheadings.length})</Text>
                        <TouchableOpacity onPress={addSubheading} style={styles.addBtn}>
                            <Ionicons name="add-circle" size={24} color={colors.primary} />
                            <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Chapter</Text>
                        </TouchableOpacity>
                    </View>

                    {subheadings.map((item, subheadingIndex) => (
                        <View key={item.id} style={[styles.subtopicCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.subtopicCardHeader}>
                                <Text style={[styles.subtopicTitle, { color: colors.text }]}>Chapter {subheadingIndex + 1}</Text>
                                <View style={styles.subtopicActions}>
                                    <TouchableOpacity
                                        style={[styles.defaultBtn, item.id === defaultSubheadingId && styles.defaultBtnActive]}
                                        onPress={() => setDefaultSubheadingId(item.id)}
                                    >
                                        <Ionicons name={item.id === defaultSubheadingId ? 'star' : 'star-outline'} size={15} color={item.id === defaultSubheadingId ? '#FFFFFF' : '#864b03'} />
                                        <Text style={[styles.defaultBtnText, item.id === defaultSubheadingId && styles.defaultBtnTextActive]}>Show first</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeSubheading(subheadingIndex)}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>SUBHEADING TITLE (CHAPTER)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    value={item.title}
                                    onChangeText={(value) => updateSubheading(subheadingIndex, 'title', value)}
                                    placeholder="e.g. Chapter One: The Meeting"
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>VOICE NOTE / EXPLANATION</Text>
                                <View style={[styles.audioContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    {(item.audioUrl || item.localAudioFile) ? (
                                        <View style={styles.audioPlayerRow}>
                                            <TouchableOpacity 
                                                style={[styles.audioActionBtn, { backgroundColor: colors.primary }]}
                                                onPress={() => playAudio(item)}
                                            >
                                                <Ionicons name="play" size={20} color="#FFF" />
                                                <Text style={styles.audioActionText}>{item.localAudioFile ? 'Preview' : 'Listen'}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.audioActionBtn, { backgroundColor: '#EF4444' }]}
                                                onPress={() => removeAudio(subheadingIndex)}
                                            >
                                                <Ionicons name="trash" size={20} color="#FFF" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={styles.audioControlsRow}>
                                            <>
                                                <TouchableOpacity 
                                                    style={[styles.audioBtn, isRecording === item.id && styles.audioBtnRecording]}
                                                    onPress={() => isRecording === item.id ? stopRecording(subheadingIndex) : startRecording(item.id)}
                                                >
                                                    <Ionicons name={isRecording === item.id ? "stop-circle" : "mic"} size={22} color={isRecording === item.id ? "#FFF" : colors.primary} />
                                                    <Text style={[styles.audioBtnText, isRecording === item.id && { color: '#FFF' }]}>
                                                        {isRecording === item.id ? "Recording..." : "Record"}
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.audioBtn} onPress={() => pickAudio(subheadingIndex)}>
                                                    <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
                                                    <Text style={styles.audioBtnText}>Upload File</Text>
                                                </TouchableOpacity>
                                            </>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>CHAPTER CONTENT</Text>
                                <RichTextEditor
                                    initialValue={item.content}
                                    onChange={(value) => updateSubheading(subheadingIndex, 'content', value)}
                                    placeholder="Paste or write chapter summaries and content summaries here..."
                                    isDark={false}
                                    height={320}
                                />
                            </View>

                            {/* Quiz questions builder for this subheading */}
                            <View style={[styles.topicQuizCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <View style={styles.quizHeader}>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Quiz Questions ({item.quiz.length})</Text>
                                    <TouchableOpacity onPress={() => addQuizQuestion(subheadingIndex)} style={styles.addBtn}>
                                        <Ionicons name="add-circle" size={24} color={colors.primary} />
                                        <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Question</Text>
                                    </TouchableOpacity>
                                </View>

                                {item.quiz.map((q, qIndex) => (
                                    <View key={q.id} style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <View style={styles.qHeader}>
                                            <Text style={[styles.qLabel, { color: colors.text }]}>Question {qIndex + 1}</Text>
                                            <TouchableOpacity onPress={() => removeQuizQuestion(subheadingIndex, qIndex)}>
                                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>

                                        <TextInput
                                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginBottom: 12 }]}
                                            value={q.question}
                                            onChangeText={(v) => updateQuizQuestion(subheadingIndex, qIndex, 'question', v)}
                                            placeholder="Enter question..."
                                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                            multiline
                                        />

                                        <View style={styles.optionsGrid}>
                                            {['A', 'B', 'C', 'D'].map((opt, oIndex) => (
                                                <View key={opt} style={styles.optionRow}>
                                                    <TouchableOpacity
                                                        onPress={() => updateQuizQuestion(subheadingIndex, qIndex, 'correctAnswer', opt)}
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
                                                        onChangeText={(v) => updateOption(subheadingIndex, qIndex, oIndex, v)}
                                                        placeholder={`Option ${opt}`}
                                                        placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                                    />
                                                </View>
                                            ))}
                                        </View>

                                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>EXPLANATION</Text>
                                        <TextInput
                                            style={[styles.input, styles.explanationInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                            value={q.explanation}
                                            onChangeText={(v) => updateQuizQuestion(subheadingIndex, qIndex, 'explanation', v)}
                                            onFocus={handleExplanationFocus}
                                            onBlur={() => setKeyboardExtraSpace(false)}
                                            placeholder="Mandatory explanation..."
                                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                            multiline
                                            textAlignVertical="top"
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}
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
        backgroundColor: '#FFFFFF',
        borderBottomColor: '#EFEBE9'
    },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
    headerInfo: { flex: 1, marginLeft: 16 },
    headerTitle: { fontSize: 20, fontWeight: '900' },
    saveHeaderBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, minWidth: 100, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', elevation: 4 },
    saveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
    form: { padding: 16 },
    formKeyboardExtra: { paddingBottom: 130 },
    card: { padding: 20, borderRadius: 24, borderWidth: 1, elevation: 2 },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 11, fontWeight: '900', marginBottom: 10, marginLeft: 4, letterSpacing: 1, color: '#864b03' },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 14,
        fontSize: 16,
        fontWeight: '600'
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
    subheadingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#000000' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    addBtnText: { color: '#864b03', fontWeight: '800', fontSize: 14 },
    subtopicCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 24,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    subtopicCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    subtopicTitle: { fontSize: 16, fontWeight: '900' },
    subtopicActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    defaultBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#D7CCC8',
        backgroundColor: '#FFF8F6'
    },
    defaultBtnActive: {
        backgroundColor: '#4E342E',
        borderColor: '#4E342E'
    },
    defaultBtnText: { color: '#864b03', fontSize: 11, fontWeight: '900' },
    defaultBtnTextActive: { color: '#FFFFFF' },
    audioContainer: { padding: 12, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
    audioControlsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    audioBtn: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 8, 
        paddingVertical: 10, 
        borderRadius: 12, 
        backgroundColor: 'rgba(134, 75, 3, 0.05)' 
    },
    audioBtnRecording: { backgroundColor: '#EF4444' },
    audioBtnText: { fontSize: 13, fontWeight: '700', color: '#864b03' },
    audioPlayerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    audioActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    audioActionText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    topicQuizCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 24,
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    quizHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    questionCard: {
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    qLabel: { fontWeight: '900', fontSize: 14, color: '#3E2723' },
    optionsGrid: { gap: 12 },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D7CCC8', alignItems: 'center', justifyContent: 'center' },
    optionInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        fontWeight: '600',
        backgroundColor: '#FFF8F6',
        borderColor: '#D7CCC8',
        color: '#3E2723'
    },
    explanationInput: {
        minHeight: 84,
        paddingTop: 12,
        paddingBottom: 12
    }
});
