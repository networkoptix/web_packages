import { PlaybackQuality, PlaybackTransport } from '@view/view.types';
import { ms, int } from '@vms-client/utils/type-aliases';

export type CAMERA_STATUS = 'Live' | 'Archive' | 'Recording' | 'Online' | 'Offline' | 'Unauthorized'

export interface ISimpleTimeRange {
    start: ms,
    end: ms,
    duration: ms,
    clone(): SimpleTimeRange,
    contains(r: SimpleTimeRange): boolean,
    isContained(r: SimpleTimeRange): boolean,
    isDisjointWith(r: SimpleTimeRange): boolean,
    overlapsWith(r: SimpleTimeRange): boolean,
}

export type IRecord = ISimpleTimeRange

export class SimpleTimeRange {
    constructor(
        // public start: ms,
        // public end: ms
        public readonly start: ms,
        public readonly end: ms
    ) {
    }

    public get duration (): ms {
        return this.end - this.start;
    }

    public clone (): SimpleTimeRange {
        return new SimpleTimeRange(this.start, this.end);
    }

    public static fromISTR(tr: ISimpleTimeRange): SimpleTimeRange {
        return new SimpleTimeRange(tr.start, tr.end);
    }

    public contains (r: SimpleTimeRange): boolean {
        return (this.start <= r.start && this.end >= r.end);
    }

    public isContained (r: SimpleTimeRange): boolean {
        return r.contains(this);
    }

    public isDisjointWith (r: SimpleTimeRange): boolean {
        return this.start > r.end || this.end < r.start;
    }

    public overlapsWith (r: SimpleTimeRange): boolean {
        return !this.isDisjointWith(r);
    }
}

export type CameraArchive = Array<IRecord>

export interface AvailableTransportsAndResolutions {
    [s: string]: Array<PlaybackQuality>, // means: [s: PlaybackTransport]
}

export interface ICamera {
    id: string,
    name: string,
    url: string,
    ip: string,
    status: CAMERA_STATUS,
    isVirtual: boolean,
    isOnline: boolean,
    isRecording: boolean,
    isLive: boolean,
    isAuthorized: boolean,
    isOffline: boolean,
    isUnauthorized: boolean,

    isScheduleEnabled: boolean,
    disableDualStreaming: boolean,

    hasArchive: boolean,
    archiveRange: ISimpleTimeRange,
    archive: CameraArchive,
    readonly archiveEnd: ms,

    thumbnailUrl: string,

    getVideoUrl: (transport: string, quality: string, t?: ms) => string,
    getPosterUrl(t?: ms, width?: number, height?: number),
    getRecords(startMs: ms, endMs: ms, minGapMs: ms): Array<IRecord>
    setRecords(range: ISimpleTimeRange, records: CameraArchive)

    rotation: int

    availableTransports: Array<PlaybackTransport>,
    availableTransportsAndResolutions: AvailableTransportsAndResolutions

    pushRecordedChunks (rs: CameraArchive)

    isThereRecord (t: ms)
    getNextRecord (t: ms): ISimpleTimeRange

    preferredServerId: string,
    parentServerId: string,
}

export default ICamera;
