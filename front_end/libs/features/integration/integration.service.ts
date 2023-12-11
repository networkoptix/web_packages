import { Injectable, OnDestroy } from '@angular/core';
import { escape } from 'lodash-es';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { Integration } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { icons } from '@static-variables';
import { paramSortFunc } from '@utils/general';

interface Platform {
    file: string;
    name: string;
    order: string;
    url: string;
    noFollow: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class IntegrationService implements OnDestroy {
    CONFIG: IConfig;
    account: Account;

    pluginsSubject = new BehaviorSubject<Partial<Integration>[]>(undefined);
    pluginSubject = new BehaviorSubject<Partial<Integration>>({});
    haveCustomBuild: boolean;
    private integrationSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        private api: NxCloudApiService,
        private accountService: NxAccountService,
    ) {
        this.CONFIG = configService.getConfig();

        this.accountService
            .get()
            .then(account => {
                this.account = account;
            })
            .then(_ => {
                this.integrationSubscription = this.getIntegrations(
                    this.account && this.account.is_staff,
                ).subscribe(result => {
                    const plugins = result?.data || [];

                    plugins.forEach(plugin => {
                        if (plugin.mine) {
                            plugin.information.type.push({ id: 'mine', label: 'mine' }); // label is not important - filter by ID
                        }

                        plugin.versionDetails = {
                            version: plugin.versionDetails
                                ? this.formatVersion(plugin.versionDetails.version) || '1.0'
                                : '1.0',
                        };
                        this.formatRequirementsAndCompatibility(plugin);

                        plugin.information.logo = plugin.information.logo || icons.default;

                        plugin.state = plugin.pending
                            ? 'pending'
                            : plugin.draft
                              ? 'draft'
                              : undefined;

                        plugin.link = '/integrations/' + (plugin.urlified || plugin.id);
                        plugin.queryParams = plugin.state ? { state: plugin.state } : {};
                    });
                    this.pluginsSubject.next(plugins);
                });
            });
    }

    private getIntegrations(ignoreSW): Observable<any> {
        return this.api.getIntegrations();
    }

    formatVersion(elm) {
        if (!elm || (elm && elm !== '' && !elm.startsWith('v.'))) {
            elm = elm ? 'v.&nbsp;' + elm : '';
        }

        return elm;
    }

    private formatRequirementsAndCompatibility(plugin): void {
        const section = plugin.requirementsAndCompatibility;

        if (section) {
            this.haveCustomBuild = false;

            if (section.platforms) {
                section.platforms.icons = this.setPlatformIcons(plugin);
            }

            if (section.testedBuild) {
                section.testedVersions.splice(0, 0, section.testedBuild);
                this.haveCustomBuild = true;
            }

            switch (section.testedVersions.length) {
                case 0:
                    break;
                case 1:
                    section.testedVersionsString = section.testedVersions[0];
                    break;

                case 2:
                    if (this.haveCustomBuild) {
                        section.testedVersionsString = section.testedVersions[0] + ',&nbsp;...';
                    } else {
                        section.testedVersionsString = section.testedVersions.join(',&nbsp;');
                    }
                    break;

                default:
                    if (this.haveCustomBuild) {
                        section.testedVersionsString = section.testedVersions[0] + ',&nbsp;...';
                    } else {
                        section.testedVersionsString =
                            section.testedVersions.slice(0, 2).join(',&nbsp;') + ',&nbsp;...';
                    }
            }

            section.testedVersionsStringFull = section.testedVersions.join(', ');

            section.testedVersionsString = this.formatVersion(section.testedVersionsString);
            section.testedVersionsStringFull = this.formatVersion(section.testedVersionsStringFull);
        }
    }

    private formatScreenshots(section): void {
        if (section.screenshots) {
            const processed: any = [];
            section.screenshots.forEach(screenshot => {
                processed.push({
                    id: processed.length + 1,
                    value: screenshot.screenshot,
                    sortKey: processed.length + 1,
                    caption: screenshot.caption,
                });
            });
            section.screenshots = processed;
        }
    }

    private formatOverviewScreenshots(plugin) {
        const processed: any = [];

        if (!plugin.overview) {
            return;
        }

        processed.push(
            ...plugin.overview.screenshots.map(screenshot => ({
                id: processed.length + 1,
                value: screenshot.screenshot,
                sortKey: processed.length + 1,
                caption: screenshot.caption,
            })),
        );

        if (processed.length) {
            processed.sort(
                paramSortFunc((elm: any) => {
                    return elm.sortKey;
                }),
            );

            plugin.overview.screenshots = processed;
        }
    }

    setPlatformIcons(plugin) {
        const platformIcons = [];

        icons.platforms.forEach(icon => {
            const platform = plugin.requirementsAndCompatibility.platforms.find(platform => {
                // 32 or 64 bit? ... it doesn't matter :)
                return platform.toLowerCase().includes(icon.name);
            });
            if (platform) {
                platformIcons.push({ name: platform, src: icon.src });
            }
        });

        return platformIcons;
    }

    format(plugin) {
        if (plugin.downloadFiles) {
            const downloadPlatforms = plugin.downloadFiles;
            plugin.downloadFiles = [];

            for (const platformName in downloadPlatforms) {
                // If there is no file url, or it's the name for an additional field skip
                if (
                    typeof downloadPlatforms[platformName] !== 'string' ||
                    !downloadPlatforms[platformName] ||
                    platformName.match(/-file-[\d]+-name/) ||
                    platformName.match(/external-link-name/)
                ) {
                    continue;
                }

                const platform: Platform = {
                    file: '',
                    name: '',
                    order: '',
                    url: '',
                    noFollow: false,
                };
                // If the platformName is additional file we replace it with the correct name
                if (platformName.match(/-file-[\d]+/) || platformName.match(/external-link/)) {
                    platform.name = downloadPlatforms[`${platformName}-name`];
                    if (platformName.match(/external-link/)) {
                        platform.noFollow = true;
                    }
                } else {
                    platform.name = this.CONFIG.integration.defaultPlatformNames[platformName];
                }

                platform.url = downloadPlatforms[platformName];
                platform.file = platform.url.slice(platform.url.lastIndexOf('/') + 1);
                platform.order = plugin.downloadFilesOrder[platformName];
                if (!platform.file) {
                    platform.file = platform.url;
                }
                plugin.downloadFiles.push(platform);
            }
            // sort by name and then sort by file name.
            plugin.downloadFiles = plugin.downloadFiles.sort((a, b) => {
                if (a.order < b.order) {
                    return -1;
                } else if (a.order > b.order) {
                    return 1;
                }
                return 0;
            });
        }

        if (plugin.versionDetails) {
            plugin.versionDetails.version = this.formatVersion(
                escape(plugin.versionDetails.version),
            );
        } else {
            plugin.versionDetails = {
                version: '&nbsp;',
            };
        }

        if (plugin.requirementsAndCompatibility?.platforms) {
            plugin.requirementsAndCompatibility.platforms.icons = this.setPlatformIcons(plugin);
        }

        this.formatScreenshots(plugin.instructions);
        this.formatOverviewScreenshots(plugin);
        this.formatRequirementsAndCompatibility(plugin);

        return plugin;
    }

    getIntegrationBy(id: number, status: string): Observable<any> {
        return this.api.getIntegrationBy(id, status);
    }

    setIntegrationPlugin(plugin: any = {}): void {
        this.pluginSubject.next(plugin);
    }

    getIntegrationPlugin() {
        return this.pluginSubject.value;
    }

    ngOnDestroy(): void {
        this.integrationSubscription.unsubscribe();
        this.pluginsSubject.complete();
    }
}
