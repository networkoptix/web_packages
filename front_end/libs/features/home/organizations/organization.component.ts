import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
    Component,
    DestroyRef,
    Input,
    OnInit,
    inject,
    signal,
    computed,
    input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, map } from 'rxjs';
import { delay } from 'rxjs/operators';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectCurrentOrganization,
    selectCurrentPartnerId,
    selectCurrentPartnerOrgs,
    selectRootOrganizations,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxHidableModule } from '@components/hidable/hidable.module';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxRibbonStandaloneComponent } from '@components/ribbon/ribbon-standalone.component';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { PipesModule } from '@pipes/pipes.module';
import { Account } from '@services/account.service/account';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import {
    Organization,
    State,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import { icons } from '@static-variables';

import { NxSystemGroupsSidebarComponent } from '../components/sidebar/sidebar.component';
import { NxAccessTableComponent } from '../components/users/access-table/access-table.component';
import { Crumb } from '../home.types';
import { GroupsStore } from '../store/groups/groups.store';
import { ChannelPartnersRouteState } from '../store/route-state/route-state.store';

import { NxOrganizationCardContainerComponent } from './cards-container/org-cards-container.component';

interface SidebarSettings {
    showSidebarState: boolean;
}

@UntilDestroy()
@Component({
    selector: 'nx-organization',
    templateUrl: 'organization.component.html',
    styleUrls: ['organization.component.scss'],
    standalone: true,
    imports: [
        RouterModule,
        NxPreLoaderComponent,
        CommonModule,
        AngularSvgIconModule,
        NxSystemGroupsSidebarComponent,
        NxOrganizationCardContainerComponent,
        NxAddSvgSrcDirective,
        DragDropModule,
        NxTabsModule,
        NxAccessTableComponent,
        NxTagComponent,
        TranslateModule,
        NxRibbonStandaloneComponent,
        PipesModule,
        NxHidableModule,
    ],
})
export class NxOrganizationsComponent implements OnInit {
    LANG = staticLang;
    icons = icons;
    State = State;
    permissionsStore = inject(PermissionsStore);
    groupsStore = inject(GroupsStore);
    routerState = inject(ChannelPartnersRouteState);
    currentTabRoute$$ = input.required<string>({ alias: 'currentTabRoute' });
    breadcrumbIconStyle = { 'width.px': '20', 'height.px': '20', 'margin-right.px': '4' } as const;
    tabs$$ = computed(() => {
        const tabs: Tab[] = [];
        if (this.permissionsStore.canViewSystems$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.systems,
                route: 'systems',
            });
        }
        if (this.permissionsStore.canViewOrgUsers$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.users,
                route: 'users',
            });
        }
        if (!this.currentGroupId$$()) {
            if (this.permissionsStore.canViewOrgReports$$()) {
                tabs.push({
                    displayName: this.LANG.channelPartners.tabNames.reports,
                    route: 'reports',
                });
            }
            if (this.permissionsStore.canViewOrgSettings$$()) {
                tabs.push({
                    displayName: this.LANG.channelPartners.tabNames.settings,
                    route: 'settings',
                });
            }
        }
        return tabs;
    });

    isLoading = true;
    userEmail: string;
    destroyRef = inject(DestroyRef);
    isChannelPartnerUser$$ = signal<boolean>(false);
    showAccessTable = false;
    accessTableUser: string = '';
    @Input() inChannelPartner: boolean = false;

    private account$$ = this.store.selectSignal<Account>(selectCurrentUser);
    organizations$$ = this.store.selectSignal<Organization[]>(selectRootOrganizations);
    currentPartnerOrganizations$$ =
        this.store.selectSignal<Organization[]>(selectCurrentPartnerOrgs);
    currentPartnerId$$ = this.store.selectSignal<string>(selectCurrentPartnerId);

    sidebarSettings: CustomAccountProperty<SidebarSettings>;
    currentGroupId$$ = computed(() => this.cpService.paramStateHandler.state$$()?.params?.groupId);
    currentOrganization$$ = this.store.selectSignal(selectCurrentOrganization);
    rootGroups$$ = this.groupsStore.groupsEntities;

    constructor(
        private store: Store,
        private router: Router,
        private cloudApi: NxCloudApiService,
        private cpService: NxChannelPartnersService,
    ) {
        const { email } = this.account$$();
        this.userEmail = email;
        this.sidebarSettings = this.cloudApi.customAccountPropertyFactory(
            'showSidebarState',
            email,
            { showSidebarState: true },
        );
    }

    ngOnInit(): void {
        if (!this.inChannelPartner) {
            this.store.dispatch(CPActions.setCurrentPartnerId({ currentPartnerId: null }));
        }
        this.cpService.paramStateHandler.state$
            .pipe(
                map(({ params }) => params.email),
                distinctUntilChanged(),
                delay(100),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(email => {
                if (email) {
                    this.accessTableUser = email;
                    this.showAccessTable = true;
                } else {
                    this.showAccessTable = false;
                }
            });

        this.cpService.paramStateHandler.state$
            .pipe(
                map(({ params }) => params.organizationId),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(id => {
                const orgs = this.organizations$$();
                const partnerOrgs = this.currentPartnerOrganizations$$();
                const currOrg = this.currentOrganization$$();
                if (
                    (!orgs.find(o => o.id === id) && !partnerOrgs.find(o => o.id === id)) ||
                    !currOrg
                ) {
                    return this.router.navigate(['404']);
                }

                this.cpService.getSelfChannelPartnerUser(currOrg?.channelPartner).subscribe({
                    next: () => this.isChannelPartnerUser$$.set(true),
                    error: () => {
                        this.isChannelPartnerUser$$.set(false);
                        this.isLoading = false;
                    },
                    complete: () => (this.isLoading = false),
                });
            });
    }

    public handleSidebarTogglingEarClick(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = !curr.showSidebarState;
            return curr;
        }, true);
    }

    dismiss(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = false;
            return curr;
        }, true);
    }

    trackItem(_index: number, item: Crumb): string {
        return item.id;
    }

    excludeLast = <T>(items: T[]): T[] => items.slice(0, -1);
}
