import {
    Component, LOCALE_ID, Inject,
    OnInit, OnDestroy, ViewEncapsulation
} from '@angular/core';
import { NxConfigService, IConfig }      from '../../../../services/nx-config';
import { NxLanguageProviderService }     from '../../../../services/nx-language-provider';
import { NxDialogsService }              from '../../../../dialogs/dialogs.service';
import { SubscriptionLike }              from 'rxjs';
import { NxUtilsService }                from '../../../../services/utils.service';
import { LanguageI18NStaticTypes }       from '../../../../../language_i18n_static_types';
import { NxSettingsService }             from '../settings.service';
import { NxSystem }                      from '../../../../services/system.service';
import { NxCloudApiService }             from '../../../../services/nx-cloud-api';
import { NxProcessService, Process }     from '../../../../services/process.service';
import { NxMenuService }                 from '../../../../components/menu/menu.service';
import { delay, filter, map, retryWhen } from 'rxjs/operators';
import { AutoUnsubscribe }               from 'ngx-auto-unsubscribe';
import { DatePipe }                      from '@angular/common';

interface LicenseInfo {
    type: string,
    count: string,
    inuse: string, // still not implemented VMS-18155 ... TODO: once done adjust var name
    required: number, // VMS-18155 ... once done it should display warning (if negative)
    serverName: string,
    hwid: string,
    status: string,
    expiration: string
}

@AutoUnsubscribe()
@Component({
    selector      : 'nx-system-licenses-storage',
    templateUrl   : 'licenses.component.html',
    styleUrls     : ['licenses.component.scss']
})
export class NxSystemLicensesComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    system: NxSystem;
    systemSubscription: SubscriptionLike;
    serverSubscription: SubscriptionLike;

    licenses: any = [];
    classMap: any = {};

    // Constructor and class initialization methods
    private setupDefaults() {
        this.classMap = {
            digital       : this.LANG.license.info.digital,
            analog        : 'Analog',
            edge          : 'Edge',
            vmax          : 'VMAX',
            videowall     : 'Video Wall',
            analogencoder : 'Analog Encoder',
            starter       : 'Starter',
            iomodule      : 'IO Module',
            bridge        : 'Bridge'
        };

        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe((system) => {
                this.system = system;

                this.system.getLicenses().then((result) => {
                    if (result.length) {
                        result.forEach((item) => {
                            const info: LicenseInfo = {
                                type       : '',
                                count      : '',
                                inuse      : '',
                                required   : 0,
                                serverName : '',
                                hwid       : '',
                                status     : '',
                                expiration : ''

                            };
                            item.info = info;
                            item.licenseBlock
                                .split('\n')
                                .map((property) => {
                                    const prop = property.split('=');
                                    item.info[prop[0].toLowerCase()] = prop[1];
                                });

                            item.info.status = (new Date(item.info.expiration).getTime() < new Date().getTime()) ? this.LANG.license.info.expired : this.LANG.license.info.ok;

                            // Set license type
                            if (item.info.serial === 'TRIAL' || item.info.name === 'TRIAL') {
                                item.info.type = this.LANG.license.info.trial;
                            } else if (!item.info.expiration || (item.info.ordertype && item.info.ordertype === 'saas')) {
                                item.info.type = this.classMap[item.info.class];
                            } else {
                                item.info.type = this.LANG.license.info.time;
                            }

                            // Set license usage /Pending VMS-18155/
                            if (item.info.inuse !== '') {
                                item.info.required = parseInt(item.info.count) - parseInt(item.info.inuse);
                            }
                        });

                        if (this.serverSubscription) {
                            this.serverSubscription.unsubscribe();
                        }
                        this.serverSubscription = this.system.infoSubject
                            .pipe(
                                map(system => {
                                    if (!system.servers || system.servers.length === 0) {
                                        throw system;
                                    }
                                }),
                                retryWhen(err => err.pipe(delay(1000)))
                            )
                            .subscribe(() => {
                                if (this.system.currentServerNotBusy) {
                                    if (this.system && this.system.servers && this.system.servers.length) {
                                        this.system
                                            .getHardwareIdsOfServers()
                                            .then((data) => {
                                                if (data.reply.length) {
                                                    result.forEach((item) => {
                                                        const boundServer = data.reply.find((server) => {
                                                            return server.hardwareIds.find((id) => id === item.info.hwid);
                                                        });

                                                        const server = this.system.servers.find((server) => server.id === boundServer.serverId);
                                                        if (Object.keys(server).length) {
                                                            item.info.serverName = server.name;
                                                            item.info.status = server.status === this.LANG.license.info.online ? item.info.status : this.LANG.license.info.error;
                                                        }
                                                    });
                                                }
                                            })
                                            .finally(() => {
                                                this.licenses = result;
                                            });
                                    }
                                }
                            });
                    }

                });
            });
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        @Inject(LOCALE_ID) private locale: string,
        private dialogService: NxDialogsService,
        private utilsService: NxUtilsService,
        private settingsService: NxSettingsService,
        private cloudApiService: NxCloudApiService,
        private processService: NxProcessService,
        private menuService: NxMenuService,
        private datePipe: DatePipe
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();

        this.setupDefaults();
    }

    ngOnInit() {
        this.menuService.setSection(this.CONFIG.menus.systemSettings.admin.id);
        this.menuService.setDetailsSection(this.CONFIG.menus.systemSettings.licenses.id);

    }

    ngOnDestroy(): void {
    }

    orderedDetails(info) {
        const details = [];
        details.push({ name: this.LANG.license.info.type, value: info.type });
        details.push({ name: this.LANG.license.info.channels, value: info.count });
        details.push({ name: this.LANG.license.info.server, value: info.serverName });
        details.push({ name: this.LANG.license.info.hwid, value: info.hwid });
        details.push({ name: this.LANG.license.info.status, value: info.status });
        details.push({ name: this.LANG.license.info.expires, value: this.datePipe.transform(info.expiration, 'dd MMM yyyy, hh:mm a') });

        return details;
    }
}
