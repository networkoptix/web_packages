import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, computed, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { selectCurrentOrganization } from '@common/store/channel-partners/channel-partners.selectors';
import { NxSearchComponent } from '@components/search/search.component';
import type { SearchFilter } from '@components/search/search.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { PipesModule } from '@pipes/pipes.module';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { icons } from '@static-variables';
import { accountSelectors } from '@store/account';

import { NxUsersAccessTableComponent } from '../../users-tables/access-table/access-table.component';

@Component({
    selector: 'nx-access-table-container',
    templateUrl: 'access-table-container.component.html',
    styleUrls: [
        'access-table-container.component.scss',
        '../../../organizations/cards-container/org-cards-container.component.scss',
    ],
    imports: [
        NxUsersAccessTableComponent,
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        RouterModule,
        PipesModule,
        FormsModule,
        NxSearchComponent,
    ],
    standalone: true,
})
export class NxAccessTableContainerComponent implements OnDestroy {
    LANG = staticLang;
    icons = icons;
    groupsStore = inject(GroupsStore);
    orgUsersStore = inject(OrgUsersStore);
    routerState = inject(ChannelPartnersRouteState);

    @Input() email: string = '';
    @ViewChild(NxUsersAccessTableComponent) accessTable!: NxUsersAccessTableComponent;
    searchModel: SearchFilter = { query: '' };
    selectedCount = 0;
    accountEmail$$ = this.store.selectSignal(accountSelectors.selectCurrentUserName);
    orgRecords$$ = this.orgUsersStore.usersByGroupSignalFactory();
    isOrgUser$$ = computed(
        () => this.orgRecords$$().find(user => user.email === this.email)?.isOrgUser,
    );
    fullName$$ = computed(() => {
        const fullName = this.orgRecords$$().find(
            u => u.email === this.email && u.fullName !== 'N/A',
        )?.fullName;
        if (fullName) {
            return `${fullName}, ${this.email}`;
        }

        return this.email;
    });

    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    currentGroupId$$ = computed(
        () => this.cpService.paramStateHandler.state$$().params?.groupId || '',
    );
    currentPath$$ = computed(() => {
        // Todo:
        // Add all organizations if current user is a CP user
        const groupsPath = this.groupsStore.groupsPath$$();
        const currentOrg = this.currentOrg$$()!;
        return [currentOrg, ...groupsPath.reverse()];
    });

    constructor(
        private cpService: NxChannelPartnersService,
        private store: Store,
        private dialogService: NxDialogsService,
    ) {}

    ngOnDestroy(): void {
        this.setQuery({ query: '' });
    }

    setQuery(model: SearchFilter): void {
        this.orgUsersStore.setSearchQuery(model.query);
    }

    addAccess(): void {
        const organization = this.currentOrg$$()!;
        this.dialogService.addOrgUserV2({
            organization,
            email: this.email,
        });
    }

    updateSelectedCount(count: number): void {
        this.selectedCount = count;
    }
}
