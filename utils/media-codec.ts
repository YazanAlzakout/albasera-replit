export type AudioPlaybackDiagnostic = {
    status: 'missing' | 'unsupported';
    codec?: string;
};

export type NativeMediaContentType = 'hls' | 'progressive';

const MP2_PATTERN = /\bmp2\b|mpeg(?:[-_\s]?1)?[-_\s]?layer[-_\s]?2|audio\/mpeg-l2|audio\/mp2/i;
const MPEG_AUDIO_PATTERN = /audio\/mpeg|mime(?:type)?\s*=\s*audio\/mpeg/i;
const AUDIO_ERROR_PATTERN = /audio|audiotrack|audio renderer|codec|decoder/i;
const UNSUPPORTED_ERROR_PATTERN = /unsupported|not supported|no (?:suitable )?decoder|decoder (?:init|initialization|initialisation)?\s*failed|failed to (?:initialize|initialise|create) decoder|audio(?:sink|track).*init failed|error_code_decod(?:er|ing)|format[_\s]support(?:ed)?=no|exceeds capabilities/i;

/**
 * Raw Xtream live endpoints normally return MPEG-TS even when the URL has no
 * extension. Declaring them as progressive avoids relying on platform sniffing.
 */
export function getNativeMediaContentType(url: string, isLive: boolean): NativeMediaContentType | undefined {
    if (/\.m3u8(?:$|[?#])/i.test(url)) return 'hls';
    if (isLive || /\.ts(?:$|[?#])/i.test(url)) return 'progressive';
    return undefined;
}

function extractCodecLabel(message: string): string | undefined {
    if (MP2_PATTERN.test(message)) return 'MP2';
    if (/\be-?ac-?3\b|\bec-?3\b|\beac3\b/i.test(message)) return 'E-AC-3';
    if (/\bac-?3\b/i.test(message)) return 'AC-3';
    if (/\bopus\b/i.test(message)) return 'Opus';
    if (/\bvorbis\b/i.test(message)) return 'Vorbis';
    if (/\baac\b|\bmp4a(?:\.[\w.-]+)?\b/i.test(message)) return 'AAC';
    if (MPEG_AUDIO_PATTERN.test(message)) return 'MPEG Audio (MP2/MP3)';
    return undefined;
}

/**
 * Media3/ExoPlayer includes the rejected audio format in decoder errors. Keep
 * this parser intentionally conservative so network/video errors are not shown
 * as audio codec failures.
 */
export function diagnoseNativeAudioError(message?: string): AudioPlaybackDiagnostic | null {
    const normalized = message?.trim();
    if (!normalized || !AUDIO_ERROR_PATTERN.test(normalized)) {
        return null;
    }

    const codec = extractCodecLabel(normalized);
    const isDecoderFailure = UNSUPPORTED_ERROR_PATTERN.test(normalized)
        || (!!codec && /audio renderer error|decoder|audiosink|audiotrack/i.test(normalized));
    if (!isDecoderFailure) return null;

    return {
        status: 'unsupported',
        codec,
    };
}