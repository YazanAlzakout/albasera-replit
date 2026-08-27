import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { WatchedItem } from '@/services/watch-history-service';
import * as SecureStore from '@/utils/secure-store';

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error';

export interface DownloadItem extends WatchedItem {
    type: 'movie' | 'series';
    sourceUrl: string;
    localUri?: string;
    status: DownloadStatus;
    progress: number;
    totalBytes?: number;
    downloadedBytes?: number;
    resumeData?: string;
    error?: string;
    completedAt?: number;
}

export class DownloadServiceError extends Error {
    constructor(
        message: string,
        public readonly code: 'UNSUPPORTED' | 'INVALID_SOURCE' | 'STORAGE' | 'NETWORK',
    ) {
        super(message);
        this.name = 'DownloadServiceError';
    }
}

const DOWNLOADS_KEY = 'albasera_downloads_v1';
const DOWNLOAD_DIRECTORY = 'albasera-downloads';
const activeTasks = new Map<string, FileSystem.DownloadResumable>();
const generations = new Map<string, number>();
const itemLocks = new Map<string, Promise<void>>();
let cachedDownloads: DownloadItem[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let mutationQueue: Promise<void> = Promise.resolve();

function nextGeneration(id: string): number {
    const generation = (generations.get(id) ?? 0) + 1;
    generations.set(id, generation);
    return generation;
}

function isCurrentGeneration(id: string, generation: number): boolean {
    return generations.get(id) === generation;
}

async function withItemLock<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const previous = itemLocks.get(id) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const queued = previous.catch(() => undefined).then(() => gate);
    itemLocks.set(id, queued);
    await previous.catch(() => undefined);
    try {
        return await operation();
    } finally {
        release();
        if (itemLocks.get(id) === queued) itemLocks.delete(id);
    }
}

function serializeKey(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'media';
}

function extensionFor(item: Pick<DownloadItem, 'extension' | 'sourceUrl'>): string {
    const extension = (item.extension || '').toLowerCase().replace(/^\./, '');
    if (extension && /^[a-z0-9]{1,8}$/.test(extension)) return extension;
    try {
        const pathname = new URL(item.sourceUrl).pathname;
        const match = pathname.match(/\.([a-z0-9]{1,8})$/i);
        return match?.[1]?.toLowerCase() || 'mp4';
    } catch {
        return 'mp4';
    }
}

function isDirectMediaSource(item: Pick<DownloadItem, 'type' | 'sourceUrl' | 'extension'>): boolean {
    if (item.type !== 'movie' && item.type !== 'series') return false;
    const source = item.sourceUrl.toLowerCase();
    const extension = extensionFor(item);
    return !source.includes('.m3u8') && extension !== 'm3u8' && extension !== 'm3u';
}

async function persist(downloads: DownloadItem[]): Promise<void> {
    cachedDownloads = downloads;
    writeQueue = writeQueue
        .catch(() => undefined)
        .then(() => SecureStore.setItemAsync(DOWNLOADS_KEY, JSON.stringify(downloads)));
    await writeQueue;
}

async function load(): Promise<DownloadItem[]> {
    if (cachedDownloads) return cachedDownloads;
    try {
        const raw = await SecureStore.getItemAsync(DOWNLOADS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const downloads: DownloadItem[] = Array.isArray(parsed) ? parsed : [];
        const reconciled = downloads.map((item) => (
            item.status === 'downloading'
                ? { ...item, status: 'paused' as const, error: undefined }
                : item
        ));
        cachedDownloads = reconciled;
        if (reconciled.some((item, index) => item !== downloads[index])) {
            writeQueue = writeQueue
                .catch(() => undefined)
                .then(() => SecureStore.setItemAsync(DOWNLOADS_KEY, JSON.stringify(reconciled)));
        }
    } catch {
        cachedDownloads = [];
    }
    return cachedDownloads;
}

async function fileExists(uri?: string): Promise<boolean> {
    if (!uri || Platform.OS === 'web') return false;
    try {
        const result = await FileSystem.getInfoAsync(uri);
        return result.exists;
    } catch {
        return false;
    }
}

async function ensureDirectory(): Promise<string> {
    if (!FileSystem.documentDirectory) {
        throw new DownloadServiceError('Local storage is not available on this device.', 'STORAGE');
    }
    const directory = `${FileSystem.documentDirectory}${DOWNLOAD_DIRECTORY}/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true }).catch(() => undefined);
    return directory;
}

async function updateItem(
    id: string,
    patch: Partial<DownloadItem>,
    generation?: number,
): Promise<DownloadItem | undefined> {
    let updated: DownloadItem | undefined;
    const operation = mutationQueue
        .catch(() => undefined)
        .then(async () => {
            if (generation !== undefined && !isCurrentGeneration(id, generation)) return;
            const downloads = await load();
            const index = downloads.findIndex((item) => item.id === id);
            if (index < 0) return;
            updated = { ...downloads[index], ...patch };
            downloads[index] = updated;
            await persist([...downloads]);
        });
    mutationQueue = operation.then(() => undefined, () => undefined);
    await operation;
    return updated;
}

async function setItem(item: DownloadItem, generation?: number): Promise<DownloadItem | undefined> {
    let saved: DownloadItem | undefined;
    const operation = mutationQueue
        .catch(() => undefined)
        .then(async () => {
            if (generation !== undefined && !isCurrentGeneration(item.id, generation)) return;
            const downloads = await load();
            saved = item;
            await persist([...downloads.filter((download) => download.id !== item.id), item]);
        });
    mutationQueue = operation.then(() => undefined, () => undefined);
    await operation;
    return saved;
}

export async function getDownloads(): Promise<DownloadItem[]> {
    const downloads = await load();
    if (Platform.OS === 'web') return downloads;

    const valid: DownloadItem[] = [];
    let changed = false;
    for (const item of downloads) {
        if (item.status === 'completed' && !(await fileExists(item.localUri))) {
            valid.push({ ...item, status: 'error', error: 'The downloaded file is no longer available.', localUri: undefined });
            changed = true;
        } else {
            valid.push(item);
        }
    }
    if (changed) await persist(valid);
    return valid;
}

export async function getDownload(id: string): Promise<DownloadItem | undefined> {
    return (await getDownloads()).find((item) => item.id === id);
}

export function canDownload(item: Pick<DownloadItem, 'type' | 'sourceUrl' | 'extension'>): boolean {
    return Platform.OS !== 'web' && isDirectMediaSource(item);
}

export async function startDownload(
    input: Omit<DownloadItem, 'status' | 'progress' | 'timestamp'> & { timestamp?: number },
    onProgress?: (progress: number) => void,
): Promise<DownloadItem> {
    if (Platform.OS === 'web') {
        throw new DownloadServiceError('Offline downloads require the mobile or TV app.', 'UNSUPPORTED');
    }
    if (!isDirectMediaSource(input)) {
        throw new DownloadServiceError('This stream cannot be downloaded for offline playback.', 'UNSUPPORTED');
    }
    if (!input.sourceUrl.startsWith('http://') && !input.sourceUrl.startsWith('https://')) {
        throw new DownloadServiceError('The media URL is invalid.', 'INVALID_SOURCE');
    }

    const setup = await withItemLock(input.id, async () => {
        const downloads = await load();
        const existing = downloads.find((item) => item.id === input.id);
        if (existing?.status === 'completed' && await fileExists(existing.localUri)) {
            return { kind: 'existing' as const, item: existing };
        }
        if (activeTasks.has(input.id)) {
            return {
                kind: 'existing' as const,
                item: existing ?? ({ ...input, status: 'downloading', progress: 0, timestamp: Date.now() } as DownloadItem),
            };
        }

        const generation = nextGeneration(input.id);
        const directory = await ensureDirectory();
        const extension = extensionFor(input);
        const localUri = existing?.localUri || `${directory}${serializeKey(input.id)}.${extension}`;
        const item: DownloadItem = {
            ...input,
            type: input.type,
            timestamp: input.timestamp ?? Date.now(),
            localUri,
            status: 'downloading',
            progress: existing?.progress ?? 0,
            totalBytes: existing?.totalBytes,
            downloadedBytes: existing?.downloadedBytes,
            resumeData: existing?.resumeData,
            error: undefined,
        };

        await setItem(item, generation);
        onProgress?.(item.progress);

        let lastPersistedProgress = item.progress;
        const task = FileSystem.createDownloadResumable(
            input.sourceUrl,
            localUri,
            { sessionType: FileSystem.FileSystemSessionType.BACKGROUND },
            (progress) => {
                const total = progress.totalBytesExpectedToWrite;
                const current = progress.totalBytesWritten;
                const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;
                onProgress?.(percent);
                if (percent - lastPersistedProgress >= 2 || percent >= 100) {
                    lastPersistedProgress = percent;
                    void updateItem(input.id, {
                        status: 'downloading',
                        progress: percent,
                        totalBytes: total > 0 ? total : undefined,
                        downloadedBytes: current,
                    }, generation);
                }
            },
            existing?.resumeData,
        );
        activeTasks.set(input.id, task);
        return { kind: 'task' as const, item, task, generation };
    });

    if (setup.kind === 'existing') return setup.item;
    const { item, task, generation } = setup;

    try {
        const result = await task.downloadAsync();
        return await withItemLock(input.id, async () => {
            if (!isCurrentGeneration(input.id, generation)) {
                return (await getDownload(input.id)) ?? item;
            }
            if (!result?.uri) {
                const current = await getDownload(input.id);
                if (current?.status === 'paused') return current;
                throw new DownloadServiceError('The download did not return a local file.', 'NETWORK');
            }
            const completed = await updateItem(input.id, {
                localUri: result.uri,
                status: 'completed',
                progress: 100,
                resumeData: undefined,
                error: undefined,
                completedAt: Date.now(),
            }, generation);
            if (!completed) throw new DownloadServiceError('The download record could not be saved.', 'STORAGE');
            return completed;
        });
    } catch (error) {
        if (!isCurrentGeneration(input.id, generation)) {
            return (await getDownload(input.id)) ?? item;
        }
        const current = await getDownload(input.id);
        if (current?.status === 'paused') return current;
        const message = error instanceof Error ? error.message : 'Download failed.';
        await updateItem(input.id, { status: 'error', error: message }, generation);
        if (error instanceof DownloadServiceError) throw error;
        throw new DownloadServiceError(message, 'NETWORK');
    } finally {
        if (activeTasks.get(input.id) === task) activeTasks.delete(input.id);
    }
}

export async function pauseDownload(id: string): Promise<DownloadItem | undefined> {
    return withItemLock(id, async () => {
        const generation = nextGeneration(id);
        const task = activeTasks.get(id);
        if (!task) {
            const existing = await getDownload(id);
            if (existing?.status === 'downloading') {
                return updateItem(id, { status: 'paused', error: undefined }, generation);
            }
            return existing;
        }
        activeTasks.delete(id);
        const pauseState = await task.pauseAsync();
        return updateItem(id, {
            status: 'paused',
            resumeData: pauseState.resumeData,
            progress: pauseState.resumeData ? (await getDownload(id))?.progress ?? 0 : 0,
        }, generation);
    });
}

export async function deleteDownload(id: string): Promise<void> {
    await withItemLock(id, async () => {
        const generation = nextGeneration(id);
        const task = activeTasks.get(id);
        activeTasks.delete(id);
        if (task) await task.cancelAsync().catch(() => undefined);
        const existing = await getDownload(id);
        if (existing?.localUri && Platform.OS !== 'web') {
            await FileSystem.deleteAsync(existing.localUri, { idempotent: true }).catch(() => undefined);
        }
        const operation = mutationQueue
            .catch(() => undefined)
            .then(async () => {
                if (!isCurrentGeneration(id, generation)) return;
                await persist((await load()).filter((item) => item.id !== id));
            });
        mutationQueue = operation.then(() => undefined, () => undefined);
        await operation;
    });
}

export function getDownloadSource(item: Pick<DownloadItem, 'localUri' | 'sourceUrl' | 'status'>): string {
    return item.status === 'completed' && item.localUri ? item.localUri : item.sourceUrl;
}

export const downloadService = {
    getDownloads,
    getDownload,
    canDownload,
    startDownload,
    pauseDownload,
    deleteDownload,
    getDownloadSource,
};