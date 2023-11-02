import {
    Component,
    OnInit,
    Inject,
    ViewContainerRef,
    ViewChild,
    computed,
    Input,
    OnChanges,
    Optional,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { BehaviorSubject, from, throwError, of, Observable, combineLatest } from 'rxjs';
import { filter, map, delay, retry, catchError, switchMap, share } from 'rxjs/operators';

import { createPortalToken } from '@common/tokens';
import {
    InfoBlockColumns,
    InfoBlockLine,
    InfoBlockSection,
    InfoBlockSize,
} from '@components/info-block/info-block.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { NxHealthService } from '@pages/health/health.service';
import { NxApplyService } from '@services/apply.service';
import { Watcher } from '@services/apply.service/watcher';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { AlarmsReply } from '@services/system-api.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import {
    CameraUpdate,
    MotionType,
    NxSystemCamera,
    RecordingModes,
    RecordingType,
    StreamQuality,
    TaskUpdate,
    CameraStatus,
    DeviceType,
} from '@services/system.service/camera-manager/camera-manager-types';
import type { NxSystem } from '@services/system.service/system';
import { NxUriService } from '@services/uri.service';
import { ChildRoutes } from '@services/uri.service.types';
import { icons, menus, settingsConfig } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import {
    ROTATION_OPTIONS,
    type SensitivityButtonValue,
    DEFAULT_ROTATION,
    ASPECT_RATIOS,
} from './cameras.component.types';
import { NxRecordingSettingsComponent } from './recording-settings/recording-settings.component';

class Alert {
    errors: string[] = [];
    warnings: string[] = [];

    constructor(public cameraId: string, { availability }: AlarmsReply['cameras'][string]) {
        Object.values(availability || {}).forEach(alertType => {
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
export class NxCamerasComponent implements OnInit, OnChanges {
    @Input() system: NxSystem;
    @Input() camera: NxSystemCamera;

    LANG = staticLang;
    defaultAspectRatio: number = null;
    aspectRatioOptions = ASPECT_RATIOS;
    rotationOptions = ROTATION_OPTIONS;
    isMobile: boolean;
    infoBlockSizeEnum = InfoBlockSize;
    public reload$ = new BehaviorSubject(0);
    preview$: Observable<string>;

    sensitivityButtons$ = new BehaviorSubject<SensitivityButtonValue>(false);

    overlayEnabled = (): boolean => {
        return (
            !this.isMobile &&
            !!this.camera &&
            !!this.motionMask &&
            this.camera.status !== CameraStatus.Offline
        );
    };

    // TODO: Remove after Forms refactor
    @ViewChild(NxRecordingSettingsComponent)
    private recordingSettingsComponent!: NxRecordingSettingsComponent;

    private viewContainerRef: ViewContainerRef;
    enableEdit: boolean;
    private alerts: Alert[] = [];
    warnings: string[] = [];
    errors: string[] = [];
    showUnauthorized = false;
    showOffline = false;
    showPreloader = true;
    cameraDetailColumns: InfoBlockColumns;
    editMode = false;
    icons = icons;
    readonly cameraCredentialUpdateTimeout: number = 1500;

    private credentialsUpdateInProgress: boolean = false;

    // Added for handing non camera devices CLOUD-8669
    settingsDisabled = false;
    settingsRecordingDisabled = true;

    motionGridChangeWatcher = new Watcher<boolean>();
    cameraNameWatcher = new Watcher<string>();
    selectedAspectWatcher = new Watcher<number | null>();
    selectedRotationWatcher = new Watcher<number>();
    private audioEnabledWatcher = new Watcher<boolean>();
    recordingWatcher = new Watcher<boolean>();
    recordingModesWatcher = new Watcher<RecordingModes[]>();
    selectedFpsWatcher = new Watcher<number | null>();
    selectedQualityWatcher = new Watcher<StreamQuality>();
    motionEnabledWatcher = new Watcher<MotionType>();
    motionMaskWatcher = new Watcher<string>();

    editCameras = computed<boolean>(() => this.system.permissionManager.permissions().editCameras);
    canSeeInfo = computed<boolean>(() => {
        if (!this.system.isOnline || !this.system.isAvailable) {
            return false;
        }
        return this.system.permissionManager.permissions()?.systemHealth;
    });
    canSeeView = computed<boolean>(() => {
        if (!this.system.isOnline || !this.system.isAvailable) {
            return false;
        }
        const permissions = this.system.permissionManager.permissions();
        return permissions.view || permissions.viewArchives;
    });
    fullInfoPath = computed<string>(() => {
        return (
            this.uriService.getSystemSettingsRoute({
                systemId: this.system.id,
                childRoute: ChildRoutes.HEALTH,
            }) + menus.systemSettings.cameras.path
        );
    });
    cameraViewPath = computed<string>(() => {
        return (
            this.uriService.getSystemSettingsRoute({
                systemId: this.system.id,
                childRoute: ChildRoutes.VIEW,
            }) + this.camera.id
        );
    });

    private get cameraName(): string {
        return this.cameraNameWatcher.value;
    }

    private set cameraName(value: string) {
        this.cameraNameWatcher.value = value;
    }

    get previewWidth(): number {
        const height = 120;
        const aspect = this.selectedAspectWatcher?.value || ASPECT_RATIOS['16:9'];
        const rotated = (this.selectedRotationWatcher?.value ?? 0) % 180;
        return rotated ? height / aspect : aspect * height;
    }

    private get maxHeight(): number {
        const aspect = this.selectedAspectWatcher?.value || ASPECT_RATIOS['4:3'];
        const normalHeight = 480;
        const narrowHeight = 384;
        return aspect > 1.5 ? narrowHeight : normalHeight;
    }

    get sensitivityButtons(): SensitivityButtonValue {
        return this.sensitivityButtons$.value;
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
        private route: ActivatedRoute,
        private uriService: NxUriService,
        private healthService: NxHealthService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private dialogService: NxDialogsService,
        private deviceService: DeviceDetectorService,
        @Inject(ViewContainerRef) viewContainerRef: ViewContainerRef,
        private activeRoute: ActivatedRoute,
        @Optional()
        @Inject(
            createPortalToken<Pick<NxCamerasComponent, 'camera' | 'system'>, NxCamerasComponent>(
                NxCamerasComponent,
            ),
        )
        data: Pick<NxCamerasComponent, 'camera' | 'system'>,
    ) {
        this.viewContainerRef = viewContainerRef;
        this.menuService.selectedSection.set('cameras');
        if (data) {
            Object.assign(this, data);
        }
    }

    ngOnChanges(changes: NgChanges<NxCamerasComponent>): void {
        // if Camera input changes reset the form
        if (changes.camera && !changes.camera.firstChange) {
            this.resetForm();
            this.setCamera();
        }
    }

    resetForm(): void {
        this.applyService.reset(true);
        this.applyService.setVisible(false);
    }

    ngOnInit(): void {
        this.isMobile = this.deviceService.isMobile() || this.deviceService.isTablet();

        this.showPreloader = false;
        this.initializeApplyService();
        this.setCamera();
        // TODO: do we need this?
        this.system.infoSubject
            .pipe(
                untilDestroyed(this),
                filter(res => !!res?.cameraManager),
                map(res => res.cameraManager.cameras),
            )
            .subscribe(cameras => {
                if (cameras.length === 0) {
                    this.router.navigate(['../'], { relativeTo: this.activeRoute });
                }
            });

        this.motionGridChangeWatcher.originalValue = false;

        this.setPreviewImage();
    }

    private initializeApplyService(): void {
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
    }

    private setPreviewImage(): void {
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
                    (this.selectedAspectWatcher?.value || ASPECT_RATIOS['4:3']) *
                        this.maxHeight *
                        2,
                    this.maxHeight * 2,
                    this.selectedRotationWatcher?.value || 0,
                );
            }),
            share({ resetOnRefCountZero: true }),
        );
    }

    private get saveSettingsProcess(): Process {
        return this.processService.createProcess(this.saveSettings.bind(this), {
            ignoreError: true,
        });
    }

    // TODO: When saving component gets reset
    private saveSettings(): Promise<NxSystemCamera> {
        const newApi = this.system.serverManager.mediaserver instanceof NxSystemRestAPI;
        if (!(this.recordingSettingsComponent?.safeToUpdateRecordingSettings ?? true)) {
            this.applyService.setWarn(this.LANG.common.recordingSettingsWarning);
            return Promise.reject();
        }

        let updatedTask: TaskUpdate;
        if (this.recordingSettingsComponent?.recordingSettingsChanged) {
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
            id: this.camera.id,
            name: this.cameraNameWatcher.value,
            audioEnabled: this.audioEnabledWatcher.value,
            scheduleEnabled: this.recordingWatcher.value,
            motionType: this.motionType,
            motionMask: this.motionMask || settingsConfig.defaultMotionMask,
        };
        const overrideAr =
            this.selectedAspectWatcher.value === this.camera.defaultRatio
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
            return this.system.serverManager.mediaserver
                .getCamera(this.camera.id)
                .toPromise()
                .then(updatedCamera => {
                    const newNxSystemCamera = this.system.cameraManager.parseCamera(updatedCamera);
                    this.camera = newNxSystemCamera;
                    this.setCamera();
                    this.toggleMotionGrid();
                    // this updates the menu with any changes. we should look to avoid this pattern
                    this.system.systemInfo = this.system;
                    return newNxSystemCamera;
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
                                    ({ id }) => id === this.camera.id,
                                );
                                if (selectedCamera.status !== CameraStatus.Unauthorized) {
                                    return throwError('Camera Unauthorized');
                                }
                                return of(selectedCamera);
                            }),
                            delay(this.cameraCredentialUpdateTimeout),
                        ),
                    ),
                    retry(5),
                    delay(this.cameraCredentialUpdateTimeout),
                    catchError(err => {
                        console.error(err);
                        return of(err);
                    }),
                )
                .toPromise()
                .finally(() => {
                    this.credentialsUpdateInProgress = false;
                    this.showUnauthorized = this.camera.status === CameraStatus.Unauthorized;
                    this.reload$.next(this.reload$.value + 1);
                });
        };
        this.dialogService.updateCameraCredentials({
            camera: this.camera,
            system: this.system,
            updateCallback: update,
        });
    }

    toggleMotionGrid(): void {
        this.sensitivityButtons$.next(false);
    }

    resetSensitivity(): void {
        this.sensitivityButtons$.next('reset');
    }

    updateMask(maskString: string): void {
        this.motionMask = maskString;
    }

    private setCamera = async (): Promise<void> => {
        this.enableEdit = this.system.permissionManager.isAdmin() || this.editCameras();

        this.menuService.selectedDetailsSection.set(this.camera.id);

        const {
            vendor,
            model,
            url,
            deviceType,
            isStream,
            defaultRatio,
            parameters,
            audioEnabled,
            recordingSettings,
            motionType,
            motionMask,
        } = this.camera;
        this.settingsDisabled = deviceType !== DeviceType.Camera || !vendor;
        this.settingsRecordingDisabled =
            environment.isLocal || deviceType !== DeviceType.Camera || !vendor;
        const deviceColumn = [
            new InfoBlockSection([
                new InfoBlockLine(this.LANG.common.vendor, vendor),
                new InfoBlockLine(this.LANG.common.model, model),
            ]),
        ];

        const parentName = this.system.serverManager.servers.find(s => s.id)?.name;
        const otherInfoColumn = [
            new InfoBlockSection([
                new InfoBlockLine(this.LANG.common.ip, url),
                new InfoBlockLine(this.LANG.common.server, parentName),
            ]),
        ];
        this.cameraDetailColumns = isStream ? [otherInfoColumn] : [deviceColumn, otherInfoColumn];
        this.cameraName = this.camera.name;
        // Setup the automatic value based on the camera's dimensions
        if (defaultRatio) {
            this.defaultAspectRatio = defaultRatio;
        }
        this.selectedAspectWatcher.value = parameters.overrideAr ?? this.defaultAspectRatio;
        this.selectedRotationWatcher.value = parameters.rotation ?? DEFAULT_ROTATION;
        this.audioEnabled = audioEnabled;
        this.recordingModesWatcher.value = recordingSettings.modes;
        if (this.recordingSettingsComponent) {
            setTimeout(() => {
                if (this.recordingSettingsComponent) {
                    this.recordingSettingsComponent.selectedFps = recordingSettings.fps;
                }
            });
        }
        this.selectedQualityWatcher.value = recordingSettings.quality;
        this.recordingWatcher.value = recordingSettings.recording;
        this.updateValues();

        this.setWatcherDefaults({
            motionGridChange: false,
            cameraName: this.cameraName,
            selectedAspect: this.selectedAspectWatcher.value,
            selectedRotation: this.selectedRotationWatcher.value,
            audioEnabled: this.audioEnabled,
            recording: this.recordingWatcher.value,
            recordingModes: this.recordingModesWatcher.value,
            selectedFps: this.recordingSettingsComponent?.selectedFps,
            selectedQuality: recordingSettings.quality,
            motionEnabled: motionType,
            motionMask: motionMask || settingsConfig.defaultMotionMask,
        });
        this.applyService.reset();
        this.applyService.setVisible();
        this.showPreloader = false;
    };

    // TODO: Temporary until we remove watchers
    private setWatcherDefaults({
        motionGridChange,
        cameraName,
        selectedAspect,
        selectedRotation,
        audioEnabled,
        recording,
        recordingModes,
        selectedFps,
        selectedQuality,
        motionEnabled,
        motionMask,
    }: {
        motionGridChange: boolean;
        cameraName: string;
        selectedAspect: number;
        selectedRotation: number;
        audioEnabled: boolean;
        recording: boolean;
        recordingModes: RecordingModes[];
        selectedFps: number;
        selectedQuality: StreamQuality;
        motionEnabled: MotionType;
        motionMask: string;
    }): void {
        this.motionGridChangeWatcher.originalValue = motionGridChange;
        this.cameraNameWatcher.originalValue = cameraName;
        this.selectedAspectWatcher.originalValue = selectedAspect;
        this.selectedRotationWatcher.originalValue = selectedRotation;
        this.audioEnabledWatcher.originalValue = audioEnabled;
        this.recordingWatcher.originalValue = recording;
        this.recordingModesWatcher.originalValue = recordingModes;
        this.selectedFpsWatcher.originalValue = selectedFps;
        this.selectedQualityWatcher.originalValue = selectedQuality;
        this.motionEnabledWatcher.originalValue = motionEnabled;
        this.motionMaskWatcher.originalValue = motionMask;
    }

    private updateAlerts(): void {
        const currentAlerts = this.alerts.find(({ cameraId }) => cameraId === this.camera.id);
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
        this.showUnauthorized = this.camera.status === CameraStatus.Unauthorized;

        // ActivatedRoute.fragment was something different before?
        // @ts-expect-error TODO .value does not exist on Observable<string>
        if (this.showUnauthorized && this.route.fragment.value === 'authorize') {
            if (!this.credentialsUpdateInProgress) {
                this.updateCredentials();
            }
        }

        this.showOffline = this.camera.status === CameraStatus.Offline;
    }

    private updateValues(): void {
        this.healthService.ready = false;
        if (this.system.permissionManager.isAdmin()) {
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
                            if (!window.parent) {
                                window.location.reload();
                            } else {
                                window.parent.location.reload();
                            }
                        }
                    },
                });
        } else {
            this.updateAlerts();
        }
    }
}
