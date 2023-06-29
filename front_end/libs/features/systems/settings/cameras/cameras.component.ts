import { Component, OnInit, Inject, ViewContainerRef, ViewChild } from '@angular/core';
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
    SensitivityButtonValue,
} from './cameras.component.types';
import { NxRecordingSettingsComponent } from './recording-settings/recording-settings.component';

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

@UntilDestroy()
@Component({
    selector: 'nx-cameras-component',
    templateUrl: 'cameras.component.html',
    styleUrls: ['cameras.component.scss'],
})
export class NxCamerasComponent implements OnInit {
    LANG = staticLang;
    ASPECT_RATIOS = {
        '4:3': 1.33333,
        '16:9': 1.77778,
        '1:1': 1,
    };
    isMobile: boolean;
    infoBlockSizeEnum = InfoBlockSize;
    public reload$ = new BehaviorSubject(0);
    preview$: Observable<string>;

    sensitivityButtons$ = new BehaviorSubject<SensitivityButtonValue>(false);
    private settingsSubscription: Subscription;
    private cameraSubscription: Subscription;

    // TODO: Remove after Forms refactor
    @ViewChild(NxRecordingSettingsComponent)
    private recordingSettingsComponent!: NxRecordingSettingsComponent;

    private viewContainerRef: ViewContainerRef;
    system: NxSystem;
    parsedCameraId: string;
    selectedCamera: NxSystemCamera;
    enableEdit: boolean;
    fullInfoPath: string;
    cameraViewPath: string;
    private alerts: Alert[] = [];
    aspectRatios: AspectRatioDropdownItem[];
    rotations: RotationDropdownItem[];
    warnings: string[] = [];
    errors: string[] = [];
    showUnauthorized = false;
    showOffline = false;
    showOverlay = false;
    showPreloader = true;
    noCameras = false;
    cameraDetailColumns: InfoBlockColumns;
    canSeeInfo = false;
    editMode = false;
    icons = icons;
    readonly cameraCredentialUpdateTimeout: number = 1500;

    private credentialsUpdateInProgress: boolean = false;

    // Added for handing non camera devices CLOUD-8669
    settingsDisabled = false;
    settingsRecordingDisabled = true;

    motionGridChangeWatcher = new Watcher<boolean>();
    cameraNameWatcher = new Watcher<string>();
    private selectedAspectWatcher = new Watcher<number | null>();
    private selectedRotationWatcher = new Watcher<number>();
    private audioEnabledWatcher = new Watcher<boolean>();
    recordingWatcher = new Watcher<boolean>();
    recordingModesWatcher = new Watcher<RecordingModes[]>();
    selectedFpsWatcher = new Watcher<number | null>();
    selectedQualityWatcher = new Watcher<StreamQuality>();
    motionEnabledWatcher = new Watcher<MotionType>();
    motionMaskWatcher = new Watcher<string>();

    private get cameraName(): string {
        return this.cameraNameWatcher.value;
    }

    private set cameraName(value: string) {
        this.cameraNameWatcher.value = value;
    }

    get previewWidth(): number {
        const height = 120;
        const aspect = this.selectedAspect?.value || this.ASPECT_RATIOS['16:9'];
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
        const aspect = this.selectedAspect.value || this.ASPECT_RATIOS['4:3'];
        const normalHeight = 480;
        const narrowHeight = 384;
        return aspect > 1.5 ? narrowHeight : normalHeight;
    }

    get sensitivityButtons(): SensitivityButtonValue {
        return this.sensitivityButtons$.value;
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
        this.applyService.initPageWatcher(
            this.viewContainerRef,
            this.saveSettingsProcess,
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
                    (this.selectedAspect?.value || this.ASPECT_RATIOS['4:3']) * this.maxHeight * 2,
                    this.maxHeight * 2,
                    this.selectedRotation?.value || 0,
                );
            }),
        );
    }

    // Update menu options after language is loaded
    private updateSelects(): void {
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
    }

    private get saveSettingsProcess(): Process {
        return this.processService.createProcess(this.saveSettings.bind(this), {
            ignoreError: true,
        });
    }

    private saveSettings(): Promise<NxSystemCamera[]> {
        const newApi = this.system.serverManager.mediaserver instanceof NxSystemRestAPI;
        if (!this.recordingSettingsComponent.safeToUpdateRecordingSettings) {
            this.applyService.setWarn(this.LANG.common.recordingSettingsWarning);
            return Promise.reject();
        }

        let updatedTask: TaskUpdate;
        if (this.recordingSettingsComponent.recordingSettingsChanged) {
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
            motionMask: this.motionMask || settingsConfig.defaultMotionMask,
        };
        const overrideAr =
            this.selectedAspectWatcher.value === this.selectedCamera.defaultRatio
                ? ''
                : this.selectedAspectWatcher.value.toString();
        const rotation = this.selectedRotationWatcher.value.toString();

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

    toggleMotionGrid(): void {
        this.showOverlay = false;
        this.sensitivityButtons$.next(false);
        setTimeout(() => {
            this.showOverlay = true;
        });
    }

    resetSensitivity(): void {
        this.sensitivityButtons$.next('reset');
    }

    updateMask(maskString: string): void {
        this.motionMask = maskString;
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
            setTimeout(() => {
                this.recordingSettingsComponent.selectedQuality =
                    recordingSettings.quality === 'various'
                        ? this.recordingSettingsComponent.various
                        : this.recordingSettingsComponent.streamQualities.find(
                              ({ value }) => recordingSettings.quality === value,
                          );
                this.recordingSettingsComponent.selectedFps = recordingSettings.fps;
            }, 0);
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
}
