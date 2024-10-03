import { Observable } from 'rxjs';

import type { MediaStream } from '@services/system.service/camera-manager/add-params.types';
import { int, ms } from '@view/datatypes/type-aliases';
import { PlaybackTransport } from '@view/view.types';

import { BirdViewTree } from './BirdViewTree';
import type { BaseTimeRange } from './TimeRange';

export type CAMERA_STATUS =
    | 'Live'
    | 'Archive'
    | 'Recording'
    | 'Online'
    | 'Offline'
    | 'Unauthorized';

export interface Resolutions {
    high?: string;
    low?: string;
    '1080p'?: string;
    '720p'?: string;
    '480p'?: string;
    '360p'?: string;
}

export class ViewCamera {
    private birdViewTree: BirdViewTree;

    constructor(
        public id: string,
        public parentServerId: string,
        public preferredServerId: string,
        public name: string,
        public model: string,
        public url: string,
        public status: CAMERA_STATUS,
        public isScheduleEnabled: boolean,
        public disableDualStreaming: boolean,
        public archiveRange: BaseTimeRange,
        public archive: BaseTimeRange[] = [],
        public thumbnailUrl: Observable<string> | undefined = undefined,
        public getVideoUrl: (transport: string, quality: string, t?: ms) => string,
        public getPosterUrl: (t?: ms, width?: number, height?: number) => Observable<string>,
        public require2fa: boolean = false,
        public mediaStreams: MediaStream[],
        public rotation: int,
    ) {
        this.initBirdView();
    }

    get ip(): string {
        try {
            return this.url.split('/')[2].split(':')[0];
        } catch {
            return this.url;
        }
    }

    get availableTransportsAndResolutions(): Record<string, Resolutions> {
        return this.availableTransports.reduce<Record<string, Resolutions>>((acc, t) => {
            acc[t] = this.getAvailableResolutions(t);
            return acc;
        }, {});
    }

    get availableTransports(): PlaybackTransport[] {
        const isTransportSupported = (t: string): boolean => {
            if (this.require2fa) {
                return t === 'hls';
            }
            switch (t) {
                case 'hls':
                case 'webm':
                case 'mjpeg':
                case 'mp4':
                case 'rtsp':
                    return true;
                default:
                    return false;
            }
        };

        const result = new Set();
        this.mediaStreams
            // .filter(s => s.resolution !== '*')
            .map(s => s.transports.map(t => result.add(t)));
        return Array.from(result).filter(isTransportSupported) as Array<PlaybackTransport>;
    }

    private getAvailableResolutions(transport: PlaybackTransport): Resolutions {
        const result: Resolutions = {};
        const resolutions: string[] = [];
        const isHls = transport === 'hls';
        this.mediaStreams
            .filter(s => s.resolution !== '*')
            .map(s => s.transports.filter(t => t === transport) && resolutions.push(s.resolution));

        if (resolutions.length === 1) {
            result.high = isHls ? 'hi' : resolutions[0];
        } else {
            const high = resolutions
                .filter(r => {
                    return !this.resolutionIsLow(r);
                })
                .sort();
            if (high.length) {
                result.high = isHls ? 'hi' : high[high.length - 1];
            }
            const low = resolutions.filter(r => this.resolutionIsLow(r)).sort();
            if (!this.disableDualStreaming) {
                if (isHls) {
                    result.low = 'lo';
                } else if (low.length) {
                    result.low = low[0];
                } else {
                    result.low = high[0]; // If there is no low use the lowest high stream.
                }
            }
        }

        if (resolutions.length && transport !== 'hls') {
            const primaryResolutionHeight = parseInt((result.high || result.low).split('x')[1]);
            const defaultResolutions = {
                1080: '1920x1080',
                720: '1280x720',
                480: '854x480',
                360: '640x360',
            };
            [1080, 720, 480, 360].forEach(yResolution => {
                if (primaryResolutionHeight >= yResolution) {
                    result[`${yResolution}p`] = defaultResolutions[yResolution];
                }
            });
        }
        return result;
    }

    private resolutionIsLow(s: string): boolean {
        return (
            s
                .split('x')
                .map(r => parseInt(r))
                .reduce((acc, v) => {
                    if (acc > v) {
                        acc = v;
                    }
                    return acc;
                }, Infinity) < 720
        );
    }

    get isVirtual(): boolean {
        return !this.model;
    }

    get isLive(): boolean {
        return (
            !this.isVirtual &&
            (this.status === 'Online' || this.status === 'Live' || this.status === 'Recording')
        );
    }

    get isOnline(): boolean {
        return this.status !== 'Offline';
    }

    get isOffline(): boolean {
        return this.status === 'Offline';
    }

    get isRecording(): boolean {
        return !this.isVirtual && this.status === 'Recording';
    }

    get isAuthorized(): boolean {
        return this.status !== 'Unauthorized';
    }

    get isUnauthorized(): boolean {
        return this.status === 'Unauthorized';
    }

    get hasArchive(): boolean {
        return !!(this.archiveRange && this.archiveRange.end > this.archiveRange.start);
    }

    getRecords(startMs: ms, endMs: ms, minGapMs: ms): BaseTimeRange[] {
        // console.log('========', new Date(startMs), new Date(endMs))
        return this.birdViewTree.getRecords(startMs, endMs, minGapMs);
    }

    setRecords(range: BaseTimeRange, archive: BaseTimeRange[]): void {
        this.archiveRange = range;
        this.archive = archive;
        this.initBirdView();
    }

    private initBirdView(): void {
        this.birdViewTree = new BirdViewTree(this.archiveRange, this.archive);
    }

    pushRecordedChunks(rs: BaseTimeRange[]): void {
        // console.log('SNR', rs, this)
        this.birdViewTree.setNewlyRecorded(rs);
        // this._archiveRange.end = rs[rs.length - 1].end;
    }

    isThereRecord(t: ms): boolean {
        return this.birdViewTree.isThereRecord(t);
    }

    getNextRecord(t: ms): BaseTimeRange {
        return this.birdViewTree.getNextRecord(t);
    }

    // get archiveEnd(): ms {
    //     if (this.hasArchive) {
    //         return this.birdViewTree.archiveEnd;
    //     } else {
    //         return -Infinity;
    //     }
    // }
}
