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
import { APIDocVersion } from '@services/system-rest-api.service';

enum requestTypes {
    GET = 'get',
    POST = 'post',
    TRACE = 'trace',
    PUT = 'put',
    DELETE = 'delete',
    PATCH = 'patch'
}

// Could make this type more accurate, but have to watch out for different/older versions of the API
interface APIDoc {
    tags  : {
                name: string,
                [key:string]: any
            }[],
    paths : {
                [key: string]: {
                    [key in requestTypes]: {
                        tags: string[],
                        parameters: [{[key:string]: any}],
                        [key: string] : any
                    }
                }
            }
}

type placeHolderSelections = 'api_information' | 'legacy' | 'deprecated'

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
    gettingLegacyAPI: boolean;
    swaggerMenuTitle: string;
    placeHolderContent: { [key in placeHolderSelections]: string } = { api_information: 'API Information', legacy: 'Legacy API', deprecated: 'Deprecated Endpoints' }

    private resizeSubscription: Subscription;
    private menuSectionSubscription: Subscription;
    private menuSelectedDetailsSubscription: Subscription;
    private menuSubsectionSubscription: Subscription;
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
                    if (typeof selection === 'string') {
                        this.getMenuTitle(selection);
                    }
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

        this.menuSubsectionSubscription = this.menuService.selectedSubSectionSubject.subscribe((selection: any) => {
            if (this.content) {
                this.content.selectedSubSection = selection;
                if (typeof selection === 'string') {
                    this.getMenuTitle(selection);
                }
                this.content = { ...this.content };
                this.initSwagger(this.content.selectedSubSection);
            }
        });
    }

    getMenuTitle(selection: string) {
        let title = selection;
        // Deprecated or Legacy titles have to be modified
        if (selection.indexOf('-L') !== -1  || selection.indexOf('-D') !== -1) {
            title  = selection.slice(0, -2);
        }
        this.swaggerMenuTitle = title;
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

    getAPIDoc(serverId: string, type: APIDocVersion) {
        return this.system.serverManager
            .getApiDoc(serverId, type);
    }

    onServerChange(event) {

    }

    onSystemChange(system) {
        this.system = this.systemService.createSystem('', system.value, '', true);
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
                                this.getAPIDoc(server.id, 'main')
                                    .then((response: APIDoc) => {
                                    // extend filtering options
                                    // TODO: remove once https://networkoptix.atlassian.net/browse/CLOUD-6573 is done
                                        const modApi = this.modifyPathTags(response);
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
                                    }).finally(async () => {
                                        this.selectedServer = this.serversDropdown[0];
                                        this.serversDropdown.some((server) => {
                                            if (!server.incompatible) {
                                                this.selectedServer = server;
                                            }
                                            return !server.incompatible;
                                        });
                                        if (this.serversDropdown.length === this.system.serverManager.servers.length) {
                                            this.createMenuContent(this.selectedServer.apiDocFull);
                                            await this.getLegacyAPIDocs(server.id, this.selectedServer.apiDocFull);
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

    // Handles legacy API scenarios where there are multiple requests to the same path but with a different request type (GET, POST .. etc)
    getLegacyMenuText(endpoint: string, includeTypeOfRequest: boolean, requestType: string) {
        if (includeTypeOfRequest) {
            return endpoint + ' - ' + requestType.toUpperCase();
        }
        return endpoint;
    }

    async getLegacyAPIDocs(serverID, apiDocFull: APIDoc) {
        let legacyAPI;
        let deprecatedAPI;

        // Optional chaining here because getApiDoc returns undefined if system version is below 4.3
        const legacyAPICall = this.getAPIDoc(serverID, 'legacy')?.then(response => {
            this.modifyTagNames(response, 'legacy');
            legacyAPI = this.modifyPathTags(response, 'legacy');
        });
        const deprecatedAPICall = this.getAPIDoc(serverID, 'deprecated')?.then(response => {
            this.modifyTagNames(response, 'deprecated');
            deprecatedAPI =  this.modifyPathTags(response, 'deprecated');
        });

        await legacyAPICall;
        await deprecatedAPICall;

        if (legacyAPI) {
            apiDocFull.tags = [...apiDocFull.tags, ...legacyAPI.tags];
            apiDocFull.paths = Object.assign(apiDocFull.paths,  legacyAPI.paths);
            this.addSubMenuApi(legacyAPI,
                this.content, 'legacy');
        }
        if (deprecatedAPI) {
            apiDocFull.tags = [...apiDocFull.tags, ...deprecatedAPI.tags];
            apiDocFull.paths = Object.assign(apiDocFull.paths,  deprecatedAPI.paths);
            this.addSubMenuApi(deprecatedAPI, this.content, 'deprecated');
        }
    }

    setHeaderHeight() {
        this.headerHeight = this.appStateService.ribbonVisibility ? this.CONFIG.headerHeight + this.CONFIG.ribbonHeight : this.CONFIG.headerHeight;
    }

    private initSwagger(filter, expand = 'list') {
        if (filter === '' || filter?.length === 0) {
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

    // Add onto tag Ids to differentiate the different API files in swagger
    getTagModifier(type: APIDocVersion) {
        switch (type) {
            case 'deprecated':
                return '-D';
            case 'legacy':
                return '-L';
            default:
                return '';
        }
    }

    private modifyPathTags(api: APIDoc, type: APIDocVersion = 'main') {
        // We have to change the tags on sub-apis so that swagger can properly differentiate tags with the same name coming from multiple different API files
        const tagModifier = this.getTagModifier(type);

        Object.keys(api.paths).forEach(endpoint => {
            const endpointObj = Object.entries(api.paths[endpoint]);
            const includeTypeOfRequest = endpointObj.length > 1;
            endpointObj.forEach((method: any) => {
                const modifiedTag = api.paths[endpoint][method[0]].tags[0] + tagModifier;
                api.paths[endpoint][method[0]].tags[0] = modifiedTag;
                // Adds the endpoint/summary itself as a tag so that swagger can filter for just the endpoint
                api.paths[endpoint][method[0]].tags.push(method[1].summary || this.getLegacyMenuText(endpoint, includeTypeOfRequest, method[0]));
            });
        });
        return api;
    }

    modifyTagNames(api: APIDoc, type: APIDocVersion) {
        api.tags.forEach((tag: any) => {
            tag.name = tag.name + this.getTagModifier(type);
        });
        return api;
    }

    private createMenuContent(response: APIDoc) {
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

    private addSubMenuApi(legacyApi: APIDoc, baseContent, type: 'legacy' | 'deprecated') {
        const title = type[0].toUpperCase() + type.slice(1);
        const apiContent = baseContent;
        apiContent.level1.push({
            id     : type,
            svg    : 'arrow_expand',
            label  : title,
            path   : '',
            level2 : [],
            level3 : []
        });

        const _content = apiContent.level1.find(item => item.id === type);

        if (Object.keys(legacyApi || {}).length) {
            legacyApi.tags.forEach(tag => {
                const categoryNode = {
                    id     : tag.name,
                    svg    : 'arrow_expand',
                    label  : tag.name.slice(0, -2),
                    path   : '',
                    level2 : [],
                    level3 : []
                };
                _content.level2.push(categoryNode);
                _content.searchable = true;
            });

            let categoryNode:any = [];
            Object.keys(legacyApi.paths).forEach(endpoint => {
                const endpointObj = Object.entries(legacyApi.paths[endpoint]);
                const includeTypeOfRequest = endpointObj.length > 1;
                endpointObj.forEach((method: any) => {
                    categoryNode = _content.level2.find((node) => {
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
    }
}
