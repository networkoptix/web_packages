import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { selectCurrentOrganization } from '@common/store/channel-partners/channel-partners.selectors';
import { NxSearchComponent } from '@components/search/search.component';
import type { SearchFilter } from '@components/search/search.component.types';
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
    ],
})
export class NxOrganizationUsersComponent implements OnInit {
    icons = icons;
    orgUsersStore = inject(OrgUsersStore);
    routerState = inject(ChannelPartnersRouteState);

    @ViewChild(NxOrgUsersTableComponent) orgUsersTable!: NxOrgUsersTableComponent;
    searchModel: SearchFilter = { query: '' };

    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    selectedCount = 0;

    constructor(
        private dialogsService: NxDialogsService,
        private store: Store,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        const searchParam = this.route.snapshot.queryParamMap.get('search');
        if (searchParam) {
            this.searchModel.query = searchParam;
            this.setQuery(this.searchModel);
        }
    }

    setQuery(model: SearchFilter): void {
        this.orgUsersStore.setSearchQuery(model.query);
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
}
