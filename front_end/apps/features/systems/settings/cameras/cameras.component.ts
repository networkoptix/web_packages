import {
    Component,
    OnDestroy,
    OnInit,
    Inject,
    ViewContainerRef
} from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual } from 'lodash-es';
import { DeviceDetectorService } from 'ngx-device-detector';
import {
    Subscription,
    BehaviorSubject,
    from,
    throwError,
    of
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
    switchMap
} from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import {
    InfoBlockColumns,
    InfoBlockSection,
    InfoBlockLine,
    InfoBlockSize
} from '@components/info-block/info-block.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxHealthService } from '@pages/health/health.service';
import { NxApplyService } from '@services/apply.service';
import { Watcher } from '@services/apply.service/watcher';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import {
    ICamera,
    IRecordingModes,
    IRecordingSettings,
    ITask,
    MotionType,
    RecordingType,
} from '@services/system.service/camera-manager/camera-manager-types';
import type { NxSystem } from '@services/system.service/system';
import { NxUriService } from '@services/uri.service';
import { ChildRoutes } from '@services/uri.service.types';
import { WINDOW } from '@services/window-provider';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';

import { NxSettingsService } from '../settings.service';

import type {
    AspectRatioDropdownItem,
    RotationDropdownItem,
    QualityDropdownItem,
} from './cameras.component.types';

class Alert {
    errors: string[] = [];
    warnings: string[] = [];

    constructor(public cameraId: string, alertInfo, prefix: string) {
        Object.values(alertInfo.availability || {}).forEach((_: any[] = []) =>
            _.forEach(item => {
                if (item?.level && item.text && this[`${item.level}s`]) {
                    this[`${item.level}s`].push(`${prefix} ${item.text}`);
                }
            })
        );
    }
}

@UntilDestroy()
@Component({
    selector: 'nx-cameras-component',
    templateUrl: 'cameras.component.html',
    styleUrls: ['cameras.component.scss']
})
export class NxCamerasComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    isMobile: boolean;
    infoBlockSizeEnum = InfoBlockSize;
    public reload$ = new BehaviorSubject(0);
    width$ = new BehaviorSubject(0);

    sensitivityButtons$: BehaviorSubject<boolean | number | 'reset'> = new BehaviorSubject(false);
    settingsSubscription: Subscription;
    routeParamsSubscription: Subscription;
    healthReportSubscription: Subscription;
    cameraSubscription: Subscription;

    viewContainerRef: ViewContainerRef;
    system: NxSystem;
    cameraIdFromParams: string;
    parsedCameraId: string;
    selectedCamera: ICamera;
    enableEdit: boolean;
    fullInfoPath: string;
    cameraViewPath: string;
    alerts: Alert[];
    saveSettings: Process;
    various: QualityDropdownItem;
    auto: AspectRatioDropdownItem;
    aspectRatios: AspectRatioDropdownItem[];
    rotations: RotationDropdownItem[];
    streamQualities: QualityDropdownItem[];
    maxFps: number = 15;
    fps: number = this.maxFps;
    warnings: string[] = [];
    errors: string[] = [];
    showUnauthorized = false;
    showOffline = false;
    showOverlay = false;
    alertsLoaded = false;
    showPreloader = true;
    availableLicenses = 0;
    noCameras = false;
    sensitivityColors = new Array(10);
    shakeHint = false;
    cameraDetailColumns: InfoBlockColumns;
    canSeeInfo = false;
    editMode = false;
    recordingSettings: IRecordingSettings;

    // Added for handing non camera devices CLOUD-8669
    settingsDisabled = false;
    settingsRecordingDisabled = true;

    motionGridChangeWatcher = new Watcher<boolean>();
    cameraNameWatcher: Watcher<string> = new Watcher();
    selectedAspectWatcher = new Watcher<number | ''>();
    selectedRotationWatcher = new Watcher<number>();
    audioEnabledWatcher: Watcher<boolean> = new Watcher();
    recordingWatcher: Watcher<boolean> = new Watcher();
    recordingModesWatcher: Watcher<IRecordingModes[]> = new Watcher();
    selectedFpsWatcher: Watcher<any> = new Watcher();
    selectedQualityWatcher: Watcher<any> = new Watcher();
    motionEnabledWatcher: Watcher<string> = new Watcher();
    motionMaskWatcher: Watcher<string> = new Watcher();

    get cameraName() {
        return this.cameraNameWatcher.value;
    }

    set cameraName(value) {
        this.cameraNameWatcher.value = value;
    }

    get previewWidth() {
        const height = 120;
        const defaultAspectRatio = 1.77778;
        const aspect = this.selectedAspect?.value || defaultAspectRatio;
        const rotated = this.selectedRotation?.value % 180 || 0;
        return rotated ? height / aspect : aspect * height;
    }

    get selectedAspect(): AspectRatioDropdownItem {
        return this.aspectRatios
            .find(({ value: id }) => this.selectedAspectWatcher.value === id);
    }

    set selectedAspect(item: AspectRatioDropdownItem) {
        this.showOverlay = false;
        this.selectedAspectWatcher.value = item.value;
        setTimeout(() => {
            this.showOverlay = true;
        });
    }

    get aspectClass() {
        let aspect: AspectRatioDropdownItem;
        if (this.selectedAspectWatcher.value) {
            aspect = this.aspectRatios
                .find(({ value: id }) => this.selectedAspectWatcher.value === id);
        } else {
            aspect = this.aspectRatios[1];
        }
        const [width, height] =
            (aspect.value ? aspect.name : this.selectedAspect[1].name).split(':');
        return `${width}-${height}`;
    }

    get maxHeight() {
        const aspect = this.selectedAspect.value as number ||
            this.aspectRatios[1].value as number;
        const normalHeight = 480;
        const narrowHeight = 384;
        return aspect > 1.5 ? narrowHeight : normalHeight;
    }

    get height() {
        return this.getCanvasSize().height;
    }

    get width() {
        return this.getCanvasSize().width;
    }

    get previewWrapperWidth() {
        return Math.ceil(
            (
                this.selectedAspect.value as number ||
                this.aspectRatios[1].value as number
            ) * this.maxHeight / 44
        ) * 44;
    }

    get canvasWidth() {
        return Math.floor(this.previewWrapperWidth / 44) * 44;
    }

    get canvasHeight() {
        const aspect = <number>this.selectedAspect.value ||
            <number>this.aspectRatios[1].value;
        return Math.min(
            Math.floor(this.canvasWidth / aspect / 32) * 32, this.maxHeight
        );
    }

    public get preview() {
        return this.system.getPreviewUrl(
            this.selectedCamera.id,
            null,
            (
                this.selectedAspect.value as number ||
                this.aspectRatios[1].value as number
            ) * this.maxHeight * 2,
            this.maxHeight * 2,
            this.selectedRotation.value || 0
        );
    }

    get sensitivityButtons() {
        return this.sensitivityButtons$.value;
    }

    set sensitivityButtons(value) {
        this.sensitivityButtons$.next(value);
    }

    get selectedRotation(): RotationDropdownItem {
        return this.rotations.find(({ value: id }) =>
            this.selectedRotationWatcher.value === id
        );
    }

    set selectedRotation(item: RotationDropdownItem) {
        this.selectedRotationWatcher.value = item.value;
    }

    get audioEnabled() {
        return this.audioEnabledWatcher.value;
    }

    set audioEnabled(value) {
        this.audioEnabledWatcher.value = value;
    }

    get recordingSettingsChanged() {
        return this.recordingModesWatcher.changed ||
            this.selectedFpsWatcher.changed ||
            this.selectedQualityWatcher.changed;
    }

    get recordingSwitchedOn() {
        return !this.recordingWatcher.originalValue &&
            this.recordingWatcher.value;
    }

    get existingRecordingsScheduled() {
        let type;
        let fps;
        let quality;
        return !this.recordingSettingsChanged &&
            this.selectedCamera.scheduleTasks.length &&
            !this.selectedCamera.scheduleTasks.every(({ recordingType }) =>
                recordingType === RecordingType.NEVER
            ) &&
            !this.selectedCamera.scheduleTasks.every(
                ({ recordingType, fps: currentFps, streamQuality }, index) => {
                    if (index === 0) {
                        type = recordingType;
                        fps = currentFps;
                        quality = streamQuality;
                        return true;
                    }
                    return recordingType === type &&
                        fps === currentFps &&
                        quality === streamQuality;
                });
    }

    get recording() {
        return this.recordingWatcher.value;
    }

    set recording(value) {
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

    get recordingModes(): IRecordingModes[] {
        return this.recordingModesWatcher.value;
    }

    set recordingModes(value: IRecordingModes[]) {
        if (!this.selectedFps) {
            this.selectedFps = this.selectedCamera.maxFps;
        }

        if (this.selectedQuality.value === 'various') {
            this.selectedQuality = this.streamQualities[1];
        }
        this.recordingModesWatcher.value = value;
    }

    get existingModesSelected() {
        return this.recordingModes.some(({ value }) => value === 1);
    }

    get safeToUpdateRecordingSettings() {
        return !this.recordingSettingsChanged ||
            (
                !this.selectedCamera.scheduleTasks.length ||
                this.selectedCamera.scheduleTasks.every(({ recordingType }) =>
                    recordingType === RecordingType.NEVER)
            ) ||
            !this.variousQualities && !this.variousFps && !this.existingModesSelected;
    }

    get selectedFps() {
        return this.selectedFpsWatcher.value;
    }

    set selectedFps(value) {
        const fps = !value ? value : Math.min(value, this.selectedCamera.maxFps);
        this.selectedFpsWatcher.value = Number.isNaN(fps) ? null : fps;
    }

    get variousFps() {
        return this.selectedFps === null || !this.selectedFps;
    }

    get selectedQuality(): QualityDropdownItem {
        return [...this.streamQualities, this.various].find(({ value: id }) =>
            this.selectedQualityWatcher.value === id
        );
    }

    set selectedQuality(item: QualityDropdownItem) {
        this.selectedQualityWatcher.value = item.value;
    }

    get variousQualities() {
        return this.selectedQuality.value === this.various.value;
    }

    get motionEnabled() {
        return ![MotionType.noMotion, MotionType.none].includes(
            this.motionEnabledWatcher.value as MotionType
        );
    }

    set motionEnabled(enabled) {
        this.motionEnabledWatcher.value = !enabled
            ? MotionType.noMotion
            : ![MotionType.noMotion, MotionType.none].includes(
                this.motionEnabledWatcher.originalValue as MotionType
            )
                ? this.motionEnabledWatcher.originalValue
                : this.getSupportedMotion();

        this.recordingModes = this.recordingModes.map(({ id, ...mode }) => ({
            ...mode,
            id,
            enabled: this.checkModeEnabled(id)
        }));
    }

    get motionMask() {
        return this.motionMaskWatcher.value;
    }

    set motionMask(value) {
        this.motionMaskWatcher.value = value;
    }

    set motionType(value: MotionType) {
        this.motionEnabledWatcher.value = value;
    }

    get motionType(): MotionType {
        const motionType = this.motionEnabledWatcher.value as MotionType;
        return parseInt(motionType) ? motionType : MotionType[motionType];
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
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
        @Inject(ViewContainerRef) viewContainerRef
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
        this.updateSelects();
        this.viewContainerRef = viewContainerRef;
        this.menuService.section = 'cameras';
    }

    ngOnInit(): void {
        this.isMobile = this.deviceService.isMobile() ||
            this.deviceService.isTablet();

        this.router.events.pipe(untilDestroyed(this)).subscribe(route => {
            if (route instanceof NavigationStart) {
                // remove unnecessary system update (ex. health monitor will trigger system update)
                // and orphan metrics request in cameraSubscription
                this.cameraSubscription?.unsubscribe();
                this.settingsSubscription?.unsubscribe();
            }
        });

        this.routeParamsSubscription = this.route
            .params
            .pipe(
                untilDestroyed(this),
                distinctUntilChanged()
            )
            .subscribe((params: any) => {
                if (params.cameraId) {
                    this.warnings = [];
                    this.errors = [];
                    this.showUnauthorized = false;
                    this.showOverlay = false;
                    this.menuService.detail = params.cameraId;
                    this.cameraIdFromParams = params.cameraId;
                    this.parsedCameraId = params.cameraId.replace(/\s|\{|\}/g, '');
                    if (!this.applyService.locked) {
                        this.setCamera();
                    }
                }
            });

        this.settingsSubscription = this.settingsService.systemSubject
            .pipe(
                untilDestroyed(this),
                filter(data => data !== undefined && data.id !== this.system?.id)
            )
            .subscribe(system => {
                if (system && (!this.system || !environment.isLocal)) {
                    this.system = system;
                    if (!this.system.isOnline || !this.system.isAvailable) {
                        this.alertsLoaded = true;
                        this.canSeeInfo = false;
                    } else {
                        this.canSeeInfo = this.system.canViewInfo();
                        if (this.canSeeInfo) {
                            this.fullInfoPath = this.uriService.getSystemSettingsRoute({
                                systemId: this.system.id,
                                childRoute: ChildRoutes.HEALTH
                            }) + this.CONFIG.menus.systemSettings.cameras.path;
                        }
                    }
                } else {
                    this.showPreloader = false;
                    this.alertsLoaded = true;
                    this.noCameras = false;
                }
                if (this.cameraSubscription) {
                    this.cameraSubscription.unsubscribe();
                }
                let prevCameras = [];
                this.cameraSubscription = this.system.infoSubject
                    .pipe(
                        untilDestroyed(this),
                        filter(res => {
                            if (res.cameraManager.cameras === undefined) {
                                return false;
                            }

                            this.noCameras = res.cameraManager.cameras?.length === 0;
                            if (this.noCameras) {
                                this.showPreloader = false;
                                if (!this.system.userManager.permissions.editCameras) {
                                    this.system.show404 = true;
                                }
                            } else {
                                this.cameraViewPath =
                                    this.CONFIG.menus.systemSettings.baseUrl +
                                    this.system.id +
                                    '/view/' +
                                    this.parsedCameraId;
                                this.initUpdateProcess();
                            }

                            const camerasEqual = isEqual(
                                prevCameras,
                                res.cameraManager.cameras
                            );
                            prevCameras = [...res.cameraManager.cameras];
                            return !camerasEqual;
                        }),
                        map((system: NxSystem) => {
                            if (!system.cameraManager.cameras) {
                                throw new Error();
                            }
                        }),
                        retryWhen(err => err.pipe(delay(1000)))
                    )
                    .subscribe(() => {
                        if (this.system.currentServerNotBusy) {
                            if (
                                this.system &&
                                this.system.cameraManager.cameras &&
                                this.system.cameraManager.cameras.length
                            ) {
                                this.system.serverManager
                                    .initSystemMediaServers().catch(_ => { });
                            }
                            if (!this.applyService.locked) {
                                this.setCamera();
                            }
                        }
                        this.noCameras = this.system &&
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
                this.motionGridChangeWatcher
            ]);

        this.motionGridChangeWatcher.originalValue = false;
    }

    ngOnDestroy(): void {
    }

    // Update menu options after language is loaded
    updateSelects(): void {
        this.various = { name: this.LANG.common.resolution.various(), value: 'various' };
        this.auto = { name: this.LANG.common.resolution.auto(), value: '' };
        this.aspectRatios = [
            this.auto,
            { name: '4:3', value: 1.33333 },
            { name: '16:9', value: 1.77778 },
            { name: '1:1', value: 1 }
        ];
        this.rotations = [
            { name: '0˚', value: 0 },
            { name: '90˚', value: 90 },
            { name: '180˚', value: 180 },
            { name: '270˚', value: 270 }
        ];
        this.streamQualities = [
            { name: this.LANG.common.resolution.best(), value: 'highest' },
            { name: this.LANG.common.resolution.high(), value: 'high' },
            { name: this.LANG.common.resolution.medium(), value: 'normal' },
            { name: this.LANG.common.resolution.low(), value: 'low' }
        ];
    }

    // Process for apply service
    initUpdateProcess(): void {
        this.saveSettings = this.processService.createProcess(() => {
            if (!this.safeToUpdateRecordingSettings) {
                this.applyService.setWarn(this.LANG.common.recordingSettingsWarning());
                return Promise.reject();
            }

            const updatedTask: Pick<ITask, 'fps' | 'recordingType' | 'streamQuality'> | false = this.recordingSettingsChanged ? {
                fps: !this.selectedFpsWatcher.value ? this.selectedFpsWatcher.originalValue : this.selectedFpsWatcher.value,
                recordingType: this.recordingModesWatcher.value.find(({ value }) => value === 2)?.id || RecordingType.ALWAYS,
                streamQuality: this.selectedQualityWatcher.value === 'varies' ? null : this.selectedQualityWatcher.value
            } : false;

            const cameraSettings: Pick<ICamera, 'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'overrideAr' | 'rotation' | 'motionType' | 'motionMask'> = {
                id: this.selectedCamera.id,
                name: this.cameraNameWatcher.value,
                audioEnabled: this.audioEnabledWatcher.value,
                overrideAr: `${this.selectedAspectWatcher.value === this.selectedCamera.defaultRatio
                    ? ''
                    : this.selectedAspectWatcher.value}`,
                rotation: `${this.selectedRotationWatcher.value}` || '',
                scheduleEnabled: this.recordingWatcher.value,
                motionType: this.motionType,
                motionMask: this.motionMaskWatcher.value || this.CONFIG.settingsConfig.defaultMotionMask
            };

            return Promise.all([
                this.system.updateRecordingSettings(updatedTask, cameraSettings),
                this.system.serverManager.updateResource(cameraSettings.id, {
                    overrideAr: cameraSettings.overrideAr as string,
                    rotation: cameraSettings.rotation as string,
                })
            ]).then(_ => {
                this.system.cameraManager.cameras = this.system.cameraManager.cameras.map(
                    camera => camera.id === this.selectedCamera.id
                        ? { ...camera, ...cameraSettings }
                        : camera
                );

                return this.system.cameraManager.getCameras().then(res => {
                    this.setCamera();
                    this.toggleMotionGrid();
                    this.settingsService.system = this.system;
                    this.system.systemInfo = this.system;
                    return res;
                });
            });
        }, { ignoreError: true });
    }

    handleBlur(): void {
        this.editMode = false;
        this.handleBlankName();
    }

    handleFocus(): void {
        this.editMode = true;
    }

    handleBlankName(): void {
        if (!this.cameraName) {
            this.cameraName = this.cameraNameWatcher.originalValue;
        }
    }

    credentialsUpdateInProgress: boolean = false;

    updateCredentials() {
        this.credentialsUpdateInProgress = true;
        const update = () => {
            const { cameraCredentialUpdateTimeout } = this.CONFIG;
            this.showUnauthorized = false;
            return of('').pipe(
                delay(cameraCredentialUpdateTimeout),
                switchMap(() => from(this.system.cameraManager.getCameras()).pipe(
                    switchMap(cameras => {
                        const selectedCamera = cameras.find(({ id }) => id === this.selectedCamera.id);
                        const unauthorized = selectedCamera.status === 'Unauthorized';
                        if (unauthorized) {
                            return throwError('Camera Unauthorized');
                        }
                        return of(selectedCamera);
                    }),
                    delay(cameraCredentialUpdateTimeout)
                )),
                retry(5),
                delay(cameraCredentialUpdateTimeout),
                tap(_ => this.settingsService.systemSubject.next(this.system)),
                catchError(err => {
                    console.error(err);
                    return of(err);
                })
            ).toPromise().finally(() => {
                this.credentialsUpdateInProgress = false;
                const selectedCamera = this.system.cameraManager.cameras
                    .find(({ id }) => id === this.selectedCamera.id);
                this.selectedCamera = selectedCamera;
                this.showUnauthorized = selectedCamera.status === 'Unauthorized';
                this.reload$.next(this.reload$.value + 1);
            });
        };
        this.dialogService.updateCameraCredentials(
            this.selectedCamera,
            this.system,
            update
        );
    }

    handleResize({ width }): void {
        this.width$.next(width);
        this.toggleMotionGrid();
    }

    getCanvasSize() {
        const wrapperWidth = this.width$.value;
        const maxCanvasHeightInPixels = 480;
        const rotation = this.selectedRotation.value || 0;
        const rotated = rotation % 180;
        const columnsToRoundPixelsByMultiple = rotated ? 32 : 44;
        const RowsToRoundPixelsByMultiple = rotated ? 44 : 32;
        const defaultAspectRatio = 1.77778;
        const aspect = <number>this.selectedAspect.value || defaultAspectRatio;
        const aspectWithRotation = rotated ? 1 / aspect : aspect;
        const constrainedByHeight = wrapperWidth / aspectWithRotation > maxCanvasHeightInPixels;
        let height, width;

        if (constrainedByHeight) {
            const size = Math.floor(maxCanvasHeightInPixels / RowsToRoundPixelsByMultiple);
            height = RowsToRoundPixelsByMultiple * size;
            width = Math.floor(height * aspectWithRotation / columnsToRoundPixelsByMultiple) * columnsToRoundPixelsByMultiple;
        } else {
            const size = Math.floor(wrapperWidth / columnsToRoundPixelsByMultiple);
            width = columnsToRoundPixelsByMultiple * size;
            height = Math.floor(width / aspectWithRotation / RowsToRoundPixelsByMultiple) * RowsToRoundPixelsByMultiple;
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

    preventContext = event => event.preventDefault();

    checkModeEnabled(id, enabled = this.motionEnabled) {
        return id === RecordingType.ALWAYS ||
            id === RecordingType.NEVER ||
            (id === RecordingType.META_LOW
                ? this.selectedCamera.motionLowResEnabled
                : enabled);
    }

    handleRecordingToggle(switchValue: boolean | undefined): void {
        const needLic = (!this.recording && !this.recordingWatcher.originalValue)
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

    toggleMode({ name: toggledName, enabled }): void {
        if (!enabled) return;
        this.recordingModes = this.recordingModes.map(
            ({ name, id, enabled }) => ({
                name,
                id,
                enabled: this.checkModeEnabled(id, enabled),
                value: name === toggledName ? 2 : 0
            })
        );
    }

    updateMask(maskString): void {
        this.motionMask = maskString;
    }

    toggleMotionEnabled = (): void => {
        this.motionEnabled = !this.motionEnabled;
    };

    disableMotion = (): void => {
        this.motionEnabled = false;
        this.recordingModes = this.recordingModes.map(({ name, id }) => {
            const enabled = id === RecordingType.ALWAYS;
            const value = enabled ? 2 : 0;
            return { name, id, enabled, value };
        });
        this.updateMotionWarning();
    };

    enableMotion = (updateModes = false): void => {
        this.motionEnabled = true;
        if (updateModes) {
            this.recordingModes = this.recordingModes.map(({ name, id }) => {
                const enabled = this.checkModeEnabled(id);
                const value =
                    [RecordingType.MOTION_ONLY, RecordingType.META_ONLY].includes(id)
                        ? 2
                        : 0;
                return { name, id, enabled, value };
            });
        } else {
            this.updateMotionWarning();
        }
    };

    updateMotionWarning(): void {
        const [
            // always,
            motion,
            lowMotion
        ] = this.recordingModesWatcher.originalValue;
        const show = this.motionEnabledWatcher.value &&
            this.motionEnabledWatcher.changed &&
            (motion.value + lowMotion.value);
        this.applyService.setWarn(
            show ? this.LANG.common.disableMotionWarning?.() : ''
        );
    }

    getSupportedMotion() {
        const softwareGrid = {
            id: MotionType.softwareGrid,
            value: 'softwaregrid'
        };
        const hardwaregrid = {
            id: MotionType.hardwareGrid,
            value: 'hardwaregrid'
        };

        const {
            selectedCamera: {
                parsedAddParams: { supportedMotion, motionStream }
            }
        } = this;
        return supportedMotion === hardwaregrid.value || typeof motionStream === 'undefined'
            ? hardwaregrid.id
            : softwareGrid.id;
    }

    setCamera = (forceUpdate = false) => {
        this.applyService.reset(true);
        this.applyService.setVisible(false);
        if (
            this.selectedCamera &&
            this.parsedCameraId === this.selectedCamera?.id &&
            !forceUpdate
        ) {
            return;
        }

        if (
            this.selectedCamera &&
            this.parsedCameraId !== this.selectedCamera?.id
        ) {
            this.showOffline = false;
            this.showUnauthorized = false;
            this.credentialsUpdateInProgress = false;
            this.alerts = [];
        }

        let cameraIndex: number;
        if (this.system && this.system.cameraManager.cameras) {
            this.enableEdit = this.system.userManager.permissions.isAdmin ||
                this.system.userManager.permissions.editCameras;
            const { cameras } = this.system.cameraManager;
            cameraIndex = cameras
                .findIndex(camera => camera?.id === `{${this.parsedCameraId}}`);
            this.system.show404 = (!!this.parsedCameraId && cameraIndex === -1) ||
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
                this.parsedCameraId =
                    cameras[cameraIndex].id.replace(/\s|\{|\}/g, '');
                this.uriService
                    .updateURI(this.uriService.getSystemSettingsRoute({
                        systemId: this.system.id,
                        cameraId: this.parsedCameraId
                    }))
                    .catch(error => {
                        console.error(error);
                    });
            }
            this.cameraViewPath = this.uriService.getSystemSettingsRoute({
                systemId: this.system.id,
                childRoute: ChildRoutes.VIEW
            }) + this.parsedCameraId;
            this.menuService.detail = this.parsedCameraId;
            this.selectedCamera = cameras[cameraIndex];
            const { vendor, model, url, parentName, deviceType } = this.selectedCamera;
            this.settingsDisabled = (deviceType !== 'Camera' || !vendor);
            this.settingsRecordingDisabled = environment.isLocal || (deviceType !== 'Camera' || !vendor);
            const deviceColumn = [
                new InfoBlockSection([
                    new InfoBlockLine(this.LANG.common.vendor(), vendor),
                    new InfoBlockLine(this.LANG.common.model(), model)
                ])
            ];
            const otherInfoColumn = [
                new InfoBlockSection([
                    new InfoBlockLine(this.LANG.common.ip(), url),
                    new InfoBlockLine(this.LANG.common.server(), parentName)
                ])
            ];
            this.cameraDetailColumns = this.selectedCamera.isStream
                ? [otherInfoColumn]
                : [deviceColumn, otherInfoColumn];
            this.cameraName = this.selectedCamera.name;
            this.motionGridChangeWatcher.originalValue = false;
            // Setup the automatic value based on the camera's dimensions
            this.aspectRatios[0].value = this.selectedCamera.defaultRatio > 0
                ? this.selectedCamera.defaultRatio
                : '';
            this.selectedAspect = this.aspectRatios.find(({ value: id }) =>
                id === parseFloat(<string>this.selectedCamera.overrideAr)
            ) || this.aspectRatios[0];
            this.selectedRotation = this.rotations.find(({ value: id }) =>
                id === parseInt(<string>this.selectedCamera.rotation)
            ) || this.rotations[0];
            this.audioEnabled = this.selectedCamera.audioEnabled;
            this.recordingModesWatcher.value = this.selectedCamera.recordingSettings.modes;
            this.selectedQuality = [...this.streamQualities, this.various]
                .find(({ value: id }) =>
                    id === this.selectedCamera.recordingSettings.quality
                ) || this.various;
            this.selectedFps = this.selectedCamera.recordingSettings.fps;
            this.recordingWatcher.value = this.selectedCamera.recordingSettings.recording;
            this.recordingSettings = this.selectedCamera.recordingSettings;
            this.motionType = this.selectedCamera.motionType;
            this.motionMaskWatcher.originalValue = this.selectedCamera.motionMask ||
                this.CONFIG.settingsConfig.defaultMotionMask;
            this.updateValues();
            this.applyService.reset();
            this.applyService.setVisible();
            this.system.getLicenseChannels().then(({ available }) => {
                this.availableLicenses = available;
            }).catch(_ => {
                this.availableLicenses = 0;
            });
            this.showPreloader = false;
        } else {
            this.noCameras = true;
        }
    };

    private updateAlerts(): void {
        const currentAlerts = (this.alerts || []).find(({ cameraId }) =>
            cameraId === this.parsedCameraId
        );
        const unauthorizedMessage = 'camera is unauthorized';
        const offlineMessage = 'camera is offline';
        if (currentAlerts) {
            this.warnings = currentAlerts.warnings;
            this.errors = currentAlerts.errors.filter(error =>
                error.toLowerCase() !== unauthorizedMessage &&
                error.toLowerCase() !== offlineMessage
            );
        }
        this.showUnauthorized = this.selectedCamera &&
            this.selectedCamera.status === 'Unauthorized';

        // @ts-expect-error
        if (this.showUnauthorized && this.route.fragment.value === 'authorize') {
            if (!this.credentialsUpdateInProgress) {
                this.updateCredentials();
            }
        }

        this.showOffline = this.selectedCamera &&
            this.selectedCamera.status === 'Offline';
        this.alertsLoaded = true;
    }

    updateValues(): void {
        this.healthService.ready = false;
        if (this.system.canViewInfo) {
            this.healthReportSubscription = this.system.mediaserver
                .getAggregateHealthReport()
                .pipe(untilDestroyed(this))
                .subscribe(
                    (result: any) => {
                        this.applyService.setVisible();
                        const alerts = result &&
                            result.reply &&
                            result.reply['ec2/metrics/alarms'] &&
                            result.reply['ec2/metrics/alarms'].reply.cameras;
                        this.alerts = Object.entries(alerts || {}).map(
                            ([cameraId, alertInfo]) =>
                                new Alert(cameraId, alertInfo, 'Camera')
                        );
                        this.updateAlerts();
                    },
                    () => {
                        if (!this.system.id) {
                            !this.window.parent
                                ? this.window.location.reload()
                                : this.window.parent.location.reload();
                        }
                    }
                );
        } else {
            this.updateAlerts();
        }
    }

    toggle(property: string, disabled = false): void {
        if (disabled) return;
        this.selectedCamera[property] = !this.selectedCamera[property];
    }

    lockGrid(lock: boolean): void {
        if (!this.isMobile) {
            this.motionGridChangeWatcher.value = lock;
        }
    }

    // storePreviousValue(e) {
    //     if (e.key.length === 1 && e.key.match(/[a-zA-Z\W]/)) { // Fix typing non-numerical chars (especially valid for FF)
    //         e.preventDefault();
    //     }
    // }
}
