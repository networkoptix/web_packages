import { PlaybackTransport } from '@view/view.types';
import { ms, int } from '@vms-client/utils/type-aliases';

import { BirdViewTree } from './BirdViewTree';
import {
    ICamera,
    ISimpleTimeRange,
    CAMERA_STATUS,
    CameraArchive,
    MediaStreamInfo
} from './ICamera';

interface NameValue {
    name: string,
    value: string,
}

export class Camera implements ICamera {
    protected _birdViewTree: BirdViewTree;

    public get archiveRange() {
        return this._archiveRange;
    }

    public get archive() {
        return this._archive;
    }

    protected _mediaStreams: Array<MediaStreamInfo> = [];

    protected _rotation: int = 0;
    protected _streamUrls: string[] = [];

    constructor(
        public readonly id: string,
        public readonly parentServerId: string,
        public readonly preferredServerId: string,
        public readonly name: string,
        public readonly model: string,
        public readonly url: string,
        public readonly status: CAMERA_STATUS,
        public readonly isScheduleEnabled: boolean,
        public readonly disableDualStreaming: boolean,
        protected _archiveRange: ISimpleTimeRange,
        protected _archive: CameraArchive = [],
        public readonly thumbnailUrl: string | undefined = undefined,
        public readonly getVideoUrl: (
            transport: string,
            quality: string,
            t?: ms
        ) => string,
        public readonly getPosterUrl: (t?: ms) => string
    ) {
        this._initBirdView();
    }

    public get ip() {
        try {
            return this.url.split('/')[2].split(':')[0];
        } catch {
            return this.url;
        }
    }

    public parseAdditionalParams(ps: Array<NameValue>): void {
        const ms = ps.find(p => p.name === 'mediaStreams');
        if (ms) {
            try {
                this._mediaStreams = JSON.parse(ms.value).streams;
                // console.log('parsed media streams', this.id, this._mediaStreams, this.hasHlsStream, this.hasLowQualityHlsStream, this.hasHighQualityHlsStream)
            } catch (e) {
                this._mediaStreams = [];
                console.error('error parsing media streams', this.id, e);
            }
        }
        const rotation = ps.find(p => p.name === 'rotation');
        if (rotation) {
            this._rotation = parseInt(rotation.value) || 0;
            // console.log('got camera rotation', this._rotation)
        }
        // console.log('CAMERA ROTATION RECEIVED', rotation, this._rotation)

        const streamUrls = ps.find(p => p.name === 'streamUrls');
        if (streamUrls) {
            this._streamUrls = Object.values(JSON.parse(streamUrls.value))
                .map((stream: string) => stream);
        }
    }

    public get rotation() {
        // console.log('CAMERA ROTATION GET', this._rotation)
        return this._rotation;
    }

    public get streamUrls() {
        return this._streamUrls;
    }

    public get availableTransportsAndResolutions() {
        return this.availableTransports.reduce((acc, t) => {
            acc[t] = this._getAvailableResolutions(t);
            return acc;
        }, {});
    }

    public get availableTransports() {
        function isTransportSupported(t) {
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
        }

        const result = new Set();
        this._mediaStreams
            // .filter(s => s.resolution !== '*')
            .map(s => s.transports.map(t => result.add(t)));
        return Array.from(result).filter(isTransportSupported) as Array<PlaybackTransport>;
    }

    public get mediaStreams() {
        return this._mediaStreams;
    }

    protected _getAvailableResolutions(transport) {
        const result: any = {};
        const resolutions = [];
        const isHls = transport === 'hls';
        this._mediaStreams
            .filter(s => s.resolution !== '*')
            .map(s =>
                s.transports.filter(t => t === transport) &&
                resolutions.push(s.resolution)
            );

        if (resolutions.length === 1) {
            result.high = isHls ? 'hi' : resolutions[0];
        } else {
            const high = resolutions.filter(r => {
                return !this._resolutionIsLow(r);
            }).sort();
            if (high.length) {
                result.high = isHls ? 'hi' : high[high.length - 1];
            }
            const low = resolutions.filter(r => this._resolutionIsLow(r)).sort();
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
            const primaryResolutionHeight = parseInt(
                (result.high || result.low).split('x')[1]
            );
            const defaultResolutions = {
                1080: '1920x1080',
                720: '1280x720',
                480: '854x480',
                360: '640x360'
            };
            [1080, 720, 480, 360].forEach(yResolution => {
                if (primaryResolutionHeight >= yResolution) {
                    result[`${yResolution}p`] = defaultResolutions[yResolution];
                }
            });
        }
        return result;
    }

    protected _resolutionIsLow(s: string): boolean {
        return s.split('x').map(r => parseInt(r)).reduce((acc, v) => {
            if (acc > v) {
                acc = v;
            }
            return acc;
        }, Infinity) < 720;
    }

    public get isVirtual() {
        return !this.model;
    }

    public get isLive() {
        return (
            !this.isVirtual &&
            (
                this.status === 'Online' ||
                this.status === 'Live' ||
                this.status === 'Recording'
            )
        );
    }

    public get isOnline() {
        return this.status !== 'Offline';
    }

    public get isOffline() {
        return this.status === 'Offline';
    }

    public get isRecording() {
        return !this.isVirtual && this.status === 'Recording';
    }

    public get isAuthorized() {
        return this.status !== 'Unauthorized';
    }

    public get isUnauthorized() {
        return this.status === 'Unauthorized';
    }

    public get hasArchive() {
        return !!(
            this.archiveRange &&
            this.archiveRange.end > this.archiveRange.start
        );
    }

    public getRecords(startMs: ms, endMs: ms, minGapMs: ms) {
        // console.log('========', new Date(startMs), new Date(endMs))
        return this._birdViewTree.getRecords(startMs, endMs, minGapMs);
    }

    public setRecords(range: ISimpleTimeRange, archive: CameraArchive): void {
        this._archiveRange = range;
        this._archive = archive;
        this._initBirdView();
    }

    protected _initBirdView(): void {
        this._birdViewTree = new BirdViewTree(this._archiveRange, this.archive);
    }

    public pushRecordedChunks(rs: CameraArchive): void {
        // console.log('SNR', rs, this)
        this._birdViewTree.setNewlyRecorded(rs);
        // this._archiveRange.end = rs[rs.length - 1].end;
    }

    public isThereRecord(t: ms) {
        return this._birdViewTree.isThereRecord(t);
    }

    public getNextRecord(t: ms): ISimpleTimeRange {
        return this._birdViewTree.getNextRecord(t);
    }

    public get archiveEnd(): ms {
        if (this.hasArchive) {
            return this._birdViewTree.archiveEnd;
        } else {
            return -Infinity;
        }
    }
}
