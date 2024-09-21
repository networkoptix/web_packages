import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
    Component,
    computed,
    DestroyRef,
    effect,
    HostListener,
    inject,
    Input,
    input,
    OnDestroy,
    OnInit,
    signal,
    untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, firstValueFrom, map } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectAllOrganizations,
    selectBanner,
    selectCurrentOrganization,
    selectCurrentParentPartnerForChild,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxHidableModule } from '@components/hidable/hidable.module';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderGenericNewV2Component } from '@components/placeholdersV2/page/page-placeholder.component';
import { NxRibbonStandaloneComponent } from '@components/ribbon/ribbon-standalone.component';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxTutorialDialogComponent } from '@dialogs/channel-partners/tutorial-dialog/tutorial-dialog.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
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
import { useNewCloud } from '@utils/general';
import { NxMenuProjectionDirective } from 'nx-components';

import { NxSystemGroupsSidebarComponent } from '../components/sidebar/sidebar.component';
import { NxAccessTableContainerComponent } from '../components/users/access-table-users/access-table-container.component';
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
        NxAccessTableContainerComponent,
        NxTagComponent,
        TranslateModule,
        PipesModule,
        NxHidableModule,
        NxAlertBlockComponent,
        NxTutorialDialogComponent,
        NxPagePlaceholderGenericNewV2Component,
        NxRibbonStandaloneComponent,
        NxMenuProjectionDirective,
    ],
})
export class NxOrganizationsComponent implements OnInit, OnDestroy {
    LANG = staticLang;
    icons = icons;
    State = State;
    useNewCloud = useNewCloud();
    permissionsStore = inject(PermissionsStore);
    parentPartner$$ = this.store.selectSignal(selectCurrentParentPartnerForChild);
    groupsStore = inject(GroupsStore);
    routerState = inject(ChannelPartnersRouteState);
    currentTabRoute$$ = input.required<string>({ alias: 'currentTabRoute' });
    breadcrumbIconStyle = { 'width.px': '20', 'height.px': '20', 'margin-right.px': '4' } as const;
    isValidOrg = false;

    hasSupportInfo$$ = computed(() => {
        return Object.values(this.parentPartner$$()?.supportInformation || []).some(
            fieldset => fieldset?.length,
        );
    });

    windowWidth$$ = signal(window.innerWidth);
    path$$ = computed(() => {
        const path = this.groupsStore.groupsPath$$();
        if (!path.length) {
            return [];
        }
        const orgBreadcrumb = {
            name: this.currentOrganization$$()?.name,
            id: this.routerState.rootGroupLink$$(),
        };
        const width = this.windowWidth$$();
        const mobileWidth = 520;
        if (width < mobileWidth) {
            return [path.at(-2) ?? orgBreadcrumb];
        }
        return [orgBreadcrumb, ...path];
    });

    @HostListener('window:resize', ['$event'])
    onResize(): void {
        this.windowWidth$$.set(window.innerWidth);
    }

    canManageSystems$$ = this.permissionsStore.canManageSystems$$;

    tabs$$ = computed(() => {
        const tabs: Tab[] = [];
        const groups = this.groupsStore.groupsEntities();
        if (this.permissionsStore.canViewSystems$$() || groups.length) {
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

            if (this.permissionsStore.canViewPartnerSupportUI$$() && this.hasSupportInfo$$()) {
                tabs.push({
                    displayName: this.LANG.channelPartners.tabNames.support,
                    route: 'support',
                });
            }
            // Use this statement when we support disconnecting from orgs.
            // if (!this.currentPartnerId$$() || this.permissionsStore.canViewOrgSettings$$()) {
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
    organizations$$ = this.store.selectSignal<Organization[]>(selectAllOrganizations);

    sidebarSettings: CustomAccountProperty<SidebarSettings>;
    currentGroupId$$ = computed(() => this.cpService.paramStateHandler.state$$()?.params?.groupId);
    currentOrganization$$ = this.store.selectSignal(selectCurrentOrganization);
    rootGroups$$ = this.groupsStore.groupsEntities;
    banner$$ = this.store.selectSignal(selectBanner);

    constructor(
        private store: Store,
        private cloudApi: NxCloudApiService,
        private cpService: NxChannelPartnersService,
        private dialogsService: NxDialogsService,
    ) {
        const { email } = this.account$$();
        this.userEmail = email;
        this.sidebarSettings = this.cloudApi.customAccountPropertyFactory(
            'showSidebarState',
            email,
            { showSidebarState: true },
        );
    }
    changeOrgEffect = effect(() => {
        this.currentOrganization$$();
        untracked(() => this.fetchParentInfoOnLoad());
    });

    private fetchParentInfoOnLoad(): void {
        const currentOrg = this.currentOrganization$$();
        if (currentOrg?.channelPartner && currentOrg.channelPartner !== '**REDACTED**') {
            this.store.dispatch(
                CPActions.loadCurrentParentPartnerForChild({
                    parentId: currentOrg.channelPartner,
                }),
            );
        } else {
            this.store.dispatch(
                CPActions.setCurrentParentPartnerForChild({
                    parentPartnerForCurrentChild: null,
                }),
            );
        }
    }

    ngOnDestroy(): void {
        const parentPartner = this.parentPartner$$();
        if (
            parentPartner?.parentChannelPartner &&
            parentPartner.parentChannelPartner !== '**REDACTED**'
        ) {
            this.store.dispatch(
                CPActions.loadCurrentParentPartnerForChild({
                    parentId: parentPartner.parentChannelPartner,
                }),
            );
        } else {
            this.store.dispatch(
                CPActions.setCurrentParentPartnerForChild({
                    parentPartnerForCurrentChild: null,
                }),
            );
        }
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
                switchMap(async id => {
                    const loadedOrg =
                        this.currentOrganization$$() ||
                        this.organizations$$().find(o => o.id === id);

                    if (loadedOrg) {
                        return loadedOrg;
                    }

                    return firstValueFrom(this.cpService.getOrganization(id))
                        .then(fetchedOrg => {
                            this.store.dispatch(
                                CPActions.addOrganizations({ organizations: [fetchedOrg] }),
                            );
                            return fetchedOrg;
                        })
                        .catch(err => {
                            console.error(err);
                        });
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(currentOrg => {
                if (!currentOrg) {
                    this.isLoading = false;
                    return;
                }
                this.isValidOrg = true;

                this.cpService.getSelfChannelPartnerUser(currentOrg?.channelPartner).subscribe({
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

    openTutorial(): void {
        this.dialogsService.addSystemTutorial();
    }
    excludeLast = <T>(items: T[]): T[] => items.slice(0, -1);
}
