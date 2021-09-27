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
    filter, finalize, map, retryWhen, take
}                                    from 'rxjs/operators';
import { UntilDestroy }              from '@ngneat/until-destroy';
import SwaggerUI                     from 'swagger-ui';
import { IConfig, NxConfigService }  from '@services/nx-config';
import { NxAppStateService }         from '@services/nx-app-state.service';
import { NxScrollMechanicsService }  from '@services/scroll-mechanics.service';
import { NxMenuService }             from '@src/menu';
import { NxUtilsService }            from '@services/utils.service';
import {
    NxSystemsService,
    NxSystemWithUserInfo
}                                    from '@services/systems.service';
import { NxHeaderService }           from '@services/nx-header.service';
import {
    APIDocVersion,
    NxSystemRestAPI
}                                    from '@services/system-rest-api.service';
import { NxAccountService }          from '@services/account.service';
import { Router }                    from '@angular/router';

enum requestTypes {
    GET = 'get',
    POST = 'post',
    TRACE = 'trace',
    PUT = 'put',
    DELETE = 'delete',
    PATCH = 'patch',
    OPTIONS = 'options'
}

interface SystemDropdownItem {
    name: string,
    value: string
}

// Could make this type more accurate, but have to watch out for different/older versions of the API
interface APIDoc {
    tags  : {
                name: string,
                description?: string,
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
            },
    servers?: { url: string}[]
}

interface ServerDropdownItem {
    value        : string,
    name         : string,
    apiDocFull   : APIDoc,
    incompatible : boolean
}

interface Level1Item {
    id     : string,
    svg    : string,
    label  : string,
    path   : string,
    level2 : any[],
    level3 : any[]
}
interface Content {
        searchable             : boolean,
        selectedSection        : string,
        selectedSubSection     : string, // updated by selectedSubSectionSubject
        selectedDetailsSection : string,
        system                 : object,
        base                   : string, // no base - no navigation
        level1                 : Level1Item[]
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
    content: Content;
    headerHeight: number;
    swagger: SwaggerUI;
    systems: NxSystemWithUserInfo[];
    systemsDropdown: SystemDropdownItem[] = [];
    selectedSystem: SystemDropdownItem;
    serversDropdown: ServerDropdownItem[] = [];
    selectedServer: ServerDropdownItem;
    serversLoaded: boolean;
    loadingFailure = false;
    loadingErrorType: '' | 'NO_SYSTEM_FOUND_API_TOOL' | 'SYSTEM_FAILED_TO_LOAD_API_TOOL' = ''
    APIFileLoadingError = false;
    mediaServerUpdating = false;
    gettingLegacyAPI: boolean;
    swaggerMenuTitle: string;
    swaggerMenuDescription = ''
    placeHolderContent: { [key in placeHolderSelections]: string } = { api_information: 'API Information', legacy: 'Legacy API', deprecated: 'Deprecated Endpoints' }
    RTSPRequestShowing = false;
    uuidRegex = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i')

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
        private headerService: NxHeaderService,
        private accountService: NxAccountService,
        private router: Router
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
            .pipe(filter(value => value !== '')).subscribe(selection => {
                if (this.content) {
                    this.content.selectedSection = selection;
                    this.content = { ...this.content }; // trigger onChange
                    if (typeof selection === 'string') {
                        this.setMenuTitle(selection);
                    }
                    this.initSwagger(this.content.selectedSection);
                }
            });

        this.menuSelectedDetailsSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                if (this.content) {
                    if (selection instanceof Array) {
                        const [detail, subNode] = selection;
                        this.content.selectedDetailsSection = detail;
                        this.content.selectedSubSection = subNode;
                        this.setMenuTitle(subNode);
                    } else {
                        this.content.selectedDetailsSection = selection;
                    }
                    this.content = { ...this.content }; // trigger onChange
                    this.initSwagger(this.content.selectedDetailsSection, 'full');
                }
            });

        this.menuSubsectionSubscription = this.menuService.selectedSubSectionSubject.subscribe((selection: any) => {
            if (this.content) {
                this.content.selectedSubSection = selection;
                if (typeof selection === 'string') {
                    this.setMenuTitle(selection);
                }
                this.content = { ...this.content };
                this.initSwagger(this.content.selectedSubSection);
            }
        });
    }

    setMenuTitle(selection: string) {
        this.swaggerMenuTitle = selection.slice(0, -2);
        this.swaggerMenuDescription = this.selectedServer.apiDocFull.tags.find(item => item.name === selection)?.description || '';
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
        this.systems.forEach(system => {
            if (system.name !== undefined) {
                const sysName = (system.stateOfHealth !== 'online') ? system.name + ' - Offline' : system.name;
                this.systemsDropdown.push({ value: system.id, name: sysName });
            }
        });

        const cachedSystem = this.systemService.getCurrentSystem();
        if (this.CONFIG.isLocal) {
            await this.accountService.get().then((account) => {
                if (!account) {
                    this.router.navigate(['/']);
                }
                this.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
                this.getServersInfo();
            });
        }  else if (cachedSystem) {
            this.system = cachedSystem;
            this.selectedSystem = { value: this.system.id, name: this.system.info.name };
            this.getServersInfo();
        } else {
            const validSystem: NxSystemWithUserInfo = this.headerService.lastActive && this.headerService.lastActive.stateOfHealth === 'online'
                ? this.headerService.lastActive : this.systems.find(system => system.stateOfHealth === 'online');
            if (validSystem) {
                this.system = await this.systemService.createSystem('', validSystem.id);
                this.getServersInfo();
            } else {
                this.loadingErrorType = 'NO_SYSTEM_FOUND_API_TOOL';
                this.loadingFailure = true;
            }
        }
    }

    getAPIDoc(serverId: string, type: APIDocVersion) {
        return this.system.serverManager
            .getApiDoc(serverId, type);
    }

    onServerChange(_event) {

    }

    onSystemChange(system) {
        this.content = undefined;
        this.system = this.systemService.createSystem('', system.value);
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
                        return system;
                    }
                    if (!system || !system.serverManager.servers || system.serverManager.servers.length === 0) {
                        throw system;
                    }
                }),
                retryWhen(err => {
                    return err.pipe(delay(1000), take(5));
                }),
                finalize(() => {
                    if (!this.serversLoaded) {
                        this.loadingFailure = true;
                        this.loadingErrorType = 'SYSTEM_FAILED_TO_LOAD_API_TOOL';
                    }
                })
            )
            .subscribe(_system => {
                if (!this.mediaServerUpdating) {
                    this.updateMediaServers();
                }
            });
    }

    private updateMediaServers() {
        this.mediaServerUpdating = true;
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
                                        let APIDoc = response;
                                        if (!this.isRestAPI(server.id)) {
                                            APIDoc = this.removeProprietaryEndpoints(APIDoc);
                                        }
                                        APIDoc = this.prepareSwaggerAPIDoc(APIDoc, server.id);
                                        if (!this.serversDropdown.find(dropDownServer => dropDownServer.value === server.id)) {
                                            this.serversDropdown.push({
                                                value        : server.id,
                                                name         : server.name,
                                                apiDocFull   : APIDoc,
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
                                                apiDocFull   : {} as APIDoc,
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
                                            if (this.selectedServer.incompatible) {
                                                // If for whatever reason, all servers are marked as incompatible
                                                this.APIFileLoadingError = true;
                                                this.content = {} as any;
                                            } else {
                                                this.createMenuContent(this.selectedServer.apiDocFull);
                                                await this.getLegacyAPIDocs(server.id, this.selectedServer.apiDocFull);
                                                this.menuService.section = 'api_information';
                                            }
                                            this.mediaServerUpdating = false;
                                            this.serversLoaded = true;
                                            if (this.serverSubscription) {
                                                this.serverSubscription.unsubscribe();
                                            }
                                        }
                                    });
                            } else {
                                this.serversDropdown.push({
                                    value        : server.id,
                                    name         : server.name + ' - Offline',
                                    apiDocFull   : {} as APIDoc,
                                    incompatible : true
                                });
                            }
                        });
                    })
                    .catch(error => {
                        this.mediaServerUpdating = false;
                        console.error(error);
                    });
            } else {
                this.mediaServerUpdating = false;
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

        // Optional chaining here because getApiDoc returns undefined if system version is below 5.0
        const legacyAPICall = this.getAPIDoc(serverID, 'legacy')?.then(response => {
            this.removeProprietaryEndpoints(response);
            this.modifyTagNames(response, 'legacy');
            legacyAPI = this.modifyPathTags(response, 'legacy');
        });
        const deprecatedAPICall = this.getAPIDoc(serverID, 'deprecated')?.then(response => {
            this.removeProprietaryEndpoints(response);
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

    private removeProprietaryEndpoints(api: APIDoc) {
        Object.keys(api.paths).forEach(path => {
            const apiPath = api.paths[path];
            Object.keys(apiPath).forEach(requestType => {
                if (apiPath[requestType].description?.slice(0, 17) === '<p><b>Proprietary') {
                    delete apiPath[requestType];
                }
            });
        });
        return api;
    }

    private prepareSwaggerAPIDoc(APIDoc: APIDoc, serverID: string) {
        this.modifyPathTags(APIDoc);
        this.modifyTagNames(APIDoc, 'main');
        this.setRequestUrl(APIDoc, serverID);
        return APIDoc;
    }

    private initSwagger(filter, expand = 'list') {
        if (filter === '' || filter?.length === 0) {
            return;
        }
        if (this.placeHolderContent[this.content.selectedSection] && !this.content.selectedSubSection.length) {
            this.swagger = undefined;
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
                spec                   : this.selectedServer.apiDocFull,
                filter                 : filter,
                docExpansion           : expand,
                supportedSubmitMethods : this.getSupportedMethods(),
                maxDisplayedTags       : expand === 'full' ? 1 : undefined,
                requestInterceptor     : (request) => {
                    this.authenticateRequest(request);
                    if (this.CONFIG.isLocal) {
                        request.curlOptions = ['--insecure'];
                    }
                    // System APIs before 5.0 only have one trace request which is the RTSP request
                    if ((!this.isRestAPI() && request.method === 'TRACE') || this.isRTSPRoute(request)) {
                        this.RTSPRequestShowing = true;
                        this.handleRTSPRequest(request);
                    } else {
                        this.RTSPRequestShowing = false;
                    }
                    return request;
                }
            });
        });
    }

    isRTSPRoute = (request) => {
        // The only route that starts with a uuid is the RTSP route.
        const requestWithBaseUrlRemoved = request.url.slice(this.selectedServer.apiDocFull.servers[0].url.length + 1);

        return this.uuidRegex.test(requestWithBaseUrlRemoved);
    }

    private handleRTSPRequest = (request) => {
        request.url = 'rtsp' + request.url.slice(5);
    }

    private setRequestUrl(api: APIDoc, serverID) {
        // servers.url currently only has a single item which determines the route that API requests go to.
        api.servers[0].url = this.system.serverManager.mediaserverConnections[serverID].urlBase;
    }

    private authenticateRequest (request) {
        const headers = this.system.serverManager.mediaserverConnections[this.selectedServer.value].generateHeaders();
        if (headers) {
            // 5.0 and up
            for (const key of headers.keys()) {
                request.headers[key] = headers.get(key);
            }
        } else {
            // Below 5.0
            this.setAuthParam(request);
        }
    }

    private setAuthParam = (request) => {
        const Url = new URL(request.url);
        const authParam = request.method === 'GET' ? 'authGet' : 'authPost';
        let potentialAmpersand = '';
        if (Url.search) potentialAmpersand = '&';
        Url.search += potentialAmpersand + 'auth=' + this.system.serverManager.mediaserverConnections[this.selectedServer.value][authParam];
        request.url = Url.toString();
    }

    isRestAPI(serverID = this.selectedServer.value) {
        // REST API servers are 5.0 and above
        return this.system.serverManager.mediaserverConnections[serverID] instanceof NxSystemRestAPI;
    }

    getSupportedMethods = () => {
        // Trace requests are not truly supported, but in the APIs that are below 5.0 there is only a single trace request that is handled differently
        // and the try it out button needs to be enabled for this handling
        return this.isRestAPI()
            ? ['get', 'put', 'post', ' delete', 'options', 'head', 'patch']
            : ['get', 'trace', 'post', 'delete', 'options', 'head', 'patch'];
    }

    // Add onto tag Ids to differentiate the different API files in swagger
    getTagModifier(type: APIDocVersion) {
        switch (type) {
            case 'deprecated':
                return '-D';
            case 'legacy':
                return '-L';
            case 'main':
                return '-M';
        }
    }

    private modifyPathTags(api: APIDoc, type: APIDocVersion = 'main') {
        // We have to change the tags on apis so that swagger can properly differentiate tags with the same name coming from multiple different API files
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
            searchable             : false,
            selectedSection        : 'api_information', // updated by selectedSectionSubject
            selectedSubSection     : '', // updated by selectedSubSectionSubject
            selectedDetailsSection : '',
            system                 : {}, // updated by getSystemInfo
            base                   : '', // no base - no navigation
            level1                 : [
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
                    label  : tag.name.slice(0, -2),
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
                if (!tag.name.includes('Proprietary')) {
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
                }
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
