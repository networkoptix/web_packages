import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { DomSanitizer }                 from '@angular/platform-browser';
import { AutoUnsubscribe }              from 'ngx-auto-unsubscribe';
import { combineLatest, Subscription }  from 'rxjs';
import { map }                          from 'rxjs/operators';
import { NxLanguageProviderService }    from '../../../services/nx-language-provider';
import { NxConfigService, IConfig }     from '../../../services/nx-config';
import { NxAccountService }             from '../../../services/account.service';
import { NxPageService }                from '../../../services/page.service';
import { NxRibbonService }              from '../../../components/ribbon';
import { IntegrationService }           from '../integration.service';
import { NxMenuService }                from '../../../menu';
import { NxDialogsService }             from '../../../dialogs/dialogs.service';
import { LanguageI18NStaticTypes }      from '../../../../language_i18n_static_types';
import { MessageParams }                from '../../../dialogs/message/message.component';

@AutoUnsubscribe()
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

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;
    }

    constructor(configService: NxConfigService,
                public sanitizer: DomSanitizer,
                private router: Router,
                private route: ActivatedRoute,
                private integrationService: IntegrationService,
                private ribbonService: NxRibbonService,
                // TODO: Use dialog service when it is not being downgraded
                private dialogs: NxDialogsService,
                private language: NxLanguageProviderService,
                private menuService: NxMenuService,
                private accountService: NxAccountService,
                private pageService: NxPageService
    ) {
        this.setupDefaults(configService);
    }

    ngOnInit(): void {
        this.pageService.setDesktopLayout();
        this.menuDetailsSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });

        this.routeSubscription = combineLatest(this.route.params, this.route.queryParams)
            .pipe(map(results => ({ params: results[0], query: results[1] })))
            .subscribe(results => {
                // @ts-ignore
                if (results.params.id) {
                    this.integrationService.setIntegrationPlugin({});

                    // @ts-ignore
                    const query = results.query;

                    this.content = {
                        selectedSection: '', // updated by selectedSectionSubject
                        base           : '/integrations/', // updated by route param
                        level1         : [
                            {
                                id    : '',
                                label : '',
                                path  : '',
                                level3: [
                                    {
                                        id   : 'how-it-works',
                                        label: this.LANG['How it works']() || 'How it works',
                                        // path : 'how-it-works',
                                        path : '',
                                        query
                                    },
                                    {
                                        id   : 'how-to-setup',
                                        label: this.LANG['How to setup?']() || 'How to setup?',
                                        path : 'how-to-setup',
                                        query
                                    }]
                            }]
                    };

                    // @ts-ignore
                    this.integrationSubscription = this.integrationService.getIntegrationBy(results.params.id, results.query.state)
                        .subscribe(result => {
                            if (result.length) {
                                // @ts-ignore
                                this.content.base += results.params.id;

                                this.plugin = this.integrationService.format(result[0]);

                                if (this.plugin.pending || this.plugin.draft) {
                                    this.ribbonService.show(
                                        this.LANG.ribbon.integration.previewRibbon,
                                        this.LANG.ribbon.integration.backToEditText,
                                        this.CONFIG.integration.adminLink.replace('%ID%', this.plugin.id)
                                    );
                                }

                                this.integrationService.setIntegrationPlugin(this.plugin);
                            }
                        }).add(() => {
                            if (!this.plugin) {
                                this.router
                                    .navigate([this.CONFIG.redirect.page404])
                                    .catch(error => {
                                        console.error(error);
                                    });
                            }
                        });
                }
            });
    }

    ngOnDestroy() {
        this.ribbonService.hide();
        this.plugin = undefined;
        this.pageService.setDefaultLayout();
    }

    openMessageDialog() {
        let disclaimer: string = this.LANG.privacyPolicy.integration;
        disclaimer = disclaimer.replace(/{{INTEGRATION_COMPANY}}/g, this.plugin.information.companyName);
        disclaimer = disclaimer.replace(/{{INTEGRATION_PRIVACY_POLICY}}/g, this.plugin.information.companyPrivacyPolicyLink);
        const data: MessageParams = {
            to     : this.plugin.information.companyName,
            email  : this.plugin.support.supportEmail,
            disclaimer,
            assetId: this.plugin.id,
            asset  : this.plugin.information.name
        };
        this.dialogs
            .message(this.accountService, this.CONFIG.dialogs.message.type.integration, data)
            .then(() => {});
    }
}
