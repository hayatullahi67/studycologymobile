// import NetInfo from '@react-native-community/netinfo';
// import * as supabaseDB from './supabaseDatabase';
// import * as localDB from './localDatabase';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as FileSystem from 'expo-file-system/legacy';

// const SYNC_COMPLETE_KEY = 'acecbt_sync_complete_v2';
// const LAST_SYNCED_ID_KEY = 'acecbt_last_synced_id_v2';

// export interface SyncStatus {
//     isSyncing: boolean;
//     progress: number;
//     error: string | null;
// }

// let currentStatus: SyncStatus = { isSyncing: false, progress: 0, error: null };
// let listeners: Array<(s: SyncStatus) => void> = [];

// const notify = () => listeners.forEach(l => l({ ...currentStatus }));

// export const subscribeToSyncStatus = (l: (s: SyncStatus) => void) => {
//     listeners.push(l);
//     l(currentStatus);
//     return () => { listeners = listeners.filter(x => x !== l); };
// };

// /**
//  * REWRITTEN SEQUENTIAL SYNC
//  * Fetches data in discrete steps to allow database to breathe.
//  * Now supports INCREMENTAL updates.
//  */
// export const startFullSync = async (force: boolean = false) => {
//     if (currentStatus.isSyncing) return;

//     const net = await NetInfo.fetch();
//     if (!net.isConnected) return;

//     try {
//         currentStatus = { ...currentStatus, isSyncing: true, progress: 0, error: null };
//         notify();

//         console.log('[SyncV2] Phase 1: Metadata Refresh...');

//         // Ensure connection
//         await localDB.initLocalDatabase();

//         // 1. Metadata sequential steps
//         const metadataSteps = [
//             { name: 'Exams', fn: async () => localDB.saveExams(await supabaseDB.getExams()), weight: 0.1 },
//             { name: 'Years', fn: async () => localDB.saveExamYears(await supabaseDB.getAllExamYears()), weight: 0.1 },
//             { name: 'Subjects', fn: async () => localDB.saveSubjects(await supabaseDB.getAllSubjectsSync()), weight: 0.1 },
//             {
//                 name: 'Jamb Texts', fn: async () => {
//                     const lit = await supabaseDB.getJambTexts('literature');
//                     const eng = await supabaseDB.getJambTexts('english');
//                     await localDB.saveJambTexts([...lit, ...eng]);
//                 }, weight: 0.1
//             },
//             { name: 'Notes', fn: async () => localDB.saveNotes(await supabaseDB.getNotes()), weight: 0.05 },
//             { name: 'PDFs', fn: async () => localDB.savePdfResources(await supabaseDB.getAllPdfResources()), weight: 0.05 },
//         ];

//         let currentProgress = 0;
//         for (const step of metadataSteps) {
//             try {
//                 await step.fn();
//             } catch (stepErr) {
//                 console.warn(`[SyncV2] Step ${step.name} failed (non-critical):`, stepErr);
//             }
//             currentProgress += step.weight;
//             currentStatus.progress = Math.min(0.5, currentProgress);
//             notify();
//         }

//         // 1.5. PDF Content Sync (Background Download)
//         try {
//             console.log('[SyncV2] Phase 1.5: Syncing PDFs...');
//             const allPdfs = await localDB.getLocalPdfResources();
//             const dir = (FileSystem as any).documentDirectory + 'past_questions/';
//             const dirInfo = await FileSystem.getInfoAsync(dir);
//             if (!dirInfo.exists) {
//                 await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
//             }

//             const existingFiles = await FileSystem.readDirectoryAsync(dir);
//             const downloadedSet = new Set(existingFiles.map(f => f.replace('.pdf', '')));

//             // Filter to find missing PDFs
//             const missingPdfs = (allPdfs as any[]).filter(p => !downloadedSet.has(p.id.toString()));

//             if (missingPdfs.length > 0) {
//                 console.log(`[SyncV2] Found ${missingPdfs.length} missing PDFs. Downloading...`);
//                 let downloadedCount = 0;

//                 // Process in batches of 3 to avoid network congestion
//                 const BATCH_SIZE = 3;
//                 for (let i = 0; i < missingPdfs.length; i += BATCH_SIZE) {
//                     const batch = missingPdfs.slice(i, i + BATCH_SIZE);
//                     await Promise.all(batch.map(async (pdf) => {
//                         try {
//                             await FileSystem.downloadAsync(pdf.file_url, dir + pdf.id + '.pdf');
//                         } catch (e) {
//                             console.warn(`[SyncV2] Failed to download PDF ${pdf.id}`, e);
//                         }
//                     }));
//                     downloadedCount += batch.length;
//                     // Update progress slightly within the 0.5 range (don't overflow)
//                     // keeping it simple, just log for now or maybe minor increment? 
//                     // Users prefer "Syncing Questions" so we won't block main progress too long.
//                 }
//             }
//         } catch (e) {
//             console.warn('[SyncV2] PDF Sync failed:', e);
//         }

//         // 2. Question sync (Incremental & Fault Tolerant)
//         console.log('[SyncV2] Phase 2: Incremental Question Batching...');

//         // Determine lastSyncedId
//         const dbMaxId = await localDB.getMaxQuestionId();
//         let lastSyncedId = await AsyncStorage.getItem(LAST_SYNCED_ID_KEY);

//         // CRITICAL FIX: If database is actually empty, ignore AsyncStorage and start from beginning
//         if (!dbMaxId) {
//             console.log('[SyncV2] Local questions empty. Resetting sync pointer.');
//             lastSyncedId = null;
//         } else if (force) {
//             // If forcing, use what's in DB as the starting point for incremental
//             lastSyncedId = dbMaxId;
//         }

//         let totalNew = 0;
//         let batchCount = 0;

//         while (true) {
//             const batch: any[] = await supabaseDB.getAllQuestionsSync(lastSyncedId || undefined);
//             if (!batch || batch.length === 0) break;

//             await localDB.saveQuestions(batch);
//             totalNew += batch.length;
//             batchCount++;
//             lastSyncedId = batch[batch.length - 1].id;

//             // Save progress of ID tracker periodically to avoid losing too much work on crash
//             await AsyncStorage.setItem(LAST_SYNCED_ID_KEY, lastSyncedId || "");

//             // Linear progress for questions phase (0.5 to 0.98)
//             // We cap it so it stays at 0.98 until we're absolutely done
//             currentStatus.progress = Math.min(0.98, 0.5 + (batchCount * 0.05));
//             notify();
//             console.log(`[SyncV2] New Questions Batch: +${batch.length}. Total New: ${totalNew}`);
//         }

//         // 3. Cleanup & Success
//         await AsyncStorage.setItem(SYNC_COMPLETE_KEY, 'true');
//         await AsyncStorage.setItem(LAST_SYNCED_ID_KEY, lastSyncedId || "");

//         currentStatus = { isSyncing: false, progress: 1, error: null };
//         notify();
//         console.log('[SyncV2] Sync Complete. Total new content found:', totalNew);
//         await localDB.getLocalDatabaseStats();

//     } catch (e: any) {
//         console.error('[SyncV2] Critical Failure:', e);
//         currentStatus = { ...currentStatus, isSyncing: false, error: e.message };
//         notify();
//     }
// };

// export const isInitialSyncComplete = async () => {
//     return (await AsyncStorage.getItem(SYNC_COMPLETE_KEY)) === 'true';
// };

// export const resetSyncTracker = async () => {
//     await AsyncStorage.removeItem(SYNC_COMPLETE_KEY);
//     currentStatus = { isSyncing: false, progress: 0, error: null };
//     notify();
// };

import NetInfo from '@react-native-community/netinfo';
import * as supabaseDB from './supabaseDatabase';
import * as localDB from './localDatabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const SYNC_COMPLETE_KEY = 'acecbt_sync_complete_v2';
const LAST_SYNCED_ID_KEY = 'acecbt_last_synced_id_v2';

export interface SyncStatus {
    isSyncing: boolean;
    progress: number;
    error: string | null;
}

let currentStatus: SyncStatus = { isSyncing: false, progress: 0, error: null };
let listeners: Array<(s: SyncStatus) => void> = [];

const notify = () => listeners.forEach(l => l({ ...currentStatus }));

export const subscribeToSyncStatus = (l: (s: SyncStatus) => void) => {
    listeners.push(l);
    l(currentStatus);
    return () => { listeners = listeners.filter(x => x !== l); };
};

/**
 * Standalone Jamb Texts sync — exported so screens can call it directly.
 * Returns counts fetched from Supabase so callers can log/display results.
 */
export const syncJambTexts = async (): Promise<{ lit: number; eng: number }> => {
    console.log('[Sync] syncJambTexts: starting...');
    const [lit, eng] = await Promise.all([
        supabaseDB.getJambTexts('literature'),
        supabaseDB.getJambTexts('english'),
    ]);
    console.log(`[Sync] syncJambTexts: fetched lit=${lit.length} eng=${eng.length}`);
    if (lit.length > 0 || eng.length > 0) {
        await localDB.saveJambTexts([...lit, ...eng]);
        console.log(`[Sync] syncJambTexts: saved ${lit.length + eng.length} rows to local DB ✅`);
    } else {
        console.warn('[Sync] syncJambTexts: Supabase returned 0 rows — table may be empty on server');
    }
    return { lit: lit.length, eng: eng.length };
};

export const startFullSync = async (force: boolean = false) => {
    if (currentStatus.isSyncing) return;

    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    try {
        currentStatus = { ...currentStatus, isSyncing: true, progress: 0, error: null };
        notify();

        console.log('[SyncV2] Phase 1: Metadata Refresh...');
        await localDB.initLocalDatabase();

        const metadataSteps = [
            { name: 'Exams',      fn: async () => localDB.saveExams(await supabaseDB.getExams()),                weight: 0.1 },
            { name: 'Years',      fn: async () => localDB.saveExamYears(await supabaseDB.getAllExamYears()),      weight: 0.1 },
            { name: 'Subjects',   fn: async () => localDB.saveSubjects(await supabaseDB.getAllSubjectsSync()),    weight: 0.1 },
            { name: 'JambTexts',  fn: async () => { await syncJambTexts(); },                                    weight: 0.1 },
            { name: 'Notes',      fn: async () => localDB.saveNotes(await supabaseDB.getNotes()),                weight: 0.05 },
            { name: 'PDFs',       fn: async () => localDB.savePdfResources(await supabaseDB.getAllPdfResources()), weight: 0.05 },
        ];

        let currentProgress = 0;
        for (const step of metadataSteps) {
            try {
                await step.fn();
                console.log(`[SyncV2] ✅ ${step.name} done`);
            } catch (stepErr) {
                // Log the FULL error so we can see what actually went wrong
                console.error(`[SyncV2] ❌ Step "${step.name}" failed:`, stepErr);
            }
            currentProgress += step.weight;
            currentStatus.progress = Math.min(0.5, currentProgress);
            notify();
        }

        // PDF file downloads
        try {
            const allPdfs = await localDB.getLocalPdfResources();
            const dir = (FileSystem as any).documentDirectory + 'past_questions/';
            const dirInfo = await FileSystem.getInfoAsync(dir);
            if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

            const existingFiles = await FileSystem.readDirectoryAsync(dir);
            const downloadedSet = new Set(existingFiles.map(f => f.replace('.pdf', '')));
            const missingPdfs = (allPdfs as any[]).filter(p => !downloadedSet.has(p.id.toString()));

            const BATCH_SIZE = 3;
            for (let i = 0; i < missingPdfs.length; i += BATCH_SIZE) {
                await Promise.all(missingPdfs.slice(i, i + BATCH_SIZE).map(async (pdf) => {
                    try { await FileSystem.downloadAsync(pdf.file_url, dir + pdf.id + '.pdf'); }
                    catch (e) { console.warn(`[SyncV2] PDF download failed ${pdf.id}`, e); }
                }));
            }
        } catch (e) {
            console.warn('[SyncV2] PDF Sync failed:', e);
        }

        // Incremental question sync
        console.log('[SyncV2] Phase 2: Questions...');
        const dbMaxId = await localDB.getMaxQuestionId();
        let lastSyncedId = await AsyncStorage.getItem(LAST_SYNCED_ID_KEY);
        if (!dbMaxId) { lastSyncedId = null; }
        else if (force) { lastSyncedId = dbMaxId; }

        let totalNew = 0;
        let batchCount = 0;
        while (true) {
            const batch: any[] = await supabaseDB.getAllQuestionsSync(lastSyncedId || undefined);
            if (!batch || batch.length === 0) break;
            await localDB.saveQuestions(batch);
            totalNew += batch.length;
            batchCount++;
            lastSyncedId = batch[batch.length - 1].id;
            await AsyncStorage.setItem(LAST_SYNCED_ID_KEY, lastSyncedId || '');
            currentStatus.progress = Math.min(0.98, 0.5 + batchCount * 0.05);
            notify();
        }

        await AsyncStorage.setItem(SYNC_COMPLETE_KEY, 'true');
        currentStatus = { isSyncing: false, progress: 1, error: null };
        notify();
        console.log('[SyncV2] ✅ Sync Complete. New questions:', totalNew);

    } catch (e: any) {
        console.error('[SyncV2] Critical Failure:', e);
        currentStatus = { ...currentStatus, isSyncing: false, error: e.message };
        notify();
    }
};

export const isInitialSyncComplete = async () =>
    (await AsyncStorage.getItem(SYNC_COMPLETE_KEY)) === 'true';

export const resetSyncTracker = async () => {
    await AsyncStorage.removeItem(SYNC_COMPLETE_KEY);
    currentStatus = { isSyncing: false, progress: 0, error: null };
    notify();
};