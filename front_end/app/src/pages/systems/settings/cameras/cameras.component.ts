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
    Subscription, BehaviorSubject, Subject
}                                    from 'rxjs';
import {
    filter, map, retryWhen, delay, distinctUntilChanged, takeUntil
}                                    from 'rxjs/operators';
import { ActivatedRoute }            from '@angular/router';
import { NxUriService }              from '../../../../services/uri.service';

import { NxHealthService }           from '../../../health/health.service';
import { WINDOW }                    from '../../../../services/window-provider';
import { Watcher, NxApplyService }   from '../../../../services/apply.service';
import { Process, NxProcessService } from '../../../../services/process.service';
import { NxDialogsService }          from '../../../../dialogs/dialogs.service';

@Component({
    selector    : 'nx-cameras-component',
    templateUrl : 'cameras.component.html',
    styleUrls   : ['cameras.component.scss']
})
export class NxCamerasComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    viewContainerRef: ViewContainerRef;
    system: NxSystem;
    settingsSubscription: Subscription;
    routeParamsSubscription: Subscription;
    healthReportSubscription: Subscription;
    cameraSubscription: Subscription;
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
    showOverlay = false;
    unsub$: Subject<boolean> = new Subject();
    showPreloader = true;
    availableLicenses = 0;

    sensitivityColors = new Array(10);

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
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
        this.LANG = language.getTranslations();
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
                    this.setCamera();
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
                    this.system.getInfoAndPermissions(false).catch(() => {}).then((system: NxSystem) => {
                        this.cameraViewPath = this.CONFIG.menus.systemSettings.baseUrl + system.id + '/view/' + this.parsedCameraId;
                        this.canSeeInfo = (this.CONFIG.cloudCapabilities.healthMonitoring ||
                            system.info.capabilities &&
                            system.info.capabilities.vms_metrics) &&
                            this.system.canViewInfo();
                        this.initUpdateProcess();
                        if (this.canSeeInfo) {
                            this.fullInfoPath = this.CONFIG.menus.systemSettings.baseUrl + system.id + this.CONFIG.menus.systemHealth.baseUrl + this.CONFIG.menus.systemSettings.cameras.path;
                        }
                    });
                }
                if (!this.system.isOnline) {
                    this.showPreloader = false;
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
                        this.updateValues();
                        if (this.system.currentServerNotBusy) {
                            if (this.system && this.system.cameras && this.system.cameras.length) {
                                this.system.initSystemMediaServers();
                            } else {
                                this.showPreloader = false;
                            }
                            this.setCamera();
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
                this.motionMaskWatcher
            ]);
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
            this.auto,
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
                motionMask      : this.motionMaskWatcher.value || '5,0,0,44,32'
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

    // Basic Settings
    cameraNameWatcher = new Watcher()
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

    editMode = false;
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
            this.showUnauthorized = false;
            return this.system.getCameras().then(() => {
                this.setCamera(true);
                this.reload += 1;
                this.settingsService.system = this.system;
            });
        };

        this.dialogService.updateCameraCredentials(this.selectedCamera, this.system, update);
    }

    selectedAspectWatcher = new Watcher()
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

    width$ = new BehaviorSubject(0);
    get height() {
        return this.getCanvasSize().height;
    }

    get width() {
        return this.getCanvasSize().width;
    }

    handleResize({ width }) {
        this.width$.next(width);
        this.toggleMotionGrid();
    }

    getCanvasSize() {
        const wrapperWidth = this.width$.value;
        const maxCanvasHeightinPixels = 480;
        const columnsToRoundPixelsByMultiple = 44;
        const RowsToRoundPixelsByMultiple = 32;
        const defaultAspectRatio = 1.77778;
        const aspect = <number> this.selectedAspect.value || defaultAspectRatio;
        const rotation = <number> this.selectedRotation.value || 0;
        const aspectWithRotation = <number>rotation % 180 ? 1 / aspect : aspect;
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

    private get _preview() {
        return this.system.getPreviewUrl(
            this.selectedCamera.id,
            null,
            (this.selectedAspect.value as number || this.aspectRatios[1].value as number) * this.maxHeight * 2,
            this.maxHeight * 2,
            <number> this.selectedRotation.value || 0
        );
    }

    private reload = 0;

    get motionPreviewImage() {
        return this._preview + `&reload=${this.reload}`;
    }

    toggleMotionGrid() {
        this.showOverlay = false;
        this.sensitivityButtons = false;
        setTimeout(() => {
            this.showOverlay = true;
        });
    }

    sensitivityButtons$: BehaviorSubject<boolean | number | 'reset'> = new BehaviorSubject(false);
    get sensitivityButtons() {
        return this.sensitivityButtons$.value;
    }

    set sensitivityButtons(value) {
        this.sensitivityButtons$.next(value);
    }

    resetSensitivity() {
        this.sensitivityButtons = 'reset';
    }

    preventContext = event => event.preventDefault();

    selectedRotationWatcher: Watcher<any> = new Watcher()
    get selectedRotation() {
        return this.rotations.find(({ value: id }) => this.selectedRotationWatcher.value === id);
    }

    set selectedRotation(value) {
        this.selectedRotationWatcher.value = value.value;
    }

    audioEnabledWatcher = new Watcher()
    get audioEnabled() {
        return this.audioEnabledWatcher.value;
    }

    set audioEnabled(value) {
        this.audioEnabledWatcher.value = value;
    }

    // Recording Settings
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

    recordingWatcher = new Watcher()
    get recording() {
        return this.recordingWatcher.value;
    }

    set recording(value) {
        if (value === this.recording) {
            return;
        }

        if (value && !this.availableLicenses) {
            this.recordingWatcher.value = true;
            setTimeout(() => {
                this.recordingWatcher.value = false;
            }, 500);
            return;
        }

        if (this.motionEnabled) {
            this.enableMotion();
        } else {
            this.disableMotion();
        }
        this.recordingWatcher.value = value;
    }

    recordingModesWatcher: Watcher<IRecordingModes[]> = new Watcher()
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

    toggleMode({ name: toggledName, enabled }) {
        if (!enabled) return;
        this.recordingModes = this.recordingModes.map(({ name, id, enabled }) => ({
            name, id, enabled, value: name === toggledName ? 2 : 0
        }));
    }

    selectedFpsWatcher = new Watcher()
    get selectedFps() {
        return this.selectedFpsWatcher.value;
    }

    set selectedFps(value) {
        this.selectedFpsWatcher.value = Math.min(value, this.selectedCamera.maxFps);
    }

    get variousFps() {
        return this.selectedFps === 'various' || !this.selectedFps;
    }

    selectedQualityWatcher = new Watcher()
    get selectedQuality() {
        return [...this.streamQualities, this.various].find(({ value: id }) => this.selectedQualityWatcher.value === id);
    }

    set selectedQuality(value) {
        this.selectedQualityWatcher.value = value.value;
    }

    get variousQualities() {
        return this.selectedQuality.value === this.various.value;
    }

    recordingSettings: IRecordingSettings;

    // Motion Detection
    motionEnabledWatcher: Watcher<string> = new Watcher()
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

    motionMaskWatcher: Watcher<string> = new Watcher();
    get motionMask() {
        return this.motionMaskWatcher.value;
    }

    set motionMask(value) {
        this.motionMaskWatcher.value = value;
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

    canSeeInfo = false;

    ngOnDestroy() {
        this.unsub$.next(true);
    }

    setCamera = (forceUpdate = false) => {
        if (this.selectedCamera && this.parsedCameraId === this.selectedCamera.id && !forceUpdate) {
            return;
        }

        if (this.system && this.system.cameras && this.system.cameras.length > 0 && !this.applyService.locked) {
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

            this.menuService.setDetailsSection(this.parsedCameraId);
            this.selectedCamera = this.system.cameras[cameraIndex];
            this.showPreloader = false;
            this.cameraName = this.selectedCamera.name;
            const aspect = this.aspectRatios.find(({ value: id }) => id === this.selectedCamera.overrideAr) || this.aspectRatios[0];
            this.selectedAspect = aspect;
            this.selectedRotation = this.rotations.find(({ value: id }) => id === this.selectedCamera.rotation) || this.rotations[0];
            this.audioEnabled = this.selectedCamera.audioEnabled;
            this.recordingModesWatcher.value = this.selectedCamera.recordingSettings.modes;
            this.selectedQuality = [...this.streamQualities, this.various].find(({ value: id }) => id === this.selectedCamera.recordingSettings.quality) || this.various;
            this.selectedFps = this.selectedCamera.recordingSettings.fps;
            this.recordingWatcher.originalValue = this.selectedCamera.recordingSettings.recording;
            this.recordingSettings = this.selectedCamera.recordingSettings;
            this.motionType = this.selectedCamera.motionType;
            this.motionMaskWatcher.originalValue = this.selectedCamera.motionMask;
            this.updateValues();
            this.applyService.reset();
            this.applyService.setVisible();
            this.system.getLicenseChannels().then(({ available }) => {
                this.availableLicenses = available;
            });
        }
    }

    private updateAlerts() {
        const currentAlerts = (this.alerts || []).find(({ cameraId }) => cameraId === this.parsedCameraId);
        const unauthorizedMessage = 'camera is unauthorized';
        if (currentAlerts) {
            this.warnings = currentAlerts.warnings;
            this.errors = currentAlerts.errors.filter(error => error.toLowerCase() !== unauthorizedMessage);
            this.showUnauthorized = currentAlerts.errors.some(error => error.toLowerCase() === unauthorizedMessage);
        }
    }

    updateValues() {
        this.healthService.ready = false;
        this.healthReportSubscription = this.system.mediaserver
            .getAggregateHealthReport()
            .pipe(takeUntil(this.unsub$))
            .subscribe(
                result => {
                    const alerts = result.reply['ec2/metrics/alarms'].reply.cameras;
                    this.alerts = Object.entries(alerts).map(
                        ([cameraId, alertInfo]) =>
                            new Alert(cameraId, alertInfo, 'Camera')
                    );
                    if (!this.applyService.locked) {
                        this.updateAlerts();
                    }
                },
                () => {
                    if (!this.system.id) {
                        !this.window.parent
                            ? this.window.location.reload()
                            : this.window.parent.location.reload();
                    }
                }
            );
    }

    toggle(property: string, disabled = false) {
        if (disabled) return;
        this.selectedCamera[property] = !this.selectedCamera[property];
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
