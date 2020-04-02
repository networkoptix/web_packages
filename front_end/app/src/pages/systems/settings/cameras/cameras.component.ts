import {
    Component, OnDestroy, OnInit, Inject, ViewContainerRef
}                                    from '@angular/core';
import { NxConfigService, IConfig }  from '../../../../services/nx-config';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes }   from '../../../../../language_i18n_static_types';
import {
    NxSystem, ICamera, StreamQuality, IRecordingSettings, ITask, IRecordingModes
}                                    from '../../../../services/system.service';
import { Subscription }              from 'rxjs';
import {
    filter, map, retryWhen, delay, distinctUntilChanged
}                                    from 'rxjs/operators';
import { ActivatedRoute }            from '@angular/router';
import { NxUriService }              from '../../../../services/uri.service';

import { NxHealthService }           from '../../../health/health.service';
import { WINDOW }                    from '../../../../services/window-provider';
import { NxToastService }            from '../../../../dialogs/toast.service';
import { Watcher, NxApplyService }   from '../../../../services/apply.service';
import { Process, NxProcessService } from '../../../../services/process.service';
import { NxDialogsService }          from '../../../../dialogs/dialogs.service';

@AutoUnsubscribe()
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

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private menuService: NxMenuService,
        private settingsService: NxSettingsService,
        private route: ActivatedRoute,
        private uriService: NxUriService,
        private healthService: NxHealthService,
        private toastService: NxToastService,
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
            .pipe(distinctUntilChanged())
            .subscribe(params => {
                if (params.cameraId) {
                    this.menuService.setDetailsSection(params.cameraId);
                    this.cameraIdFromParams = params.cameraId;
                    this.parsedCameraId = params.cameraId.replace(/\s|\{|\}/g, '');
                    this.setCamera();
                }
            });

        this.settingsSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe(system => {
                this.settingsService.footerSubject.next(true);
                this.system = system;
                this.system.getInfoAndPermissions(false).catch(() => {}).then((system: NxSystem) => {
                    this.cameraViewPath = this.CONFIG.menus.systemSettings.baseUrl + system.id + '/view/' + this.parsedCameraId;
                    this.canSeeInfo = (this.CONFIG.cloudCapabilities.healthMonitoring || system.info.capabilities && system.info.capabilities.vms_metrics) && this.system.canViewInfo();
                    this.initUpdateProcess();
                    if (this.canSeeInfo) {
                        this.fullInfoPath = this.CONFIG.menus.systemSettings.baseUrl + system.id + this.CONFIG.menus.systemHealth.baseUrl + this.CONFIG.menus.systemSettings.cameras.path;
                    }
                });
                if (this.cameraSubscription) {
                    this.cameraSubscription.unsubscribe();
                }
                this.cameraSubscription = this.system.infoSubject
                    .pipe(
                        distinctUntilChanged(),
                        map(system => {
                            if (!system.cameras || system.cameras.length === 0) {
                                throw system;
                            }
                        }),
                        retryWhen(err => err.pipe(delay(1000)))
                    )
                    .subscribe(() => {
                        if (this.system.currentServerNotBusy) {
                            if (this.system && this.system.cameras && this.system.cameras.length) {
                                this.system.initSystemMediaServers();
                            }
                            this.updateValues();
                            this.setCamera();
                        }
                    });
            });
        this.initUpdateProcess();
        this.applyService.initPageWatcher(
            this.viewContainerRef,
            this.saveSettings,
            () => this.applyService.reset(),
            [
                this.audioEnabledWatcher,
                this.cameraNameWatcher,
                this.recordingModesWatcher,
                this.recordingWatcher,
                this.selectedAspectWatcher,
                this.selectedFpsWatcher,
                this.selectedQualityWatcher,
                this.selectedRotationWatcher
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
            const cameraSettings: Pick<ICamera, 'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'overrideAr' | 'rotation'> = {
                id              : this.selectedCamera.id,
                name            : this.cameraNameWatcher.value,
                audioEnabled    : this.audioEnabled.value,
                overrideAr      : `${this.selectedAspectWatcher.value}` || '',
                rotation        : `${this.selectedRotationWatcher.value}` || '',
                scheduleEnabled : this.recordingWatcher.value
            };
            return this.system.updateRecordingSettings(updatedTask, cameraSettings)
                .then(_ => this.system.updateCameraSettings(cameraSettings.id, {
                    overrideAr: cameraSettings.overrideAr, rotation: cameraSettings.rotation
                }).then(_ => this.system.getCameras().then(res => {
                    this.applyService.reset();
                    this.setCamera();
                    return res;
                }))
                );
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

    handleBlankName() {
        if (!this.cameraName) {
            this.cameraName = this.cameraNameWatcher.originalValue;
        }
    }

    updateCredentials() {
        this.dialogService.updateCameraCredentials(this.selectedCamera, this.system, this.setCamera);
    }

    selectedAspectWatcher = new Watcher()
    get selectedAspect() {
        return this.aspectRatios.find(({ value: id }) => this.selectedAspectWatcher.value === id);
    }

    set selectedAspect(value) {
        this.selectedAspectWatcher.value = value.value;
    }

    selectedRotationWatcher = new Watcher()
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
        this.recordingWatcher.value = value;
    }

    recordingModesWatcher: Watcher<IRecordingModes[]> = new Watcher()
    get recordingModes(): IRecordingModes[] {
        return this.recordingModesWatcher.value;
    }

    set recordingModes(value: IRecordingModes[]) {
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

    toggleMode(toggledName, disabled = false) {
        if (disabled) return;
        this.recordingModes = this.recordingModes.map(({ name, id, enabled }) => ({
            name, id, enabled, value: name === toggledName ? 2 : 0
        }));
    }

    selectedFpsWatcher = new Watcher()
    get selectedFps() {
        return this.selectedFpsWatcher.value;
    }

    set selectedFps(value) {
        this.selectedFpsWatcher.value = value;
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

    canSeeInfo = false;

    ngOnDestroy() {}

    setCamera = () => {
        if (this.selectedCamera && this.parsedCameraId === this.selectedCamera.id) {
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
            this.cameraName = this.selectedCamera.name;
            this.selectedAspect = this.aspectRatios.find(({ value: id }) => id === this.selectedCamera.overrideAr) || this.aspectRatios[0];
            this.selectedRotation = this.rotations.find(({ value: id }) => id === this.selectedCamera.rotation) || this.rotations[0];
            this.audioEnabled = !!(this.selectedCamera.isAudioSupported && this.selectedCamera.audioEnabled);
            this.recordingModes = this.selectedCamera.recordingSettings.modes;
            this.selectedQuality = [...this.streamQualities, this.various].find(({ value: id }) => id === this.selectedCamera.recordingSettings.quality) || this.various;
            this.selectedFps = this.selectedCamera.recordingSettings.fps;
            this.recording = this.selectedCamera.recordingSettings.recording;
            this.recordingSettings = this.selectedCamera.recordingSettings;
            const currentAlerts = (this.alerts || []).find(
                ({ cameraId }) => cameraId === this.parsedCameraId
            );

            if (currentAlerts) {
                // TODO: Maybe change this in CLOUD-4620 to what Tsanko is using with advanced settings
                const other = currentAlerts.warnings[0];
                const showOther = currentAlerts.warnings.some(warning => warning === other) &&
                    this.toastService.toasts.every(({ textOrTpl }) => textOrTpl !== other);
                if (showOther) {
                    setTimeout(() => this.toastService.show(other, { inset: true, classname: 'inset-warning' }), currentAlerts.warnings.length);
                } else {
                    this.toastService.remove(this.toastService.toasts[this.toastService.toasts.findIndex(({ textOrTpl }) => textOrTpl === other)]);
                }
                const unauthorizedMessage = 'Camera is Unauthorized';
                const showUnauthorized = currentAlerts.errors.some(error => error === unauthorizedMessage) &&
                    this.toastService.toasts.every(({ textOrTpl }) => textOrTpl !== unauthorizedMessage);
                if (showUnauthorized) {
                    setTimeout(() => this.toastService.show('Camera unauthorized',
                        {
                            inset     : true,
                            classname : 'inset-unauthorized',
                            action    : {
                                text     : 'Edit Credentials',
                                icon     : this.CONFIG.icons.dirNonStandard + 'warning.svg',
                                callback : () => alert('edit credentials called')
                            }
                        }), currentAlerts.warnings.length);
                } else {
                    this.toastService.remove(this.toastService.toasts[this.toastService.toasts.findIndex(({ textOrTpl }) => textOrTpl === unauthorizedMessage)]);
                }
            }
            this.applyService.reset();
            this.applyService.setVisible(true);
        }
    }

    updateValues() {
        this.healthService.ready = false;
        this.healthReportSubscription = this.system.mediaserver
            .getAggregateHealthReport()
            .subscribe(
                result => {
                    const alerts =
                        result.reply['ec2/metrics/alarms'].reply.cameras;
                    this.alerts = Object.entries(alerts).map(
                        ([cameraId, alertInfo]) =>
                            new Alert(cameraId, alertInfo, 'Camera')
                    );
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
