import {
    Component, OnDestroy, OnInit, Inject
}                                    from '@angular/core';
import { NxConfigService, IConfig }  from '../../../../services/nx-config';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes }   from '../../../../../language_i18n_static_types';
import { NxSystem, ICamera, StreamQuality, IRecordingSettings }         from '../../../../services/system.service';
import { Subscription }              from 'rxjs';
import {
    filter, map,
    retryWhen, delay, distinctUntilChanged
}                                    from 'rxjs/operators';
import { ActivatedRoute }            from '@angular/router';
import { NxUriService }              from '../../../../services/uri.service';

import { NxHealthService }           from '../../../health/health.service';
import { WINDOW }                    from '../../../../services/window-provider';
import { NxToastService } from '../../../../dialogs/toast.service';
import { Watcher } from '../../../../services/apply.service';

@AutoUnsubscribe()
@Component({
    selector : 'nx-cameras-component',
    templateUrl : 'cameras.component.html',
    styleUrls : ['cameras.component.scss']
})
export class NxCamerasComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
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
    aspectRatios: ISelect[] = [
        { name: 'Auto', id: '' },
        { name: '4:3', id: 1.33333 },
        { name: '16:9', id: 1.77778 },
        { name: '1:1', id: 1 }
    ]

    rotations: ISelect[] = [
        { name: 'Auto', id: '' },
        { name: '90˚', id: 90 },
        { name: '180˚', id: 180 },
        { name: '270˚', id: 270 }
    ]

    streamQualities: ISelect[] = [
        { name: 'Best', id: 'highest' },
        { name: 'High', id: 'high' },
        { name: 'Medium', id: 'normal' },
        { name: 'Low', id: 'low' }
    ]

    various: ISelect = { name: '– Different Values –', id: 'various' }
    maxFps: number = 30;
    fps: number = this.maxFps;

    // Methods for watchers

    // Basic Settings
    selectedAspectWatcher = new Watcher()
    get selectedAspect() {
        return this.aspectRatios.find(({ id }) => this.selectedAspectWatcher.value === id);
    };

    set selectedAspect(value) {
        this.selectedAspectWatcher.value = value.id;
    }

    selectedRotationWatcher = new Watcher()
    get selectedRotation() {
        return this.rotations.find(({ id }) => this.selectedRotationWatcher.value === id);
    };

    set selectedRotation(value) {
        this.selectedRotationWatcher.value = value.id;
    }

    audioEnabledWatcher = new Watcher()
    get audioEnabled() {
        return this.audioEnabledWatcher.value;
    }

    set audioEnabled(value) {
        this.audioEnabledWatcher.value = value;
    }

    // Recording Settings
    cameraNameWatcher = new Watcher()
    get cameraName() {
        return this.cameraNameWatcher.value;
    };

    set cameraName(value) {
        this.cameraNameWatcher.value = value;
    }

    recordingWatcher = new Watcher()
    get recording() {
        return this.recordingWatcher.value;
    };

    set recording(value) {
        this.recordingWatcher.value = value;
    }

    recordingModesWatcher = new Watcher()
    get recordingModes() {
        return this.recordingModesWatcher.value;
    };

    set recordingModes(value) {
        this.recordingModesWatcher.value = value;
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
    };

    set selectedFps(value) {
        this.selectedFpsWatcher.value = value;
    }

    selectedQualityWatcher = new Watcher()
    get selectedQuality() {
        return [...this.streamQualities, this.various].find(({ id }) => this.selectedQualityWatcher.value === id);
    };

    set selectedQuality(value) {
        this.selectedQualityWatcher.value = value.id;
    }

    recordingSettings: IRecordingSettings;

    canSeeInfo = false;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private menuService: NxMenuService,
        private settingsService: NxSettingsService,
        private route: ActivatedRoute,
        private uriService: NxUriService,
        private healthService: NxHealthService,
        private toastService: NxToastService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
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
                this.system.getInfoAndPermissions(false).catch(() => {}).then(system => {
                    this.cameraViewPath = this.CONFIG.menus.systemSettings.baseUrl + system.id + '/view/' + this.parsedCameraId;
                    this.canSeeInfo = (this.CONFIG.cloudCapabilities.healthMonitoring || system.info.capabilities && system.info.capabilities.vms_metrics) && this.system.canViewInfo();
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
    }

    ngOnDestroy() {}

    setCamera() {
        if (this.selectedCamera && this.parsedCameraId === this.selectedCamera.id) {
            return;
        }
        if (this.system && this.system.cameras && this.system.cameras.length > 0) {
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
            this.selectedAspect = this.aspectRatios.find(({ id }) => id === this.selectedCamera.overrideAr) || this.aspectRatios[0];
            this.selectedRotation = this.rotations.find(({ id }) => id === this.selectedCamera.rotation) || this.rotations[0];
            this.audioEnabled = !!(this.selectedCamera.isAudioSupported && this.selectedCamera.audioEnabled);
            this.recordingModes = this.selectedCamera.recordingSettings.modes;
            this.selectedQuality = [...this.streamQualities, this.various].find(({ id }) => id === this.selectedCamera.recordingSettings.quality) || this.streamQualities[1];
            this.selectedFps = this.selectedCamera.recordingSettings.fps;
            this.recording = this.selectedCamera.recordingSettings.recording;
            this.recordingSettings = this.selectedCamera.recordingSettings;
            // this.maxFps = this.selectedCamera.parsedAddParams.mediaStreams.streams[0].
            const currentAlerts = (this.alerts || []).find(
                ({ cameraId }) => cameraId === this.parsedCameraId
            );

            if (currentAlerts) {
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
    id: number | '' | StreamQuality;
}
