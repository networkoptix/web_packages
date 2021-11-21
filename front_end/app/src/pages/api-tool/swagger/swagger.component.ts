import {
    Component, ComponentFactoryResolver,
    Inject, Input, OnChanges, SimpleChanges,
    ViewContainerRef, ViewEncapsulation
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import SwaggerUI from 'swagger-ui';
import { NxAPIToolService } from '../api-tool.service';
import {
    MenuNodeWithParent
} from '@components/developers-menu/developers-menu.component';
import { DOCUMENT } from '@angular/common';
import {
    NxCopyToClipboardComponent
} from './copy-to-clipboard/copy-to-clipboard.component';
import { getPathAndMethodFromNodeName } from '../api-file-utils';
import {
    NxSwaggerDropdownComponent
} from './swagger-dropdown/swagger-dropdown.component';
import { environment } from '@environments/environment';

@UntilDestroy()
@Component({
    selector: 'nx-swagger',
    styleUrls: ['swagger.component.scss'],
    templateUrl: './swagger.component.html',
    encapsulation: ViewEncapsulation.None
})
export class NxSwaggerComponent implements OnChanges {
    @Input() activeNode: MenuNodeWithParent;

    swagger: SwaggerUI;
    swaggerMenuDescription = { title: '', description: '' }

    // Misc properties
    RTSPRequestShowing = false;
    singleAPIRouteShowing = false;
    uuidRegex = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i')

    constructor(
        public APIToolService: NxAPIToolService,
        private viewContainerRef: ViewContainerRef,
        private componentFactoryResolver: ComponentFactoryResolver,
        @Inject(DOCUMENT) private document: Document
    ) {}

    /** Check if node is a leaf node.
     *  If so, then the node is an API Route path (ex: /rest/v1/login/users) and some actions must be handled differently
     */
    isAPIRouteNode = (node: MenuNodeWithParent) => {
        return !node.nodes.length;
    }

    private setSwaggerDescription(node: MenuNodeWithParent, expand: 'full' | 'list') {
        const selection = expand === 'full' ? node.parentNode?.name || node.name : node.name;
        // slice(0, -2) to remove the hidden tags that are added
        const title = selection.slice(0, -2);
        let description;
        if (expand === 'list') {
            description = this.APIToolService.selectedServer.apiDocFull.tags.find(item => item.name === selection)?.description || '';
            this.singleAPIRouteShowing = false;
        }
        if (expand === 'full') {
            const info = getPathAndMethodFromNodeName(node.name);
            const path =  this.APIToolService.selectedServer.apiDocFull.paths[info.path];
            // If the method is in the node's name, then use method. Otherwise, grab the first method and use that instead (only one should exist in this case)
            if (info.method) {
                description = path[info.method?.toLowerCase()]?.description || path[Object.keys(path)[0]].description;
            } else {
                description =  path[Object.keys(path)[0]].description;
            }
            this.singleAPIRouteShowing = true;
        }
        this.swaggerMenuDescription = {
            title: title,
            description: description
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
                plugins: [this.FindCodeBlocksPlugin, this.CustomResponsePlugin],
                spec: this.APIToolService.selectedServer.apiDocFull,
                filter: filter,
                docExpansion: expand,
                showExtensions: true,
                supportedSubmitMethods: this.getSupportedMethods(), // determines which methods can: make requests/show try it out button
                maxDisplayedTags: expand === 'full' ? 1 : undefined,
                requestInterceptor: (request) => {
                    this.authenticateRequest(request);
                    if (environment.isLocal) {
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
        const urlPath = new URL(request.url).pathname.slice(1);
        const isRTSP = this.uuidRegex.test(urlPath) ||  // The only route that starts with uuid is an RTSP route.
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

    private CustomResponsePlugin = () => ({
        wrapComponents: {
            response: (Response, { React }) => (props) => {
                const response = React.createElement(Response, props);
                this.moveExampleResponse();
                this.addLabelToRequest();
                return response;
            }
        }
    })

    // swagger-ui plugin system
    private FindCodeBlocksPlugin = () => ({
        wrapComponents: {
            operation: (Responses, { React }) => (props) => {
                // If operation is open
                if (props.isShown) {
                    const codeBlocks = this.document.getElementsByClassName('microlight');
                    // Get all code blocks rendered
                    for (const codeBlock of codeBlocks as any) {
                        if (!codeBlock.parentElement.getElementsByClassName('copy-button').length) {
                            // Add clipboard button to codeblocks that dont have a clipboard button
                            const container = codeBlock.closest('div') as HTMLElement;
                            container.classList.add('highlight-code');

                            this.addCopyToClipBoardButton(codeBlock);
                        }
                    }
                    this.insertCustomDropdown();
                }
                return  React.createElement(Responses, props);
            }
        }
    })

    private generateRequestTypeLabel = () => {
        const label = this.document.createElement('label');
        label.innerHTML = '<div class="media-type-wrapper"><div class="media-type">application/json</div></div>';
        return label;
    }

    /** Moves the example response and schema outside of the response table, also adds a label.  */
    private moveExampleResponse = () => {
        const responses = this.document.querySelector('.responses-inner:not(.with-label)');
        if (responses) {
            const exampleResponse = responses.querySelector('.model-example');
            // Should skip this response on next iteration so with-label class is added even if a label is not actually added.
            responses.classList.add('with-label');
            if (exampleResponse) {
                const label = this.generateRequestTypeLabel();
                exampleResponse.insertBefore(label, exampleResponse.firstChild);
                responses.appendChild(exampleResponse);
            }
        }
    }

    addCopyToClipBoardButton = (codeBlock: HTMLElement) => {
        const factory = this.componentFactoryResolver.resolveComponentFactory(NxCopyToClipboardComponent);
        const instance = this.viewContainerRef.createComponent(factory);
        const el = instance.location.nativeElement as HTMLElement;

        codeBlock.insertAdjacentElement('afterend', el);
    }

    private addLabelToRequest = () => {
        const requestModelExample = this.document.querySelector('.opblock-description-wrapper .model-example:not(.with-label)');
        if (requestModelExample) {
            const label = this.generateRequestTypeLabel();
            requestModelExample.insertBefore(label, requestModelExample.firstChild);
            requestModelExample.classList.add('with-label');
        }
    }

    private insertCustomDropdown = () => {
        const selects = this.document.body.querySelectorAll('select:not([multiple]):not(.custom-dropdown):not(.content-type)');

        for (const select of selects as any) {
            // The original select is hidden and an nx-select is inserted
            const factory = this.componentFactoryResolver.resolveComponentFactory(NxSwaggerDropdownComponent);
            const componentRef = this.viewContainerRef.createComponent(factory);
            componentRef.instance.swaggerSelect = select;
            const el = componentRef.location.nativeElement as HTMLElement;
            select.classList.add('custom-dropdown');
            select.insertAdjacentElement('beforebegin', el);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.activeNode.currentValue) {
            const node = changes.activeNode.currentValue;
            const expand = this.isAPIRouteNode(node) ? 'full' : 'list';
            this.initSwagger(node.name, expand);
            if (!this.APIToolService.isAPIInfoMenuNode(node)) {
                this.setSwaggerDescription(node, expand);
            }
        }
    }
}
