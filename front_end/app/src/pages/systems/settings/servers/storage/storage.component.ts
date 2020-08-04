import {
    Component, Inject, OnDestroy,
    LOCALE_ID, Input, OnChanges,
    SimpleChanges, OnInit
} from '@angular/core';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { Subscription, interval }              from 'rxjs';

import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { Watcher }                   from '../../../../../services/apply.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';

enum MODE {
    MAIN = 0,
    BACKUP = 1,
    NOT_IN_USE = 3
}

enum STORAGE_STATUS {
    IN_USE,
    INACCESSIBLE,
    RESERVED,
    DISABLED
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-server-storage-component',
    templateUrl : 'storage.component.html',
    styleUrls   : ['storage.component.scss']
})
export class NxSystemStorageComponent implements OnInit, OnChanges {
    @Input() system: NxSystem;
    @Input() serverId: string;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    loading: boolean;
    showStorage: boolean;
    systemSubscription: Subscription;
    saveSettings: Process;
    storage: any;
    watchers: Watcher<any>[] = [];
    reindexingMain = false;
    percentMainDone = 0;
    reindexingBackup = false;
    percentBackupDone = 0;

    ddWidth: number;
    modes: any;
    modeSelected: any;
    STATUS: any;
    percentDoneSubscription: Subscription;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private dialogsService: NxDialogsService,
        @Inject(LOCALE_ID) private locale: string
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();

        this.showStorage = false;
        this.loading = true;

        this.modes = [
            { name: this.LANG.storage.modes.main(), value: 'modeMain' },
            { name: this.LANG.storage.modes.backup(), value: 'modeBackup' },
            { name: 'horizontal', value: '' },
            { name: this.LANG.storage.modes.notInUse(), value: 'modeNotInUse' }
        ];

        this.STATUS = STORAGE_STATUS;
    }

    ngOnInit() {
        this.calcDDWidth();
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.init();
    }

    init() {
        const replyMock = {
            reply: {
                'storageProtocols': ['smb'],
                'storages': [{
                    'freeSpace'       : '756123619328',
                    'isBackup'        : false,
                    'isExternal'      : false,
                    'isOnline'        : true,
                    'isUsedForWriting': true,
                    'isWritable'      : true,
                    'reservedSpace'   : '32212254720',
                    'storageId'       : '{52a80ce6-a2d6-b823-a326-34d9e69b2d5e}',
                    'storageStatus'   : 'used',
                    'storageType'     : 'local',
                    'totalSpace'      : '1968874332160',
                    'url'             : '/media/tsanko/movies1/HD Witness Media'
                }, {
                    'freeSpace'       : '-1',
                    'isBackup'        : false,
                    'isExternal'      : false,
                    'isOnline'        : false,
                    'isUsedForWriting': true,
                    'isWritable'      : false,
                    'reservedSpace'   : '24505933824',
                    'storageId'       : '{7afc3fbd-5fd1-a277-c3cd-999e396fa4bb}',
                    'storageStatus'   : 'used|beingChecked',
                    'storageType'     : 'local',
                    'totalSpace'      : '-1',
                    'url'             : '/media/tsanko/BUILD/HD Witness Media'
                }, {
                    'freeSpace'       : '-1',
                    'isBackup'        : false,
                    'isExternal'      : false,
                    'isOnline'        : false,
                    'isUsedForWriting': true,
                    'isWritable'      : false,
                    'reservedSpace'   : '32212254720',
                    'storageId'       : '{6ab74f2c-09df-0807-dab4-c450d7c936c6}',
                    'storageStatus'   : 'used|beingChecked',
                    'storageType'     : 'local',
                    'totalSpace'      : '-1',
                    'url'             : '/media/tsanko/movies/HD Witness Media'
                }, {
                    'freeSpace'       : '41258360832',
                    'isBackup'        : false,
                    'isExternal'      : false,
                    'isOnline'        : true,
                    'isUsedForWriting': false,
                    'isWritable'      : false,
                    'reservedSpace'   : '10737418240',
                    'storageId'       : '{b9017e44-74fe-b549-bb65-2c14418ddb02}',
                    'storageStatus'   : 'used|tooSmall|system',
                    'storageType'     : 'local',
                    'totalSpace'      : '62220242944',
                    'url'             : '/opt/networkoptix/mediaserver/var/data'
                }]
            }
        };

        this.loading = false;
        this.showStorage = true;
        this.storage = replyMock.reply.storages;

        this.storage.hasAction = false;
        this.storage.forEach(store => {
            if (store.freeSpace) {
                store.status = STORAGE_STATUS.IN_USE; // default

                if (!store.isOnline) {
                    store.status = STORAGE_STATUS.INACCESSIBLE;
                    this.storage.hasAction = true;
                } else {
                    if (store.storageStatus.includes('used') && store.storageStatus.includes('tooSmall')) {
                        store.status = STORAGE_STATUS.RESERVED;
                    }
                }
            }
        });

        // ***************************************

        // if (this.system?.currentServerNotBusy && this.system?.servers?.length) {
        //     this.system.updateOrGetSystemStorage().toPromise()
        //         .then(response => {
        //             this.loading = false;
        //             this.showStorage = (Object.keys(response.reply.storages).length > 0);
        //             this.storage = response.reply.storages;
        //
        //             this.storage.hasAction = false;
        //             this.storage.forEach(store => {
        //                 if (store.freeSpace) {
        //                     store.status = STORAGE_STATUS.IN_USE; // default
        //
        //                     if (store.freeSpace === '-1') {
        //                         store.status = STORAGE_STATUS.INACCESSIBLE;
        //                         this.storage.hasAction = true;
        //                     }
        //                 }
        //             });
        //         });
        // }
    }

    selectMode(store) {
        if (!store.isBackup) {
            return this.modes[MODE.MAIN];
        } else {
            return this.modes[MODE.BACKUP];
        }
    }

    changeMode(store, selected) {

    }

    calcDDWidth() {
        const longest = this.modes.reduce((a, b) => {
            if (b.name === 'horizontal' || a.name.length > b.name.length) {
                return a;
            }
            if (a.name === 'horizontal' || a.name.length < b.name.length) {
                return b;
            }
        });

        // calculate dd size ... for simplicity a span is used
        const dd = document.createElement('span');
        dd.style.visibility = 'hidden';
        dd.innerText = longest.name;
        document.body.appendChild(dd);
        // add button's left and right padding and space for info icon
        this.ddWidth = Math.round(dd.getBoundingClientRect().width + 80);

        document.body.removeChild(dd);
    }

    openAddStorage() {
        this.dialogsService.addStorage(this.system, this.serverId);
	}

    reindexStorage(type: 'main' | 'backup') {
        if (type === 'main') {
            this.percentDoneSubscription = interval(1000).subscribe(val => {
                if (this.percentMainDone < 1) {
                    this.percentMainDone += Math.random() * 0.2;
                    if (this.percentMainDone > 1) {
                        this.percentMainDone = 1;
                        this.percentDoneSubscription.unsubscribe();
                    }
                }
            });
        }
    }

    cancelIndexing(type: 'main' | 'backup') {
        if (type === 'main') {
            this.percentMainDone = 0;
        } else {
            this.percentBackupDone = 0;
        }
        this.percentDoneSubscription.unsubscribe();
    }
}
