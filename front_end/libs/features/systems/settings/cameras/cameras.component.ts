import { Component, OnDestroy, OnInit, Inject, ViewContainerRef } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual } from 'lodash-es';
import { DeviceDetectorService } from 'ngx-device-detector';
import {
    Subscription,
    BehaviorSubject,
    from,
    throwError,
    of,
    Observable,
    combineLatest,
} from 'rxjs';
import {
    filter,
    map,
    retryWhen,
    delay,
    distinctUntilChanged,
    retry,
    tap,
    catchError,
    switchMap,
} from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import {
    InfoBlockColumns,
    InfoBlockSection,
    InfoBlockLine,
    InfoBlockSize,
} from '@components/info-block/info-block.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import type { Size } from '@directives/resize/nx-resize.directive.types';
import { environment } from '@environments/environment';
import { icons, menus, settingsConfig } from '@lib/variables/static-variables';
import { NxHealthService } from '@pages/health/health.service';
import { NxApplyService } from '@services/apply.service';
import { Watcher } from '@services/apply.service/watcher';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { AlarmsReply } from '@services/system-api.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import {
    CameraUpdate,
    RecordingModes,
    MotionType,
    NxSystemCamera,
    RecordingType,
    TaskUpdate,
    StreamQuality,
} from '@services/system.service/camera-manager/camera-manager-types';
import type { NxSystem } from '@services/system.service/system';
import { NxUriService } from '@services/uri.service';
import { ChildRoutes } from '@services/uri.service.types';
import { WINDOW } from '@services/window-provider';
import { cleanId } from '@utils/general';

import { NxSettingsService } from '../settings.service';

import type {
    AspectRatioDropdownItem,
    RotationDropdownItem,
    QualityDropdownItem,
} from './cameras.component.types';

type SensitivityButtonValue = number | boolean | 'reset';

class Alert {
    errors: string[] = [];
    warnings: string[] = [];

    constructor(public cameraId: string, { availability }: AlarmsReply['cameras'][string]) {
        Object.values(availability).forEach(alertType => {
            Object.values(alertType).forEach(item => {
                const text = `Camera ${item.text}`;
                if (item.level === 'error') {
                    this.errors.push(text);
                } else if (item.level === 'warning') {
                    this.warnings.push(text);
                }
            });
        });
    }
}

const ASPECT_RATIOS = {
    '4:3': 1.33333,
    '16:9': 1.77778,
    '1:1': 1,
};

@UntilDestroy()
@Component({
    selector: 'nx-cameras-component',
    templateUrl: 'cameras.component.html',
    styleUrls: ['cameras.component.scss'],
})
export class NxCamerasComponent implements OnInit, OnDestroy {
    LANG = staticLang;
    isMobile: boolean;
    infoBlockSizeEnum = InfoBlockSize;
    public reload$ = new BehaviorSubject(0);
    width$ = new BehaviorSubject(0);
    preview$: Observable<string>;
    sensitivity = new FormGroup({
        current: new FormControl<SensitivityButtonValue>(false),
    });

    sensitivityButtons$ = new BehaviorSubject<SensitivityButtonValue>(false);
    private settingsSubscription: Subscription;
    private cameraSubscription: Subscription;

    private viewContainerRef: ViewContainerRef;
    system: NxSystem;
    parsedCameraId: string;
    selectedCamera: NxSystemCamera;
    enableEdit: boolean;
    fullInfoPath: string;
    cameraViewPath: string;
    private alerts: Alert[] = [];
    private saveSettings: Process;
    private various: QualityDropdownItem;
    aspectRatios: AspectRatioDropdownItem[];
    rotations: RotationDropdownItem[];
    streamQualities: QualityDropdownItem[];
    warnings: string[] = [];
    errors: string[] = [];
    showUnauthorized = false;
    showOffline = false;
    showOverlay = false;
    showPreloader = true;
    availableLicenses = 0;
    noCameras = false;
    sensitivityColors = new Array(10);
    shakeHint = false;
    cameraDetailColumns: InfoBlockColumns;
    canSeeInfo = false;
    editMode = false;
    icons = icons;
    readonly cameraCredentialUpdateTimeout: number = 1500;

    private credentialsUpdateInProgress: boolean = false;

    // Added for handing non camera devices CLOUD-8669
    settingsDisabled = false;
    settingsRecordingDisabled = true;

    private motionGridChangeWatcher = new Watcher<boolean>();
    cameraNameWatcher = new Watcher<string>();
    private selectedAspectWatcher = new Watcher<number | null>();
    private selectedRotationWatcher = new Watcher<number>();
    private audioEnabledWatcher = new Watcher<boolean>();
    recordingWatcher = new Watcher<boolean>();
    private recordingModesWatcher = new Watcher<RecordingModes[]>();
    private selectedFpsWatcher = new Watcher<number | null>();
    private selectedQualityWatcher = new Watcher<StreamQuality>();
    private motionEnabledWatcher = new Watcher<MotionType>();
    motionMaskWatcher = new Watcher<string>();

    private get cameraName(): string {
        return this.cameraNameWatcher.value;
    }

    private set cameraName(value: string) {
        this.cameraNameWatcher.value = value;
    }

    get previewWidth(): number {
        const height = 120;
        const aspect = this.selectedAspect?.value || ASPECT_RATIOS['16:9'];
        const rotated = (this.selectedRotation?.value ?? 0) % 180;
        return rotated ? height / aspect : aspect * height;
    }

    get selectedAspect(): AspectRatioDropdownItem {
        return this.aspectRatios.find(({ value: id }) => this.selectedAspectWatcher.value === id);
    }

    set selectedAspect(item: AspectRatioDropdownItem) {
        this.showOverlay = false;
        this.selectedAspectWatcher.value = item.value;
        setTimeout(() => {
            this.showOverlay = true;
        });
    }

    private get maxHeight(): number {
        const aspect = this.selectedAspect.value || ASPECT_RATIOS['4:3'];
        const normalHeight = 480;
        const narrowHeight = 384;
        return aspect > 1.5 ? narrowHeight : normalHeight;
    }

    get height(): number {
        return this.getCanvasSize().height;
    }

    get width(): number {
        return this.getCanvasSize().width;
    }

    private get previewWrapperWidth(): number {
        return (
            Math.ceil(((this.selectedAspect.value || ASPECT_RATIOS['4:3']) * this.maxHeight) / 44) *
            44
        );
    }

    get canvasWidth(): number {
        return Math.floor(this.previewWrapperWidth / 44) * 44;
    }

    get canvasHeight(): number {
        const aspect = this.selectedAspect.value || ASPECT_RATIOS['4:3'];
        return Math.min(Math.floor(this.canvasWidth / aspect / 32) * 32, this.maxHeight);
    }

    get sensitivityButtons(): SensitivityButtonValue {
        return this.sensitivityButtons$.value;
    }

    set sensitivityButtons(value: SensitivityButtonValue) {
        this.sensitivityButtons$.next(value);
    }

    get selectedRotation(): RotationDropdownItem {
        return this.rotations.find(({ value: id }) => this.selectedRotationWatcher.value === id);
    }

    set selectedRotation(item: RotationDropdownItem) {
        this.selectedRotationWatcher.value = item.value;
    }

    get audioEnabled(): boolean {
        return this.audioEnabledWatcher.value;
    }

    set audioEnabled(value: boolean) {
        this.audioEnabledWatcher.value = value;
    }

    private get recordingSettingsChanged(): boolean {
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

    get existingModesSelected(): boolean {
        return this.recordingModes.some(({ value }) => value === 1);
    }

    private get safeToUpdateRecordingSettings(): boolean {
        return (
            !this.recordingSettingsChanged ||
            !this.selectedCamera.scheduleTasks.length ||
            this.selectedCamera.scheduleTasks.every(
                ({ recordingType }) => recordingType === RecordingType.NEVER,
            ) ||
            (!this.variousQualities && !this.variousFps && !this.existingModesSelected)
        );
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

    get variousFps(): boolean {
        return this.selectedFps === null || !this.selectedFps;
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

    get variousQualities(): boolean {
        return this.selectedQuality.value === this.various.value;
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

    private get motionMask(): string {
        return this.motionMaskWatcher.value;
    }

    private set motionMask(value: string) {
        this.motionMaskWatcher.value = value;
    }

    private set motionType(value: MotionType) {
        this.motionEnabledWatcher.value = value;
    }

    private get motionType(): MotionType {
        const motionType = this.motionEnabledWatcher.value;
        return parseInt(motionType) ? motionType : MotionType[motionType];
    }

    constructor(
        private router: Router,
        private menuService: NxMenuService,
        private settingsService: NxSettingsService,
        private route: ActivatedRoute,
        private uriService: NxUriService,
        private healthService: NxHealthService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private dialogService: NxDialogsService,
        private deviceService: DeviceDetectorService,
        @Inject(WINDOW) private window: Window,
        @Inject(ViewContainerRef) viewContainerRef: ViewContainerRef,
    ) {
        this.updateSelects();
        this.viewContainerRef = viewContainerRef;
        this.menuService.section = 'cameras';
    }

    ngOnInit(): void {
        this.isMobile = this.deviceService.isMobile() || this.deviceService.isTablet();

        this.router.events.pipe(untilDestroyed(this)).subscribe(route => {
            if (route instanceof NavigationStart) {
                // remove unnecessary system update (ex. health monitor will trigger system update)
                // and orphan metrics request in cameraSubscription
                this.cameraSubscription?.unsubscribe();
                this.settingsSubscription?.unsubscribe();
            }
        });

        this.sensitivity.controls.current.valueChanges.pipe(untilDestroyed(this)).subscribe(val => {
            this.sensitivityButtons$.next(val);
            this.sensitivity.setValue({ current: false });
        });

        this.route.params.pipe(untilDestroyed(this), distinctUntilChanged()).subscribe(params => {
            if (params.cameraId) {
                this.warnings = [];
                this.errors = [];
                this.showUnauthorized = false;
                this.showOverlay = false;
                this.menuService.detail = params.cameraId;
                this.parsedCameraId = params.cameraId;
                if (!this.applyService.locked) {
                    this.setCamera();
                }
            }
        });
        this.settingsService.system.serverManager
            .getLicenseChannels(this.settingsService.system.cameraManager.cameras)
            .pipe(untilDestroyed(this))
            .subscribe(
                ({ available }) => {
                    this.availableLicenses = available;
                },
                _ => {
                    this.availableLicenses = 0;
                },
            );

        this.settingsSubscription = this.settingsService.systemSubject$
            .pipe(
                untilDestroyed(this),
                filter(data => data !== undefined && data.id !== this.system?.id),
            )
            .subscribe(system => {
                if (system && (!this.system || !environment.isLocal)) {
                    this.system = system;
                    if (!this.system.isOnline || !this.system.isAvailable) {
                        this.canSeeInfo = false;
                    } else {
                        this.canSeeInfo = this.system.userManager.permissions.isAdmin;
                        if (this.canSeeInfo) {
                            this.fullInfoPath =
                                this.uriService.getSystemSettingsRoute({
                                    systemId: this.system.id,
                                    childRoute: ChildRoutes.HEALTH,
                                }) + menus.systemSettings.cameras.path;
                        }
                    }
                } else {
                    this.showPreloader = false;
                    this.noCameras = false;
                }
                this.cameraSubscription?.unsubscribe();
                let prevCameras: NxSystemCamera[] = [];
                this.cameraSubscription = this.system.infoSubject
                    .pipe(
                        untilDestroyed(this),
                        filter(res => {
                            this.noCameras = res.cameraManager.cameras?.length === 0;
                            if (this.noCameras) {
                                this.showPreloader = false;
                                if (!this.system.userManager.permissions.editCameras) {
                                    this.system.show404 = true;
                                }
                            } else {
                                this.cameraViewPath =
                                    menus.systemSettings.baseUrl +
                                    this.system.id +
                                    '/view/' +
                                    this.parsedCameraId;
                                this.initUpdateProcess();
                            }

                            const camerasEqual = isEqual(prevCameras, res.cameraManager.cameras);
                            prevCameras = [...res.cameraManager.cameras];
                            return !camerasEqual;
                        }),
                        map(system => {
                            if (!system.cameraManager.cameras) {
                                throw new Error();
                            }
                        }),
                        retryWhen(err => err.pipe(delay(1000))),
                    )
                    .subscribe(() => {
                        if (!this.applyService.locked) {
                            this.setCamera();
                        }
                        this.noCameras =
                            this.system &&
                            this.system.cameraManager.cameras &&
                            this.system.cameraManager.cameras.length === 0;
                        if (this.noCameras || !this.system.isAvailable) {
                            this.showPreloader = false;
                        }
                    });
            });
        this.initUpdateProcess();
        this.applyService.initPageWatcher(
            this.viewContainerRef,
            this.saveSettings,
            () => {
                this.toggleMotionGrid();
                this.motionMaskWatcher.reset = function () {
                    // Force change detection
                    setTimeout(() => {
                        this.value = this.originalValue;
                    });
                };
                this.applyService.reset();
            },
            [
                this.audioEnabledWatcher,
                this.cameraNameWatcher,
                this.recordingModesWatcher,
                this.recordingWatcher,
                this.selectedAspectWatcher,
                this.selectedFpsWatcher,
                this.selectedQualityWatcher,
                this.selectedRotationWatcher,
                this.motionEnabledWatcher,
                this.motionMaskWatcher,
                this.motionGridChangeWatcher,
            ],
        );

        this.motionGridChangeWatcher.originalValue = false;
        this.preview$ = combineLatest([
            this.route.params,
            this.selectedAspectWatcher.valueSubject,
            this.selectedRotationWatcher.valueSubject,
            this.reload$,
        ]).pipe(
            switchMap(([{ cameraId }, _1, _2, _3]) => {
                if (!cameraId || _1 === undefined || _2 === undefined) {
                    return of('');
                }
                return this.system.serverManager.getPreviewUrl(
                    cameraId,
                    null,
                    (this.selectedAspect?.value || this.aspectRatios[1].value) * this.maxHeight * 2,
                    this.maxHeight * 2,
                    this.selectedRotation?.value || 0,
                );
            }),
        );
    }

    ngOnDestroy(): void {}

    // Update menu options after language is loaded
    private updateSelects(): void {
        this.various = { name: this.LANG.common.resolution.various, value: 'various' };
        this.aspectRatios = [
            { name: this.LANG.common.resolution.auto, value: null },
            { name: '4:3', value: 1.33333 },
            { name: '16:9', value: 1.77778 },
            { name: '1:1', value: 1 },
        ];
        this.rotations = [
            { name: '0˚', value: 0 },
            { name: '90˚', value: 90 },
            { name: '180˚', value: 180 },
            { name: '270˚', value: 270 },
        ];
        this.streamQualities = [
            { name: this.LANG.common.resolution.best, value: 'highest' },
            { name: this.LANG.common.resolution.high, value: 'high' },
            { name: this.LANG.common.resolution.medium, value: 'normal' },
            { name: this.LANG.common.resolution.low, value: 'low' },
        ];
    }

    // Process for apply service
    private initUpdateProcess(): void {
        this.saveSettings = this.processService.createProcess(
            () => {
                const newApi = this.system.serverManager.mediaserver instanceof NxSystemRestAPI;
                if (!this.safeToUpdateRecordingSettings) {
                    this.applyService.setWarn(this.LANG.common.recordingSettingsWarning);
                    return Promise.reject();
                }

                let updatedTask: TaskUpdate;
                if (this.recordingSettingsChanged) {
                    const fps = !this.selectedFpsWatcher.value
                        ? this.selectedFpsWatcher.originalValue
                        : this.selectedFpsWatcher.value;

                    const allScheduled = this.recordingModesWatcher.value.find(
                        ({ value }) => value === 2,
                    )?.id;
                    const alwaysType = newApi ? RecordingType.META_ALWAYS : RecordingType.ALWAYS;
                    const recordingType = allScheduled || alwaysType;

                    const streamQuality =
                        this.selectedQualityWatcher.value === 'various'
                            ? null
                            : this.selectedQualityWatcher.value;

                    updatedTask = { fps, recordingType, streamQuality };
                }

                const cameraSettings: CameraUpdate = {
                    id: this.selectedCamera.id,
                    name: this.cameraNameWatcher.value,
                    audioEnabled: this.audioEnabledWatcher.value,
                    scheduleEnabled: this.recordingWatcher.value,
                    motionType: this.motionType,
                    motionMask: this.motionMaskWatcher.value || settingsConfig.defaultMotionMask,
                };
                const overrideAr =
                    this.selectedAspectWatcher.value === this.selectedCamera.defaultRatio
                        ? ''
                        : this.selectedAspectWatcher.value?.toString();
                const rotation = this.selectedRotationWatcher.value?.toString();

                return Promise.all([
                    this.system.cameraManager.updateRecordingSettings(updatedTask, cameraSettings),
                    this.system.serverManager.updateResource(cameraSettings.id, {
                        overrideAr,
                        rotation,
                    }),
                ]).then(_ => {
                    return this.system.cameraManager.getCameras().then(res => {
                        this.setCamera();
                        this.toggleMotionGrid();
                        this.settingsService.system = this.system;
                        this.system.systemInfo = this.system;
                        return res;
                    });
                });
            },
            { ignoreError: true },
        );
    }

    updateCredentials(): void {
        this.credentialsUpdateInProgress = true;
        const update = (): Promise<void> => {
            this.showUnauthorized = false;
            return of('')
                .pipe(
                    delay(this.cameraCredentialUpdateTimeout),
                    switchMap(() =>
                        from(this.system.cameraManager.getCameras()).pipe(
                            switchMap(cameras => {
                                const selectedCamera = cameras.find(
                                    ({ id }) => id === this.selectedCamera.id,
                                );
                                const unauthorized = selectedCamera.status === 'Unauthorized';
                                if (unauthorized) {
                                    return throwError('Camera Unauthorized');
                                }
                                return of(selectedCamera);
                            }),
                            delay(this.cameraCredentialUpdateTimeout),
                        ),
                    ),
                    retry(5),
                    delay(this.cameraCredentialUpdateTimeout),
                    tap(_ => this.settingsService.systemSubject$.next(this.system)),
                    catchError(err => {
                        console.error(err);
                        return of(err);
                    }),
                )
                .toPromise()
                .finally(() => {
                    this.credentialsUpdateInProgress = false;
                    const selectedCamera = this.system.cameraManager.cameras.find(
                        ({ id }) => id === this.selectedCamera.id,
                    );
                    this.selectedCamera = selectedCamera;
                    this.showUnauthorized = selectedCamera.status === 'Unauthorized';
                    this.reload$.next(this.reload$.value + 1);
                });
        };
        this.dialogService.updateCameraCredentials({
            camera: this.selectedCamera,
            system: this.system,
            updateCallback: update,
        });
    }

    handleResize({ width }: Size): void {
        this.width$.next(width);
        this.toggleMotionGrid();
    }

    private getCanvasSize(): Size {
        const wrapperWidth = this.width$.value;
        const maxCanvasHeightInPixels = 480;
        const rotation = this.selectedRotation?.value || 0;
        const rotated = rotation % 180;
        const columnsToRoundPixelsByMultiple = rotated ? 32 : 44;
        const RowsToRoundPixelsByMultiple = rotated ? 44 : 32;
        const aspect = this.selectedAspect.value || ASPECT_RATIOS['16:9'];
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

    toggleMotionGrid(): void {
        this.showOverlay = false;
        this.sensitivityButtons = false;
        setTimeout(() => {
            this.showOverlay = true;
        });
    }

    resetSensitivity(): void {
        this.sensitivityButtons = 'reset';
    }

    private checkModeEnabled(id: RecordingType, enabled: boolean = this.motionEnabled): boolean {
        return (
            [RecordingType.META_ALWAYS, RecordingType.ALWAYS, RecordingType.NEVER].includes(id) ||
            (id === RecordingType.META_LOW ? this.selectedCamera.motionLowResEnabled : enabled)
        );
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

    updateMask(maskString: string): void {
        this.motionMask = maskString;
    }

    disableMotion = (): void => {
        this.motionEnabled = false;
        this.recordingModes = this.recordingModes.map(({ name, id }) => {
            const enabled = [RecordingType.META_ALWAYS, RecordingType.ALWAYS].includes(id);
            const value = enabled ? 2 : 0;
            return { name, id, enabled, value };
        });
    };

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

    private getSupportedMotion(): MotionType {
        const {
            selectedCamera: {
                addParams: { supportedMotion, motionStream },
            },
        } = this;
        return supportedMotion === MotionType.HardwareGrid || motionStream === undefined
            ? MotionType.HardwareGrid
            : MotionType.SoftwareGrid;
    }

    private setCamera = async (forceUpdate = false): Promise<void> => {
        this.applyService.reset(true);
        this.applyService.setVisible(false);
        if (
            this.selectedCamera &&
            this.parsedCameraId === this.selectedCamera?.id &&
            !forceUpdate
        ) {
            return;
        }

        if (this.selectedCamera && this.parsedCameraId !== this.selectedCamera?.id) {
            this.showOffline = false;
            this.showUnauthorized = false;
            this.alerts = [];
        }

        let cameraIndex: number;
        if (this.system && this.system.cameraManager.cameras) {
            this.enableEdit =
                this.system.userManager.permissions.isAdmin ||
                this.system.userManager.permissions.editCameras;
            const { cameras } = this.system.cameraManager;
            cameraIndex = cameras.findIndex(camera => camera.id === `{${this.parsedCameraId}}`);
            this.system.show404 =
                (!!this.parsedCameraId && cameraIndex === -1) ||
                !this.system.userManager.permissions.editCameras;
            if (this.system.show404) {
                return;
            }
            if (!cameras.length) {
                this.showPreloader = false;
                return;
            }

            if (cameraIndex === -1) {
                cameraIndex = 0;
                this.parsedCameraId = cleanId(cameras[0].id);
                this.uriService
                    .updateURI(
                        this.uriService.getSystemSettingsRoute({
                            systemId: this.system.id,
                            cameraId: this.parsedCameraId,
                        }),
                    )
                    .catch(error => {
                        console.error(error);
                    });
            }
            this.cameraViewPath =
                this.uriService.getSystemSettingsRoute({
                    systemId: this.system.id,
                    childRoute: ChildRoutes.VIEW,
                }) + this.parsedCameraId;
            this.menuService.detail = this.parsedCameraId;

            this.selectedCamera = this.system.cameraManager.parseCamera(
                await this.system.mediaserver.getCamera(this.parsedCameraId).toPromise(),
            );
            const {
                vendor,
                model,
                url,
                parentName,
                deviceType,
                isStream,
                defaultRatio,
                parsedAddParams,
                audioEnabled,
                recordingSettings,
                motionType,
                motionMask,
            } = this.selectedCamera;
            this.settingsDisabled = deviceType !== 'Camera' || !vendor;
            this.settingsRecordingDisabled =
                environment.isLocal || deviceType !== 'Camera' || !vendor;
            const deviceColumn = [
                new InfoBlockSection([
                    new InfoBlockLine(this.LANG.common.vendor, vendor),
                    new InfoBlockLine(this.LANG.common.model, model),
                ]),
            ];
            const otherInfoColumn = [
                new InfoBlockSection([
                    new InfoBlockLine(this.LANG.common.ip, url),
                    new InfoBlockLine(this.LANG.common.server, parentName),
                ]),
            ];
            this.cameraDetailColumns = isStream
                ? [otherInfoColumn]
                : [deviceColumn, otherInfoColumn];
            this.cameraName = this.selectedCamera.name;
            this.motionGridChangeWatcher.originalValue = false;
            // Setup the automatic value based on the camera's dimensions
            if (defaultRatio) {
                this.aspectRatios[0].value = defaultRatio;
            }
            this.selectedAspect =
                this.aspectRatios.find(({ value }) => value === parsedAddParams.overrideAr) ||
                this.aspectRatios[0];
            this.selectedRotation =
                this.rotations.find(({ value }) => value === parsedAddParams.rotation) ||
                this.rotations[0];
            this.audioEnabled = audioEnabled;
            this.recordingModesWatcher.value = recordingSettings.modes;
            this.selectedQuality =
                recordingSettings.quality === 'various'
                    ? this.various
                    : this.streamQualities.find(({ value }) => recordingSettings.quality === value);
            this.selectedFps = recordingSettings.fps;
            this.recordingWatcher.value = recordingSettings.recording;
            this.motionType = motionType;
            this.motionMaskWatcher.originalValue = motionMask || settingsConfig.defaultMotionMask;
            this.updateValues();

            this.applyService.reset();
            this.applyService.setVisible();
            this.showPreloader = false;
        } else if (this.parsedCameraId) {
            this.noCameras = false;
        } else {
            this.noCameras = true;
        }
    };

    private updateAlerts(): void {
        const currentAlerts = this.alerts.find(({ cameraId }) => cameraId === this.parsedCameraId);
        const unauthorizedMessage = 'camera is unauthorized';
        const offlineMessage = 'camera is offline';
        if (currentAlerts) {
            this.warnings = currentAlerts.warnings;
            this.errors = currentAlerts.errors.filter(
                error =>
                    error.toLowerCase() !== unauthorizedMessage &&
                    error.toLowerCase() !== offlineMessage,
            );
        }
        this.showUnauthorized =
            this.selectedCamera && this.selectedCamera.status === 'Unauthorized';

        // ActivatedRoute.fragment was something different before?
        // @ts-expect-error TODO .value does not exist on Observable<string>
        if (this.showUnauthorized && this.route.fragment.value === 'authorize') {
            if (!this.credentialsUpdateInProgress) {
                this.updateCredentials();
            }
        }

        this.showOffline = this.selectedCamera && this.selectedCamera.status === 'Offline';
    }

    private updateValues(): void {
        this.healthService.ready = false;
        if (this.system.userManager.permissions.isAdmin) {
            this.system.mediaserver
                .getHealthAlarms()
                .pipe(untilDestroyed(this))
                .subscribe({
                    next: ({ reply: { cameras } }) => {
                        this.applyService.setVisible();
                        this.alerts = Object.entries(cameras || {}).map(
                            ([id, alarm]) => new Alert(id, alarm),
                        );
                        this.updateAlerts();
                    },
                    error: () => {
                        if (!this.system.id) {
                            if (!this.window.parent) {
                                this.window.location.reload();
                            } else {
                                this.window.parent.location.reload();
                            }
                        }
                    },
                });
        } else {
            this.updateAlerts();
        }
    }

    lockGrid(lock: boolean): void {
        if (!this.isMobile) {
            this.motionGridChangeWatcher.value = lock;
        }
    }
}
