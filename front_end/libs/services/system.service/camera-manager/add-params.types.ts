export type BoolNum = 0 | 1;

export type ParsedAddParams = Partial<{
    bitrateInfos: BitrateInfos;
    // bitratePerGOP: number;
    // cameraCapabilities: number;
    // compatibleAnalyticsEngines: CompatibleAnalyticsEngines;
    mediaCapabilities: MediaCapabilities;
    mediaStreams: MediaStreams;
    hasDualStreaming: BoolNum;
    ioSettings: IoSetting[];
    isAudioSupported: BoolNum;
    // ptzCapabilities: number;
    overrideAr: number;
    rotation: number;
    // streamUrls: StreamUrls; // DANGER: JSON is not properly formatted!
    // trustCameraTime: BoolNum;
}>;

// export type CamParameters = ParsedAddParams &
//     Partial<{
//         motionStream: string;
//         supportedMotion: string;
//         // Strings params which don't need parsing
//     }>;

/* Parsed JSON */
export interface BitrateInfos {
    streams: BitrateInfoStream[];
}
interface BitrateInfoStream {
    actualBitrate: number;
    actualFps: number;
    averageGopSize: number;
    bitrateFactor: number;
    bitratePerGop: boolean;
    encoderIndex: string;
    fps: number;
    isConfigured: boolean;
    numberOfChannels: number;
    rawSuggestedBitrate: number;
    resolution: string;
    suggestedBitrate: number;
    timestamp: string;
}

// type CompatibleAnalyticsEngines = string[];

export interface MediaCapabilities {
    hasAudio: boolean;
    hasDualStreaming: boolean;
    streamCapabilities: [
        { key: 'primary'; value: StreamCapability },
        { key: 'secondary'; value: StreamCapability },
    ];
}
interface StreamCapability {
    defaultBitrateKbps: number;
    defaultFps: number;
    maxBitrateKbps: number;
    maxFps: number;
    minBitrateKbps: number;
}

export interface MediaStreams {
    streams: MediaStream[];
}
interface MediaStream {
    codec: number;
    customStreamParams: Record<string, unknown>;
    encoderIndex: number;
    resolution: string;
    transcodingRequired: boolean;
    transports: string[];
}

export interface StreamUrls {
    1: string;
    2: string;
}

export interface IoSetting {
    autoResetTimeoutMs: number;
    iDefaultState: string;
    id: string;
    inputName: string;
    oDefaultState: string;
    outputName: string;
    portType: string;
    supportedPortTypes: string;
}
