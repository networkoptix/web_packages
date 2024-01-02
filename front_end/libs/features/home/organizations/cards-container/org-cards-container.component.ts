import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import {
    Component,
    DestroyRef,
    Input,
    booleanAttribute,
    computed,
    effect,
    inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Observable, Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';
import stringify from 'safe-stable-stringify';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxCardComponent } from '@pages/home/components/card/card.component';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    selectCurrentOrgId,
    selectCurrentOrganization,
} from '@pages/home/store/channel-partners/channel-partners.selectors';
import {
    CloudSystem,
    GroupItem,
    OrgCardItem,
    OrgPermissions,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemsService } from '@services/systems.service';
import { caseInsenstiveSearch } from '@utils/general';
import { search as searchConfig, icons } from '@variables/static-variables';

import { NxNoSystemsCardsComponent } from '../../components/no-systems/no-systems.component';
import { NxSystemCardComponent } from '../../components/system-card/system-card.component';
import * as GroupActions from '../../store/groups/groups.actions';
import {
    selectCurrentGroup,
    selectCurrentGroupId,
    selectCurrentGroups,
    selectGroupItems,
    selectHasGroups,
} from '../../store/groups/groups.selectors';
@Component({
    selector: 'nx-org-cards-container',
    templateUrl: 'org-cards-container.component.html',
    styleUrls: ['org-cards-container.component.scss'],
    standalone: true,
    imports: [
        TranslateModule,
        CdkMenuModule,
        CommonModule,
        NxSystemCardComponent,
        DragDropModule,
        NxNoSystemsCardsComponent,
        NxCardComponent,
        AngularSvgIconModule,
        NxPreLoaderComponent,
        RouterOutlet,
        NxSearchComponent,
        FormsModule,
    ],
})
export class NxOrganizationCardContainerComponent {
    LANG = staticLang;
    icons = icons;
    searchConfig = searchConfig;
    destroyRef = inject(DestroyRef);
    @Input({ transform: booleanAttribute }) inRoot: boolean;
    canCreateGroups$$ = computed(() => {
        const currOrg = this.store.selectSignal(selectCurrentOrganization);
        return currOrg()?.ownPermissions.includes(OrgPermissions.MANAGE_SYSTEMS);
    });
    hasEnoughGroups$$ = computed(() => {
        return this.currentGroups$$().length > searchConfig.channelPartners.searchMinimumCards;
    });
    hasGroups$$ = this.store.selectSignal<boolean>(selectHasGroups);
    currentGroupId$$ = this.store.selectSignal<string>(selectCurrentGroupId);
    currentGroup$$ = this.store.selectSignal<GroupItem>(selectCurrentGroup);
    currentGroups$$ = this.store.selectSignal<GroupItem[]>(selectCurrentGroups);
    filteredGroups: GroupItem[];
    currentOrgId$$ = this.store.selectSignal<string>(selectCurrentOrgId);
    currentSystems$: Observable<SystemItem[]>;
    filteredSystems$: Observable<SystemItem[]>;
    search = { value: '' };
    searchChanged = new Subject<void>();
    systemsFromSubject$$ = toSignal(this.systemsService.systemsSubject);
    groupItems$$ = this.store.selectSignal(selectGroupItems);
    systemMap$$ = computed(() => {
        const systems = this.systemsFromSubject$$();
        return new Map(systems?.map(sys => [sys.id, sys]));
    });

    isLoading = true;
    constructor(
        private store: Store,
        private dialogsService: NxDialogsService,
        private route: ActivatedRoute,
        private router: Router,
        private cpService: NxChannelPartnersService,
        private systemsService: NxSystemsService,
    ) {
        this.cpService.paramStateHandler.state$
            .pipe(distinctUntilChanged((a, b) => stringify(a) === stringify(b)))
            .subscribe(({ params: { groupId } }) => {
                this.store.dispatch(GroupActions.setCurrentGroupId({ currentGroupId: groupId }));
            });

        effect(() => {
            const systemMap = this.systemMap$$();
            this.currentSystems$ = this.inRoot
                ? this.cpService.getOrgSystems(this.currentOrgId$$()).pipe(
                      map(orgSystems =>
                          orgSystems.map(sys => ({
                              ...sys,
                              type: OrgCardItem.SYSTEM,
                              name: systemMap.get(sys.systemId)?.name,
                          })),
                      ),
                  )
                : this.cpService.getGroup(this.currentGroupId$$()).pipe(
                      map(group => {
                          return group.systems.map(systemId => {
                              return {
                                  systemId,
                                  name: systemMap.get(systemId)?.name,
                                  type: OrgCardItem.SYSTEM,
                              };
                          });
                      }),
                  );
        });

        this.searchChanged
            .pipe(debounceTime(this.searchConfig.debounceTime), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.searchSystems();
            });

        this.search.value = this.route.snapshot.queryParams.search;
        this.searchSystems();
    }

    trackGroup(_index: number, item: GroupItem): string {
        return item.id;
    }

    trackSystem(_index: number, item: CloudSystem | SystemItem): string {
        return item.systemId;
    }

    onDrop(event: CdkDragDrop<GroupItem, GroupItem, GroupItem>): void {
        const dragged = event.item.data;
        const droppedOn = event.container.data;
        if (!event.isPointerOverContainer || dragged.id === droppedOn.id) {
            return;
        }
        if (dragged.type === OrgCardItem.GROUP) {
            this.cpService
                .patchGroup(dragged.id, { parentId: droppedOn.id })
                .subscribe(updatedGroup => {
                    // Use ngrx effect to update store
                    const groups: GroupItem[] = [...this.groupItems$$()];
                    const parentId = dragged.parentId;
                    if (parentId) {
                        const parent = Object.assign(
                            {},
                            groups.find(group => group.id === parentId),
                        );
                        if (parent) {
                            parent.children = [
                                ...parent.children.filter(child => child.id !== dragged.id),
                            ];
                        }
                        const parentIndex = groups?.findIndex(group => group.id === parentId);
                        groups[parentIndex] = parent;
                    }
                    const droppedOnGroup = Object.assign(
                        {},
                        groups.find(group => group.id === droppedOn.id),
                    );
                    droppedOnGroup.children = [...droppedOnGroup?.children, updatedGroup];
                    const droppedOnIndex = groups?.findIndex(group => group.id === droppedOn.id);
                    groups[droppedOnIndex] = droppedOnGroup;

                    const movedGroupIndex = groups.findIndex(group => group.id === dragged.id);
                    groups[movedGroupIndex] = updatedGroup;
                    this.store.dispatch(GroupActions.setGroups({ groups }));
                });
        } else if (dragged.type === OrgCardItem.SYSTEM) {
            this.cpService
                .updateSystemGroup(dragged.systemId, { groupId: droppedOn.id })
                .subscribe(() => {
                    this.currentSystems$ = this.currentSystems$.pipe(
                        map(systems => systems.filter(system => system.systemId !== dragged.id)),
                    );
                });
        }
    }

    newGroupDialog(): void {
        this.dialogsService.createSystemGroup({
            parentGroup: this.currentGroupId$$(),
            orgId: this.currentOrgId$$(),
            hasGroups: this.hasGroups$$(),
        });
    }

    handleGroupClick(group: GroupItem): void {
        const route = ['group', group.id];
        this.router.navigate(route, { relativeTo: this.route.parent });
    }

    handleSystemClick(system: CloudSystem | SystemItem): void {
        this.router.navigate(['systems', system.systemId]);
    }

    searchSystems(): void {
        const search = this.search.value;
        if (search) {
            if (this.currentGroups$$()) {
                this.filteredGroups = this.currentGroups$$().filter(system =>
                    caseInsenstiveSearch(system.name, search),
                );
            }

            if (this.currentSystems$) {
                this.filteredSystems$ = this.currentSystems$.pipe(
                    map(res => res.filter(system => caseInsenstiveSearch(system.name, search))),
                );
            }
        } else {
            this.filteredGroups = this.currentGroups$$();
            this.filteredSystems$ = this.currentSystems$;
        }
    }

    setSearch(model: { query: string }): void {
        this.search.value = model.query;
        this.searchChanged.next();
    }
}
