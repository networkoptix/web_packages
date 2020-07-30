import {
    Component, Inject, OnDestroy,
    LOCALE_ID, Input, OnChanges,
    SimpleChanges, OnInit
} from '@angular/core';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { Subscription }              from 'rxjs';

import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { Watcher }                   from '../../../../../services/apply.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';
import { mapStorages }               from '../storage-advanced/storage.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-server-storage-component',
    templateUrl : 'storage.component.html',
    styleUrls   : ['storage.component.scss']
})
export class NxSystemStorageComponent implements OnChanges {
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
        @Inject(LOCALE_ID) private locale: string
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();

        this.showStorage = false;
        this.loading = true;
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.init();
        // if (changes.system?.currentValue || changes.serverId?.currentValue) {
        //     this.init();
        // }
    }

    init() {
        const replyMock = {
            reply: {
                storageProtocols : ['smb'],
                storages         : [
                    {
                        freeSpace        : '761341648896',
                        isBackup         : false,
                        isExternal       : false,
                        isOnline         : true,
                        isUsedForWriting : true,
                        isWritable       : true,
                        reservedSpace    : '32212254720',
                        storageId        : '{6ab74f2c-09df-0807-dab4-c450d7c936c6}',
                        storageStatus    : 'used',
                        storageType      : 'local',
                        totalSpace       : '1968874332160',
                        url              : '/media/tsanko/movies/HD Witness Media'
                    }, {
                        freeSpace        : '41420242944',
                        isBackup         : false,
                        isExternal       : false,
                        isOnline         : true,
                        isUsedForWriting : true,
                        isWritable       : false,
                        reservedSpace    : '10737418240',
                        storageId        : '{b9017e44-74fe-b549-bb65-2c14418ddb02}',
                        storageStatus    : 'used|tooSmall|system',
                        storageType      : 'local',
                        totalSpace       : '62220242944',
                        url              : '/opt/networkoptix/mediaserver/var/data'
                    }]
            }
        };

        this.loading = false;
        this.showStorage = true;
        this.storage = replyMock.reply.storages;

        // if (this.system?.currentServerNotBusy && this.system?.servers?.length) {
        //     this.system.updateOrGetSystemStorage().toPromise()
        //         .then(response => {
        //             this.loading = false;
        //             this.showStorage = (Object.keys(response.reply.storages).length > 0);
        //             this.storage = response.reply.storages;
        //         });
        // }
    }
}
