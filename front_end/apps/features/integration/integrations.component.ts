import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import type { SearchFilter } from '@components/search/search.component.types';
import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxUriService } from '@services/uri.service';

import { IntegrationService } from './integration.service';

@UntilDestroy()
@Component({
    selector: 'nx-integrations-component',
    templateUrl: 'integrations.component.html',
    styleUrls: ['integrations.component.scss']
})

export class NxIntegrationsComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    allElements: any;
    elements: any;
    filterModel: SearchFilter = { query: '', tags: [] };
    params: any;
    account: any;
    selectors = {
        access: false,
        analytics: false,
        cameras: false,
        home: false,
        psim: false
    };

    private setupDefaults(configService): void {
        this.CONFIG = configService.getConfig();

        this.allElements = [];
    }

    constructor(configService: NxConfigService,
        private uri: NxUriService,
        private integrations: IntegrationService,
        private language: NxLanguageProviderService,
        private pageService: NxPageService,
        private accountService: NxAccountService,
    ) {
        this.setupDefaults(configService);
    }

    ngOnDestroy(): void { }

    ngOnInit(): void {
        this.LANG = this.language.translations;
        this.pageService.pageTitle = this.LANG.pageTitles.integrations?.();
        this.pageService.pageDescription = this.CONFIG.integration.seoPageDesc;

        // Example URI
        // /integrations?search=node
        this.uri.getParams()
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.params = { ...params };
                this.filterModel.query = this.params.search || '';
            });

        this.integrations.pluginsSubject
            .pipe(untilDestroyed(this))
            .subscribe((result: any) => {
                if (result) {
                    if (!this.CONFIG.cloudCapabilities.integrationStore) {
                        this.accountService.requireLogin()
                            .then(() => {
                                this.setIntegrations(result);
                            })
                            .catch(this.pageService.show404);
                    } else {
                        this.setIntegrations(result);
                    }
                } else {
                    this.elements = undefined;
                }
            }, error => {
                console.error('Integration plugins error -> ', error);
                this.pageService.show404();
            });
    }

    setIntegrations(integrations): void {
        this.allElements = integrations;
        this.setTags();
        this.setFilter();
    }

    setTags(): void {
        const found = this.allElements.find(elm => elm.mine);
        const haveMyIntegration = (found && found.mine) || false;

        this.CONFIG.integration.filter.items.forEach(item => {
            if (
                item.enabled ||
                (item.id === this.CONFIG.integration.myTagId && haveMyIntegration)
            ) {
                this.filterModel.tags.push({
                    id: item.id,
                    label: item.name,
                    value: false
                });
            }
        });

        // Ensure model change will be trigger
        this.filterModel = cloneDeep(this.filterModel);
    }

    setFilter() {
        const IGNORE_KEYS = [
            'downloadFilesOrder',
            'id',
            'lastModified',
            'link',
            'mine'
        ];
        const searchBy = (item, query) => {
            return Object.keys(item).find(key => {
                // Ignore values that are undefined or that dont help the search.
                if (!item[key] || IGNORE_KEYS.includes(key)) {
                    return false;
                }
                return JSON.stringify(Object.values(item[key]))
                    .toLowerCase()
                    .includes(query);
            });
        };

        this.elements = this.allElements.map(obj => ({ ...obj }));

        if (this.filterModel.query !== '') {
            const query = this.filterModel.query.toLowerCase();

            this.elements = this.elements.filter(item => searchBy(item, query));
        }

        if (this.filterModel.tags?.length) {
            const hasTagSelection = this.filterModel.tags.some(tag => tag.value);
            if (hasTagSelection) {
                this.elements = this.elements.filter(item => {
                    return item.information.type.find(type => {
                        return this.filterModel.tags.some(tag => {
                            return tag.id === type.id && tag.value;
                        });
                    });
                });
            }
        }
    }

    modelChanged(searchModel: SearchFilter): void {
        this.filterModel = cloneDeep(searchModel);
        this.setFilter();
    }

    markMatch(item, text): void {
        const pattern = new RegExp(text, 'gm');
        item.name = item.name.replace(
            pattern,
            '<span class="marked">' + text + '</span>'
        );
    }
}
