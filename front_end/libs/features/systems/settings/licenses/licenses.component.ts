import { Component, Input, OnInit, ViewChild, effect, signal } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject } from 'rxjs';
import { delay, map, retryWhen, takeUntil } from 'rxjs/operators';

import { NxLicenseSummaryComponent } from '@components/summary/summary.component';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import type { License } from '@services/system.service/types/licenses.types';
import type { NxSystemServer } from '@services/system.service/types/servers.types';
import { menus } from '@static-variables';
import { cleanId } from '@utils/general';

import { getDynamicLicense } from './dynamic-license';

@UntilDestroy()
@Component({
    selector: 'nx-system-licenses',
    templateUrl: 'licenses.component.html',
    styleUrls: ['licenses.component.scss'],
})
export class NxSystemLicensesComponent implements OnInit {
    @Input() system: NxSystem;
    @ViewChild('licenseSummary', { static: false }) licenseSummary: NxLicenseSummaryComponent;
    CONFIG: IConfig;
    LANG = staticLang;

    resetSystemInfo$ = new Subject();
    resetSystem$ = new Subject();
    resetLicense$ = new Subject();

    licenses: any = [];
    licenseSummaries: License[];

    showNewLicense$$ = signal(false);

    private updateLicenses(): void {
        this.resetLicense$.next(true);
        this.system.licensesModifiedSubject.pipe(takeUntil(this.resetLicense$)).subscribe(() => {
            this.getLicenses();
        });
    }

    // private updateMediaServers(): void {
    //     this.resetSystem$.next(true);
    //     this.system.infoSubject
    //         .pipe(
    //             distinctUntilChanged(),
    //             map(system => {
    //                 if (!system.servers || system.servers.length === 0) {
    //                     throw new Error();
    //                 }
    //             }),
    //             retryWhen(err => err.pipe(delay(1000))),
    //             untilDestroyed(this),
    //             takeUntil(this.resetSystem$),
    //         )
    //         .subscribe(() => {
    //             this.system.serverManager
    //                 .initSystemMediaServers()
    //                 .catch(error => {
    //                     console.error(error);
    //                 });
    //         });
    // }

    constructor(configService: NxConfigService, private menuService: NxMenuService) {
        this.CONFIG = configService.getConfig();

        effect(() => {
            if (this.showNewLicense$$()) {
                this.licenseSummary.getLicenses(true);
            }
        });
    }

    ngOnInit(): void {
        this.updateLicenses();
        this.menuService.selectedSection.set(menus.systemSettings.admin.id);
        this.menuService.selectedDetailsSection.set(menus.systemSettings.licenses.id);
    }

    private createLicenseInfo(item): void {
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
            deactivations: '-',
        };

        const dynamicLicense = getDynamicLicense({
            CONFIG: this.CONFIG,
            licenseTypeTitles: this.LANG.license.licenseTypeTitles,
        });

        item.licenseBlock.split('\n').forEach(property => {
            const prop = property.split('=');
            item.info[prop[0].toLowerCase()] = prop[1];
        });

        if (!item.info.class || !item.info.brand || !item.info.hwid) {
            item.info.serial = item.key;
            item.info.status = this.LANG.license.info.error;
            item.info.type = this.LANG.license.licenseTypeTitles.Invalid;

            return;
        }

        item.info.status = item.info.expired
            ? this.LANG.license.info.expired
            : this.LANG.license.info.ok;
        // Set license type - it may seem easy optimization, but it's a messed up logic so keeping it verbose makes it simple
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

    private addLicenseSummary(item): void {
        // for license summary block
        const { type } = item.info;
        const license = this.licenseSummaries.find(ls => ls.type === type);

        let avail = parseInt(item.info.count) || 0;
        if (item.info.serverStatus !== this.LANG.license.info.online || item.info.expired) {
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
                required: item.info.required,
            });
        }
    }

    private buildLicensesInfo(info): void {
        const serversTime = info?.times || [];
        const hardwareIds = info?.hardwareIds?.reply || [];
        const licensesInfo = info?.licensesInfo?.licenses || [];
        this.licenseSummaries = [];

        if (hardwareIds.length) {
            let maxNvrChannels = 0;
            let maxStarterChannels = 0;

            licensesInfo.forEach(item => {
                this.createLicenseInfo(item);

                const boundServer = hardwareIds.find(
                    (server: { hardwareIds: string[]; serverId: string }) => {
                        return server.hardwareIds.find((id: string) => id === item.info.hwid);
                    },
                );

                const server: NxSystemServer | any = boundServer
                    ? this.system.serverManager.servers.find(
                          server => server.id === boundServer.serverId,
                      ) || {}
                    : {};

                if (Object.keys(server).length) {
                    if (serversTime.length) {
                        item.info.serverTime = serversTime.find(time => {
                            return cleanId(server.id) === time.serverId;
                        }).vmsTime;
                    }

                    // format date to standard format ... Safari doesn't recognize "yyyy-MM-dd HH:mm:ss"
                    item.info.expiration = new Date(
                        item.info.expiration.replace(/-/g, '/'),
                    ).getTime();

                    item.info.expired = item.info.expiration < item.info.serverTime; // serverTime is in milliseconds
                    item.info.serverName = server.name;
                    item.info.serverStatus = this.LANG.license.info[server.status.toLowerCase()];
                    item.info.status = item.info.expired
                        ? this.LANG.license.info.expired
                        : item.info.serverStatus === this.LANG.license.info.online
                        ? item.info.status
                        : this.LANG.license.info.error;

                    // monkey patch -> turn off all NVR licenses and then flip only the one with higher channels
                    if (item.info.type === this.LANG.license.licenseTypeTitles.NVR) {
                        if (maxNvrChannels < +item.info.count) {
                            maxNvrChannels = +item.info.count;
                        }
                        item.info.status = this.LANG.license.info.error;
                    }
                    // monkey patch -> turn off all STARTER licenses and then flip only the one with higher channels
                    if (item.info.type === this.LANG.license.licenseTypeTitles.Starter) {
                        if (maxStarterChannels < +item.info.count) {
                            maxStarterChannels = +item.info.count;
                        }
                        item.info.status = this.LANG.license.info.error;
                    }
                } else {
                    item.info.serverName = this.LANG.license.info.serverNotFound;
                    item.info.serverStatus = server.status;
                    item.info.status = this.LANG.license.info.error;
                }

                this.addLicenseSummary(item);
            });

            // only one license per type "NVR" or "STARTER" is allowed per system
            // since it's not possible to register new one with fewer channels
            // it's safe to assume that last one is the active
            const nvrs = licensesInfo.filter(item => {
                return item.info.type === this.LANG.license.licenseTypeTitles.NVR;
            });
            if (nvrs.length) {
                nvrs[nvrs.length - 1].info.status = this.LANG.license.info.ok;
            }

            const starters = licensesInfo.filter(item => {
                return item.info.type === this.LANG.license.licenseTypeTitles.Starter;
            });
            if (starters.length) {
                starters[starters.length - 1].info.status = this.LANG.license.info.ok;
            }

            this.licenses = licensesInfo;
        }
    }

    private getServerInfo(): void {
        this.system.getAggregateLicenseInfo().subscribe(info => {
            this.buildLicensesInfo(info);
        });
    }

    private getLicenses(): void {
        this.resetSystemInfo$.next(true);
        this.system.infoSubject
            .pipe(
                map(system => {
                    if (
                        !system.serverManager.servers ||
                        system.serverManager.servers.length === 0
                    ) {
                        throw new Error();
                    }
                }),
                retryWhen(err => err.pipe(delay(1000))),
                untilDestroyed(this),
                takeUntil(this.resetSystemInfo$),
            )
            .subscribe(() => {
                this.getServerInfo();
            });
    }
}
