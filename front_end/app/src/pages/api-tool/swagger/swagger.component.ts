import { Component, Input, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { UntilDestroy }         from '@ngneat/until-destroy';
import SwaggerUI                                from 'swagger-ui';
import { IConfig, NxConfigService }             from '@services/nx-config';
import { NxAPIToolService }                     from '../api-tool.service';
import { MenuNodeWithParent } from '@components/developers-menu/developers-menu.component';

@UntilDestroy()
@Component({
    selector: 'nx-swagger',
    styleUrls: ['swagger.component.scss'],
    templateUrl: './swagger.component.html',
    encapsulation: ViewEncapsulation.None
})
export class NxSwaggerComponent implements OnChanges {
    @Input() activeNode: MenuNodeWithParent;
    CONFIG: IConfig;

    swagger: SwaggerUI;
    swaggerMenuDescription = { title: '', description: '' }

    // Misc properties
    RTSPRequestShowing = false;
    uuidRegex = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i')

    constructor(public APIToolService: NxAPIToolService,
                private configService: NxConfigService) {
        this.CONFIG = this.configService.getConfig();
    }

    /** Check if node is a leaf node.
     *  If so, then the node is an API Route path Node (ex: /) and some actions must be handled differently
     */
    isAPIPathNode = (node: MenuNodeWithParent) => {
        return !node.nodes.length;
    }

    private setSwaggerDescription(selection: string) {
        this.swaggerMenuDescription = {
            // slice(0, -2) to remove the hidden tags that are added
            title: selection.slice(0, -2),
            description: this.APIToolService.selectedServer.apiDocFull.tags.find(item => item.name === selection)?.description || ''
        };
    }

    private initSwagger(filter: string | string[], expand = 'list') {
        if (filter === '' || filter?.length === 0) {
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

    ngOnChanges(changes: SimpleChanges) {
        if (changes.activeNode.currentValue) {
            const node = changes.activeNode.currentValue;
            let expand: 'full' | 'list';
            let nodeName: string;
            if (this.isAPIPathNode(node)) {
                nodeName = node.parentNode?.name || node.name;
                expand = 'full';
            } else {
                nodeName = node.name;
                expand = 'list';
            }
            this.initSwagger(node.name, expand);
            this.setSwaggerDescription(nodeName);
        }
    }
}
