import {
    Component, OnInit, Inject,
    ViewContainerRef, OnDestroy
}                                     from '@angular/core';
import {
    filter, map, delay,
    retryWhen
}                                     from 'rxjs/operators';
import { Subscription }               from 'rxjs';
import { ActivatedRoute }             from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { IConfig, NxConfigService } from '../../../../../services/nx-config';
import { LanguageI18NStaticTypes } from '../../../../../../language_i18n_static_types';
import { NxSystem } from '../../../../../services/system.service';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxApplyService } from '../../../../../services/apply.service';
import { NxProcessService } from '../../../../../services/process.service';
import { NxDialogsService } from '../../../../../dialogs/dialogs.service';
import { NxSettingsService } from '../../settings.service';
import { NxMenuService } from '../../../../../components/menu/menu.service';
import { NxUriService } from '../../../../../services/uri.service';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-server-advanced-storage-component',
    templateUrl : 'storage.component.html',
    styleUrls   : ['storage.component.scss']
})

export class NxSystemAdvancedStorageComponent implements OnDestroy {
    // TODO: Replace with request to system
    response = {
        error       : '0',
        errorString : '',
        reply       : {
            storageProtocols: [
                'smb'
            ],
            storages: [
                {
                    freeSpace        : '1837679546368',
                    isBackup         : false,
                    isExternal       : false,
                    isOnline         : true,
                    isUsedForWriting : true,
                    isWritable       : true,
                    reservedSpace    : '32212254720',
                    storageId        : '{301a17be-003c-7302-b28a-ccdc1a4c4a63}',
                    storageStatus    : 'used|system',
                    storageType      : 'local',
                    totalSpace       : '1964203130880',
                    url              : '/opt/networkoptix/mediaserver/var/data'
                },
                {
                    freeSpace        : '1837679546368',
                    isBackup         : false,
                    isExternal       : false,
                    isOnline         : true,
                    isUsedForWriting : true,
                    isWritable       : true,
                    reservedSpace    : '32212254720',
                    storageId        : '{301a17be-003c-7302-b28a-ccdc1a4c4a63}',
                    storageStatus    : 'used|system',
                    storageType      : 'local',
                    totalSpace       : '1964203130880',
                    url              : '/opt/networkoptix/mediaserver/var/second'
                }
            ]
        }
    }

    storages = this.response.reply.storages;

    ngOnDestroy() {}
}
