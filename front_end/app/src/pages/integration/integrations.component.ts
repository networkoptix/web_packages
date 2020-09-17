import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router }                       from '@angular/router';
import { Subscription }                 from 'rxjs';
import { AutoUnsubscribe }              from 'ngx-auto-unsubscribe';
import { IntegrationService }           from './integration.service';
import { NxUriService }                 from '../../services/uri.service';
import { NxConfigService, IConfig }     from '../../services/nx-config';
import { NxLanguageProviderService }    from '../../services/nx-language-provider';
import { NxAccountService }             from '../../services/account.service';
import { NxPageService }                from '../../services/page.service';
import { NxUtilsService }               from '../../services/utils.service';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector   : 'integrations-component',
    templateUrl: 'integrations.component.html',
    styleUrls  : ['integrations.component.scss']
})

export class NxIntegrationsComponent implements OnInit, OnDestroy {
    private CONFIG: IConfig;
    private LANG: LanguageI18NStaticTypes;

    private allElements: any;
    private elements: any;
    private emptyFilter: any = {};
    private filterModel: any = {};

    private integrationSubscription: Subscription;
    private uriSubscription: Subscription;
    params: any;
    account: any;

    selectors = {
        access    : false,
        analytics : false,
        cameras   : false,
        home      : false,
        psim      : false
    };

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();

        this.allElements = [];

        this.emptyFilter = {
            query: ''
        };
        this.filterModel = this.emptyFilter;
        this.filterModel.tags = [];
    }

    constructor(configService: NxConfigService,
                private uri: NxUriService,
                private integrations: IntegrationService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private accountService: NxAccountService,
                private router: Router
    ) {
        this.setupDefaults(configService);
    }

    ngOnDestroy() {}

    ngOnInit(): void {
        this.LANG = this.language.translations;
        this.pageService.pageTitle = this.LANG.pageTitles.integrations;

        // Example URI
        // /integrations?search=node
        this.uriSubscription = this.uri
            .getURI()
            .subscribe(params => {
                this.params = { ...params };
                this.filterModel.query = this.params.search || '';
            });

        this.integrationSubscription = this.integrations
            .pluginsSubject
            .subscribe((result: any) => {
                if (result) {
                    if (!this.CONFIG.cloudCapabilities.integrationStore) {
                        this.accountService.requireLogin()
                            .then(() => {
                                this.setIntegrations(result);
                            })
                            .catch(() => {
                                this.router
                                    .navigate([this.CONFIG.redirect.page404])
                                    .catch(error => {
                                        console.error(error);
                                    });
                            });
                    } else {
                        this.setIntegrations(result);
                    }
                } else {
                    this.elements = undefined;
                }
            }, error => {
                console.error('Integration plugins error -> ', error);
                this.router
                    .navigate([this.CONFIG.redirect.page404])
                    .catch(error => {
                        console.error(error);
                    });
            });
    }

    setIntegrations(integrations) {
        this.allElements = integrations;
        this.setTags();
        this.setFilter();
    }

    setTags() {
        const found = this.allElements.find((elm) => elm.mine);
        const haveMyIntegration = (found && found.mine) || false;

        this.CONFIG.integration.filter.items.forEach(item => {
            if (item.enabled || (item.id === this.CONFIG.integration.myTagId && haveMyIntegration)) {
                this.filterModel.tags.push({ id: item.id, label: item.name, value: false });
            }
        });

        // Ensure model change will be trigger
        this.filterModel = NxUtilsService.deepCopy(this.filterModel);
    }

    setFilter() {
        const IGNORE_KEYS = ['downloadFilesOrder', 'id', 'lastModified', 'link', 'mine'];
        const searchBy = (item, query) => {
            return Object.keys(item).find((key) => {
                // Ignore values that are undefined or that dont help the search.
                if (!item[key] || IGNORE_KEYS.indexOf(key) > -1) {
                    return false;
                }
                return JSON.stringify(Object.values(item[key])).toLowerCase().indexOf(query) > -1;
            });
        };

        this.elements = this.allElements.map(obj => ({ ...obj }));

        if (this.filterModel.query !== '') {
            const query = this.filterModel.query.toLowerCase();

            this.elements = this.elements.filter(item => searchBy(item, query));
        }

        if (this.filterModel.tags && this.filterModel.tags.length) {
            const hasTagSelection = this.filterModel.tags.some((tag) => tag.value);
            if (hasTagSelection) {
                this.elements = this.elements.filter(item => {
                    return item.information.type.find((type) => {
                        return this.filterModel.tags.some(tag => {
                            if (tag.id === type.id && tag.value) {
                                return item;
                            }
                        });
                    });
                });
            }
        }
    }

    modelChanged(searchModel): void {
        this.filterModel = NxUtilsService.deepCopy(searchModel);
        this.setFilter();
    }

    markMatch(item, text) {
        const pattern = new RegExp(text, 'gm');
        item.name = item.name.replace(pattern, '<span class="marked">' + text + '</span>');
    }
}
