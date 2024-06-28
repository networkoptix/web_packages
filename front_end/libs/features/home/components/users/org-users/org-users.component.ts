import { CommonModule } from '@angular/common';
import {
    Component,
    computed,
    effect,
    inject,
    OnDestroy,
    OnInit,
    signal,
    untracked,
    ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { selectCurrentOrganization } from '@common/store/channel-partners/channel-partners.selectors';
import { NxSearchComponent } from '@components/search/search.component';
import type { SearchFilter } from '@components/search/search.component.types';
import { NxFilterTagsComponent } from '@components/tag-filter/tag.component';
import { UserFilter } from '@dialogs/channel-partners/filter-users/filter-users.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { icons } from '@static-variables';

import { NxOrgUsersTableComponent } from '../../users-tables/org-users-table/org-users-table.component';

@Component({
    selector: 'nx-org-users',
    templateUrl: 'org-users.component.html',
    styleUrls: [
        'org-users.component.scss',
        '../../../organizations/cards-container/org-cards-container.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        NxOrgUsersTableComponent,
        TranslateModule,
        NxSearchComponent,
        FormsModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxFilterTagsComponent,
    ],
})
export class NxOrganizationUsersComponent implements OnInit, OnDestroy {
    protected readonly icons = icons;

    orgUsersStore = inject(OrgUsersStore);
    routerState = inject(ChannelPartnersRouteState);

    @ViewChild(NxOrgUsersTableComponent) orgUsersTable!: NxOrgUsersTableComponent;

    searchModel: SearchFilter = { query: '' };

    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    selectedCount = 0;

    users = this.orgUsersStore.currentGroupUsersEntities();

    filters$$ = signal<UserFilter[]>([]);

    searchFilters$$ = computed<Record<string, unknown>>(() => {
        const filters = this.filters$$();
        if (!filters) {
            return {};
        }
        const searchFilters: Record<string, unknown> = {};
        filters.forEach(filter => {
            if (filter.selected) {
                searchFilters[filter.group] = filter.value;
            }
        });
        return searchFilters;
    });
    updateSearchEffect = effect(() => {
        this.filters$$();
        untracked(() => {
            this.orgUsersStore.setSearchFilters(this.searchFilters$$());
        });
    });

    constructor(
        private dialogsService: NxDialogsService,
        private store: Store,
        private route: ActivatedRoute,
        private dialogs: NxDialogsService,
    ) {}

    ngOnInit(): void {
        const searchParam = this.route.snapshot.queryParamMap.get('search') || '';

        this.searchModel.query = searchParam;
        this.setQuery(this.searchModel);
    }

    ngOnDestroy(): void {
        this.orgUsersStore.clearSearchFilters();
    }

    setQuery(model: SearchFilter): void {
        this.orgUsersStore.setSearchQuery(model.query);
    }

    filterRecords(): void {
        this.dialogs.filterUsers(null).then(filters => {
            this.filters$$.update(() => filters);
        });
    }

    newUserDialog(): void {
        const organization = this.currentOrg$$()!;

        this.dialogsService.addOrgUserV2({
            organization,
            initialFolder: this.routerState.state$$().groupId || organization.id,
        });
    }

    updateSelectedCount(count: number): void {
        this.selectedCount = count;
    }

    updateFilters({
        idx,
        value,
        remove = false,
    }: {
        idx: number;
        value: boolean;
        remove?: boolean;
    }): void {
        this.filters$$.update(filters => {
            const newFilters: UserFilter[] = [...filters];
            if (remove) {
                newFilters.splice(idx, 1);
            } else {
                newFilters[idx].selected = value;
            }

            return newFilters;
        });
    }
}
