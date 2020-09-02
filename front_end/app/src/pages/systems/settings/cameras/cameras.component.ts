import {
    Component, OnDestroy, OnInit, Inject, ViewContainerRef
}                                    from '@angular/core';
import { NxConfigService, IConfig }  from '../../../../services/nx-config';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { LanguageI18NStaticTypes }   from '../../../../../language_i18n_static_types';
import {
    NxSystem, ICamera, StreamQuality, IRecordingSettings, ITask, IRecordingModes, MotionType
}                                    from '../../../../services/system.service';
import {
    Subscription, BehaviorSubject, Subject, from, throwError, of, Observable
}                                    from 'rxjs';
import {
    filter, map, retryWhen, delay, distinctUntilChanged, takeUntil, retry, tap, catchError, mergeMap, switchMap
}                                    from 'rxjs/operators';
import { ActivatedRoute, Router }    from '@angular/router';
import { NxUriService }              from '../../../../services/uri.service';

import { NxHealthService }           from '../../../health/health.service';
import { WINDOW }                    from '../../../../services/window-provider';
import { Watcher, NxApplyService }   from '../../../../services/apply.service';
import { Process, NxProcessService } from '../../../../services/process.service';
import { NxDialogsService }          from '../../../../dialogs/dialogs.service';
import {
    InfoBlockLine, InfoBlockSection, InfoBlockColumns
}                                    from '../../../../components/info-block/info-block.component';

@Component({
    selector    : 'nx-cameras-component',
    templateUrl : 'cameras.component.html',
    styleUrls   : ['cameras.component.scss']
})
export class NxCamerasComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    unsub$: Subject<boolean> = new Subject();
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
    fullInfoPath: string;
    cameraViewPath: string;
    alerts: Alert[];
    saveSettings: Process
    various: ISelect;
    auto: ISelect;
    aspectRatios: ISelect[];
    rotations: ISelect[];
    streamQualities: ISelect[];
    maxFps: number = 30;
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

    motionGridChangeWatcher = new Watcher<boolean>();
    cameraNameWatcher = new Watcher();
    selectedAspectWatcher = new Watcher();
    selectedRotationWatcher: Watcher<any> = new Watcher();
    audioEnabledWatcher = new Watcher();
    recordingWatcher = new Watcher();
    recordingModesWatcher: Watcher<IRecordingModes[]> = new Watcher();
    selectedFpsWatcher = new Watcher();
    selectedQualityWatcher = new Watcher();
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
        const aspect = <number> this.selectedAspect.value || defaultAspectRatio;
        const rotated = <number> this.selectedRotation.value % 180;
        return rotated ? height / aspect : aspect * height;
    }

    get selectedAspect() {
        return this.aspectRatios.find(({ value: id }) => this.selectedAspectWatcher.value === id);
    }

    set selectedAspect(value) {
        this.showOverlay = false;
        this.selectedAspectWatcher.value = value.value;
        setTimeout(() => {
            this.showOverlay = true;
        });
    }

    get aspectClass() {
        let aspect: ISelect;
        if (this.selectedAspectWatcher.value) {
            aspect = this.aspectRatios.find(({ value: id }) => this.selectedAspectWatcher.value === id);
        } else {
            aspect = this.aspectRatios[1];
        }
        const [width, height] = (aspect.value ? aspect.name : this.selectedAspect[1].name).split(':');
        return `${width}-${height}`;
    }

    get maxHeight() {
        const aspect = (this.selectedAspect.value as number || this.aspectRatios[1].value as number);
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
        return Math.ceil((this.selectedAspect.value as number || this.aspectRatios[1].value as number) * this.maxHeight / 44) * 44;
    }

    get canvasWidth() {
        return Math.floor(this.previewWrapperWidth / 44) * 44;
    }

    get canvasHeight() {
        const aspect = <number> this.selectedAspect.value || <number> this.aspectRatios[1].value;
        return Math.min(Math.floor(this.canvasWidth / aspect / 32) * 32, this.maxHeight);
    }

    public get preview() {
        return this.system.getPreviewUrl(
            this.selectedCamera.id,
            null,
            (this.selectedAspect.value as number || this.aspectRatios[1].value as number) * this.maxHeight * 2,
            this.maxHeight * 2,
            <number> this.selectedRotation.value || 0
        );
    }

    get sensitivityButtons() {
        return this.sensitivityButtons$.value;
    }

    set sensitivityButtons(value) {
        this.sensitivityButtons$.next(value);
    }

    get selectedRotation() {
        return this.rotations.find(({ value: id }) => this.selectedRotationWatcher.value === id);
    }

    set selectedRotation(value) {
        this.selectedRotationWatcher.value = value.value;
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
        return !this.recordingWatcher.originalValue && this.recordingWatcher.value;
    }

    get existingRecordingsScheduled() {
        let type;
        let fps;
        let quality;
        return !this.recordingSettingsChanged &&
            this.selectedCamera.scheduleTasks.length &&
            !this.selectedCamera.scheduleTasks.every(({ recordingType }) => recordingType === 'RT_Never') &&
            !this.selectedCamera.scheduleTasks.every(({ recordingType, fps: currentFps, streamQuality }, index) => {
                if (index === 0) {
                    type = recordingType;
                    fps = currentFps;
                    quality = streamQuality;
                    return true;
                }
                return recordingType === type && fps === currentFps && quality === streamQuality;
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
                this.enableMotion();
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
        (!this.selectedCamera.scheduleTasks.length ||
            this.selectedCamera.scheduleTasks.every(({ recordingType }) => recordingType === 'RT_Never')) ||
            !this.variousQualities && !this.variousFps && !this.existingModesSelected;
    }

    get selectedFps() {
        return this.selectedFpsWatcher.value;
    }

    set selectedFps(value) {
        this.selectedFpsWatcher.value = !value ? value : Math.min(value, this.selectedCamera.maxFps);
    }

    get variousFps() {
        return this.selectedFps === 'various' || !this.selectedFps;
    }

    get selectedQuality() {
        return [...this.streamQualities, this.various].find(({ value: id }) => this.selectedQualityWatcher.value === id);
    }

    set selectedQuality(value) {
        this.selectedQualityWatcher.value = value.value;
    }

    get variousQualities() {
        return this.selectedQuality.value === this.various.value;
    }

    get motionEnabled() {
        return this.motionEnabledWatcher.value !== MotionType.noMotion;
    }

    set motionEnabled(enabled) {
        this.motionEnabledWatcher.value = !enabled ? MotionType.noMotion : this.motionEnabledWatcher.originalValue !== MotionType.noMotion
            ? this.motionEnabledWatcher.originalValue : this.getSupportedMotion();

        this.recordingModes = this.recordingModes.map(({ id, ...mode }) => ({
            ...mode, id, enabled: (id === 'RT_Always' || id === 'RT_Never') || enabled
        }));
    }

    get motionMask() {
        return this.motionMaskWatcher.value;
    }

    set motionMask(value) {
        this.motionMaskWatcher.value = value;
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
        @Inject(WINDOW) private window: Window,
        @Inject(ViewContainerRef) viewContainerRef
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
        this.updateSelects();
        this.viewContainerRef = viewContainerRef;
        this.menuService.setSection('cameras');
    }

    ngOnInit() {
        this.routeParamsSubscription = this.route
            .params
            .pipe(
                takeUntil(this.unsub$),
                distinctUntilChanged()
            ).subscribe(params => {
                if (params.cameraId) {
                    this.warnings = [];
                    this.errors = [];
                    this.showUnauthorized = false;
                    this.showOverlay = false;
                    this.menuService.setDetailsSection(params.cameraId);
                    this.cameraIdFromParams = params.cameraId;
                    this.parsedCameraId = params.cameraId.replace(/\s|\{|\}/g, '');
                    if (!this.applyService.locked) {
                        this.setCamera();
                    }
                }
            });

        this.settingsSubscription = this.settingsService.systemSubject
            .pipe(
                takeUntil(this.unsub$),
                filter(data => data !== undefined)
            ).subscribe(system => {
                this.settingsService.footerSubject.next(true);
                if (system) {
                    this.system = system;
                    this.system.getInfoAndPermissions(false).catch(() => {}).then(() => {
                        if (!this.system.isOnline) {
                            this.showPreloader = false;
                            this.alertsLoaded = true;
                            this.noCameras = this.system.cameras && this.system.cameras.length === 0;
                        }
                        this.cameraViewPath = this.CONFIG.menus.systemSettings.baseUrl + this.system.id + '/view/' + this.parsedCameraId;
                        this.canSeeInfo = (this.CONFIG.cloudCapabilities.healthMonitoring ||
                            this.system.info.capabilities &&
                            this.system.info.capabilities.vms_metrics) &&
                            this.system.canViewInfo();
                        this.initUpdateProcess();
                        if (this.canSeeInfo) {
                            this.fullInfoPath = this.CONFIG.menus.systemSettings.baseUrl + this.system.id + this.CONFIG.menus.systemHealth.baseUrl + this.CONFIG.menus.systemSettings.cameras.path;
                        }
                    });
                } else {
                    this.showPreloader = false;
                    this.alertsLoaded = true;
                    this.noCameras = false;
                }
                if (this.cameraSubscription) {
                    this.cameraSubscription.unsubscribe();
                }
                this.cameraSubscription = this.system.infoSubject
                    .pipe(
                        takeUntil(this.unsub$),
                        map(system => {
                            if (!system.cameras) {
                                throw system;
                            }
                        }),
                        retryWhen(err => err.pipe(delay(1000)))
                    )
                    .subscribe(() => {
                        if (!this.system.permissions.editCameras) {
                            return this.router.navigate(['systems', this.system.id])
                                .catch(error => console.error(error));
                        }
                        this.updateValues();
                        if (this.system.currentServerNotBusy) {
                            if (this.system && this.system.cameras && this.system.cameras.length) {
                                this.system.initSystemMediaServers();
                            }
                            if (!this.applyService.locked) this.setCamera();
                        }
                        this.noCameras = this.system && this.system.cameras && this.system.cameras.length === 0;
                        if (this.noCameras) {
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

    ngOnDestroy() {
        this.unsub$.next(true);
    }

    // Update menu options after language is loaded
    updateSelects() {
        this.various = { name: this.LANG.common.resolution.various, value: 'various' };
        this.auto = { name: this.LANG.common.resolution.auto, value: '' };
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
            { name: this.LANG.common.resolution.best, value: 'highest' },
            { name: this.LANG.common.resolution.high, value: 'high' },
            { name: this.LANG.common.resolution.medium, value: 'normal' },
            { name: this.LANG.common.resolution.low, value: 'low' }
        ];
    }

    // Process for apply service
    initUpdateProcess() {
        this.saveSettings = this.processService.createProcess(() => {
            if (!this.safeToUpdateRecordingSettings) {
                return this.applyService.setWarn(this.LANG.common.recordingSettingsWarning);
            }
            const updatedTask: Pick<ITask, 'fps' | 'recordingType' | 'streamQuality'> | false = this.recordingSettingsChanged ? {
                fps           : !this.selectedFpsWatcher.value ? this.selectedFpsWatcher.originalValue : this.selectedFpsWatcher.value,
                recordingType : this.recordingModesWatcher.value.find(({ value }) => value === 2).id || 'RT_Always',
                streamQuality : this.selectedQualityWatcher.value === 'varies' ? null : this.selectedQualityWatcher.value
            } : false;
            const cameraSettings: Pick<ICamera, 'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'overrideAr' | 'rotation' | 'motionType' | 'motionMask'> = {
                id              : this.selectedCamera.id,
                name            : this.cameraNameWatcher.value,
                audioEnabled    : this.audioEnabledWatcher.value,
                overrideAr      : `${this.selectedAspectWatcher.value}` || '',
                rotation        : `${this.selectedRotationWatcher.value}` || '',
                scheduleEnabled : this.recordingWatcher.value,
                motionType      : this.motionType,
                motionMask      : this.motionMaskWatcher.value || this.CONFIG.settingsConfig.defaultMotionMask
            };
            return Promise.all([
                this.system.updateRecordingSettings(updatedTask, cameraSettings),
                this.system.updateCameraSettings(cameraSettings.id, {
                    overrideAr: cameraSettings.overrideAr, rotation: cameraSettings.rotation
                })
            ]).then(_ => this.system.getCameras().then(res => {
                this.applyService.reset();
                this.setCamera();
                this.toggleMotionGrid();
                this.settingsService.system = this.system;
                return res;
            }));
        });
    }

    handleBlur() {
        this.editMode = false;
        this.handleBlankName();
    }

    handleFocus() {
        this.editMode = true;
    }

    handleBlankName() {
        if (!this.cameraName) {
            this.cameraName = this.cameraNameWatcher.originalValue;
        }
    }

    updateCredentials() {
        const update = () => {
            const { cameraCredentialUpdateTimeout } = this.CONFIG;
            this.showUnauthorized = false;
            return of('').pipe(
                delay(cameraCredentialUpdateTimeout),
                switchMap(() => from(this.system.getCameras()).pipe(
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
                const selectedCamera = this.system.cameras.find(({ id }) => id === this.selectedCamera.id);
                this.selectedCamera = selectedCamera;
                this.showUnauthorized = selectedCamera.status === 'Unauthorized';
                this.reload$.next(this.reload$.value + 1);
            });
        };
        this.dialogService.updateCameraCredentials(this.selectedCamera, this.system, update);
    }

    handleResize({ width }) {
        this.width$.next(width);
        this.toggleMotionGrid();
    }

    getCanvasSize() {
        const wrapperWidth = this.width$.value;
        const maxCanvasHeightinPixels = 480;
        const rotation = <number> this.selectedRotation.value || 0;
        const rotated = <number>rotation % 180;
        const columnsToRoundPixelsByMultiple = rotated ? 32 : 44;
        const RowsToRoundPixelsByMultiple = rotated ? 44 : 32;
        const defaultAspectRatio = 1.77778;
        const aspect = <number> this.selectedAspect.value || defaultAspectRatio;
        const aspectWithRotation = rotated ? 1 / aspect : aspect;
        const constrainedByHeight = wrapperWidth / aspectWithRotation > maxCanvasHeightinPixels;
        let height, width;

        if (constrainedByHeight) {
            const size = Math.floor(maxCanvasHeightinPixels / RowsToRoundPixelsByMultiple);
            height = RowsToRoundPixelsByMultiple * size;
            width = Math.floor(height * aspectWithRotation / columnsToRoundPixelsByMultiple) * columnsToRoundPixelsByMultiple;
        } else {
            const size = Math.floor(wrapperWidth / columnsToRoundPixelsByMultiple);
            width = columnsToRoundPixelsByMultiple * size;
            height = Math.floor(width / aspectWithRotation / RowsToRoundPixelsByMultiple) * RowsToRoundPixelsByMultiple;
        }
        return { width, height };
    }

    toggleMotionGrid() {
        this.showOverlay = false;
        this.sensitivityButtons = false;
        setTimeout(() => {
            this.showOverlay = true;
        });
    }

    resetSensitivity() {
        this.sensitivityButtons = 'reset';
    }

    preventContext = event => event.preventDefault();

    handleRecordingToggle() {
        if (!this.recording && this.availableLicenses <= 0) {
            this.shakeHint = true;
            setTimeout(() => {
                this.shakeHint = false;
            }, 500);
        } else {
            this.recording = !this.recording;
        }
    }

    toggleMode({ name: toggledName, enabled }) {
        if (!enabled) return;
        this.recordingModes = this.recordingModes.map(({ name, id, enabled }) => ({
            name, id, enabled, value: name === toggledName ? 2 : 0
        }));
    }

    updateMask(maskString) {
        this.motionMask = maskString;
    }

    set motionType(value: MotionType) {
        this.motionEnabledWatcher.value = value;
    }

    get motionType(): MotionType {
        return this.motionEnabledWatcher.value;
    }

    toggleMotionEnabled = () => {
        this.motionEnabled = !this.motionEnabled;
    }

    disableMotion = () => {
        this.motionEnabled = false;
        this.recordingModes = this.recordingModes.map(({ name, id }) => {
            const enabled = id === 'RT_Always';
            const value =  enabled ? 2 : 0;
            return { name, id, enabled, value };
        });
    }

    enableMotion = () => {
        this.motionEnabled = true;
        this.recordingModes = this.recordingModes.map(({ name, id }) => {
            const enabled = id === 'RT_Always' || this.motionEnabled;
            const value =  id === 'RT_MotionOnly' ? 2 : 0;
            return { name, id, enabled, value };
        });
    }

    getSupportedMotion() {
        const softwareGrid = {
            id    : MotionType.softwareGrid,
            value : 'softwaregrid'
        };
        const hardwaregrid = {
            id    : MotionType.hardwareGrid,
            value : 'hardwaregrid'
        };

        const { selectedCamera: { parsedAddParams: { supportedMotion, motionStream } } } = this;
        return supportedMotion === hardwaregrid.value || typeof motionStream === 'undefined' ? hardwaregrid.id : softwareGrid.id;
    }

    setCamera = (forceUpdate = false) => {
        this.applyService.setVisible(false);
        if (this.selectedCamera && this.parsedCameraId === this.selectedCamera.id && !forceUpdate) {
            return;
        }

        if (this.selectedCamera && this.parsedCameraId !== this.selectedCamera.id) {
            this.showOffline = false;
            this.showUnauthorized = false;
            this.alerts = [];
        }

        if (
            this.system &&
            this.system.cameras &&
            this.system.cameras.length > 0 &&
            this.applyService &&
            this.applyService.applyComponentRef &&
            this.applyService.applyComponentRef.instance &&
            !this.applyService.locked
        ) {
            this.applyService.hardReset();
            let cameraIndex = this.system.cameras.findIndex(camera => camera.id === `{${this.parsedCameraId}}`);

            if (cameraIndex === -1) {
                cameraIndex = 0;
                this.parsedCameraId = this.system.cameras[cameraIndex].id.replace(/\s|\{|\}/g, '');
                this.uriService
                    .updateURI(`systems/${this.system.id}/cameras/${this.parsedCameraId}`)
                    .catch(error => {
                        console.error(error);
                    });
            }
            this.cameraViewPath = this.CONFIG.menus.systemSettings.baseUrl + this.system.id + '/view/' + this.parsedCameraId;
            this.menuService.setDetailsSection(this.parsedCameraId);
            this.selectedCamera = this.system.cameras[cameraIndex];
            const { vendor, model, url, parentName } = this.selectedCamera;
            this.cameraDetailColumns = [
                [
                    new InfoBlockSection([
                        new InfoBlockLine(this.LANG.common.vendor, vendor),
                        new InfoBlockLine(this.LANG.common.model, model)
                    ])
                ],
                [
                    new InfoBlockSection([
                        new InfoBlockLine(this.LANG.common.ip, url),
                        new InfoBlockLine(this.LANG.common.server, parentName)
                    ])
                ]
            ];
            this.cameraName = this.selectedCamera.name;
            this.motionGridChangeWatcher.originalValue = false;
            const aspect = this.aspectRatios.find(({ value: id }) => id === parseFloat(<string> this.selectedCamera.overrideAr)) || this.aspectRatios[0];
            this.selectedAspect = aspect;
            this.selectedRotation = this.rotations.find(({ value: id }) => id === parseInt(<string> this.selectedCamera.rotation)) || this.rotations[0];
            this.audioEnabled = this.selectedCamera.audioEnabled;
            this.recordingModesWatcher.value = this.selectedCamera.recordingSettings.modes;
            this.selectedQuality = [...this.streamQualities, this.various].find(({ value: id }) => id === this.selectedCamera.recordingSettings.quality) || this.various;
            this.selectedFps = this.selectedCamera.recordingSettings.fps;
            this.recordingWatcher.value = this.selectedCamera.recordingSettings.recording;
            this.recordingSettings = this.selectedCamera.recordingSettings;
            this.motionType = this.selectedCamera.motionType;
            this.motionMaskWatcher.originalValue = this.selectedCamera.motionMask || this.CONFIG.settingsConfig.defaultMotionMask;
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
    }

    private updateAlerts() {
        const currentAlerts = (this.alerts || []).find(({ cameraId }) => cameraId === this.parsedCameraId);
        const unauthorizedMessage = 'camera is unauthorized';
        const offlineMessage = 'camera is offline';
        if (currentAlerts) {
            this.warnings = currentAlerts.warnings;
            this.errors = currentAlerts.errors.filter(error => error.toLowerCase() !== unauthorizedMessage && error.toLowerCase() !== offlineMessage);
        }
        this.showUnauthorized = this.selectedCamera && this.selectedCamera.status === 'Unauthorized';
        this.showOffline = this.selectedCamera && this.selectedCamera.status === 'Offline';
        this.alertsLoaded = true;
    }

    updateValues() {
        this.healthService.ready = false;
        if (this.system.canViewInfo) {
            this.healthReportSubscription = this.system.mediaserver
                .getAggregateHealthReport()
                .pipe(takeUntil(this.unsub$))
                .subscribe(
                    result => {
                        this.applyService.setVisible();
                        const alerts = result && result.reply && result.reply['ec2/metrics/alarms'] && result.reply['ec2/metrics/alarms'].reply.cameras;
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

    toggle(property: string, disabled = false) {
        if (disabled) return;
        this.selectedCamera[property] = !this.selectedCamera[property];
    }

    lockGrid(lock: boolean) {
        this.motionGridChangeWatcher.value = lock;
    }
}

export class Alert {
    errors: string[] = [];
    warnings: string[] = [];
    constructor(public cameraId: string, alertInfo, prefix: string) {
        Object.values(alertInfo.availability || {}).forEach((_: any[] = []) =>
            _.forEach(item => {
                if (item && item.level && item.text && this[`${item.level}s`]) {
                    this[`${item.level}s`].push(`${prefix} ${item.text}`);
                }
            })
        );
    }
}

export interface ISelect {
    name: string;
    value: number | '' | StreamQuality;
}
