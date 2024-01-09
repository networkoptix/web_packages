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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Subject, combineLatestWith, debounceTime, distinctUntilChanged, map } from 'rxjs';
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
    selectCurrentSystems,
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
    hasEnoughGroupsOrSystems$$ = computed(() => {
        return (
            this.currentGroups$$().length + this.currentSystems$$().length >
            searchConfig.channelPartners.searchMinimumCards
        );
    });
    hasGroups$$ = this.store.selectSignal<boolean>(selectHasGroups);
    currentGroupId$$ = this.store.selectSignal<string>(selectCurrentGroupId);
    currentGroup$$ = this.store.selectSignal<GroupItem>(selectCurrentGroup);
    currentGroups$$ = this.store.selectSignal<GroupItem[]>(selectCurrentGroups);
    filteredGroups: GroupItem[];
    currentOrgId$$ = this.store.selectSignal<string>(selectCurrentOrgId);
    search = { value: '' };
    searchChanged = new Subject<void>();
    currentSystems$$ = this.store.selectSignal(selectCurrentSystems);
    filteredSystems$: SystemItem[];
    systemMap$ = this.systemsService.systemsSubject.pipe(
        map(systems => new Map(systems?.map(sys => [sys.id, sys]))),
    );
    groupItems$$ = this.store.selectSignal(selectGroupItems);
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
            const groups = this.currentGroups$$();
            if (this.inRoot) {
                this.cpService
                    .getOrgSystems(this.currentOrgId$$())
                    .pipe(combineLatestWith(this.systemMap$))
                    .subscribe(([orgSystems, systemMap]) => {
                        const systems = orgSystems.map(sys => ({
                            ...sys,
                            type: OrgCardItem.SYSTEM,
                            name: systemMap.get(sys.systemId)?.name,
                        }));
                        this.store.dispatch(GroupActions.setSystems({ systems }));
                        this.searchSystems(systems, groups);
                    });
            } else {
                this.cpService
                    .getGroup(this.currentGroupId$$())
                    .pipe(combineLatestWith(this.systemMap$))
                    .subscribe(([group, systemMap]) => {
                        const systems = group.systems.map(systemId => ({
                            systemId,
                            name: systemMap.get(systemId)?.name,
                            type: OrgCardItem.SYSTEM,
                        }));
                        this.store.dispatch(GroupActions.setSystems({ systems }));
                        this.searchSystems(systems, groups);
                    });
            }
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
        if (!event.isPointerOverContainer || event.container === event.previousContainer) {
            return;
        }
        const dragged = event.item.data;
        const droppedOn = event.container.data;
        if (dragged.type === OrgCardItem.GROUP) {
            this.cpService
                .patchGroup(dragged.id, { parentId: droppedOn.id })
                .subscribe(updatedGroup => {
                    // Use ngrx effect to update store
                    const groups: GroupItem[] = [...this.groupItems$$()];
                    const parentId = dragged.parentId;
                    if (parentId) {
                        const parentIndex = groups?.findIndex(group => group.id === parentId);
                        const parent = structuredClone(groups[parentIndex]);
                        parent.children = parent.children.filter(child => child.id !== dragged.id);
                        groups[parentIndex] = parent;
                    }
                    const droppedOnGroup = structuredClone(droppedOn);
                    if (droppedOnGroup.children) {
                        droppedOnGroup.children.push(updatedGroup);
                    } else {
                        droppedOnGroup.children = [updatedGroup];
                    }
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
                    const systems = this.currentSystems$$().filter(
                        sys => sys.systemId !== dragged.systemId,
                    );
                    this.store.dispatch(GroupActions.setSystems({ systems }));
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

    searchSystems(
        currentSystems = this.currentSystems$$(),
        currentGroups = this.currentGroups$$(),
    ): void {
        const search = this.search.value;
        if (search) {
            if (currentGroups) {
                this.filteredGroups = currentGroups.filter(system =>
                    caseInsenstiveSearch(system.name, search),
                );
            }

            if (currentSystems) {
                this.filteredSystems$ = currentSystems.filter(system =>
                    caseInsenstiveSearch(system.name as string, search),
                );
            }
        } else {
            this.filteredGroups = currentGroups;
            this.filteredSystems$ = currentSystems;
        }
    }

    setSearch(model: { query: string }): void {
        this.search.value = model.query;
        this.searchChanged.next();
    }
}
