import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { forkJoin, Subject } from 'rxjs';
import { delay, filter, map, retryWhen, takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSystem, NxSystemServer } from '@services/system.service';
import { NxUtilsService } from '@services/utils.service';
import { NxMenuService } from '@src/menu/menu.service';

import { NxSettingsService } from '../settings.service';

@UntilDestroy()
@Component({
    selector: 'nx-system-licenses',
    templateUrl: 'licenses.component.html',
    styleUrls: ['licenses.component.scss']
})
export class NxSystemLicensesComponent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    system: NxSystem;
    resetSystemInfo$ = new Subject();
    resetSystem$ = new Subject();
    resetLicense$ = new Subject();

    licenses: any = [];
    licenseSummaries: Array<{
        type: string,
        count: number,
        countAvail: number,
        inUse: number | string,
        required: number
    }>;

    // Constructor and class initialization methods
    private setupDefaults() {
        this.settingsService.systemSubject
            .pipe(
                untilDestroyed(this),
                filter(data => data !== undefined && data.id !== this.system?.id))
            .subscribe((system) => {
                this.system = system;

                this.getLicenses();

                this.resetLicense$.next(true);
                this.system.licensesModifiedSubject
                    .pipe(takeUntil(this.resetLicense$))
                    .subscribe(() => {
                        this.getLicenses();
                    });

                this.resetSystem$.next(true);
                this.system.infoSubject
                    .pipe(
                        untilDestroyed(this),
                        takeUntil(this.resetSystem$),
                        map(system => {
                            if (!system.servers || system.servers.length === 0) {
                                throw system;
                            }
                        }),
                        retryWhen(err => err.pipe(delay(1000)))
                    )
                    .subscribe(() => {
                        if (this.system.currentServerNotBusy) {
                            if (
                                this.system &&
                                this.system.servers &&
                                this.system.servers.length
                            ) {
                                this.system.serverManager
                                    .initSystemMediaServers()
                                    .catch(error => {
                                        console.error(error);
                                    });
                            }
                        }
                    });
            });
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.setupDefaults();
    }

    ngOnInit() {
        this.menuService.section = this.CONFIG.menus.systemSettings.admin.id;
        this.menuService.detail = this.CONFIG.menus.systemSettings.licenses.id;
    }

    private createLicenseInfo(item) {
        item.info = {
            type: '',
            count: '',
            inuse: '',
            required: 0,
            serverName: '',
            hwid: '',
            expired: false,
            status: '',
            expiration: '',
            deactivations: '-'
        };

        const dynamicLicense = getDynamicLicense(this);

        item.licenseBlock
            .split('\n')
            .map((property) => {
                const prop = property.split('=');
                item.info[prop[0].toLowerCase()] = prop[1];
            });

        item.info.status = item.info.expired
            ? this.LANG.license.info.expired()
            : this.LANG.license.info.ok();
        // Set license type - it may seem easy optimization but it's a messed up logic so keeping it verbose makes it simple
        if (
            item.info.serial === 'TRIAL' ||
            item.info.name === 'TRIAL' ||
            item.key.indexOf('0000-0000-0000') === 0
        ) {
            item.info.type = dynamicLicense.trial.title;
        } else {
            if (item.info.ordertype && item.info.ordertype === 'saas') {
                item.info.type = dynamicLicense[item.info.class].title;
            } else {
                // this is complicated as for now it matches desktop client. It will change in 4.2
                if (item.info.class === 'videowall') {
                    item.info.type = dynamicLicense[item.info.class].title;
                } else {
                    if (item.info.expiration) {
                        item.info.type = dynamicLicense.time.title;
                    } else {
                        item.info.type = dynamicLicense[item.info.class].title;
                    }
                }
            }
        }

        // Set license usage /Pending VMS-18155/
        if (item.info.inuse !== '') {
            item.info.required = parseInt(item.info.count) - parseInt(item.info.inuse);
        }
    }

    private addLicenseSummary(item) {
        // for license summary block
        const type = typeof item.info.type === 'function'
            ? item.info.type()
            : item.info.type;
        const license = this.licenseSummaries.find(ls => ls.type === type);

        let avail = parseInt(item.info.count) || 0;
        if (
            item.info.serverStatus !== this.LANG.license.info.online() ||
            item.info.expired
        ) {
            avail = 0;
        }

        if (license) {
            license.count += parseInt(item.info.count) || 0;
            license.countAvail += avail;
            license.required += item.info.required;
        } else {
            this.licenseSummaries.push({
                type,
                count: parseInt(item.info.count) || 0,
                countAvail: avail,
                inUse: 'N/A',
                required: item.info.required
            });
        }
    }

    private getLicenses() {
        this.system.getLicenses()
            .then(({ licenses: result }) => {
                if (result.length) {
                    this.resetSystemInfo$.next(true);
                    this.system.infoSubject
                        .pipe(
                            untilDestroyed(this),
                            takeUntil(this.resetSystemInfo$),
                            map(system => {
                                if (
                                    !system.servers ||
                                    system.servers.length === 0
                                ) {
                                    throw system;
                                }
                            }),
                            retryWhen(err => err.pipe(delay(1000)))
                        )
                        .subscribe(() => {
                            if (this.system.currentServerNotBusy) {
                                if (
                                    this.system &&
                                    this.system.servers &&
                                    this.system.servers.length
                                ) {
                                    forkJoin({
                                        times: this.system.getServerTimes(),
                                        hardwareIds: this.system.getHardwareIdsOfServers()
                                    }).subscribe(data => {
                                        const serversTime = data.times;
                                        const hardwareIds = data.hardwareIds.reply;
                                        this.licenseSummaries = [];

                                        if (hardwareIds.length) {
                                            let maxNvrChannels = 0;
                                            let maxStarterChannels = 0;

                                            result.forEach((item) => {
                                                this.createLicenseInfo(item);

                                                const boundServer = hardwareIds.find((server: { hardwareIds: string[], serverId: string }) => {
                                                    return server.hardwareIds.find((id: string) => id === item.info.hwid);
                                                });

                                                const server: NxSystemServer | any = (boundServer)
                                                    ? this.system.servers.find((server) => server.id === boundServer.serverId)
                                                    : {};

                                                if (Object.keys(server).length) {
                                                    item.info.serverTime = serversTime.find(time => {
                                                        return NxUtilsService.cleanId(server.id) === time.serverId;
                                                    }).vmsTime;

                                                    // format date to standard format ... Safari doesn't recognize "yyyy-MM-dd HH:mm:ss"
                                                    item.info.expiration = new Date(item.info.expiration.replace(/-/g, '/')).getTime();

                                                    item.info.expired = item.info.expiration < item.info.serverTime; // serverTime is in milliseconds
                                                    item.info.serverName = server.name;
                                                    item.info.serverStatus = this.LANG.license.info[server.status.toLowerCase()]();
                                                    item.info.status = (item.info.expired)
                                                        ? this.LANG.license.info.expired()
                                                        : (item.info.serverStatus === this.LANG.license.info.online())
                                                            ? item.info.status
                                                            : this.LANG.license.info.error();

                                                    // monkey patch -> turn off all NVR licenses and then flip only the one with higher channels
                                                    if (item.info.type() === this.LANG.license.licenseTypeTitles.NVR()) {
                                                        if (maxNvrChannels < +item.info.count) {
                                                            maxNvrChannels = +item.info.count;
                                                        }
                                                        item.info.status = this.LANG.license.info.error();
                                                    }
                                                    // monkey patch -> turn off all STARTER licenses and then flip only the one with higher channels
                                                    if (item.info.type() === this.LANG.license.licenseTypeTitles.Starter()) {
                                                        if (maxStarterChannels < +item.info.count) {
                                                            maxStarterChannels = +item.info.count;
                                                        }
                                                        item.info.status = this.LANG.license.info.error();
                                                    }
                                                } else {
                                                    item.info.serverName = this.LANG.license.info.serverNotFound();
                                                    item.info.serverStatus = server.status;
                                                    item.info.status = this.LANG.license.info.error();
                                                }

                                                this.addLicenseSummary(item);
                                            });

                                            result.find((item) => {
                                                if (
                                                    item.info.type === this.LANG.license.licenseTypeTitles.NVR &&
                                                    +item.info.count === maxNvrChannels ||
                                                    item.info.type === this.LANG.license.licenseTypeTitles.Starter &&
                                                    +item.info.count === maxStarterChannels
                                                ) {
                                                    item.info.status = this.LANG.license.info.ok();
                                                }
                                            });
                                            this.licenses = result;
                                        }
                                    });
                                }
                            }
                        });
                } else {
                    this.licenses = [];
                }
            })
            .catch(() => {
                this.licenses = [];
            });
    }
}

export interface DynamicLicense {
    [key: string]: {
        title: string;
        deactivationsAllowed
    }
}

export const getDynamicLicense = (
    instance: {
        CONFIG: IConfig,
        LANG: LanguageI18NStaticTypes
    }
) => instance.CONFIG.licenseTypes.reduce((
    licenses,
    { name, deactivationsAllowed, title }
) => ({
    ...licenses,
    [name]: {
        deactivationsAllowed,
        title: instance.LANG.license.licenseTypeTitles[title] || title
    }
}), {} as DynamicLicense);
