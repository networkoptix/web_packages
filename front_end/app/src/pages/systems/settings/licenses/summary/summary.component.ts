import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import type { NxSystem } from '@services/system.service/system';
import { NxUtilsService } from '@services/utils.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-license-summary-component',
    templateUrl: 'summary.component.html',
    styleUrls: ['summary.component.scss']
})

export class NxLicenseSummaryComponent implements OnInit, OnChanges {
    @Input() licensesLegacyInfo: any = [];

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    system: NxSystem;
    licenses: any = [];

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private settingsService: NxSettingsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit() {
        this.settingsService.systemSubject
            .pipe(
                untilDestroyed(this),
                filter(data => data !== undefined && data.id !== this.system?.id))
            .subscribe(system => {
                this.system = system;
                this.getLicenses();
            });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (
            changes.licensesLegacyInfo?.currentValue &&
            !NxUtilsService.isEqual(
                changes.licensesLegacyInfo.currentValue,
                changes.licensesLegacyInfo.previousValue
            )
        ) {
            this.getLicenses();
        }
    }

    getLicenses() {
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
                });
        } else {
            this.licenses = this.licensesLegacyInfo;
        }
    }

    setLicenses(response) {
        this.licenses = Object.keys(response).map(licence => {
            const title = this.CONFIG.licenseTypes.find(item =>
                item.name === licence
            ).title || licence.charAt(0).toUpperCase() + licence.slice(1);
            return {
                type: title,
                count: response[licence].total,
                countAvail: response[licence].available,
                inUse: response[licence].inUse,
                required: -1 * (
                    response[licence].available - response[licence].inUse
                )
            };
        });
    }
}
