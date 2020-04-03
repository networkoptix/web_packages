import {
    Component, OnDestroy, OnInit
}                                    from '@angular/core';
import { ActivatedRoute, Params }    from '@angular/router';
import { NxConfigService, IConfig }  from '../../../../services/nx-config';
import { NxPageService }             from '../../../../services/page.service';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { NxSystem }                  from '../../../../services/system.service';
import { Subscription }              from 'rxjs';
import { filter }                    from 'rxjs/operators';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes }   from '../../../../../language_i18n_static_types';
import { NxUriService }              from '../../../../services/uri.service';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-system-admin-component',
    templateUrl : 'admin.component.html',
    styleUrls   : ['admin.component.scss']
})
export class NxSystemAdminComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system: NxSystem;
    systems: any;
    params: Params;

    advanced: boolean;
    debugMode: boolean;
    betaMode: boolean;
    settingsServiceSubscription: Subscription;

    private setupDefaults() {
        this.params = this.route.snapshot.queryParams;
        this.advanced = (this.params.advanced !== undefined);

        this.debugMode = this.CONFIG.clientMode.debug;
        this.betaMode = this.CONFIG.clientMode.beta;
        this.menuService.setSection('admin');
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private route: ActivatedRoute,
        private pageService: NxPageService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private uri: NxUriService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();

        this.setupDefaults();
    }

    ngOnDestroy() {}

    ngOnInit(): void {
        if (this.settingsServiceSubscription) {
            this.settingsServiceSubscription.unsubscribe();
        }

        this.settingsServiceSubscription = this.settingsService
            .systemSubject
            .pipe(filter((system) => system !== undefined))
            .subscribe((system) => {
                this.pageService.setPageTitle(this.LANG.pageTitles.systemName.replace('{{systemName}}', system.info.name));
                if (system.isAvailable) {
                    system.updateOrGetSystemSettings().subscribe((res: any) => {
                        this.system = system;
                    });
                }
            });
    }

    hideAdvancedSettings() {
        const queryParams: Params = {};
        queryParams.advanced = undefined;

        this.uri
            .updateURI(this.uri.getURL(), queryParams, true)
            .then(() => {
                this.advanced = false;
            });
    }
}
