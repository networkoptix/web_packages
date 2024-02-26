import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, map } from 'rxjs';
import stringify from 'safe-stable-stringify';

import {
    selectCurrentOrgId,
    selectCurrentOrganization,
} from '@common/store/channel-partners/channel-partners.selectors';
import { ActionItems } from '@components/dropdowns/three-dot/three-dot.component.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxCardComponent } from '@pages/home/components/card/card.component';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    CloudSystem,
    GroupItem,
    OrgCardItem,
    OrgPermissions,
    Organization,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemsService } from '@services/systems.service';
import { NxVmsClientService } from '@services/vms-client.service';
import { caseInsenstiveSearch } from '@utils/general';
import { search as searchConfig, icons } from '@variables/static-variables';

import { NxNoSystemsCardsComponent } from '../../components/no-systems/no-systems.component';
import { NxSystemCardComponent } from '../../components/system-card/system-card.component';
import * as GroupActions from '../../store/groups/groups.actions';
import {
    selectCurrentGroupId,
    selectCurrentGroups,
    selectCurrentSystems,
    selectGroupItems,
    selectHasGroups,
    selectOpenGroups,
    selectRootGroups,
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
        RouterLink,
    ],
})
export class NxOrganizationCardContainerComponent {
    LANG = staticLang;
    icons = icons;
    searchConfig = searchConfig;
    @Input({ transform: booleanAttribute }) inRoot: boolean;
    canCreateGroups$$ = computed(() => {
        const currOrg$$ = this.store.selectSignal(selectCurrentOrganization);
        return currOrg$$()?.ownPermissions.includes(OrgPermissions.MANAGE_SYSTEMS);
    });
    hasEnoughGroupsOrSystems$$ = computed(() => {
        return (
            this.currentGroups$$().length + this.currentSystems$$().length >
            searchConfig.channelPartners.searchMinimumCards
        );
    });
    hasGroups$$ = this.store.selectSignal<boolean>(selectHasGroups);
    openGroups$$ = this.store.selectSignal(selectOpenGroups);
    rootGroups$$ = this.store.selectSignal<GroupItem[]>(selectRootGroups);
    currentGroupId$$ = this.store.selectSignal<string>(selectCurrentGroupId);
    currentGroups$$ = this.store.selectSignal<GroupItem[]>(selectCurrentGroups);
    currentOrg$$ = this.store.selectSignal<Organization>(selectCurrentOrganization);
    currentOrgId$$ = this.store.selectSignal<string>(selectCurrentOrgId);
    search = { value: '' };
    currentSystems$$ = this.store.selectSignal(selectCurrentSystems);
    filteredSystems$: SystemItem[];
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
        protected route: ActivatedRoute,
        private router: Router,
        private cpService: NxChannelPartnersService,
        private systemsService: NxSystemsService,
        private translateService: TranslateService,
        private vmsService: NxVmsClientService,
    ) {
        this.cpService.paramStateHandler.state$
            .pipe(distinctUntilChanged((a, b) => stringify(a) === stringify(b)))
            .subscribe(({ params: { groupId } }) => {
                this.store.dispatch(GroupActions.setCurrentGroupId({ currentGroupId: groupId }));
            });

        effect(() => {
            const currentOrgId = this.currentOrgId$$();
            const currentGroupID = this.currentGroupId$$();
            if (this.inRoot && currentOrgId) {
                this.cpService.getOrgSystems(currentOrgId).subscribe(orgSystems => {
                    const systemMap = this.systemMap$$();
                    const systems = orgSystems.map(sys => ({
                        ...sys,
                        type: OrgCardItem.SYSTEM,
                        name: systemMap.get(sys.systemId)?.name,
                    }));
                    this.store.dispatch(GroupActions.setSystems({ systems }));
                });
            } else if (currentGroupID) {
                this.cpService.getGroup(currentGroupID).subscribe(group => {
                    const systemMap = this.systemMap$$();
                    const systems = group.systems.map(systemId => ({
                        systemId,
                        name: systemMap.get(systemId)?.name,
                        type: OrgCardItem.SYSTEM,
                    }));
                    this.store.dispatch(GroupActions.setSystems({ systems }));
                });
            }
        });

        this.search.value = this.route.snapshot.queryParams.search;
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
                    this.updateGroup(updatedGroup, dragged);
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
        const currGroupId = this.currentGroupId$$();
        this.dialogsService
            .createSystemGroup({
                parentGroup: currGroupId,
                orgId: this.currentOrgId$$(),
                hasGroups: this.hasGroups$$(),
            })
            .then(group => {
                if (group) {
                    const groups = structuredClone(this.groupItems$$()) || [];
                    if (group.parentId) {
                        const currGroupIndex = groups.findIndex(group => group.id === currGroupId);
                        groups[currGroupIndex] = {
                            ...groups[currGroupIndex],
                            children: [...groups[currGroupIndex].children, group],
                        };
                    } else {
                        groups.push(group);
                    }
                    this.store.dispatch(GroupActions.setGroups({ groups }));
                }
            });
    }

    handleGroupClick(group: GroupItem): void {
        const route = ['group', group.id];
        this.router.navigate(route, { relativeTo: this.route.parent }).then(_ => {
            const groups = { ...this.openGroups$$() };
            groups[group.id] = true;
            this.store.dispatch(GroupActions.setOpenGroups({ openGroups: groups }));
        });
    }

    handleSystemClick(system: CloudSystem | SystemItem): void {
        this.router.navigate(['systems', system.systemId]);
    }

    search$$ = toSignal<string>(this.route.queryParams.pipe(map(({ search }) => search)));
    filteredGroups$$ = computed(() => {
        const search = this.search$$();
        const groups = this.currentGroups$$();
        if (!search) {
            return groups;
        }
        return groups.filter(group => caseInsenstiveSearch(group.name, search));
    });
    filteredSystems$$ = computed(() => {
        const search = this.search$$();
        const systems = this.currentSystems$$();
        if (!search) {
            return systems;
        }
        return systems.filter(system => caseInsenstiveSearch(system.name, search));
    });
    groupActions$$ = computed<Record<string, ActionItems[]>>(() => {
        const groups = this.currentGroups$$() || [];
        const renameAction = this.translateService.instant(
            staticLang.channelPartners.orgs.groupAction.rename,
        );
        const moveToAction = this.translateService.instant(
            staticLang.channelPartners.orgs.groupAction.moveTo,
        );
        const deleteAction = this.translateService.instant(
            staticLang.channelPartners.orgs.groupAction.delete,
        );
        return groups.reduce((groupActions, group) => {
            groupActions[group.id] = [
                {
                    name: moveToAction,
                    id: group.id,
                    action: () => {
                        this.dialogsService
                            .moveOrgItem({
                                item: group,
                                organization: this.currentOrg$$(),
                                groups: this.rootGroups$$(),
                            })
                            .then(newGroup => {
                                if (newGroup && 'parentId' in newGroup) {
                                    const processedGroup = {
                                        ...group,
                                        ...newGroup,
                                        children: group.children,
                                    };
                                    this.updateGroup(processedGroup, group);
                                }
                            });
                    },
                },
                {
                    name: renameAction,
                    id: group.id,
                    action: () => {
                        this.dialogsService.updateGroupName(group.id).then(updatedGroup => {
                            const groups = [...this.groupItems$$()];
                            const currGroupIndex = groups.findIndex(gr => gr.id === group.id);
                            groups[currGroupIndex] = updatedGroup;
                            this.store.dispatch(GroupActions.setGroups({ groups }));
                        });
                    },
                },
                {
                    name: deleteAction,
                    id: group.id,
                    action: () => {
                        this.dialogsService
                            .confirm({
                                title: deleteAction,
                                footer: {
                                    actionLabel: deleteAction,
                                    cancelLabel: staticLang.channelPartners.orgs.groupAction.cancel,
                                    buttonClass: 'btn-danger',
                                },
                                message: this.translateService.instant(
                                    staticLang.channelPartners.orgs.groupAction.deleteMessage,
                                    { folderName: group.name },
                                ),
                            })
                            .then(confirm => {
                                if (confirm) {
                                    this.cpService.deleteGroup(group.id).subscribe(
                                        deletedGroup => {
                                            const groups = this.groupItems$$()?.filter(
                                                obj => obj.id !== group.id,
                                            );
                                            if (groups) {
                                                this.store.dispatch(
                                                    GroupActions.setGroups({ groups }),
                                                );
                                            }
                                        },
                                        () => {
                                            // TODO: Waiting for direction from design on error handling//
                                        },
                                    );
                                }
                            });
                    },
                },
            ];
            return groupActions;
        }, {});
    });
    systemActions$$ = computed<Record<string, ActionItems[]>>(() => {
        const systems = this.currentSystems$$() || [];
        const openVms = this.translateService.instant('Open in %VMS_NAME%');
        const moveToAction = this.translateService.instant(
            staticLang.channelPartners.orgs.groupAction.moveTo,
        );
        return systems.reduce((systemActions, system) => {
            systemActions[system.systemId] = [
                {
                    name: moveToAction,
                    id: system.systemId,
                    action: () => {
                        this.dialogsService
                            .moveOrgItem({
                                item: system,
                                organization: this.currentOrg$$(),
                                groups: this.rootGroups$$(),
                            })
                            .then(_ => {
                                const currSystems = [...this.currentSystems$$()];
                                const updatedSystems = currSystems.filter(
                                    sys => sys.systemId !== system.systemId,
                                );
                                this.store.dispatch(
                                    GroupActions.setSystems({ systems: updatedSystems }),
                                );
                            });
                    },
                },
                {
                    name: openVms,
                    id: system.systemId,
                    action: this.protocolFactory(system.systemId, true),
                },
            ];
            return systemActions;
        }, {});
    });

    protocolFactory = (id: string, useRest: boolean) => () =>
        this.vmsService.openClient({ id, useRest });

    updateGroup = (updatedGroup: GroupItem, oldGroup: GroupItem): void => {
        const groups: GroupItem[] = [...this.groupItems$$()];
        const movedToGroup = groups.find(group => group.id === updatedGroup.parentId);
        const parentId = oldGroup.parentId;
        if (parentId) {
            const parentIndex = groups.findIndex(group => group.id === parentId);
            const parent = structuredClone(groups[parentIndex]);
            parent.children = parent.children.filter(child => child.id !== updatedGroup.id);
            groups[parentIndex] = parent;
        }
        if (movedToGroup) {
            const droppedOnGroup = structuredClone(movedToGroup);
            if (droppedOnGroup.children) {
                droppedOnGroup.children.push(updatedGroup);
            } else {
                droppedOnGroup.children = [updatedGroup];
            }
            const droppedOnIndex = groups?.findIndex(gr => gr.id === movedToGroup.id);
            groups[droppedOnIndex] = droppedOnGroup;
        }
        const movedGroupIndex = groups.findIndex(gr => gr.id === oldGroup.id);
        groups[movedGroupIndex] = updatedGroup;
        this.store.dispatch(GroupActions.setGroups({ groups }));
    };
}
