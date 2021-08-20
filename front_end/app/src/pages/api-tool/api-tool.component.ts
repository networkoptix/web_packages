import {
    Component, OnInit,
    ViewEncapsulation
}                                    from '@angular/core';
import { NxPageService }             from '@services/page.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxSystem, NxSystemService } from '@services/system.service';
import { Subscription }              from 'rxjs';
import {
    delay, distinctUntilChanged,
    map, retryWhen
}                                    from 'rxjs/operators';
import { UntilDestroy }              from '@ngneat/until-destroy';
import SwaggerUI                     from 'swagger-ui';
import { IConfig, NxConfigService }  from '@services/nx-config';
import { NxAppStateService }         from '@services/nx-app-state.service';
import { NxScrollMechanicsService }  from '@services/scroll-mechanics.service';
import { NxMenuService }             from '@src/menu';
import { NxUtilsService }            from '@services/utils.service';
import { NxSystemsService, NxSystemWithUserInfo }          from '@services/systems.service';
import { NxHeaderService } from '@services/nx-header.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector      : 'nx-api-tool',
    styleUrls     : ['api-tool.component.scss'],
    templateUrl   : 'api-tool.component.html',
    encapsulation : ViewEncapsulation.None
})
export class NxApiToolComponent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system: NxSystem;
    apiDocFull: any = {};
    apiDoc: any;
    content : any;
    headerHeight: number;
    swagger: SwaggerUI;
    systems: NxSystemWithUserInfo[];
    systemsDropdown: any = [];
    selectedSystem: any = {};
    serversDropdown: any = [];
    selectedServer: any = {};
    serversLoaded: boolean;
    noSystemError = false;

    private resizeSubscription: Subscription;
    private menuSectionSubscription: Subscription;
    private menuSelectedDetailsSubscription: Subscription;
    private systemSubscription: Subscription;
    private serverSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        pageService: NxPageService,
        private systemService: NxSystemService,
        private appStateService: NxAppStateService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private menuService: NxMenuService,
        private systemsService: NxSystemsService,
        private headerService: NxHeaderService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();

        pageService.pageTitle = this.LANG.pageTitles.apiTool();

        // We listen to window resize and measure header height to know how much to offset the fixed menu by
        this.resizeSubscription = this.scrollMechanicsService.windowSizeSubject.subscribe(({ width }) => {
            if (width >= 768) {
                this.setHeaderHeight();
            }
        });

        this.menuSectionSubscription = this.menuService
            .selectedSectionSubject
            .subscribe(selection => {
                if (this.content) {
                    this.content.selectedSection = selection;
                    this.content = { ...this.content }; // trigger onChange
                    this.initSwagger(this.content.selectedSection);
                }
            });

        this.menuSelectedDetailsSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                if (this.content) {
                    this.content.selectedDetailsSection = selection;
                    this.content = { ...this.content }; // trigger onChange
                    this.initSwagger(this.content.selectedDetailsSection, 'full');
                }
            });
    }

    ngOnInit() {
        this.systems = this.systemsService.systems || [];

        if (!this.systems.length) {
            this.systemSubscription = this.systemsService.systemsSubject
                .pipe(
                    distinctUntilChanged((a, b) => NxUtilsService.isEqual(a, b)))
                .subscribe((systems) => {
                    this.systems = systems;
                    this.getSystem();
                });
        } else {
            this.getSystem();
        }
    }

    async getSystem() {
        this.systemsDropdown = this.systems.map(system => {
            const sysName = (system.stateOfHealth !== 'online') ? system.name + ' - Offline' : system.name;
            return { value: system.id, name: sysName };
        });

        const localSystem = this.systemService.getCurrentSystem();

        if (localSystem) {
            this.system = localSystem;
            this.selectedSystem = { value: this.system.id, name: this.system.info.name };
            this.updateMediaServers();
        } else {
            const validSystem: NxSystemWithUserInfo = this.headerService.lastActive && this.headerService.lastActive.stateOfHealth === 'online'
                ? this.headerService.lastActive : this.systems.find(system => system.stateOfHealth === 'online');
            if (validSystem) {
                this.system = await this.systemService.createSystem('', validSystem.id);
                this.getServersInfo();
            } else {
                this.noSystemError = true;
            }
        }
    }

    getAPIDoc(serverId: string) {
        return this.system.serverManager
            .getApiDoc(serverId);
    }

    onServerChange(event) {

    }

    async onSystemChange(system) {
        this.system = await this.systemService.createSystem('', system.value, '', true);
        this.selectedSystem = { value: system.value, name: system.name };

        this.getServersInfo();
    }

    private getServersInfo() {
        this.serversLoaded = false;
        if (this.serverSubscription) {
            this.serverSubscription.unsubscribe();
        }
        this.serverSubscription = this.system.infoSubject
            .pipe(
                map(system => {
                    if (system) {
                        this.selectedSystem = { value: system.id, name: system.info.name };
                    }
                    if (!system.serverManager.servers || system.serverManager.servers.length === 0) {
                        throw system;
                    }
                }),
                retryWhen(err => {
                    return err.pipe(delay(1000));
                })
            )
            .subscribe((system) => {
                this.updateMediaServers();
            });
    }

    private updateMediaServers() {
        if (this.system.currentServerNotBusy) {
            if (this.system?.serverManager.servers?.length) {
                this.system.serverManager
                    .initSystemMediaServers()
                    .then(() => {
                        this.serversDropdown = [];
                        this.system.serverManager.servers.forEach((server) => {
                            if (server.status !== 'Offline') {
                                this.getAPIDoc(server.id)
                                    .then((response) => {
                                    // extend filtering options
                                    // TODO: remove once https://networkoptix.atlassian.net/browse/CLOUD-6573 is done
                                        const modApi = this.modifiedApi(response);
                                        if (!this.serversDropdown.find(dropDownServer => dropDownServer.value === server.id)) {
                                            this.serversDropdown.push({
                                                value        : server.id,
                                                name         : server.name,
                                                apiDocFull   : modApi,
                                                incompatible : false
                                            });
                                        }
                                    }).catch(err => {
                                        let typeOfError = 'Error';
                                        if (err.status === 404) { // this server does not support openapi
                                            typeOfError = 'Incompatible';
                                        }
                                        if (!this.serversDropdown.find(dropDownServer => dropDownServer.value === server.id)) {
                                            this.serversDropdown.push({
                                                value        : server.id,
                                                name         : server.name + ' - ' + typeOfError,
                                                apiDocFull   : {},
                                                incompatible : true
                                            });
                                        }
                                    }).finally(() => {
                                        this.selectedServer = this.serversDropdown[0];
                                        this.serversDropdown.some((server) => {
                                            if (!server.incompatible) {
                                                this.selectedServer = server;
                                            }
                                            return !server.incompatible;
                                        });
                                        if (this.serversDropdown.length === this.system.serverManager.servers.length) {
                                            this.createMenuContent(this.selectedServer.apiDocFull);
                                            this.menuService.section = 'api_information';
                                            if (this.serverSubscription) {
                                                this.serverSubscription.unsubscribe();
                                            }
                                            this.serversLoaded = true;
                                        }
                                    });
                            } else {
                                this.serversDropdown.push({
                                    value        : server.id,
                                    name         : server.name + ' - Offline',
                                    apiDocFull   : {},
                                    incompatible : true
                                });
                            }
                        });
                    })
                    .catch(error => {
                        console.error(error);
                    });
            }
        }
    }

    setHeaderHeight() {
        this.headerHeight = this.appStateService.ribbonVisibility ? this.CONFIG.headerHeight + this.CONFIG.ribbonHeight : this.CONFIG.headerHeight;
    }

    private initSwagger(filter, expand = 'list') {
        if (filter === '') {
            return;
        }
        if (this.content.selectedSection === 'api_information') {
            this.swagger = undefined;
            this.apiDoc = {};
            return;
        }

        // wait for the DOM element
        setTimeout(() => {
            this.swagger = new SwaggerUI({
                dom_id  : '#swagger-ui',
                layout  : 'BaseLayout',
                presets : [
                    SwaggerUI.presets.apis,
                    SwaggerUI.SwaggerUIStandalonePreset
                ],
                spec             : this.selectedServer.apiDocFull,
                filter           : filter,
                docExpansion     : expand,
                maxDisplayedTags : expand === 'full' ? 1 : undefined
            });
        });
    }

    getLegacyMenuText(endpoint: string, includeTypeOfRequest: boolean, requestType: string) {
        if (includeTypeOfRequest) {
            return endpoint + ' - ' + requestType.toUpperCase();
        }
        return endpoint;
    }

    private modifiedApi(api) {
        Object.keys(api.paths).forEach(endpoint => {
            const endpointObj = Object.entries(api.paths[endpoint]);
            const includeTypeOfRequest = endpointObj.length > 1;
            endpointObj.forEach((method: any) => {
                api.paths[endpoint][method[0]].tags.push(method[1].summary || this.getLegacyMenuText(endpoint, includeTypeOfRequest, method[0]));
            });
        });

        return api;
    }

    private createMenuContent(response) {
        const _content = {
            searchable         : false,
            selectedSection    : '', // updated by selectedSectionSubject
            selectedSubSection : '', // updated by selectedSubSectionSubject
            system             : {}, // updated by getSystemInfo
            base               : '', // no base - no navigation
            level1             : [
                {
                    id     : 'api_information',
                    svg    : '',
                    label  : 'API Information',
                    path   : '',
                    level2 : [],
                    level3 : []
                }
            ]
        };

        if (Object.keys(response || {}).length) {
            response.tags.forEach(tag => {
                const categoryNode = {
                    id     : tag.name,
                    svg    : 'arrow_expand',
                    label  : tag.name,
                    path   : '',
                    level2 : [],
                    level3 : []
                };
                _content.level1.push(categoryNode);
                _content.searchable = true;
            });

            let categoryNode:any = [];

            Object.keys(response.paths).forEach(endpoint => {
                const endpointObj = Object.entries(response.paths[endpoint]);
                const includeTypeOfRequest = endpointObj.length > 1;
                endpointObj.forEach((method: any) => {
                    categoryNode = _content.level1.find((node) => {
                        return node.id === method[1].tags[0]; // if more tags?
                    });
                    categoryNode.level3.push({
                        additionalLabel : '',
                        id              : method[1].summary || this.getLegacyMenuText(endpoint, includeTypeOfRequest, method[0]),
                        isEnabled       : true, // is proprietary?
                        label           : method[1].summary || this.getLegacyMenuText(endpoint, includeTypeOfRequest, method[0]),
                        path            : '',
                        svgIcon         : ''
                    });
                });
            });
        }

        _content.level1.forEach((level1) => {
            level1.level3.sort((a, b) => {
                const fa = a.label.toLowerCase();
                const fb = b.label.toLowerCase();

                if (fa < fb) {
                    return -1;
                }
                if (fa > fb) {
                    return 1;
                }
                return 0;
            });
        });

        this.content = _content;
    }
}
