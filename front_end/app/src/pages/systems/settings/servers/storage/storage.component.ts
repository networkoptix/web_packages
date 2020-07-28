import {
    Component, Inject, OnDestroy,
    LOCALE_ID, Input, OnChanges,
    SimpleChanges
}                                    from '@angular/core';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { Subscription }              from 'rxjs';

import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { Watcher }                   from '../../../../../services/apply.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { LanguageI18NStaticTypes }  from '../../../../../../language_i18n_static_types';
import { IConfig, NxConfigService } from '../../../../../services/nx-config';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-server-storage-component',
    templateUrl : 'storage.component.html',
    styleUrls   : ['storage.component.scss']
})
export class NxSystemStorageComponent {
    @Input() system: NxSystem;
    @Input() serverId: string;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    loading: boolean;
    showStorage: boolean;
    systemSubscription: Subscription;
    saveSettings: Process;
    storage = [];
    watchers: Watcher<any>[] = [];

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        @Inject(LOCALE_ID) private locale: string,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();

        this.showStorage = false;
        this.loading = true;
    }

}
