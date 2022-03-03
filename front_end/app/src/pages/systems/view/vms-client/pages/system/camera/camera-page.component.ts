import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import { TimelineExtendToNowService } from '@vms-client/submodules/timeline/services/timeline.extend-to-now.service';
import { TimelineService } from '@vms-client/submodules/timeline/services/timeline.service';
import { ICamera } from '@vms-client/submodules/vms/datatypes/ICamera';
import { VmsState, VMS_MODE } from '@vms-client/submodules/vms/datatypes/VmsState';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

import { FpsMeterService } from '../../../../../../../services/fps-meter.service';

@Component({
    selector: 'camera-page',
    templateUrl: './camera-page.component.html',
    styleUrls: ['./camera-page.component.scss']
})
export class CameraPageComponent implements OnInit, OnDestroy {
    public id: string;
    public camera: ICamera;

    protected _routeSubscription: Subscription;
    protected _vmsStateSubscription: Subscription;
    protected _animationFrameRequestHandler: number;

    constructor(
        private route: ActivatedRoute,
        private vms: VideoManagementSystemService,
        private playback: PlaybackService,
        public timeline: TimelineService,
        public timelineExtendToNow: TimelineExtendToNowService,
        protected fpsMeter: FpsMeterService
    ) {
        this._onRouteChange = this._onRouteChange.bind(this);
        this._onVmsStateChange = this._onVmsStateChange.bind(this);
        this._onAnimationFrame = this._onAnimationFrame.bind(this);
    }

    public ngOnInit(): void {
        this._routeSubscription = this.route.params.subscribe(
            this._onRouteChange
        );
        this._vmsStateSubscription = this.vms.subject.subscribe(
            this._onVmsStateChange
        );
        this._animationFrameRequestHandler =
            requestAnimationFrame(this._onAnimationFrame);
        this.fpsMeter.install();
    }

    public ngOnDestroy(): void {
        this._routeSubscription?.unsubscribe();
        this._vmsStateSubscription?.unsubscribe();
        cancelAnimationFrame(this._animationFrameRequestHandler);
    }

    protected _onRouteChange(params) {
        this.id = params['camera-id'];
        this.vms.selectCamera(this.id);
    }

    protected _onVmsStateChange(s: VmsState) {
        switch (s.mode) {
            case VMS_MODE.NOT_INITIALIZED:
            case VMS_MODE.CAMERA_NOT_SELECTED:
                this.camera = undefined;
                break;
            case VMS_MODE.CAMERA_SELECTED:
                this.camera = s.selectedCamera;
                this._initSelectedCamera();
        }
    }

    public _onAnimationFrame(): void {
        if (this.camera?.isLive) {
            this.timelineExtendToNow.extendToNow();
        }

        setTimeout(() => {
            this._animationFrameRequestHandler = requestAnimationFrame(() =>
                this._onAnimationFrame
            );
        }, Math.ceil(1000 / 34));
    }

    public get showPlayer(): boolean {
        return this.camera && this.camera.isLive || this.camera.hasArchive;
    }

    public get showPlaybackControls(): boolean {
        return this.showPlayer;
    }

    public get showTimeline(): boolean {
        return this.camera && this.camera.hasArchive;
    }

    protected _initSelectedCamera() {
        this.playback.stop();

        if (this.camera.hasArchive) {
            console.log('timeline reset time', this.camera);
            this.timeline.reset(
                this.camera.archiveRange.start,
                this.camera.archiveRange.end
            );
        }

        if (this.camera.isLive) {
            this.playback.playLive();
        }
    }

    public onTimeLineDoubleClick(e: MouseEvent) {
        // TODO: remove
        // @ts-ignore
        console.log(this.vms.selectedCamera._birdViewTree._treeRoot);
    }
}
