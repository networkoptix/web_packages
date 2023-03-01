import { Location } from '@angular/common';
import { Component, Inject, Injector, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import type { Content } from '@app/menu/menu.types';
import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import type { RibbonAction } from '@components/ribbon/ribbon.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons, dialogs } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';

import { IntegrationService } from '../integration.service';

@UntilDestroy()
@Component({
    selector: 'nx-integration-detail-component',
    templateUrl: 'details.component.html',
    styleUrls: ['details.component.scss'],
})

export class NxIntegrationDetailsComponent implements OnInit, OnDestroy {
    injector: Injector;
    CONFIG: IConfig;
    LANG = staticLang;
    plugin;
    content: Content;
    icons = icons;

    private acceptProcess: Process;
    private account: Account;

    constructor(
        injector: Injector,
        configService: NxConfigService,
        private translateService: TranslateService,
        public sanitizer: DomSanitizer,
        private router: Router,
        private route: ActivatedRoute,
        private integrationService: IntegrationService,
        private ribbonService: NxRibbonService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private accountService: NxAccountService,
        private pageService: NxPageService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private uriService: NxUriService,
        private location: Location,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();

        this.injector = injector;
    }

    setUpRouteSubscription(): void {
        combineLatest(this.route.params, this.route.queryParams)
            .pipe(
                map(results => ({ params: results[0], query: results[1] })),
                untilDestroyed(this)
            )
            .subscribe(results => {
                if (results.params.id) {
                    const assetParam = results.params.id;
                    const paramParts = assetParam.split('-');
                    const assetid = parseInt(paramParts[0]);
                    if (isNaN(assetid) || (this.plugin?.id && this.plugin.id === assetid)) {
                        return;
                    }
                    this.integrationService.setIntegrationPlugin({});
                    const query = Object.entries(results.query).length ? results.query : undefined;
                    this.content = {
                        selectedSection: '', // updated by selectedSectionSubject
                        base: '/integrations/', // updated by route param
                        level1: [
                            {
                                id: '',
                                label: '',
                                path: '',
                                level3: [
                                    {
                                        id: 'how-it-works',
                                        label: this.LANG['How it works'],
                                        // path  : 'how-it-works',
                                        path: '',
                                        query
                                    },
                                    {
                                        id: 'how-to-setup',
                                        label: this.LANG['How to setup?'],
                                        path: 'how-to-setup',
                                        query
                                    }
                                ]
                            }
                        ]
                    };

                    this.integrationService.getIntegrationBy(assetid, results.query.state)
                        .pipe(untilDestroyed(this))
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

                                // eslint-disable-next-line camelcase
                                if (this.plugin.pending || this.plugin.draft || this.plugin.canEdit || this.account?.can_publish_integration) {
                                    const ribbonActions: RibbonAction[] = [];

                                    // eslint-disable-next-line camelcase
                                    if (this.plugin.pending && this.account?.can_publish_integration) {
                                        this.acceptProcess = this.processService.createProcess(() => {
                                            return this.cloudApiService.acceptReview(this.plugin.review_id);
                                        }, {
                                            successMessage: this.LANG.account.agreementAccepted
                                        }).then(() => {
                                            this.router.navigate([this.uriService.getURL()]);
                                            this.ribbonService.hide();
                                        });

                                        ribbonActions.push(
                                            {
                                                type: 'process-button',
                                                text: this.LANG.ribbon.integration.accept,
                                                value: this.acceptProcess
                                            },
                                            {
                                                type: 'link',
                                                text: this.LANG.ribbon.integration.reject,
                                                value: `/admin/cms/assetcustomizationreview/${this.plugin.review_id}/change/`
                                            }
                                        );
                                    }

                                    if (this.plugin.canEdit) {
                                        ribbonActions.push({
                                            type: 'link',
                                            text: this.LANG.ribbon.integration.backToEditText,
                                            value: this.CONFIG.integration.adminLink.replace('%ID%', this.plugin.id)
                                        });
                                    }

                                    const preview = this.plugin.pending || this.plugin.draft;
                                    this.ribbonService.show(
                                        preview ? this.LANG.ribbon.integration.previewRibbon : this.LANG.ribbon.integration.publishedRibbon,
                                        ribbonActions
                                    );
                                }

                                this.pageService.pageTitle(
                                    this.translateService.instant(
                                        this.LANG.pageDescriptions.integrationDetails,
                                        {
                                            PLUGIN_NAME: this.plugin.information.name,
                                            PLUGIN_SHORT_DESCRIPTION: this.CONFIG.vmsName
                                        })
                                );

                                this.integrationService.setIntegrationPlugin(this.plugin);
                            }
                        }).add(() => {
                            if (!this.plugin) {
                                this.injector.get(NxPageService).redirect404();
                            }
                        });
                }
            });
    }

    ngOnInit(): void {
        this.pageService.setDesktopLayout();
        this.menuService
            .selectedDetailsSection
            .pipe(untilDestroyed(this))
            .subscribe(selection => {
                if (this.content) {
                    this.content.selectedDetailsSection = selection;
                    this.content = { ...this.content }; // trigger onChange
                }
            });

        this.accountService.get().then(account => {
            if (account) {
                this.account = account;
            }
            this.setUpRouteSubscription();
        });
    }

    ngOnDestroy(): void {
        this.ribbonService.hide();
        this.plugin = undefined;
        this.pageService.setDefaultLayout();
    }

    openMessageDialog(): void {
        const data = {
            to: this.plugin.information.companyName,
            email: this.plugin.support.supportEmail,
            disclaimer: {
                value: this.LANG.privacyPolicy.integration,
                params: {
                    INTEGRATION_COMPANY: this.plugin.information.companyName,
                    INTEGRATION_PRIVACY_POLICY: this.plugin.information.companyPrivacyPolicyLink
                }
            },
            assetId: this.plugin.id,
            asset: this.plugin.information.name
        };
        this.dialogs.message({ messageType: dialogs.message.type.integration, data });
    }

    handleDashboardOpen(open: boolean, queryParams, url): void {
        if (open) {
            const route = ['dashboard'];
            const options = { queryParams };

            if (this.window.location === this.window.parent.location) {
                this.router.navigate(route, options);
            } else {
                this.window.parent.postMessage({ route, options }, '*');
            }
        } else if (open === false) {
            // This is a deliberate check, confirm dialog returns true/false for
            // action/cancel buttons and undefined for closing with X
            this.window.location.href = url;
        }
    }

    async addWidgetDialog({ url, name }): Promise<void> {
        const open = await this.dialogs.confirm({
            title: 'Add widget to dashboard?',
            message: `Would you like to add "${name}" to your dashboard?`,
            footer: {
                actionLabel: 'Add to dashboard',
                cancelLabel: 'Download file',
            }
        });
        const queryParams = { widgetUrl: url };
        this.handleDashboardOpen(open, queryParams, url);
    }

    async updateDashboardDialog({ url }): Promise<void> {
        const open = await this.dialogs.confirm({
            title: 'Update dashboard?',
            message: 'Would you like to replace your dashboard with the one from this config?',
            footer: {
                actionLabel: 'Update dashboard',
                cancelLabel: 'Download file',
            }
        });
        const queryParams = { dashboardUrl: url };
        this.handleDashboardOpen(open, queryParams, url);
    }
}
