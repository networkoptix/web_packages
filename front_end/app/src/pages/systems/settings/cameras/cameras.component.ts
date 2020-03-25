import {
    Component, OnDestroy, OnInit, OnChanges
}                                    from '@angular/core';
import { NxConfigService, IConfig }           from '../../../../services/nx-config';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes } from '../../../../../language_i18n_static_types';
import { NxSystem, ICamera } from '../../../../services/system.service';
import { BehaviorSubject, Subscription, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ActivatedRoute, Params } from '@angular/router';
import { NxUriService } from '../../../../services/uri.service';

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
    settings$: Observable<any>;
    settingsSubscription: Subscription;
    params$: Observable<Params>;
    routeSubscription: Subscription;
    cameraIdFromParams: string;
    parsedCameraId: string;
    selectedCamera: ICamera;
    canSeeInfo: boolean;
    fullInfoPath: string;
    cameraViewPath: string;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private menuService: NxMenuService,
        private settingsService: NxSettingsService,
        private route: ActivatedRoute,
        private uriService: NxUriService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
        this.menuService.setSection('cameras');
    }

    ngOnInit() {
        this.initSettingsAndSystem();
        this.routeSubscription = this.route.params.subscribe(params => {
            // TODO: Need to find out how to get params when someone visits page directly
            if (params.cameraId) {
                this.cameraIdFromParams = params.cameraId;
                this.parsedCameraId = (params.cameraId !== 'undefined' ? params.cameraId : this.system.cameras[0].id).replace(/\s|\{|\}/g, '');
            }
            this.setCamera();
        });
    }

    ngOnDestroy() {}

    // init methods

    initSettingsAndSystem() {
        this.canSeeInfo = false;
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }
        this.settings$ = this.settingsService
            .systemSubject
            .pipe(filter((system) => system !== undefined));
        this.settingsSubscription = this.settings$.subscribe((system) => {
            this.system = system;
            if (this.system) {
                this.system.getInfoAndPermissions(false).catch(() => {}).then(system => {
                    this.cameraViewPath = this.CONFIG.menus.systemSettings.baseUrl + system.id + '/view/' + this.parsedCameraId;
                    this.canSeeInfo = (this.CONFIG.cloudCapabilities.healthMonitoring || system.info.capabilities && system.info.capabilities.vms_metrics) && this.system.canViewInfo();
                    if (this.canSeeInfo) {
                        this.fullInfoPath = this.CONFIG.menus.systemSettings.baseUrl + system.id + this.CONFIG.menus.systemHealth.baseUrl + this.CONFIG.menus.systemSettings.cameras.path;
                    }
                });
            }
        });
    }

    setCamera(): void {
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
        }
    }
}
