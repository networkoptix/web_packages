import {
    Component,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { Params } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import cloneDeep from 'lodash-es/cloneDeep';

import staticLang from '@app/language/language_i18n_static.json';
import { SearchFilter } from '@components/search/search.component.types';
import { environment } from '@environments/environment';
import { NxPartnersService } from '@pages/channel-partners/partners.service';
import {
    OrganizationInfo,
    PartnerInfo
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxUriService } from '@services/uri.service';

@UntilDestroy()
@Component({
    selector: 'nx-partner-orgs-component',
    templateUrl: 'org-list.component.html',
    styleUrls: ['org-list.component.scss']
})

export class NxPartnerOrganizationsListComponent implements OnInit, OnDestroy {
    readonly environment = environment;
    LANG = staticLang;

    allElements: OrganizationInfo[];
    elements: OrganizationInfo[];
    filterModel: SearchFilter = { query: '', tags: [] };
    params: Params;

    private partner: PartnerInfo = {
        customization: 1,
        parent_channel_partner: 1,
        id: 1,
        name: 'Cool partner'
    };

    constructor(
        private uri: NxUriService,
        private partnersService: NxPartnersService,
    ) {}

    ngOnInit(): void {
        this.uri.getParams()
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.params = { ...params };
                this.filterModel.query = this.params.search || '';
            });

        this.partnersService.organizationsSubject
            .subscribe(organizations => {
                this.allElements = organizations;
                // this.setTags();
                this.setFilter();
            });

        this.partnersService.getOrganizations(this.partner);
    }

    setFilter(): void {
        const SEARCH_KEYS = [
            'name',
        ];
        const searchBy = (item: unknown, query: string): string => {
            return Object.keys(item).find(key => {
                if (!item[key] || !SEARCH_KEYS.includes(key)) {
                    return false;
                }
                return item[key]
                    .toLowerCase()
                    .includes(query);
            });
        };

        this.elements = cloneDeep(this.allElements);

        if (this.filterModel.query !== '') {
            const query = this.filterModel.query.toLowerCase();

            this.elements = this.elements.filter(item => {
                const s = searchBy(item, query);
                console.log('s ->', s);
                return s;
            });
        }

        if (this.filterModel.tags?.length) {
            const hasTagSelection = this.filterModel.tags.some(tag => tag.value);
            if (hasTagSelection) {
                this.elements = this.elements.filter(item => {
                    return [];
                    // return item.information.type.find(type => {
                    //     return this.filterModel.tags.some(tag => {
                    //         return tag.id === type.id && tag.value;
                    //     });
                    // });
                });
            }
        }
    }

    modelChanged(searchModel: SearchFilter): void {
        this.filterModel = cloneDeep(searchModel);
        this.setFilter();
    }

    ngOnDestroy(): void {}
}
