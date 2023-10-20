import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { BehaviorSubject, Observable } from 'rxjs';

import type { Size } from '@directives/resize/nx-resize.directive.types';
import { Watcher } from '@services/apply.service/watcher';
import type { CameraStatus } from '@services/system.service/camera-manager/camera-manager-types';

import { SensitivityButtonValue } from '../cameras.component.types';

@UntilDestroy()
@Component({
    selector: 'nx-motion-detection-settings',
    templateUrl: 'motion-detection-settings.component.html',
    styleUrls: ['motion-detection-settings.component.scss'],
})
export class NxMotionDetectionSettingsComponent implements OnInit {
    @Input() motionEnabled: boolean;
    @Input() enableMotion: () => void;
    @Input() disableMotion: () => void;
    @Input() resetSensitivity: () => void;
    @Input() toggleMotionGrid: () => void;
    @Input() sensitivityButtons$: BehaviorSubject<SensitivityButtonValue>;
    @Input() motionGridChangeWatcher: Watcher<boolean>;
    @Input() motionMaskWatcher: Watcher<string>;
    @Input() healthImageUrl: Observable<string>;
    @Input() selectedRotation: number;
    @Input() selectedAspectRatio: number;
    @Input() imageState: CameraStatus;
    @Input() overlayEnabled: boolean;

    @Output() updateMask: EventEmitter<string> = new EventEmitter();

    width$ = new BehaviorSubject(0);
    sensitivity = new FormGroup({
        current: new FormControl<SensitivityButtonValue>(false),
    });
    isMobile: boolean;
    sensitivityColors = new Array(10);

    constructor(private deviceService: DeviceDetectorService) {}

    ngOnInit(): void {
        this.isMobile = this.deviceService.isMobile() || this.deviceService.isTablet();
        this.sensitivity.controls.current.valueChanges.pipe(untilDestroyed(this)).subscribe(val => {
            this.sensitivityButtons$.next(val);
        });
    }

    lockGrid(lock: boolean): void {
        if (!this.isMobile && this.overlayEnabled) {
            this.motionGridChangeWatcher.value = lock;
        }
    }

    handleResize({ width }: Size): void {
        this.width$.next(width);
        this.toggleMotionGrid();
    }

    get height(): number {
        return this.getCanvasSize().height;
    }

    get width(): number {
        return this.getCanvasSize().width;
    }

    private getCanvasSize(): Size {
        const wrapperWidth = this.width$.value;
        const maxCanvasHeightInPixels = 480;
        const rotated = this.selectedRotation % 180;
        const columnsToRoundPixelsByMultiple = rotated ? 32 : 44;
        const RowsToRoundPixelsByMultiple = rotated ? 44 : 32;
        const aspect = this.selectedAspectRatio;
        const aspectWithRotation = rotated ? 1 / aspect : aspect;
        const constrainedByHeight = wrapperWidth / aspectWithRotation > maxCanvasHeightInPixels;
        let height: number;
        let width: number;

        if (constrainedByHeight) {
            const size = Math.floor(maxCanvasHeightInPixels / RowsToRoundPixelsByMultiple);
            height = RowsToRoundPixelsByMultiple * size;
            width =
                Math.floor((height * aspectWithRotation) / columnsToRoundPixelsByMultiple) *
                columnsToRoundPixelsByMultiple;
        } else {
            const size = Math.floor(wrapperWidth / columnsToRoundPixelsByMultiple);
            width = columnsToRoundPixelsByMultiple * size;
            height =
                Math.floor(width / aspectWithRotation / RowsToRoundPixelsByMultiple) *
                RowsToRoundPixelsByMultiple;
        }
        return { width, height };
    }
}
