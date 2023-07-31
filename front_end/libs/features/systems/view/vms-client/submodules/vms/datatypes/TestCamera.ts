import { ms, int } from '@vms-client/utils/type-aliases';

import { BirdViewTree } from './BirdViewTree';
import { ICamera, ISimpleTimeRange, CAMERA_STATUS, CameraArchive } from './ICamera';
import { _getNextRecord, _isThereRecord } from './utils';

export class TestCamera implements ICamera {
    protected _birdViewTree: BirdViewTree;

    public readonly rotation: int = 0;

    public readonly isVirtual: boolean = false;

    public get archiveRange() {
        return this._archiveRange;
    }

    public get archive() {
        return this._archive;
    }

    constructor(
        public readonly id: string,
        public readonly preferredServerId: string,
        public readonly name: string,
        public readonly url: string,
        public readonly status: CAMERA_STATUS,
        public readonly thumbnailUrl: string | undefined = undefined,
        protected _archiveRange: ISimpleTimeRange | undefined = undefined,
        protected _archive: CameraArchive = [],
        public readonly getPosterUrl: (t?: ms) => string = undefined,
    ) {
        this._initBirdView();
    }

    public get ip() {
        return this.url;
    }

    public get isScheduleEnabled() {
        return false;
    }

    public get isLive() {
        return this.status === 'Live' || this.status === 'Recording';
    }

    public get isOnline() {
        return this.status !== 'Offline';
    }

    public get isRecording() {
        return this.status === 'Recording';
    }

    public get isAuthorized() {
        return this.status !== 'Unauthorized';
    }

    public get hasArchive() {
        return !!(this.archiveRange && this.archiveRange.end > this.archiveRange.start);
    }

    public getVideoUrl(transport: string, quality: string, t: ms) {
        if (!t) {
            switch (transport) {
                case 'hls':
                    return 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8';
                case 'webm':
                default:
                    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';
            }
        } else {
            switch (transport) {
                case 'hls':
                    return 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8';
                case 'webm':
                default:
                    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            }
        }
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

    public get availableTransportsAndResolutions() {
        return {
            hls: ['lo', 'hi', ''],
            webm: ['AxB'],
        };
    }

    public get availableTransports() {
        return ['hls', 'wemb'];
    }

    public setNewlyRecordedChunks(rs: CameraArchive): void {
        // noop
    }

    public isThereRecord(t: ms) {
        return _isThereRecord(this.archive, t);
    }

    public getNextRecord(t: ms): ISimpleTimeRange {
        return _getNextRecord(this.archive, t);
    }
}
