import { DOCUMENT } from '@angular/common';
import {
    Component, ComponentFactoryResolver,
    ComponentRef,
    ElementRef,
    Inject, Input, OnChanges, OnInit, Renderer2,
    Type,
    ViewChild,
    ViewContainerRef, ViewEncapsulation
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, fromEvent } from 'rxjs';
import { take } from 'rxjs/operators';
import type SwaggerUI from 'swagger-ui';
import type { SupportedHTTPMethods, SwaggerUIOptions, SwaggerUIPlugin } from 'swagger-ui';
import { v4 as uuid } from 'uuid';

import staticLang from '@common/language/language_i18n_static.json';
import type {
    MenuNodeWithParent
} from '@components/developers-menu/developers-menu-types';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { servers, toast } from '@lib/variables/static-variables';
import { NxLoginService } from '@services/login.service';
import { MenuNode } from '@services/menus.service.types';
import { highlightAll, isUUID } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { getPathAndMethodFromNodeName } from '../api-file-utils';
import { APIDoc } from '../api-tool-types';
import { NxAPIToolSystemService } from '../services/api-tool-system.service';
import { NxOpenAPIJSONService } from '../services/openapi-json.service';

import {
    NxCopyToClipboardComponent
} from './copy-to-clipboard/copy-to-clipboard.component';
import {
    NxSwaggerDropdownComponent
} from './swagger-dropdown/swagger-dropdown.component';
import { NxSwaggerSpinnerComponent } from './swagger-spinner/swagger-spinner.component';
import { NxSwaggerTextareaComponent } from './swagger-textarea/swagger-textarea.component';
import type { componentMap, textareaMap } from './swagger-types';
import { highlightAllCode, setCodeBlockHTML } from './swagger-utils';

@UntilDestroy()
@Component({
    selector: 'nx-swagger',
    styleUrls: ['swagger.component.scss'],
    templateUrl: './swagger.component.html',
    encapsulation: ViewEncapsulation.None
})
export class NxSwaggerComponent implements OnChanges, OnInit {
    @ViewChild('viewContainerRef', { read: ViewContainerRef }) VCR: ViewContainerRef;
    @ViewChild('swaggerDescription') swaggerDescriptionRef: ElementRef;
    @Input() activeNode: MenuNodeWithParent;

    LANG = staticLang;
    currentAPIDoc: APIDoc;
    swagger: SwaggerUI;
    swaggerLoading$ = new BehaviorSubject(false);
    swaggerMenuDescription = { title: '', description: '' };

    // Misc properties
    markdownComponentShowing = false;
    RTSPRequestShowing = false;
    singleAPIRouteShowing = false;
    singleRoutePath: string;
    singleRouteMethod: string;
    customComponentsRendering = false;
    componentMap: componentMap = {}; // Contains references to created componentRefs, which makes it possible to manually destroy them
    textareaMap: textareaMap = {}; // textAreas innerHTMLs are preserved here to be reapplied to code blocks

    constructor(
        public APIToolSystemService: NxAPIToolSystemService,
        public openAPIJSONService: NxOpenAPIJSONService,
        private loginService: NxLoginService,
        private renderer2: Renderer2,
        private componentFactoryResolver: ComponentFactoryResolver,
        private toastService: NxToastService,
        @Inject(DOCUMENT) private document: Document
    ) {
    }

    ngOnInit(): void {
        this.openAPIJSONService.currentAPIDoc$.pipe(untilDestroyed(this)).subscribe(doc => {
            this.currentAPIDoc = doc;
        });
    }

    /** Check if node is a leaf node.
     *  If so, then the node is an API Route path (ex: /rest/v1/login/users) and some actions must be handled differently
     */
    isAPIRouteNode = (node: MenuNodeWithParent) => {
        const { method } = getPathAndMethodFromNodeName(node.name);
        // TODO: new way to get API info store info
        // return !this.APIToolService.APIInfoStore[node.name] && !node.nodes.length && method;
        return !node.nodes.length && method;
    };

    private setSwaggerDescription(node: MenuNodeWithParent, expand: 'full' | 'list'): void {
        const selection = expand === 'full' ? node.parentNode?.name || node.name : node.name;
        // slice(0, -2) to remove the hidden tags that are added
        const title = selection.slice(0, -2);
        let description;
        if (expand === 'list') {
            description = this.openAPIJSONService.currentAPIDoc.tags.find(item => item.name === selection)?.description || '';
        }
        if (expand === 'full') {
            const info = getPathAndMethodFromNodeName(node.name);
            const path = this.openAPIJSONService.currentAPIDoc.paths[info.path];
            // If the method is in the node's name, then use method. Otherwise, grab the first method and use that instead (only one should exist in this case)
            if (info.method) {
                description = path[info.method?.toLowerCase()]?.description || path[Object.keys(path)[0]].description;
            } else {
                description = path[Object.keys(path)[0]].description;
            }
        }
        this.swaggerMenuDescription = {
            title,
            description
        };
    }

    #swaggerUI: ((opts: SwaggerUIOptions) => SwaggerUI);

    private async getSwagger(): Promise<((opts: SwaggerUIOptions) => SwaggerUI)> {
        this.#swaggerUI ||= await import('swagger-ui').then(m => m.default);
        return this.#swaggerUI;
    }

    private initSwagger(filter: string, expand: 'list' | 'full' | 'none' = 'list') {
        this.APIToolSystemService.setRequestURL(this.currentAPIDoc);
        if (filter === '' || filter?.length === 0) {
            return;
        }
        // wait for the DOM element
        this.getSwagger().then(swagger => {
            this.swagger = swagger({
                dom_id: '#swagger-ui',
                layout: 'BaseLayout',
                // presets: [ Not sure if removing this breaks anything
                //     // swagger.presets.apis,
                //     // swagger.SwaggerUIStandalonePreset
                // ],
                plugins: [this.OnResponsesRenderPlugin],
                spec: this.currentAPIDoc,
                filter,
                docExpansion: expand,
                showExtensions: true,
                supportedSubmitMethods: this.getSupportedMethods(), // determines which methods can: make requests/show try it out button
                maxDisplayedTags: expand === 'full' ? 1 : undefined,
                requestInterceptor: request => {
                    this.authenticateRequest(request);
                    if (environment.isLocal) {
                        request.curlOptions = ['--insecure']; // CLOUD-7904
                    }
                    this.handlePotentialRTSPRoute(request);
                    return request;
                },
                responseInterceptor: response => {
                    if (response.status === 403 && response?.obj?.errorId === servers.errors.oldSessionErrorId) {
                        this.handleOldSession();
                    }
                    return response;
                }
            });
            if (this.openAPIJSONService.isInfoNode) {
                this.modifyCodeBlocksAndTextareas();
            }
            this.addSpinner(this.singleAPIRouteShowing);
            this.swaggerLoading$.next(true);
        });
    }

    // initSwagger methods
    private getSupportedMethods = (): SupportedHTTPMethods[] => {
        if (this.openAPIJSONService.isReadOnly) {
            return [];
        }
        // Trace requests are not truly supported,
        // but in the APIs that are below 5.0 there is only a single trace request that is handled differently.
        // The try it out button needs to be enabled for this handling
        return this.APIToolSystemService.isRestAPI()
            ? ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'] // 5.0
            : ['get', 'trace', 'post', 'delete', 'options', 'head', 'patch']; // below 5.0
    };

    private handlePotentialRTSPRoute = (request): void => {
        const urlPath = new URL(request.url).pathname.slice(1);
        const isRTSP = isUUID(urlPath) || // The only route that starts with uuid is an RTSP route.
            (!this.APIToolSystemService.isRestAPI() && request.method === 'TRACE'); // Only one TRACE request exists in below 5.0 APIs, and it is RTSP

        if (isRTSP) {
            this.RTSPRequestShowing = true;
            this.handleRTSPRequest(request);
        } else {
            this.RTSPRequestShowing = false;
        }
    };

    private handleOldSession = (): void => {
        this.loginService.currentSystem = this.APIToolSystemService.currentSystem;
        this.loginService.updateSession('renewWeb')
            .then(ready => {
                const { sessionRenewed, failedToUpdateSession } = this.LANG.toastMessage;
                const { success, danger } = toast;
                const toastMessage = ready ? sessionRenewed : failedToUpdateSession;
                this.toastService.notify(toastMessage, ready ? success : danger);
            });
    };

    private handleRTSPRequest = (request): void => {
        // replace http with rtsp (for display only, does not actually send an rtsp request)
        request.url = 'rtsp' + request.url.slice(5);
    };

    private authenticateRequest = (request): void => {
        const headers = this.APIToolSystemService.currentSystem.serverManager.mediaserver.generateHeaders();
        if (headers) {
            // 5.0 and up
            for (const key of headers.keys()) {
                request.headers[key] = headers.get(key);
            }
        } else {
            // below 5.0
            this.setAuthParam(request);
        }
    };

    private setAuthParam = (request): void => {
        const Url = new URL(request.url);
        const authParamType = request.method === 'GET' ? 'authGet' : 'authPost';
        const authParam = this.APIToolSystemService.currentSystem.serverManager.mediaserver[authParamType];
        const potentialAmpersand = Url.search ? '&' : '';
        Url.search += potentialAmpersand + 'auth=' + authParam;
        request.url = Url.toString();
    };

    // swagger-ui plugin system
    private OnResponsesRenderPlugin: SwaggerUIPlugin = () => ({
        wrapComponents: {
            responses: (Responses, { React }) => props => {
                const responses = React.createElement(Responses, props);
                if (this.APIToolSystemService.preventNextChangeDetection) {
                    this.APIToolSystemService.preventNextChangeDetection = false;
                } else if (!this.customComponentsRendering) {
                    this.addCustomChanges();
                }
                return responses;
            }
        }
    });

    private addCustomChanges = (): void => {
        this.customComponentsRendering = true;

        setTimeout(() => {
            this.addCustomTextareas();
            this.modifyCodeBlocksAndTextareas();
            this.addTabItemEventListener();
            this.changeRequestBodyText();
            this.removeInputPlaceholders();
            this.addButtonEventListeners();
            this.insertCustomDropdown();
            this.moveExampleResponse();
            this.modifyTitlesInResponse();
            this.addLabelToRequest();
            if (this.openAPIJSONService.searchQuery && !this.openAPIJSONService.searchMoreShowing$.getValue()) {
                this.highlightSearchMoreQuery();
            }
            this.customComponentsRendering = false;
            this.swaggerLoading$.next(false);
        }, 0);
    };

    private addSpinner = (singleAPIRoute): void => {
        const opblocks = this.document.querySelectorAll('.opblock-summary');
        for (const opblock of opblocks as any) {
            if (opblock.nextElementSibling.tagName !== 'NX-SWAGGER-SPINNER') {
                const { componentRef, element } = this.generateComponent(NxSwaggerSpinnerComponent);
                componentRef.instance.opblock = opblock.parentNode;
                componentRef.instance.initialIsVisible = singleAPIRoute;
                componentRef.instance.swaggerLoading = this.swaggerLoading$;
                opblock.insertAdjacentElement('afterend', element);
            }
        }
    };

    private addButtonEventListeners = (): void => {
        // Clicking on execute or try-it-out/cancel button triggers a rerender
        const buttons = this.document.querySelectorAll('.try-out__btn, .opblock-control__btn');
        for (const button of buttons) {
            fromEvent<MouseEvent>(button, 'click').pipe(take(1), untilDestroyed(this)).subscribe(event => {
                if ((event?.target as HTMLButtonElement)?.classList.contains('execute')) {
                    const clearBtn: HTMLButtonElement = this.document.querySelector('.btn-clear');
                    clearBtn?.click(); // CLOUD-8423, clear the response if the previous one is showing, then generate a new one
                }
                if (!this.customComponentsRendering) {
                    this.addCustomChanges();
                }
            });
        }
    };

    private changeRequestBodyText = (): void => {
        const requestBody: HTMLElement = this.document.querySelector('.opblock-title.parameter__name');
        if (requestBody) {
            requestBody.innerText = 'Body';
        }
    };

    private modifyCodeBlocksAndTextareas = (): void => {
        const elements = this.document.querySelectorAll<HTMLElement>('pre, .text-area');
        for (const element of elements) {
            if (element.nextSibling?.nodeName !== 'NX-COPY-TO-CLIPBOARD' && !(element.classList.contains('with-line-counter'))) {
                if (element.parentElement.tagName !== 'DIV' || !element.parentElement.classList.contains('highlight-code')) {
                    const wrapper = this.document.createElement('div');
                    element.parentElement.replaceChild(wrapper, element);
                    wrapper.appendChild(element);
                }
                element.parentElement.classList.add('highlight-code');
                element?.classList.add('with-line-counter');
                this.addLineCounter(element);
                if (element.tagName === 'PRE') {
                    setCodeBlockHTML(element, this.textareaMap, 'codeblock');
                    this.addCopyToClipBoardButton(element);
                }
                highlightAllCode(element);
            }
        }
    };

    private removeInputPlaceholders = (): void => {
        const inputs = this.document.querySelectorAll('input');
        for (const input of inputs) {
            input.removeAttribute('placeholder');
        }
    };

    private modifyTitlesInResponse = (): void => {
        const visibleResponseSections = this.document.querySelectorAll('.btn-group');
        for (const visibleResponseSection of visibleResponseSections) {
            const responsesWrapper = visibleResponseSection.nextElementSibling;
            const titles = responsesWrapper.querySelectorAll('h4');
            if (titles[0]) {
                titles[0].innerText = 'Server Response';
            }
            if (titles[3]) {
                titles[3].classList.add('hidden');
            }
            if (titles[4]) {
                titles[4].innerText = 'Example Response';
                titles[4].classList.add('example-response');
            }
        }
    };

    private addCustomTextareas(): void {
        const textareas = this.document.body
            .querySelectorAll<HTMLTextAreaElement>(
                'textarea:not(.custom-textarea):not([readonly])'
            );
        for (const textarea of textareas) {
            const sibling = textarea.previousElementSibling;
            if (sibling?.tagName === 'NX-SWAGGER-TEXTAREA') {
                // Swagger destroys and recreates the text area, so angular does that as well to rebind the custom component to the new textarea
                this.triggerComponentDestroyFromElement(sibling);
                this.renderer2.removeChild(sibling.parentElement, sibling);
            }
            const { componentRef, element } = this.generateComponent(NxSwaggerTextareaComponent);
            // storing the uuid on the parent element and reapplying it to textareas/code-blocks that get recreated
            const parentEl = textarea.closest('.parameters-col_description, .opblock-description-wrapper');
            const uuid = parentEl?.getAttribute('uuid');
            if (!uuid) {
                const { uuid } = this.addComponentToComponentMap(componentRef, element);
                parentEl?.setAttribute('uuid', uuid);
            } else {
                element.setAttribute('uuid', uuid);
            }
            componentRef.instance.textarea = textarea;
            componentRef.instance.textareaMap = this.textareaMap;
            textarea.classList.add('custom-textarea');
            textarea.insertAdjacentElement('beforebegin', element);
        }
    }

    private generateRequestTypeLabel = () => {
        const label = this.document.createElement('label');
        label.innerHTML = '<div class="media-type-wrapper"><div class="media-type">application/json</div></div>';
        return label;
    };

    /** Moves the example response and schema outside of the response table, also adds a label.  */
    private moveExampleResponse = (): void => {
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
    };

    private addTabItemEventListener = (): void => {
        const tabItems = this.document.querySelectorAll('.tabitem:not(.tagged-tabitem)');
        for (const tabItem of tabItems) {
            tabItem.classList.add('tagged-tabitem');
            fromEvent<MouseEvent>(tabItem, 'click')
                .pipe(untilDestroyed(this))
                .subscribe(() => {
                    setTimeout(() => {
                        this.modifyCodeBlocksAndTextareas();
                    }, 0);
                });
        }
    };

    generateComponent<C>(
        componentClass: Type<C>
    ): { componentRef: ComponentRef<C>, element: HTMLElement } {
        const factory = this.componentFactoryResolver.resolveComponentFactory(componentClass);
        const componentRef = this.VCR.createComponent(factory);
        const element = componentRef.location.nativeElement as HTMLElement;
        return { componentRef, element };
    }

    addComponentToComponentMap(componentRef: ComponentRef<any>, element: HTMLElement) {
        const id = uuid();
        element.setAttribute('uuid', id);
        this.componentMap[id] = componentRef;
        return { uuid: id };
    }

    triggerComponentDestroyFromElement = (element: Element): void => {
        const uuid = element.getAttribute('uuid');
        this.componentMap[uuid].destroy();
    };

    addCopyToClipBoardButton = (parent: HTMLElement): void => {
        const clipboardElement = this.generateComponent(NxCopyToClipboardComponent).element;

        parent.insertAdjacentElement('afterend', clipboardElement);
    };

    addLineCounter = (parent: HTMLElement): void => {
        if (parent.innerText.length > 20000) {
            return; // Too many lines, dont show line counters
        }
        if (parent.classList.contains('curl')) {
            parent.innerHTML = parent.innerText;
        }
        const el = parent.firstElementChild?.tagName === 'CODE' ? parent.firstElementChild : parent;
        const lines = el.innerHTML.split('\n').map(div => `<div class='line'>${div}</div>`);
        if (lines.length > 1) { // Don't show line counters if only one line
            parent.innerHTML = lines.join('\n');
            let contentFound = false;
            for (const child of parent.childNodes as any) {
                if (!child.textContent.length && !child.childElementCount) {
                    if (contentFound) {
                        child.innerHTML = '<br>'; // if code blocks contain an empty div, it should be a line break
                    } else {
                        // remove blank lines at beginning of code blocks
                        parent.removeChild(child);
                    }
                } else {
                    contentFound = true;
                }
            }
        } else {
            parent.innerHTML = parent.innerText; // If no lines are added, remove code highlighting elements that comes from swagger-ui
        }
    };

    private addLabelToRequest = (): void => {
        const requestModelExample = this.document.querySelector('.opblock-description-wrapper .model-example:not(.with-label)');
        if (requestModelExample) {
            const label = this.generateRequestTypeLabel();
            requestModelExample.insertBefore(label, requestModelExample.firstChild);
            requestModelExample.classList.add('with-label');
        }
    };

    private insertCustomDropdown = (): void => {
        const selects = this.document.body.querySelectorAll<HTMLSelectElement>('select:not(.custom-dropdown):not(.content-type)');

        for (const select of selects) {
            // The original select is hidden and an nx-select is inserted
            const { componentRef, element } = this.generateComponent(NxSwaggerDropdownComponent);
            componentRef.instance.swaggerSelect = select;
            componentRef.instance.isMultiSelect = select.multiple;
            select.classList.add('custom-dropdown');
            select.insertAdjacentElement('beforebegin', element);
        }
    };

    highlightSearchMoreQuery() {
        const description = this.document.querySelector('.swagger-description')?.querySelector('.mt-3');
        if (description) {
            description.innerHTML = highlightAll(description.innerHTML, this.openAPIJSONService.searchQuery);
        }
        const paramsDescriptions = this.document.querySelectorAll('.parameters-col_description > .renderedMarkdown > p');
        for (const paramDescription of paramsDescriptions) {
            paramDescription.innerHTML = highlightAll(paramDescription.innerHTML, this.openAPIJSONService.searchQuery);
        }
    }

    ngOnChanges(changes: NgChanges<NxSwaggerComponent>): void {
        if (changes.activeNode.currentValue) {
            const node: MenuNode = changes.activeNode.currentValue;
            const isSingleView = this.isAPIRouteNode(node);
            const expand = isSingleView ? 'full' : 'list';
            // this.markdownComponentShowing = node.name in this.openAPIJSONService.APIInfoNodes;
            if (!this.openAPIJSONService.determineIsInfoNode(node)) {
                this.setSwaggerDescription(node, expand);
            }
            if (isSingleView) {
                const { path, method } = getPathAndMethodFromNodeName(node.name);
                this.singleRoutePath = path;
                this.singleRouteMethod = method;
                const summary = this.currentAPIDoc.paths?.[path]?.[method.toLowerCase()]?.summary;
                if (summary) {
                    this.swaggerMenuDescription.title = summary;
                }
            }
            this.singleAPIRouteShowing = isSingleView;
            if (this.VCR) {
                this.VCR.clear(); // Destroys custom components
                this.componentMap = {};
                this.textareaMap = {};
            }
            this.initSwagger(node.name, expand);
        }
    }
}
