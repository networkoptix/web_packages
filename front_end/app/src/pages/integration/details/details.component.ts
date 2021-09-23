import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location }                     from '@angular/common';
import { ActivatedRoute, Router }       from '@angular/router';
import { DomSanitizer }                 from '@angular/platform-browser';
import { UntilDestroy }                 from '@ngneat/until-destroy';
import { combineLatest, Subscription }  from 'rxjs';
import { map }                          from 'rxjs/operators';

import { NxLanguageProviderService }    from '@services/nx-language-provider';
import { NxConfigService, IConfig }     from '@services/nx-config';
import { NxAccountService, Account }    from '@services/account.service';
import { NxPageService }                from '@services/page.service';
import {
    NxRibbonService, RibbonActionInput
}                                       from '@components/ribbon';
import { IntegrationService }           from '../integration.service';
import { NxMenuService }                from '@src/menu';
import { NxDialogsService }             from '@dialogs/dialogs.service';
import { MessageParams }                from '@dialogs/message/message.component';
import { NxProcessService, Process }    from '@services/process.service';
import { NxCloudApiService }            from '@services/nx-cloud-api';
import { NxUriService }                 from '@services/uri.service';
import { LanguageI18NStaticTypes }      from '@app/language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'integration-detail-component',
    templateUrl : 'details.component.html',
    styleUrls   : ['details.component.scss']
})

export class NxIntegrationDetailsComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    plugin;
    content: any = {};

    private integrationSubscription: Subscription;
    private menuDetailsSubscription: Subscription;
    private routeSubscription: Subscription;
    private acceptProcess: Process;
    private account: Account;

    private setupDefaults() {
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public sanitizer: DomSanitizer,
        private router: Router,
        private route: ActivatedRoute,
        private integrationService: IntegrationService,
        private ribbonService: NxRibbonService,
        // TODO: Use dialog service when it is not being downgraded
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private accountService: NxAccountService,
        private pageService: NxPageService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private uriService: NxUriService,
        private location: Location
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    setUpRouteSubscription() {
        this.routeSubscription = combineLatest(this.route.params, this.route.queryParams)
            .pipe(map(results => ({ params: results[0], query: results[1] })))
            .subscribe(results => {
                if (results.params.id) {
                    const assetParam = results.params.id;
                    const paramParts = assetParam.split('-');
                    const assetid = parseInt(paramParts[0]);
                    if (isNaN(assetid) || (this.plugin?.id && this.plugin.id === assetid)) {
                        return;
                    }
                    this.integrationService.setIntegrationPlugin({});

                    // @ts-ignore
                    const query = Object.entries(results.query).length ? results.query : undefined;
                    this.content = {
                        selectedSection : '', // updated by selectedSectionSubject
                        base            : '/integrations/', // updated by route param
                        level1          : [
                            {
                                id     : '',
                                label  : '',
                                path   : '',
                                level3 : [
                                    {
                                        id    : 'how-it-works',
                                        label : this.LANG['How it works']() || 'How it works',
                                        // path  : 'how-it-works',
                                        path  : '',
                                        query
                                    },
                                    {
                                        id    : 'how-to-setup',
                                        label : this.LANG['How to setup?']() || 'How to setup?',
                                        path  : 'how-to-setup',
                                        query
                                    }]
                            }]
                    };

                    this.integrationSubscription = this.integrationService.getIntegrationBy(assetid, results.query.state)
                        .subscribe(result => {
                            if (result.length) {
                                this.plugin = this.integrationService.format(result[0]);

                                this.content.base += this.plugin.urlified || assetid;
                                const childPath = this.route.snapshot.firstChild.routeConfig.path;
                                const newUrl = this.content.base + (childPath ? '/' + childPath : '');
                                let queryParams = '';
                                if (query) {
                                    queryParams = new URLSearchParams(query).toString();
                                }
                                this.location.replaceState(newUrl, queryParams);

                                if (this.plugin.pending || this.plugin.draft || this.plugin.canEdit || this.account?.can_publish_integration) {
                                    const ribbonActions: RibbonActionInput[] = [];

                                    if (this.plugin.pending && this.account?.can_publish_integration) {
                                        this.acceptProcess = this.processService.createProcess(() => {
                                            return this.cloudApiService.acceptReview(this.plugin.review_id);
                                        }, {
                                            successMessage: this.LANG.account.agreementAccepted?.()
                                        }).then(() => {
                                            this.router.navigate([this.uriService.getURL()]);
                                            this.ribbonService.hide();
                                        });

                                        ribbonActions.push(
                                            {
                                                type  : 'process-button',
                                                text  : this.LANG.ribbon.integration.accept?.(),
                                                value : this.acceptProcess
                                            },
                                            {
                                                type  : 'link',
                                                text  : this.LANG.ribbon.integration.reject?.(),
                                                value : `/admin/cms/assetcustomizationreview/${this.plugin.review_id}/change/`
                                            }
                                        );
                                    }

                                    if (this.plugin.canEdit) {
                                        ribbonActions.push({
                                            type  : 'link',
                                            text  : this.LANG.ribbon.integration.backToEditText,
                                            value : this.CONFIG.integration.adminLink.replace('%ID%', this.plugin.id)
                                        });
                                    }

                                    const preview = this.plugin.pending || this.plugin.draft;
                                    this.ribbonService.show(
                                        preview ? this.LANG.ribbon.integration.previewRibbon?.() : this.LANG.ribbon.integration.publishedRibbon?.(),
                                        ribbonActions
                                    );
                                }

                                this.pageService.pageTitle = NxLanguageProviderService.translate(
                                    this.LANG.pageDescriptions.integrationDetails, {
                                        PLUGIN_NAME              : this.plugin.information.name,
                                        PLUGIN_SHORT_DESCRIPTION : this.CONFIG.vmsName
                                    });

                                this.integrationService.setIntegrationPlugin(this.plugin);
                            }
                        }).add(() => {
                            if (!this.plugin) {
                                this.pageService.show404();
                            }
                        });
                }
            });
    }

    ngOnInit(): void {
        this.pageService.setDesktopLayout();
        this.menuDetailsSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });

        this.accountService.get().then(account => {
            if (account) {
                this.account = account;
            }
            this.setUpRouteSubscription();
        });
    }

    ngOnDestroy() {
        this.ribbonService.hide();
        this.plugin = undefined;
        this.pageService.setDefaultLayout();
    }

    openMessageDialog() {
        const disclaimer = NxLanguageProviderService.translate(
            this.LANG.privacyPolicy.integration, {
                INTEGRATION_COMPANY        : this.plugin.information.companyName,
                INTEGRATION_PRIVACY_POLICY : this.plugin.information.companyPrivacyPolicyLink
            });

        const data: MessageParams = {
            to      : this.plugin.information.companyName,
            email   : this.plugin.support.supportEmail,
            disclaimer,
            assetId : this.plugin.id,
            asset   : this.plugin.information.name
        };
        this.dialogs
            .message(this.accountService, this.CONFIG.dialogs.message.type.integration, data)
            .then(() => {});
    }
}
