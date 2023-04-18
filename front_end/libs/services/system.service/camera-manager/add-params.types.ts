type StringKeys = [
    'credentials',
    'DeviceUrl',
    'driverClass',
    'firmware',
    'motionStream',
    'streamFpsSharing',
    'supportedMotion',
    'defaultPreferredPtzPresetType',
][number];

export type ParsedAddParams = Omit<
    Partial<{
        bitrateInfos: BitrateInfos;
        // bitratePerGOP: number;
        // cameraCapabilities: number;
        // compatibleAnalyticsEngines: CompatibleAnalyticsEngines;
        mediaCapabilities: MediaCapabilities;
        // mediaStreams: MediaStreams;
        hasDualStreaming: boolean;
        isAudioSupported: boolean;
        // ptzCapabilities: number;
        overrideAr: number;
        rotation: number;
        // streamUrls: StreamUrls; // DANGER: JSON is not properly formatted!
        // trustCameraTime: boolean;
    }>,
    StringKeys // Actual strings should not be duplicated in parsed params
>;

/* Parsed JSON */
interface BitrateInfos {
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
    timestamp: Date;
}

// type CompatibleAnalyticsEngines = string[];

interface MediaCapabilities {
    hasAudio: boolean;
    hasDualStreaming: false;
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

// interface MediaStreams {
//     streams: MediaStream[];
// }
// interface MediaStream {
//     codec: number;
//     customStreamParams: Record<string, unknown>;
//     encoderIndex: number;
//     resolution: string;
//     transcodingRequired: boolean;
//     transports: string[];
// }

// interface StreamUrls {
//     1: string;
//     2: string;
// }
