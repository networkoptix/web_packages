import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location }                     from '@angular/common';
import { IntegrationService }           from './integration.service';
import { NxUriService }                 from '../../services/uri.service';
import { NxConfigService }              from '../../services/nx-config';
import { NxLanguageProviderService }    from '../../services/nx-language-provider';
import { Subscription }                 from 'rxjs';
import { NxAccountService }             from '../../services/account.service';
import { AutoUnsubscribe }              from 'ngx-auto-unsubscribe';
import { NxPageService }                from '../../services/page.service';
import { NxUtilsService }               from '../../services/utils.service';

@AutoUnsubscribe()
@Component({
    selector   : 'integrations-component',
    templateUrl: 'integrations.component.html',
    styleUrls  : ['integrations.component.scss']
})

export class NxIntegrationsComponent implements OnInit, OnDestroy {
    private CONFIG: any = {};
    private LANG: any = {};

    private allElements: any;
    private elements: any;
    private emptyFilter: any = {};
    private filterModel: any = {};

    private integrationSubscription: Subscription;
    private uriSubscription: Subscription;
    location: any;
    params: any;
    account: any;

    selectors = {
        access   : false,
        analytics: false,
        cameras  : false,
        home     : false,
        psim     : false,
    };

    private setupDefaults() {
        this.CONFIG = this.config.getConfig();

        this.allElements = [];

        this.emptyFilter = {
            query: ''
        };
        this.filterModel = this.emptyFilter;
        this.filterModel.tags = [];
    }

    constructor(private uri: NxUriService,
                private integrations: IntegrationService,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private accountService: NxAccountService,
                location: Location) {
        this.location = location;
        this.setupDefaults();
    }
    ngOnDestroy() {}

    ngOnInit(): void {
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.integrations);

        // Example URI
        // /integrations?search=node
        this.uriSubscription = this.uri
            .getURI()
            .subscribe(params => {
                this.params = { ...params };
                this.filterModel.query = this.params.search || '';
            });

        this.accountService.get()
            .then(account => {
                this.integrationSubscription = this.integrations
                    .pluginsSubject
                    .subscribe((result: any) => {
                        if (result) {
                            if (!this.CONFIG.integrationStoreEnabled && !(account && account.is_staff)) {
                                this.location.go('404');
                            } else {
                                this.allElements = result;
                                this.setTags();
                                this.setFilter();
                            }
                        } else {
                            this.elements = undefined;
                        }
                    }, error => {
                        console.error('Integration plugins error -> ', error);
                        this.location.go('404');
                    });
            });
    }

    setTags() {
        const found = this.allElements.find((elm) => elm.mine);
        const haveMyIntegration = (found && found.mine) || false;

        this.CONFIG.integrationFilterItems.forEach(item => {
            if (item.enabled || (item.id === this.CONFIG.myIntegrationTagId && haveMyIntegration)) {
                    this.filterModel.tags.push({ id: item.id, label: item.name, value: false });
            }
        });

        // Ensure model change will be trigger
        this.filterModel = NxUtilsService.deepCopy(this.filterModel);
    }

    setFilter() {
        function searchBy(item, query) {
            return (item.information.name && item.information.name.toLowerCase().indexOf(query) > -1 ||
                    item.information.companyName && item.information.companyName.toLowerCase().indexOf(query) > -1 ||
                    item.information.shortDescription && item.information.shortDescription.toLowerCase().indexOf(query) > -1 ||
                    item.overview && item.overview.description && item.overview.description.toLowerCase().indexOf(query) > -1);
        }

        this.elements = this.allElements.map(obj => ({ ...obj }));

        if (this.filterModel.query !== '') {
            const query = this.filterModel.query.toLowerCase();

            this.elements = this.elements.filter(item => {
                if (searchBy(item, query)) {
                    // this.markMatch(item, text);
                    return item;
                }
            });
        }

        if (this.filterModel.tags.length) {
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
