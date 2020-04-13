import {
    Component,
    OnDestroy, Input, OnChanges,
    SimpleChanges, ViewChild
} from '@angular/core';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService }          from '../../../../../services/process.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxSystem }                  from '../../../../../services/system.service';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-license-summary-component',
    templateUrl : 'summary.component.html',
    styleUrls   : ['summary.component.scss']
})

export class NxLicenseSummaryComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() licenses: any = [];

    private setupDefaults() {
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();

        this.setupDefaults();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.licenses && changes.licenses.currentValue) {

        }
    }

    ngOnDestroy(): void {
    }
}
