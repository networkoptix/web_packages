import { Component, Input, OnInit } from '@angular/core';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxSystem } from '@services/system.service';
import { SubscriptionLike } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
    selector: 'nx-license-summary-component',
    templateUrl: 'summary.component.html',
    styleUrls: ['summary.component.scss']
})

export class NxLicenseSummaryComponent implements OnInit {
    @Input() licensesLegacyInfo: any = [];

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    system: NxSystem;
    systemSubscription: SubscriptionLike;
    licenses: any = [];
    showLicenses: boolean = false;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private settingsService: NxSettingsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit() {
        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined && data.id !== this.system?.id))
            .subscribe((system) => {
                this.system = system;

                if (this.system.useRest) {
                    this.system
                        .getLicenseSummaries()
                        .then((response: any) => {
                            if (response && Object.keys(response).length) {
                                this.setLicenses(response);
                            }
                        }, () => {
                            // something went wrong - use legacy info
                            this.licenses = this.licensesLegacyInfo;
                            this.showLicenses = true;
                        }).finally(() => {
                            this.showLicenses = true;
                        });
                } else {
                    this.licenses = this.licensesLegacyInfo;
                    this.showLicenses = true;
                }
            });
    }

    setLicenses (response) {
        this.licenses = Object.keys(response).map((licence) => {
            const title = this.CONFIG.licenseTypes.find((item) => item.name === licence).title ||
                    licence.charAt(0).toUpperCase() + licence.slice(1);
            return {
                type: title,
                count: response[licence].total,
                countAvail: response[licence].available,
                inUse: response[licence].inUse,
                required: -1 * (response[licence].available - response[licence].inUse)
            };
        });
    }
}
