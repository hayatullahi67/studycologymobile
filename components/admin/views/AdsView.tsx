import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';
import { AdBanner } from '../../AdBanner';

interface AdsViewProps {
    onBack?: () => void;
}

export function AdsView({ onBack }: AdsViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light theme for Solid Brown Professional
    const [viewMode, setViewMode] = useState<'create' | 'list'>('list');
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingAd, setEditingAd] = useState<any>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [buttonText, setButtonText] = useState('Learn More');
    const [placement, setPlacement] = useState('all');
    const [priority, setPriority] = useState('0');
    const [size, setSize] = useState<'medium' | 'large' | 'option' | 'square'>('medium');
    const [selectedImage, setSelectedImage] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (viewMode === 'list') {
                loadAds();
            }
        }, [viewMode])
    );

    const loadAds = async () => {
        try {
            setLoading(true);
            const data = await supabaseDB.getAllAds();
            setAds(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load ads');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
            });

            if (result.assets && result.assets.length > 0) {
                setSelectedImage(result.assets[0]);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert('Validation', 'Please enter title and description');
            return;
        }

        try {
            setUploading(true);

            let imageUrl = editingAd?.image_url || null;

            if (selectedImage) {
                const uploadResult = await supabaseDB.uploadAdImage(selectedImage);
                imageUrl = uploadResult.publicUrl;
            }

            const adData = {
                title: title.trim(),
                description: description.trim(),
                imageUrl,
                linkUrl: linkUrl.trim() || null,
                buttonText: buttonText.trim() || 'Learn More',
                placement,
                priority: parseInt(priority) || 0,
                size,
            };

            if (editingAd) {
                await supabaseDB.updateAd(editingAd.id, adData);
                Alert.alert('Success', 'Ad updated successfully!');
            } else {
                await supabaseDB.createAd(adData);
                Alert.alert('Success', 'Ad created successfully!');
            }

            resetForm();
            setViewMode('list');
            loadAds();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save ad');
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (ad: any) => {
        setEditingAd(ad);
        setTitle(ad.title);
        setDescription(ad.description);
        setLinkUrl(ad.link_url || '');
        setButtonText(ad.button_text || 'Learn More');
        setPlacement(ad.placement);
        setPriority(ad.priority.toString());
        setSize(ad.size || 'medium');
        setSelectedImage(null);
        setViewMode('create');
    };

    const handleDelete = (ad: any) => {
        Alert.alert(
            'Delete Ad',
            `Are you sure you want to delete "${ad.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabaseDB.deleteAd(ad.id);
                            Alert.alert('Success', 'Ad deleted');
                            loadAds();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete ad');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleStatus = async (ad: any) => {
        try {
            await supabaseDB.toggleAdStatus(ad.id, !ad.is_active);
            loadAds();
        } catch (error) {
            Alert.alert('Error', 'Failed to toggle status');
        }
    };

    const resetForm = () => {
        setEditingAd(null);
        setTitle('');
        setDescription('');
        setLinkUrl('');
        setButtonText('Learn More');
        setPlacement('all');
        setPriority('0');
        setSize('medium');
        setSelectedImage(null);
    };

    const getPriorityLabel = (val: number) => {
        if (val >= 3) return 'URGENT';
        if (val === 2) return 'HIGH';
        if (val === 1) return 'NORMAL';
        return 'LOW';
    };

    const renderAdItem = ({ item }: { item: any }) => (
        <View style={[styles.adCard, { backgroundColor: colors.surface, borderColor: '#D7CCC8' }]}>
            <View style={styles.adCardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.adTitle, { color: '#3E2723' }]}>{item.title}</Text>
                    <Text style={[styles.adMeta, { color: '#64748B' }]}>
                        {item.placement.toUpperCase()} • {getPriorityLabel(item.priority)}
                    </Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.is_active ? '#ECFDF5' : '#FEF2F2' }
                ]}>
                    <Text style={[styles.statusText, { color: item.is_active ? '#10B981' : '#EF4444' }]}>{item.is_active ? 'Active' : 'Inactive'}</Text>
                </View>
            </View>

            {item.image_url && (
                <Image source={{ uri: item.image_url }} style={styles.adImage} resizeMode="cover" />
            )}

            <Text style={[styles.adDescription, { color: '#64748B' }]} numberOfLines={2}>{item.description}</Text>

            <View style={[styles.adStats, { borderTopColor: '#EFEBE9' }]}>
                <View style={styles.statItem}>
                    <Ionicons name="eye-outline" size={16} color="#64748B" />
                    <Text style={[styles.statText, { color: '#64748B' }]}>{item.impressions || 0}</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="hand-left-outline" size={16} color="#64748B" />
                    <Text style={[styles.statText, { color: '#64748B' }]}>{item.clicks || 0}</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="calendar-outline" size={16} color="#64748B" />
                    <Text style={[styles.statText, { color: '#64748B' }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
            </View>

            <View style={styles.adActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                    <Ionicons name="create-outline" size={18} color="#864b03" />
                    <Text style={[styles.actionBtnText, { color: '#64748B' }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleStatus(item)}>
                    <Ionicons name={item.is_active ? "pause-outline" : "play-outline"} size={18} color="#F59E0B" />
                    <Text style={[styles.actionBtnText, { color: '#64748B' }]}>{item.is_active ? 'Pause' : 'Start'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#64748B' }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {onBack && (
                        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#000000" />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.headerTitle, { color: '#000000' }]}>Ads Management</Text>
                </View>
            </View>

            <View style={styles.toggleWrapper}>
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EFEBE9' }]}
                        onPress={() => { setViewMode('list'); resetForm(); }}
                    >
                        <Text style={[styles.toggleText, { color: viewMode === 'list' ? '#3E2723' : '#64748B' }]}>All Ads</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'create' && { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EFEBE9' }]}
                        onPress={() => setViewMode('create')}
                    >
                        <Text style={[styles.toggleText, { color: viewMode === 'create' ? '#3E2723' : '#64748B' }]}>
                            {editingAd ? 'Edit Ad' : 'New Ad'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {viewMode === 'create' ? (
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                >
                    <ScrollView
                        contentContainerStyle={styles.formContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Live Preview */}
                        <View style={styles.previewContainer}>
                            <Text style={[styles.label, { color: '#864b03', marginTop: 0 }]}>LIVE PREVIEW</Text>
                            <View pointerEvents="none" style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF', padding: 10, borderWidth: 1, borderColor: '#D7CCC8' }}>
                                <AdBanner
                                    placement="preview"
                                    shouldShowAd={true}
                                    size={size}
                                    mockAd={{
                                        title: title || 'Ad Title',
                                        description: description || 'Ad description will appear here...',
                                        image_url: selectedImage?.uri || editingAd?.image_url,
                                        button_text: buttonText,
                                        size: size
                                    }}
                                />
                            </View>
                        </View>

                        <View style={styles.formCard}>
                            <Text style={[styles.label, { color: '#864b03' }]}>TITLE</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. JAMB CBT 2026"
                                placeholderTextColor="#94A3B8"
                                value={title}
                                onChangeText={setTitle}
                            />

                            <Text style={[styles.label, { color: '#864b03' }]}>DESCRIPTION</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe your ad..."
                                placeholderTextColor="#94A3B8"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                            />

                            <Text style={[styles.label, { color: '#864b03' }]}>AD BANNER</Text>
                            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                                {selectedImage || editingAd?.image_url ? (
                                    <View style={{ width: '100%', height: 140 }}>
                                        <Image
                                            source={{ uri: selectedImage?.uri || editingAd?.image_url }}
                                            style={styles.previewImage}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.imageOverlay}>
                                            <Ionicons name="camera" size={24} color="#FFFFFF" />
                                            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Change Image</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <View style={[styles.iconBox, { backgroundColor: '#FFF8F6' }]}>
                                            <Ionicons name="image-outline" size={32} color="#864b03" />
                                        </View>
                                        <Text style={[styles.imagePickerText, { color: '#64748B' }]}>Tap to select image banner</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <Text style={[styles.label, { color: '#864b03' }]}>LINK URL</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://example.com"
                                placeholderTextColor="#94A3B8"
                                value={linkUrl}
                                onChangeText={setLinkUrl}
                                autoCapitalize="none"
                            />

                            <Text style={[styles.label, { color: '#864b03' }]}>BUTTON TEXT</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Learn More"
                                placeholderTextColor="#94A3B8"
                                value={buttonText}
                                onChangeText={setButtonText}
                            />

                            <Text style={[styles.label, { color: '#864b03' }]}>PLACEMENT</Text>
                            <View style={styles.placementGrid}>
                                {['all', 'exam', 'past_questions', 'notes', 'texts'].map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[
                                            styles.placementChip,
                                            { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' },
                                            placement === p && { backgroundColor: '#EFEBE9', borderColor: '#864b03' }
                                        ]}
                                        onPress={() => setPlacement(p)}
                                    >
                                        <Text style={[
                                            styles.placementChipText,
                                            { color: '#64748B' },
                                            placement === p && { color: '#864b03', fontWeight: '800' }
                                        ]}>
                                            {p.replace('_', ' ').toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.label, { color: '#864b03' }]}>PRIORITY</Text>
                            <View style={styles.placementGrid}>
                                {[
                                    { label: 'Low', val: '0', color: '#64748B' },
                                    { label: 'Normal', val: '1', color: '#10B981' },
                                    { label: 'High', val: '2', color: '#F59E0B' },
                                    { label: 'Urgent', val: '3', color: '#EF4444' }
                                ].map((p) => (
                                    <TouchableOpacity
                                        key={p.val}
                                        style={[
                                            styles.priorityChip,
                                            { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' },
                                            priority === p.val && { backgroundColor: `${p.color}10`, borderColor: p.color }
                                        ]}
                                        onPress={() => setPriority(p.val)}
                                    >
                                        <Text style={[
                                            styles.placementChipText,
                                            { color: '#64748B' },
                                            priority === p.val && { color: p.color, fontWeight: '800' }
                                        ]}>
                                            {p.label.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.label, { color: '#864b03' }]}>SIZE</Text>
                            <View style={styles.placementGrid}>
                                {
                                    [
                                        { value: 'medium', label: 'MEDIUM' },
                                        { value: 'option', label: 'OPTION' },
                                        { value: 'square', label: 'SQUARE' }
                                    ].map((s) => (
                                        <TouchableOpacity
                                            key={s.value}
                                            style={[
                                                styles.sizeChip,
                                                { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' },
                                                size === s.value && { backgroundColor: '#EFEBE9', borderColor: '#864b03' }
                                            ]}
                                            onPress={() => setSize(s.value as any)}
                                        >
                                            <Text style={[
                                                styles.placementChipText,
                                                { color: '#64748B' },
                                                size === s.value && { color: '#864b03', fontWeight: '800' }
                                            ]}>
                                                {s.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                            </View>
                            <Text style={[styles.label, { color: '#64748B', fontSize: 10, marginTop: 4 }]}>
                                Note: Medium ads appear in carousels. Option ads appear between choices. Square ads appear in results.
                            </Text>

                            <TouchableOpacity
                                style={[styles.submitBtn, { opacity: uploading ? 0.7 : 1 }]}
                                onPress={handleSubmit}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.submitBtnText}>
                                        {editingAd ? 'Update Advertisement' : 'Publish Advertisement'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {editingAd && (
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setViewMode('list'); }}>
                                    <Text style={[styles.cancelBtnText, { color: '#64748B' }]}>Discard Changes</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <View style={{ flex: 1 }}>
                    {loading ? (
                        <View style={styles.center}><ActivityIndicator size="large" color="#4E342E" /></View>
                    ) : ads.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="megaphone-outline" size={48} color="#CBD5E1" />
                            </View>
                            <Text style={[styles.emptyText, { color: '#000000' }]}>No advertisements active</Text>
                            <Text style={[styles.emptySub, { color: '#64748B' }]}>Create your first campaign to show ads to users</Text>
                            <TouchableOpacity style={styles.createBtn} onPress={() => setViewMode('create')}>
                                <Text style={styles.createBtnText}>Create Campaign</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={ads}
                            keyExtractor={(item) => item.id}
                            renderItem={renderAdItem}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        backgroundColor: '#FFFFFF',
        borderBottomColor: '#EFEBE9'
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#000000' },
    toggleWrapper: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    toggleContainer: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, backgroundColor: '#EFEBE9', borderColor: '#D7CCC8' },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    toggleText: { fontSize: 13, fontWeight: '800' },
    formContent: {
        padding: 20,
        paddingBottom: 40,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    formCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    label: { fontSize: 11, fontWeight: '900', marginBottom: 8, marginTop: 16, letterSpacing: 1, color: '#864b03' },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontWeight: '600',
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8',
        color: '#3E2723'
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    imagePickerBtn: { borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', padding: 20, alignItems: 'center', justifyContent: 'center', minHeight: 140, overflow: 'hidden', borderColor: '#D7CCC8' },
    iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    imagePickerText: { fontSize: 12, fontWeight: '700' },
    previewImage: { width: '100%', height: 140, borderRadius: 12 },
    imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', gap: 4 },
    placementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    placementChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    placementChipText: { fontSize: 10, fontWeight: '800' },
    priorityChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    sizeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, minWidth: 80, alignItems: 'center' },
    submitBtn: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 32,
        elevation: 2,
        backgroundColor: '#4E342E' // Deep Coffee
    },
    submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
    cancelBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 12 },
    cancelBtnText: { fontSize: 14, fontWeight: '700' },
    listContent: {
        padding: 20,
        paddingBottom: 100,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    adCard: {
        borderRadius: 28,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 2,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    adCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    adTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4, color: '#3E2723' },
    adMeta: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: '#64748B' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    adImage: { width: '100%', height: 120, borderRadius: 16, marginBottom: 16 },
    adDescription: { fontSize: 14, marginBottom: 16, lineHeight: 22, fontWeight: '600', color: '#64748B' },
    adStats: { flexDirection: 'row', gap: 16, marginBottom: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EFEBE9' },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
    adActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1, backgroundColor: '#FFF8F6', borderColor: '#D7CCC8' },
    actionBtnText: { fontSize: 12, fontWeight: '800' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, padding: 20 },
    iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EFEBE9' },
    emptyText: { fontSize: 18, fontWeight: '900', marginBottom: 8, color: '#000000' },
    emptySub: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20, color: '#64748B' },
    createBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, backgroundColor: '#4E342E' },
    createBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
    previewContainer: { marginBottom: 24 },
});
