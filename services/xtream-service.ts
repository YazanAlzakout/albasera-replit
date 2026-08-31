import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';

export interface XtreamUserInfo {
    username: string;
    status: string;
    exp_date: string;
    is_trial: string;
    active_cons: string;
    max_connections: string;
    allowed_output_formats: string[];
}

export interface XtreamServerInfo {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    rtmp_port: string;
    timezone: string;
    timestamp_now: number;
    time_now: string;
}

export interface XtreamAuthResponse {
    user_info: XtreamUserInfo;
    server_info: XtreamServerInfo;
}

export class XtreamServiceError extends Error {
    constructor(
        message: string,
        public readonly code: 'NOT_INITIALIZED' | 'INVALID_CONFIG' | 'NETWORK' | 'HTTP' | 'INVALID_RESPONSE' | 'ACCOUNT_INACTIVE',
        public readonly status?: number,
    ) {
        super(message);
        this.name = 'XtreamServiceError';
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function requireArray<T>(value: unknown, label: string): T[] {
    if (!Array.isArray(value)) {
        throw new XtreamServiceError(`The provider returned an invalid ${label} response.`, 'INVALID_RESPONSE');
    }
    return value as T[];
}

export interface XtreamCategory {
    category_id: string;
    category_name: string;
    parent_id: number;
}

export interface XtreamStream {
    num: number;
    name: string;
    stream_type: 'live' | 'movie' | 'series';
    stream_id: number;
    series_id?: number; // Added for Series support
    stream_icon: string;
    cover?: string; // Added for Series support
    added: string;
    category_id: string;
    container_extension?: string;
    rating?: string;
    rating_5_control?: number;
    releaseDate?: string;
    backdrop_path?: string[];
    youtube_trailer?: string;
    director?: string;
    actors?: string;
    cast?: string;
    description?: string;
    plot?: string;
    age?: string;
    mpaa_rating?: string;
    duration_secs?: number;
    duration?: string;
    bitrate?: number;
}

class XtreamService {
    private axiosInstance: AxiosInstance | null = null;
    private baseUrl: string = '';
    private credentials = { username: '', password: '' };
    private apiPath: string = 'player_api.php';
    private streamCache = new Map<string, { expiresAt: number; request: Promise<XtreamStream[]> }>();
    private infoCache = new Map<string, { expiresAt: number; request: Promise<any> }>();
    private categoryCache = new Map<string, { expiresAt: number; request: Promise<XtreamCategory[]> }>();

    initialize(url: string, username: string, password: string, options?: { apiPath?: string }) {
        // Ensure url has protocol and no trailing slash
        let cleanUrl = url.trim().endsWith('/') ? url.trim().slice(0, -1) : url.trim();
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = `http://${cleanUrl}`;
        }
        try {
            const parsed = new URL(cleanUrl);
            if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error();
        } catch {
            throw new XtreamServiceError('Enter a valid provider server URL.', 'INVALID_CONFIG');
        }
        if (!username.trim() || !password.trim()) {
            throw new XtreamServiceError('Username and password are required.', 'INVALID_CONFIG');
        }

        this.baseUrl = cleanUrl;
        this.credentials = { username, password };
        this.apiPath = options?.apiPath ?? 'player_api.php';
        this.streamCache.clear();
        this.infoCache.clear();
        this.categoryCache.clear();

        const isWeb = Platform.OS === 'web';
        const headers: Record<string, string> = {
            'Accept': '*/*',
        };
        if (!isWeb) {
            // Browsers block overriding User-Agent; keep it only for native platforms.
            headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        }

        this.axiosInstance = axios.create({
            baseURL: `${this.baseUrl}/${this.apiPath}`,
            params: {
                username,
                password,
            },
            headers,
            timeout: 20000,
        });
    }

    async authenticate(): Promise<XtreamAuthResponse> {
        if (!this.axiosInstance) throw new XtreamServiceError('Xtream service is not initialized.', 'NOT_INITIALIZED');
        try {
            const response = await this.axiosInstance.get<unknown>('');
            if (!isRecord(response.data) || !isRecord(response.data.user_info) || !isRecord(response.data.server_info)) {
                throw new XtreamServiceError('The provider returned an invalid login response.', 'INVALID_RESPONSE');
            }
            const status = String(response.data.user_info.status ?? '').toLowerCase();
            if (status !== 'active') {
                throw new XtreamServiceError(
                    status ? `This provider account is ${status}.` : 'This provider account is not active.',
                    'ACCOUNT_INACTIVE',
                );
            }
            return response.data as unknown as XtreamAuthResponse;
        } catch (error: unknown) {
            throw this.normalizeError(error, 'Unable to connect to the provider.');
        }
    }

    async getCategories(type: 'live' | 'movie' | 'series'): Promise<XtreamCategory[]> {
        const client = this.getClient();
        const action = type === 'live' ? 'get_live_categories' : type === 'movie' ? 'get_vod_categories' : 'get_series_categories';
        const cacheKey = type;
        const cached = this.categoryCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.request;
        }

        const request = client.get<unknown>('', { params: { action } })
            .then((response) => requireArray<XtreamCategory>(response.data, 'categories'))
            .catch((error: unknown) => {
                this.categoryCache.delete(cacheKey);
                throw this.normalizeError(error, 'Unable to load categories.');
            });
        this.categoryCache.set(cacheKey, { expiresAt: Date.now() + 60_000, request });
        return request;
    }

    async getStreams(type: 'live' | 'movie' | 'series', categoryId?: string): Promise<XtreamStream[]> {
        const client = this.getClient();
        const action = type === 'live' ? 'get_live_streams' : type === 'movie' ? 'get_vod_streams' : 'get_series';
        const params: Record<string, string> = { action };
        if (categoryId) params.category_id = categoryId;
        const cacheKey = `${type}:${categoryId ?? '*'}`;
        const cached = this.streamCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.request;
        }

        const request = client.get<unknown>('', { params })
            .then((response) => requireArray<XtreamStream>(response.data, 'streams'))
            .catch((error: unknown) => {
                this.streamCache.delete(cacheKey);
                throw this.normalizeError(error, 'Unable to load streams.');
            });
        this.streamCache.set(cacheKey, { expiresAt: Date.now() + 60_000, request });
        return request;
    }

    async getVodInfo(vodId: number): Promise<any> {
        const client = this.getClient();
        const cacheKey = `vod:${vodId}`;
        const cached = this.infoCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.request;
        }

        const request = client.get<unknown>('', { params: { action: 'get_vod_info', vod_id: vodId } })
            .then((response) => response.data)
            .catch((error: unknown) => {
                this.infoCache.delete(cacheKey);
                throw this.normalizeError(error, 'Unable to load movie details.');
            });
        this.infoCache.set(cacheKey, { expiresAt: Date.now() + 60_000, request });
        return request;
    }

    async getSeriesInfo(seriesId: number): Promise<any> {
        const client = this.getClient();
        const cacheKey = `series:${seriesId}`;
        const cached = this.infoCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.request;
        }

        const request = client.get<unknown>('', { params: { action: 'get_series_info', series_id: seriesId } })
            .then((response) => response.data)
            .catch((error: unknown) => {
                this.infoCache.delete(cacheKey);
                throw this.normalizeError(error, 'Unable to load series details.');
            });
        this.infoCache.set(cacheKey, { expiresAt: Date.now() + 60_000, request });
        return request;
    }

    getStreamUrl(streamId: number, extension: string = '', type: 'live' | 'movie' | 'series' = 'live'): string {
        const { username, password } = this.credentials;

        if (type === 'live') {
            const ext = extension || 'm3u8';
            if (ext === 'm3u8') {
                return `${this.baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
            } else if (ext === 'ts') {
                return `${this.baseUrl}/${username}/${password}/${streamId}.ts`;
            } else {
                return `${this.baseUrl}/${username}/${password}/${streamId}`;
            }
        }

        const path = type === 'movie' ? 'movie/' : 'series/';
        return `${this.baseUrl}/${path}${username}/${password}/${streamId}.${extension || 'mp4'}`;
    }

    /**
     * Returns a prioritised list of live-stream URLs to try.
     * Covers ALL common Xtream panel URL patterns in priority order:
     *  1. HLS  (.m3u8) with    /live/ prefix  — preferred for broad audio compatibility
     *  2. TS   (.ts)   with    /live/ prefix  — most Xtream panels
     *  3. TS   (.ts)   without /live/ prefix  — some older panels
     *  4. Raw  (no ext) with   /live/ prefix  — server auto-detects
     *  5. Raw  (no ext) without /live/ prefix — last resort
     */
    getLiveStreamFallbackUrls(streamId: number, preferredExtension: string = 'm3u8'): string[] {
        const { username, password } = this.credentials;
        const hls = `${this.baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
        const liveTs = `${this.baseUrl}/live/${username}/${password}/${streamId}.ts`;
        const legacyTs = `${this.baseUrl}/${username}/${password}/${streamId}.ts`;
        const raw = [
            `${this.baseUrl}/live/${username}/${password}/${streamId}`,
            `${this.baseUrl}/${username}/${password}/${streamId}`,
        ];
        const preferred = preferredExtension.trim().toLowerCase().replace(/^\./, '');
        return Array.from(new Set(
            preferred === 'ts'
                ? [liveTs, legacyTs, hls, ...raw]
                : [hls, liveTs, legacyTs, ...raw],
        ));
    }

    /**
     * Build a possible subtitle URL for VOD/Series (same path as stream, different extension).
     * Many panels do not expose this; use when your provider serves .vtt/.srt at this path.
     */
    getSubtitleUrl(streamId: number, type: 'movie' | 'series', format: 'vtt' | 'srt' = 'vtt', lang?: string): string {
        const { username, password } = this.credentials;
        const path = type === 'movie' ? 'movie/' : 'series/';
        const suffix = lang ? `${lang}.${format}` : format;
        return `${this.baseUrl}/${path}${username}/${password}/${streamId}.${suffix}`;
    }

    private getClient(): AxiosInstance {
        if (!this.axiosInstance) {
            throw new XtreamServiceError('Xtream service is not initialized.', 'NOT_INITIALIZED');
        }
        return this.axiosInstance;
    }

    private normalizeError(error: unknown, fallbackMessage: string): XtreamServiceError {
        if (error instanceof XtreamServiceError) return error;
        if (axios.isAxiosError(error)) {
            if (error.response) {
                return new XtreamServiceError(
                    error.response.status === 401 || error.response.status === 403
                        ? 'The provider rejected the username or password.'
                        : `The provider returned HTTP ${error.response.status}.`,
                    'HTTP',
                    error.response.status,
                );
            }
            return new XtreamServiceError(
                error.code === 'ECONNABORTED'
                    ? 'The provider connection timed out.'
                    : 'The provider server could not be reached.',
                'NETWORK',
            );
        }
        return new XtreamServiceError(
            error instanceof Error && error.message ? error.message : fallbackMessage,
            'INVALID_RESPONSE',
        );
    }
}

export const xtreamService = new XtreamService();
