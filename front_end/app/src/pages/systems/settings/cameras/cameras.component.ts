import {
    Component, OnDestroy, OnInit, OnChanges
}                                    from '@angular/core';
import { NxConfigService, IConfig }           from '../../../../services/nx-config';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes } from '../../../../../language_i18n_static_types';
import { NxSystem } from '../../../../services/system.service';
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
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }
        this.settings$ = this.settingsService
            .systemSubject
            .pipe(filter((system) => system !== undefined));
        this.settingsSubscription = this.settings$.subscribe((system) => {
            this.system = system;
        });
    }

    setCamera() {
        this.menuService.setDetailsSection(this.parsedCameraId);
        this.uriService
            .updateURI(`systems/${this.system.id}/cameras/${this.parsedCameraId}`)
            .catch(error => {
                console.error(error);
            });
    }
}
