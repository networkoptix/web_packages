import { Component, Input, OnInit } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { Watcher } from '@services/apply.service/watcher';
import {
    MotionType,
    NxSystemCamera,
    RecordingModes,
    RecordingType,
    StreamQuality,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';

import { QualityDropdownItem } from '../cameras.component.types';

@Component({
    selector: 'nx-recording-settings',
    templateUrl: 'recording-settings.component.html',
    styleUrls: ['recording-settings.component.scss'],
})
export class NxRecordingSettingsComponent implements OnInit {
    @Input() system: NxSystem;
    @Input() recordingWatcher: Watcher<boolean>;
    @Input() motionEnabledWatcher: Watcher<MotionType>;
    @Input() recordingModesWatcher: Watcher<RecordingModes[]>;
    @Input() selectedFpsWatcher: Watcher<number | null>;
    @Input() selectedCamera: NxSystemCamera;
    @Input() selectedQualityWatcher: Watcher<StreamQuality>;

    LANG = staticLang;
    streamQualities: QualityDropdownItem[];
    various: QualityDropdownItem;

    availableLicenses = 0;
    shakeHint = false;

    ngOnInit(): void {
        this.streamQualities = [
            { name: this.LANG.common.resolution.best, value: 'highest' },
            { name: this.LANG.common.resolution.high, value: 'high' },
            { name: this.LANG.common.resolution.medium, value: 'normal' },
            { name: this.LANG.common.resolution.low, value: 'low' },
        ];
        this.various = { name: this.LANG.common.resolution.various, value: 'various' };

        this.system.serverManager.getLicenseChannels(this.system.cameraManager.cameras).subscribe(
            ({ available }) => {
                this.availableLicenses = available;
            },
            _ => {
                this.availableLicenses = 0;
            },
        );
    }

    get recording(): boolean {
        return this.recordingWatcher.value;
    }

    set recording(value: boolean) {
        if (value === this.recording) {
            return;
        }

        if (this.recordingWatcher.originalValue !== undefined) {
            if (this.motionEnabled) {
                this.enableMotion(true);
            } else {
                this.disableMotion();
            }
        }

        this.recordingWatcher.value = value;
    }

    get motionEnabled(): boolean {
        const motionEnabled = this.motionEnabledWatcher.value;
        return motionEnabled && ![MotionType.NoMotion, MotionType.None].includes(motionEnabled);
    }

    set motionEnabled(enabled: boolean) {
        let value: MotionType;
        if (!enabled) {
            value = MotionType.NoMotion;
        } else if (
            ![MotionType.NoMotion, MotionType.None].includes(
                this.motionEnabledWatcher.originalValue,
            )
        ) {
            value = this.motionEnabledWatcher.originalValue;
        } else {
            value = this.getSupportedMotion();
        }
        this.motionEnabledWatcher.value = value;

        this.recordingModes = this.recordingModes.map(({ id, ...mode }) => ({
            ...mode,
            id,
            enabled: this.checkModeEnabled(id),
        }));
    }

    get recordingModes(): RecordingModes[] {
        return this.recordingModesWatcher.value;
    }

    set recordingModes(value: RecordingModes[]) {
        if (!this.selectedFps) {
            this.selectedFps = this.selectedCamera.maxFps;
        }

        if (this.selectedQuality.value === 'various') {
            this.selectedQuality = this.streamQualities[1]; // High
        }
        this.recordingModesWatcher.value = value;
    }

    get selectedFps(): number {
        return this.selectedFpsWatcher.value;
    }

    set selectedFps(value: number | 'various') {
        if (value === 'various') {
            this.selectedFpsWatcher.value = null;
        } else if (!value) {
            this.selectedFpsWatcher.value = value;
        } else {
            this.selectedFpsWatcher.value = Math.min(value, this.selectedCamera.maxFps);
        }
    }

    get selectedQuality(): QualityDropdownItem {
        return this.selectedQualityWatcher.value === 'various'
            ? this.various
            : this.streamQualities.find(
                  ({ value: id }) => this.selectedQualityWatcher.value === id,
              );
    }

    set selectedQuality(item: QualityDropdownItem) {
        this.selectedQualityWatcher.value = item.value;
    }

    enableMotion = (updateModes = false): void => {
        this.motionEnabled = true;
        if (updateModes) {
            this.recordingModes = this.recordingModes.map(({ name, id }) => {
                const enabled = this.checkModeEnabled(id);
                const value = [RecordingType.MOTION_ONLY, RecordingType.META_ONLY].includes(id)
                    ? 2
                    : 0;
                return { name, id, enabled, value };
            });
        }
    };

    disableMotion = (): void => {
        this.motionEnabled = false;
        this.recordingModes = this.recordingModes.map(({ name, id }) => {
            const enabled = [RecordingType.META_ALWAYS, RecordingType.ALWAYS].includes(id);
            const value = enabled ? 2 : 0;
            return { name, id, enabled, value };
        });
    };

    private getSupportedMotion(): MotionType {
        const {
            selectedCamera: {
                parameters: { supportedMotion, motionStream },
            },
        } = this;
        return supportedMotion === MotionType.HardwareGrid || motionStream === undefined
            ? MotionType.HardwareGrid
            : MotionType.SoftwareGrid;
    }

    private checkModeEnabled(id: RecordingType, enabled: boolean = this.motionEnabled): boolean {
        return (
            [RecordingType.META_ALWAYS, RecordingType.ALWAYS, RecordingType.NEVER].includes(id) ||
            (id === RecordingType.META_LOW
                ? this.selectedCamera.recordingSettings.motionLowResEnabled
                : enabled)
        );
    }

    get existingModesSelected(): boolean {
        return this.recordingModes.some(({ value }) => value === 1);
    }

    get safeToUpdateRecordingSettings(): boolean {
        return (
            !this.recordingSettingsChanged ||
            !this.selectedCamera.scheduleTasks.length ||
            this.selectedCamera.scheduleTasks.every(
                ({ recordingType }) => recordingType === RecordingType.NEVER,
            ) ||
            (!this.variousQualities && !this.variousFps && !this.existingModesSelected)
        );
    }

    get recordingSettingsChanged(): boolean {
        return (
            this.recordingModesWatcher.changed ||
            this.selectedFpsWatcher.changed ||
            this.selectedQualityWatcher.changed
        );
    }

    get existingRecordingsScheduled(): boolean {
        let type: string;
        let fps: number;
        let quality: string;
        return (
            !this.recordingSettingsChanged &&
            this.selectedCamera.scheduleTasks.length &&
            !this.selectedCamera.scheduleTasks.every(
                ({ recordingType }) => recordingType === RecordingType.NEVER,
            ) &&
            !this.selectedCamera.scheduleTasks.every(
                ({ recordingType, fps: currentFps, streamQuality }, index) => {
                    if (index === 0) {
                        type = recordingType;
                        fps = currentFps;
                        quality = streamQuality;
                        return true;
                    }
                    return (
                        recordingType === type && fps === currentFps && quality === streamQuality
                    );
                },
            )
        );
    }

    get variousQualities(): boolean {
        return this.selectedQuality.value === this.various.value;
    }

    get variousFps(): boolean {
        return this.selectedFps === null || !this.selectedFps;
    }

    toggleMode({ name: toggledName, enabled }: RecordingModes): void {
        if (!enabled) {
            return;
        }
        this.recordingModes = this.recordingModes.map(({ name, id, enabled }) => ({
            name,
            id,
            enabled: this.checkModeEnabled(id, enabled),
            value: name === toggledName ? 2 : 0,
        }));
    }

    handleRecordingToggle(switchValue: boolean | undefined): void {
        const needLic =
            !this.recording && !this.recordingWatcher.originalValue
                ? this.availableLicenses <= 0
                : this.availableLicenses < 0;

        // value will be undefined if switch is disabled
        if ((switchValue || switchValue === undefined) && needLic) {
            this.shakeHint = true;
            setTimeout(() => {
                this.shakeHint = false;
            }, 500);
            return;
        }

        this.recording = switchValue;
    }
}
