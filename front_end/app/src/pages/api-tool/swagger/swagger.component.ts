import { Component, ViewEncapsulation } from '@angular/core';
import { UntilDestroy, untilDestroyed }         from '@ngneat/until-destroy';
import { filter }                               from 'rxjs/operators';
import SwaggerUI                                from 'swagger-ui';
import { NxMenuService }                        from '@src/menu';
import { IConfig, NxConfigService }             from '@services/nx-config';
import { NxAPIToolService }                     from '../api-tool.service';

@UntilDestroy()
@Component({
    selector: 'nx-swagger',
    styleUrls: ['swagger.component.scss'],
    templateUrl: './swagger.component.html',
    encapsulation: ViewEncapsulation.None
})
export class NxSwaggerComponent {
    CONFIG: IConfig;

    swagger: SwaggerUI;
    placeHolderContent = {
        api_information: 'API Information',
        legacy: 'Legacy API',
        deprecated: 'Deprecated Endpoints'
    }

    swaggerMenuDescription = { title: '', description: '' }

    // Misc properties
    RTSPRequestShowing = false;
    uuidRegex = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i')

    constructor(public APIToolService: NxAPIToolService, private configService: NxConfigService, private menuService: NxMenuService) {
        this.CONFIG = configService.getConfig();
        this.subscribeToMenuServiceSections();
    }

    private subscribeToMenuServiceSections() {
        this.menuService
            .selectedSectionSubject
            .pipe(filter(value => value !== ''), untilDestroyed(this)).subscribe(selection => {
                if (this.APIToolService.leftMenuContent) {
                    this.APIToolService.leftMenuContent.selectedSection = selection;
                    if (this.placeHolderContent[selection]) {
                        this.APIToolService.changeAPIDescription(selection);
                    }
                    this.APIToolService.leftMenuContent = { ...this.APIToolService.leftMenuContent }; // trigger onChange
                    if (typeof selection === 'string') {
                        this.setMenuTitle(selection);
                    }
                    this.initSwagger(this.APIToolService.leftMenuContent.selectedSection);
                }
            });

        this.menuService
            .selectedSubSectionSubject
            .pipe(untilDestroyed(this)).subscribe((selection: any) => {
                if (this.APIToolService.leftMenuContent) {
                    this.APIToolService.leftMenuContent.selectedSubSection = selection;
                    if (typeof selection === 'string') {
                        this.setMenuTitle(selection);
                    }
                    this.APIToolService.leftMenuContent = { ...this.APIToolService.leftMenuContent };
                    this.initSwagger(this.APIToolService.leftMenuContent.selectedSubSection);
                }
            });

        this.menuService
            .selectedDetailsSection
            .pipe(untilDestroyed(this)).subscribe(selection => {
                if (this.APIToolService.leftMenuContent) {
                    if (selection instanceof Array) {
                        const [detail, subNode] = selection;
                        this.APIToolService.leftMenuContent.selectedDetailsSection = detail;
                        this.APIToolService.leftMenuContent.selectedSubSection = subNode;
                        this.setMenuTitle(subNode);
                    } else {
                        this.APIToolService.leftMenuContent.selectedDetailsSection = selection;
                    }
                    this.APIToolService.leftMenuContent = { ...this.APIToolService.leftMenuContent }; // trigger onChange
                    this.initSwagger(this.APIToolService.leftMenuContent.selectedDetailsSection, 'full');
                }
            });
    }

    private setMenuTitle(selection: string) {
        this.swaggerMenuDescription = {
            // slice(0, -2) to remove the hidden tags that are added
            title: selection.slice(0, -2),
            description: this.APIToolService.selectedServer.apiDocFull.tags.find(item => item.name === selection)?.description || ''
        };
    }

    private initSwagger(filter, expand = 'list') {
        if (filter === '' || filter?.length === 0) {
            return;
        }
        if (this.placeHolderContent[this.APIToolService.leftMenuContent.selectedSection] && !this.APIToolService.leftMenuContent.selectedSubSection.length) {
            this.swagger = undefined;
            return;
        }

        // wait for the DOM element
        setTimeout(() => {
            this.swagger = new SwaggerUI({
                dom_id: '#swagger-ui',
                layout: 'BaseLayout',
                presets: [
                    SwaggerUI.presets.apis,
                    SwaggerUI.SwaggerUIStandalonePreset
                ],
                spec: this.APIToolService.selectedServer.apiDocFull,
                filter: filter,
                docExpansion: expand,
                supportedSubmitMethods: this.getSupportedMethods(), // determines which methods can: make requests/show try it out button
                maxDisplayedTags: expand === 'full' ? 1 : undefined,
                requestInterceptor: (request) => {
                    this.authenticateRequest(request);
                    if (this.CONFIG.isLocal) {
                        request.curlOptions = ['--insecure']; // CLOUD-7904
                    }
                    this.handlePotentialRTSPRoute(request);
                    return request;
                }
            });
        });
    }

    // initSwagger methods
    private getSupportedMethods = () => {
        // Trace requests are not truly supported,
        // but in the APIs that are below 5.0 there is only a single trace request that is handled differently.
        // The try it out button needs to be enabled for this handling
        return this.APIToolService.isRestAPI()
            ? ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'] // 5.0
            : ['get', 'trace', 'post', 'delete', 'options', 'head', 'patch']; // below 5.0
    }

    private handlePotentialRTSPRoute = (request) => {
        const requestWithBaseUrlRemoved = request.url.slice(this.APIToolService.selectedServer.apiDocFull.servers[0].url.length + 1);
        const isRTSP = this.uuidRegex.test(requestWithBaseUrlRemoved) ||  // The only route that starts with uuid is an RTSP route.
                      (!this.APIToolService.isRestAPI() && request.method === 'TRACE');  // Only one TRACE request exists in below 5.0 API, and it is RTSP

        if (isRTSP) {
            this.RTSPRequestShowing = true;
            this.handleRTSPRequest(request);
        } else {
            this.RTSPRequestShowing = false;
        }
    }

    private handleRTSPRequest = (request) => {
        // replace http with rtsp (for display only, does not actually send an rtsp request)
        request.url = 'rtsp' + request.url.slice(5);
    }

    private authenticateRequest = (request) => {
        const headers = this.APIToolService.system.serverManager.mediaserverConnections[this.APIToolService.selectedServer.value].generateHeaders();
        if (headers) {
            // 5.0 and up
            for (const key of headers.keys()) {
                request.headers[key] = headers.get(key);
            }
        } else {
            // below 5.0
            this.setAuthParam(request);
        }
    }

    private setAuthParam = (request) => {
        const systemMediaServerConnections = this.APIToolService.system.serverManager.mediaserverConnections;
        const serverID = this.APIToolService.selectedServer.value;

        const Url = new URL(request.url);
        const authParamType = request.method === 'GET' ? 'authGet' : 'authPost';
        const authParam = systemMediaServerConnections[serverID][authParamType];
        const potentialAmpersand = Url.search ? '&' : '';
        Url.search += potentialAmpersand + 'auth=' + systemMediaServerConnections[serverID][authParam];
        request.url = Url.toString();
    }
}
