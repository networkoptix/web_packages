import { DatePipe } from '@angular/common';
import {
    Component,
    OnDestroy,
    Input,
    OnChanges,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import {
    InfoBlockLine,
    InfoBlockSection,
    InfoBlockStyle,
    InfoDetailClass,
    InfoLineStyle,
} from '@components/info-block/info-block.component';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import type { NxSystem } from '@services/system.service/system';
import { NgChanges } from '@utils/ng-changes';

import { getDynamicLicense } from '../licenses.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-license-detail-component',
    templateUrl: 'license.component.html',
    styleUrls: ['license.component.scss']
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

    ngOnChanges(changes: NgChanges<NxLicenseDetailComponent>): void {
        if (changes.licenses && changes.licenses.currentValue) {
            this.orderedLicense = [];
            this.newlyAddedLicense = this.formatLicenseKey(
                this.system.licensesModified
            );
            this.licenses.forEach(lic => {
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
        const dynamicLicense = getDynamicLicense(this);
        const next30days = new Date();
        next30days.setDate(next30days.getDate() + 30);

        if (typeof info.expiration === 'string') {
            // Safari doesn't like date format like "2021-04-22 06:59"
            info.expiration = info.expiration
                ? new Date(info.expiration.replace(' ', 'T')).getTime()
                : '';
        }

        const warning = info.expiration
            ? info.expiration < next30days.getTime()
            : false;
        const deactivationsRemaining =
            dynamicLicense[info.class].deactivationsAllowed -
                (info.deactivations === '-' ? 0 : info.deactivations);
        const block = new InfoBlockSection(
            [
                new InfoBlockLine(
                    this.LANG.license.info.type(),
                    typeof info.type === 'function' ? info.type() : info.type
                ),
                new InfoBlockLine(this.LANG.license.info.channels(), info.count),
                new InfoBlockLine(
                    this.LANG.license.info.server(),
                    info.serverName || this.LANG.common.unknown(),
                    !info.serverStatus
                        ? InfoDetailClass.ERROR
                        : undefined
                ),
                new InfoBlockLine(this.LANG.license.info.hwid(), info.hwid),
                new InfoBlockLine(
                    this.LANG.license.info.status(),
                    info.status,
                    info.expired ||
                        !info.serverStatus ? InfoDetailClass.ERROR : undefined
                ),
                new InfoBlockLine(
                    this.LANG.license.info.expires(),
                    info.expiration
                        ? this.datePipe.transform(
                            info.expiration,
                            'dd MMM yyyy, hh:mm a'
                        )
                        : '-',
                    warning ? InfoDetailClass.ERROR : undefined
                ),
                new InfoBlockLine(
                    this.LANG.license.info.deactivations(),
                    deactivationsRemaining,
                    deactivationsRemaining <= 0 ? InfoDetailClass.ERROR : null,
                    null,
                    !info.expiration && !info.expired && info.class !== 'nvr'
                )
            ]
        );

        this.orderedLicense[info.serial] = [block];
    }
}
