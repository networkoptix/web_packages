import {
    Component, OnDestroy, OnInit
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

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private menuService: NxMenuService,
        private settingsService: NxSettingsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
        this.menuService.setSection('cameras');
    }

    ngOnInit() {
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

    ngOnDestroy() {}
}
