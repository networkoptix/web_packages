import {
    Component, OnDestroy, Input,
    OnChanges, SimpleChanges
}                                    from '@angular/core';
import { DatePipe }                  from '@angular/common';
import { UntilDestroy }              from '@ngneat/until-destroy';

import { IConfig, NxConfigService }  from '../../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxSystem }                  from '../../../../../services/system.service';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import {
    InfoBlockSection, InfoBlockStyle,
    InfoDetailClass, InfoLineStyle
} from '../../../../../components/info-block/info-block.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-license-detail-component',
    templateUrl : 'license.component.html',
    styleUrls   : ['license.component.scss']
})

export class NxLicenseDetailComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    orderedLicense: any = [];
    newlyAddedLicense: any;

    @Input() licenses: any = [];
    @Input() system: NxSystem;

    infoLineStyle = InfoLineStyle.CONDENSED;
    infoBlockStyle = InfoBlockStyle.DARK;

    private setupDefaults() {
        this.orderedLicense = [];
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private datePipe: DatePipe
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.licenses && changes.licenses.currentValue) {
            this.orderedLicense = [];
            this.newlyAddedLicense = this.formatLicenseKey(this.system.licensesModified);
            this.licenses.forEach((lic) => {
                this.orderedDetails(lic.info);
            });

            this.licenses.sort((a, b) => {
                if (a.info.serial === this.newlyAddedLicense) {
                    return -1;
                }
                if (b.info.serial === this.newlyAddedLicense) {
                    return 1;
                }
                return 0;
            });
        }
    }

    ngOnDestroy(): void {
    }

    private formatLicenseKey = (key: string) => {
        if (!key) {
            return '';
        }

        const chunks = key.match(/.{1,4}/g);
        return chunks.join('-').toUpperCase(); // returns AAAA-BBBB-CCCC-DDDD
    };

    private orderedDetails(info): void {
        const next30days = new Date();
        next30days.setDate(next30days.getDate() + 30);
        const warning = info.expiration ? new Date(info.expiration).getTime() < next30days.getTime() : false;
        const block = new InfoBlockSection(
            [
                {
                    name  : this.LANG.license.info.type,
                    value : info.type
                }, {
                    name  : this.LANG.license.info.channels,
                    value : info.count
                }, {
                    name        : this.LANG.license.info.server,
                    value       : info.serverName || this.LANG.common.unknown,
                    customClass : !info.serverStatus ? InfoDetailClass.ERROR : undefined
                }, {
                    name  : this.LANG.license.info.hwid,
                    value : info.hwid
                }, {
                    name        : this.LANG.license.info.status,
                    value       : info.status,
                    customClass : info.expired || !info.serverStatus ? InfoDetailClass.ERROR : undefined
                }, {
                    name        : this.LANG.license.info.expires,
                    value       : info.expiration ? this.datePipe.transform(info.expiration, 'dd MMM yyyy, hh:mm a') : '-',
                    customClass : warning ? InfoDetailClass.ERROR : undefined
                }, {
                    name  : this.LANG.license.info.deactivations,
                    show  : !info.expiration && !info.expired && info.status !== this.LANG.license.info.error,
                    value : (this.CONFIG.licenseDeactivations - info.deactivations) + '' // convert to string
                }]
        );

        this.orderedLicense[info.serial] = [block];
    }
}
