import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { NxPageService }                        from '@services/page.service';
import { NxLanguageProviderService }            from '@services/nx-language-provider';
import { LanguageI18NStaticTypes }              from '@app/language_i18n_static_types';
import { NxSystem, NxSystemService }            from '@services/system.service';
import { ActivatedRoute }                       from '@angular/router';
import { Subscription, SubscriptionLike }       from 'rxjs';
import { UntilDestroy }                         from '@ngneat/until-destroy';

import SwaggerUI                    from 'swagger-ui';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxAppStateService }        from '@services/nx-app-state.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxMenuService }            from '@src/menu';
import { NxUtilsService }           from '@services/utils.service';

export enum API_GROUP {
    DEVICES = 'Devices',
    SERVERS = 'Servers',
    LAYOUTTOURS = 'Layout Tours',
    LAYOUTS = 'Layouts',
    STOREDFILES = 'Stored Files',
    LICENSES = 'Licenses',
    USERROLES = 'User Roles',
    VIDEOWALLS = 'Video Walls',
    WEBPAGES = 'Web Pages',
    USERS = 'Users'
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector   : 'nx-api-tool',
    styleUrls  : ['api-tool.component.scss'],
    templateUrl: 'api-tool.component.html',
    encapsulation: ViewEncapsulation.None
})
export class NxApiToolComponent implements OnInit{
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system: NxSystem;
    apiDocFull: JSON;
    apiDoc: any;
    content : any;
    headerHeight: number;
    swagger: any;

    private resizeSubscription: Subscription;
    private routeParamsSubscription: Subscription;
    private menuSectionSubscription: Subscription;
    private menuSubSectionSubscription: Subscription;
    private menuSelectedDetailsSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        pageService: NxPageService,
        private route: ActivatedRoute,
        private systemService: NxSystemService,
        private appStateService: NxAppStateService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private menuService: NxMenuService,
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
                    this.initSwagger();
                }
            });

        this.menuSubSectionSubscription = this.menuService
            .selectedSubSectionSubject
            .subscribe(selection => {
                if (this.content) {
                    this.content.selectedSubSection = selection;
                    this.content = { ...this.content }; // trigger onChange
                }
            });

        this.menuSelectedDetailsSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                if (this.content) {
                    this.content.selectedDetailsSection = selection;
                    this.content = { ...this.content }; // trigger onChange
                }
            });

        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                this.system = this.systemService.createSystem('', params.systemId, '');
                this.system.getServerApiDoc(`{${params.serverId}}`)
                    .then((response) => {
                        this.apiDocFull = response;
                        this.createMenuContent(response);

                        this.menuService.section = 'api_information';
                    });
            });


    }

    ngOnInit() {
    }

    setHeaderHeight() {
        this.headerHeight = this.appStateService.ribbonVisibility ? this.CONFIG.headerHeight + this.CONFIG.ribbonHeight : this.CONFIG.headerHeight;
    }

    private initSwagger() {
        if (this.content.selectedSection === 'api_information') {
            this.swagger = undefined;
            this.apiDoc = {};
        } else {
            this.apiDoc = Object.assign({}, this.apiDocFull);
            Object.keys(this.apiDoc.paths).forEach(endpoint => {
                const category = endpoint.split('/').filter(String)[2];
                if (category !== this.content.selectedSection) {
                    delete this.apiDoc.paths[endpoint];
                }
            });
        }

        this.swagger = SwaggerUI({
            dom_id          : '#swagger-ui',
            layout          : 'BaseLayout',
            presets         : [
                SwaggerUI.presets.apis,
                SwaggerUI.SwaggerUIStandalonePreset
            ],
            spec            : this.apiDoc,
            // filter          : 'RESTful API', // currently all API have same tag
            // url             : '/static/openapi_v1.json',
            docExpansion    : 'list',
            operationsSorter: 'alpha'
        });
    }

    private createMenuContent(response) {
        const _content = {
            selectedSection   : '', // updated by selectedSectionSubject
            selectedSubSection: '', // updated by selectedSubSectionSubject
            system            : {}, // updated by getSystemInfo
            base              : '', // no base - no navigation
            level1            : [
                {
                    id    : 'api_information',
                    svg   : '',
                    label : 'API Information',
                    path  : '',
                    level2: [],
                    level3: []
                }
            ]
        };

        Object.keys(response.paths).forEach(endpoint => {
            const category = endpoint.split('/').filter(String)[2];
            let categoryNode = _content.level1.find((node) => node.id === category);

            if (!categoryNode) {
                categoryNode = {
                    id    : category,
                    svg   : '',
                    label : API_GROUP[category.toUpperCase()],
                    path  : '',
                    level2: [],
                    level3: []
                };
                _content.level1.push(categoryNode);
            }

            Object.keys(response.paths[endpoint]).forEach(method => {
                categoryNode.level3.push({
                    additionalLabel: '',
                    id             : '',
                    isEnabled      : true, // is proprietary?
                    label          : `(${method})`,
                    path           : '',
                    svgIcon        : ''
                });
            });
        });

        this.content = _content;
    }
}
