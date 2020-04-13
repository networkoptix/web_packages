import {
    Component,
    OnDestroy, Input, OnChanges,
    SimpleChanges, ViewChild
}                                    from '@angular/core';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService }          from '../../../../../services/process.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { DatePipe }                  from '@angular/common';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-license-detail-component',
    templateUrl : 'license.component.html',
    styleUrls   : ['license.component.scss']
})

export class NxLicenseDetailComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    orderedLicense: any = [];

    @Input() licenses: any = [];

    private setupDefaults() {
        this.orderedLicense = [];
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private datePipe: DatePipe
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();

        this.setupDefaults();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.licenses && changes.licenses.currentValue) {
            this.orderedLicense = [];
            this.licenses.forEach((lic) => {
                this.orderedDetails(lic.info);
            });
        }
    }

    ngOnDestroy(): void {
    }

    private orderedDetails(info): void {
        this.orderedLicense.push({
            name  : this.LANG.license.info.type,
            value : info.type
        });
        this.orderedLicense.push({
            name  : this.LANG.license.info.channels,
            value : info.count
        });
        this.orderedLicense.push({
            name  : this.LANG.license.info.server,
            value : info.serverName
        });
        this.orderedLicense.push({
            name  : this.LANG.license.info.hwid,
            value : info.hwid
        });
        this.orderedLicense.push({
            name  : this.LANG.license.info.status,
            value : info.status,
            error : info.expired
        });
        this.orderedLicense.push({
            name  : this.LANG.license.info.expires,
            value : this.datePipe.transform(info.expiration, 'dd MMM yyyy, hh:mm a'),
            error : info.expired
        });
        this.orderedLicense.push({
            name  : this.LANG.license.info.deactivations,
            value : info.deactivations
        });
    }
}
