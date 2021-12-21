import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

import { NxAccountService, Account } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxUtilsService } from '@services/utils.service';

interface Platform {
    file: string;
    name: string;
    order: string;
    url: string;
    noFollow: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class IntegrationService implements OnDestroy {
    CONFIG: IConfig;
    account: Account

    pluginsSubject = new BehaviorSubject(undefined);
    pluginSubject = new BehaviorSubject({});
    haveCustomBuild: boolean;
    private integrationSubject: Subscription;

    constructor(
        configService: NxConfigService,
        private api: NxCloudApiService,
        private accountService: NxAccountService
    ) {
        this.CONFIG = configService.getConfig();

        this.accountService.get().then(account => {
            this.account = account;
        }).then(_ => {
            this.integrationSubject = this.getIntegrations(this.account && this.account.is_staff)
                .subscribe(result => {
                    const plugins = result?.data || [];

                    plugins.forEach(plugin => {
                        if (plugin.mine) {
                            plugin.information.type.push({ id: 'mine', label: 'mine' }); // label is not important - filter by ID
                        }

                        plugin.versionDetails = {
                            version: (plugin.versionDetails) ? this.formatVersion(plugin.versionDetails.version) || '1.0' : '1.0'
                        };
                        this.formatRequirementsAndCompatibility(plugin);

                        plugin.information.logo = plugin.information.logo || this.CONFIG.icons.default;

                        plugin.state = (plugin.pending) ? 'pending' : (plugin.draft) ? 'draft' : undefined;

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
        if (!elm || elm && elm !== '' && !elm.startsWith('v.')) {
            elm = (elm) ? 'v.&nbsp;' + elm : '';
        }

        return elm;
    }

    private formatRequirementsAndCompatibility(plugin) {
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
                case 0: break;
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
                        section.testedVersionsString = section.testedVersions.slice(0, 2).join(',&nbsp;') + ',&nbsp;...';
                    }
            }

            section.testedVersionsStringFull = section.testedVersions.join(', ');

            section.testedVersionsString = this.formatVersion(section.testedVersionsString);
            section.testedVersionsStringFull = this.formatVersion(section.testedVersionsStringFull);
        }
    }

    private formatScreenshots(section) {
        if (section) {
            section.screenshots = Object.keys(section).filter((element) => {
                return element.match(/screenshot[\d]+/i) && section[element];
            }).map((key) => {
                const match = key.match(/([\d]+)/i);
                return { id: key, value: section[key], sortKey: parseInt(match[0], 10) };
            });

            if (section.screenshots.length < 1) {
                delete section.screenshots;
            } else {
                section.screenshots.sort(NxUtilsService.byParam((elm: any) => {
                    return elm.sortKey;
                }, NxUtilsService.sortASC));
            }
        }
    }

    private formatOverviewScreenshots(plugin) {
        const processed: any = [];

        if (!plugin.overview) {
            return;
        }

        Object.entries(plugin.overview).forEach((item) => {
            const matchScreenshot = item[0].match(/Screenshot([\d]+)$/);

            if (matchScreenshot) {
                processed.push({
                    id: item[0].replace('overview', ''),
                    value: item[1],
                    sortKey: parseInt(matchScreenshot[1], 10)
                });
            }
        });

        Object.entries(plugin.overview).forEach((item) => {
            const matchCaption = item[0].match(/Screenshot[\d]+caption$/);

            if (matchCaption) {
                processed.find((i) => {
                    if (i.id === matchCaption[0].replace('caption', '')) {
                        i.caption = item[1];
                    }
                });
            }
        });

        if (processed.length) {
            processed.sort(NxUtilsService.byParam((elm: any) => {
                return elm.sortKey;
            }, NxUtilsService.sortASC));

            plugin.overview.screenshots = processed;
        }
    }

    setPlatformIcons(plugin) {
        const platformIcons = [];

        this.CONFIG.icons.platforms.forEach(icon => {
            const platform = plugin.requirementsAndCompatibility
                .platforms
                .find(platform => {
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
                // If there is no file url or its the name for an additional field skip
                if (typeof downloadPlatforms[platformName] !== 'string' ||
                    !downloadPlatforms[platformName] ||
                    platformName.match(/-file-[\d]+-name/) ||
                    platformName.match(/external-link-name/)) {
                    continue;
                }

                const platform: Platform = { file: '', name: '', order: '', url: '', noFollow: false };
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
            plugin.versionDetails.version = NxUtilsService.htmlToEntity(
                this.formatVersion(plugin.versionDetails.version)
            );
        } else {
            plugin.versionDetails = {
                version: '&nbsp;'
            };
        }

        if (plugin.requirementsAndCompatibility?.platforms) {
            plugin.requirementsAndCompatibility.platforms.icons =
                this.setPlatformIcons(plugin);
        }

        this.formatScreenshots(plugin.instructions);
        this.formatOverviewScreenshots(plugin);
        this.formatRequirementsAndCompatibility(plugin);

        return plugin;
    }

    getIntegrationBy(id: number, status: string): Observable<any> {
        return this.api.getIntegrationBy(id, status);
    }

    setIntegrationPlugin(plugin: any = {}) {
        this.pluginSubject.next(plugin);
    }

    getIntegrationPlugin() {
        return this.pluginSubject.value;
    }

    ngOnDestroy() {
        this.integrationSubject.unsubscribe();
        this.pluginsSubject.unsubscribe();
    }
}
