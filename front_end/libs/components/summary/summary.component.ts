import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { isEqual } from 'lodash-es';
import { firstValueFrom } from 'rxjs';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxStepperComponent } from '@components/stepper/stepper.component';
import staticLang from '@language_static';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import { License } from '@services/system.service/system-types';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-license-summary-component',
    templateUrl: 'summary.component.html',
    styleUrls: ['summary.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        NxStepperComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
    ],
})
export class NxLicenseSummaryComponent implements OnInit, OnChanges {
    @Input() system: NxSystem;
    @Input() update: string;
    @Input() licensesLegacyInfo: License[];

    licenses: License[];

    CONFIG: IConfig;
    LANG = staticLang;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.getLicenses();
    }

    ngOnChanges(changes: NgChanges<NxLicenseSummaryComponent>): void {
        if (changes.update && changes.update.previousValue !== changes.update.currentValue) {
            this.getLicenses();
        }

        if (
            changes.licensesLegacyInfo.previousValue &&
            changes.licensesLegacyInfo?.currentValue &&
            !isEqual(
                changes.licensesLegacyInfo.currentValue,
                changes.licensesLegacyInfo.previousValue,
            )
        ) {
            this.getLicenses();
        }
    }

    getLicenses(): void {
        if (this.system.useRest) {
            firstValueFrom(this.system.mediaserver.getLicenseSummaries()).then(
                response => {
                    if (response && Object.keys(response).length) {
                        this.setLicenses(response);
                    }
                },
                () => {
                    // something went wrong - use legacy info
                    this.licenses = this.licensesLegacyInfo;
                },
            );
        } else {
            this.licenses = this.licensesLegacyInfo;
        }
    }

    setLicenses(response): void {
        this.licenses = Object.keys(response)
            .filter(licence => licence !== '') // don't calculate invalid licences
            .map(licence => {
                const title =
                    this.CONFIG.licenseTypes.find(item => item.name === licence)?.title ||
                    licence.charAt(0).toUpperCase() + licence.slice(1);
                return {
                    type: title,
                    count: response[licence].total,
                    countAvail: response[licence].available,
                    inUse: response[licence].inUse,
                    required: -1 * (response[licence].available - response[licence].inUse),
                };
            });
    }
}
