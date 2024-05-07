import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, booleanAttribute, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { groupBy, identity, zip } from 'lodash-es';
import { firstValueFrom, map, switchMap } from 'rxjs';

import {
    selectCurrentOrganization,
    selectCurrentPartner,
} from '@common/store/channel-partners/channel-partners.selectors';
import { ActionItems } from '@components/dropdowns/three-dot/three-dot.component.types';
import { NxHidableModule } from '@components/hidable/hidable.module';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderNoItemsComponent } from '@components/placeholdersV2/page/no-items/page-placeholder.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { DIALOG_SIZE } from '@dialogs/dialog-config-v2';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { NxCardComponent } from '@pages/home/components/card/card.component';
import type { DraggableItem } from '@pages/home/home.types';
import { flattenGroups } from '@pages/home/store/groups/groups-utils';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { PipesModule } from '@pipes/pipes.module';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    CloudSystem,
    GroupItem,
    GroupUser,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxUrlProtocolService } from '@services/url-protocol.service';
import { alphabeticalSort, caseInsenstiveSearch } from '@utils/general';
import { search as searchConfig, icons } from '@variables/static-variables';

import { NxNoSystemsCardsComponent } from '../../components/no-systems/no-systems.component';

@Component({
    selector: 'nx-org-cards-container',
    templateUrl: 'org-cards-container.component.html',
    styleUrls: ['org-cards-container.component.scss'],
    standalone: true,
    imports: [
        TranslateModule,
        CdkMenuModule,
        CommonModule,
        DragDropModule,
        NxNoSystemsCardsComponent,
        NxCardComponent,
        AngularSvgIconModule,
        NxPreLoaderComponent,
        RouterOutlet,
        NxSearchComponent,
        FormsModule,
        RouterLink,
        NxTagComponent,
        PipesModule,
        NxPagePlaceholderNoItemsComponent,
        NxSearchHighlightComponent,
        NxHidableModule,
        NxResizeObserver,
        NxPagePlaceholderV2Component,
    ],
})
export class NxOrganizationCardContainerComponent {
    groupsStore = inject(GroupsStore);
    channelPartnersRouteStore = inject(ChannelPartnersRouteState);

    LANG = staticLang;
    icons = icons;
    PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;
    searchConfig = searchConfig;
    @Input({ transform: booleanAttribute }) inRoot: boolean;

    stickyHeading = true;
    permissionsStore = inject(PermissionsStore);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);
    openServices$$ = computed(() => {
        const currentOrg = this.currentOrg$$();
        return (
            currentOrg?.channelPartner === this.currentPartner$$()?.id &&
            currentOrg?.channelPartnerAccessLevel === null
        );
    });
    canManageSystems$$ = this.permissionsStore.canManageSystems$$;

    hasEnoughGroupsOrSystems$$ = computed(() => {
        return (
            this.groupsStore.totalOrgGroupsOrSystems$$() >
            searchConfig.channelPartners.searchMinimumCards
        );
    });

    noGroupsOrSystems$$ = computed(() => {
        return (
            !this.groupsStore.currentGroups$$().length &&
            !this.groupsStore.currentSystems$$()?.length
        );
    });
    groupName: string = '';

    constructor(
        private store: Store,
        private dialogsService: NxDialogsService,
        protected route: ActivatedRoute,
        private router: Router,
        private cpService: NxChannelPartnersService,
        private translateService: TranslateService,
        private urlProtocol: NxUrlProtocolService,
    ) {}

    trackGroup(_index: number, item: GroupItem): string {
        return item.id;
    }

    trackSystem(_index: number, item: CloudSystem | SystemItem): string {
        return item.systemId;
    }

    onDrop(event: CdkDragDrop<GroupItem, DraggableItem, DraggableItem>): void {
        if (!event.isPointerOverContainer || event.container === event.previousContainer) {
            return;
        }
        const dragged = event.item.data;
        const droppedOn = event.container.data;
        this.groupsStore.moveItem(dragged, droppedOn).subscribe();
    }

    newGroupDialog(): void {
        const { organizationId, groupId } = this.cpService.paramStateHandler.state$$().params || {};
        this.dialogsService
            .createSystemGroup({
                parentGroup: groupId!,
                orgId: organizationId!,
                parentGroupName: this.groupName,
            })
            .then(group => {
                if (group) {
                    this.groupsStore.addItemWithUndo(group);
                }
            });
    }

    #groupUsers: Record<string, Promise<GroupUser[]> | null> = {};

    getGroupUsers(groupId: string, clearExisting = true): Promise<GroupUser[]> {
        if (!this.#groupUsers[groupId] || clearExisting) {
            this.#groupUsers[groupId] = firstValueFrom(this.cpService.getGroupUsers(groupId)).catch(
                () => {
                    this.#groupUsers[groupId] = null;
                    return [];
                },
            );
        }

        return this.#groupUsers[groupId] as Promise<GroupUser[]>;
    }

    search$$ = toSignal<string>(this.route.queryParams.pipe(map(({ search }) => search)));
    currentGroupGroupsSearchResults$$ = computed(() => {
        const search = this.search$$();
        const groups = this.groupsStore.currentGroups$$();
        if (!search) {
            return groups;
        }
        return Object.values(groups.filter(group => caseInsenstiveSearch(group.name, search)));
    });

    currentOrganizationGroupsSearchResults$$ = computed(() => {
        const search = this.search$$();
        const groups = this.groupsStore.groupsEntities();
        if (!search) {
            return groups;
        }

        const currentFolderResults = this.currentGroupGroupsSearchResults$$().map(({ id }) => id);
        return Object.values(flattenGroups(groups))
            .filter(({ id }) => !currentFolderResults.includes(id))
            .map(group => ({ ...group, children: [] }))
            .filter(group => caseInsenstiveSearch(group.name, search));
    });

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    mapSearchResults = (groups: GroupItem[], systems: SystemItem[]) => {
        const paths = this.groupsStore.groupPathMap$$();
        const groupsFlatMap = this.groupsStore.groupFlatMap$$();
        const currentOrg = this.currentOrg$$();
        const orgName = currentOrg?.name || '';

        const getParentId = (id: string | null): string | null =>
            id ? groupsFlatMap[id]?.parentId : null;

        const groupMatches = groups.map(group => {
            const parentId = getParentId(group.id);
            const pathInfo = parentId ? paths[parentId] : null;
            const path = pathInfo ? `${orgName} ${pathInfo.pathString}` : orgName;
            return {
                path,
                pathParents: pathInfo ? pathInfo.path : [],
                system: null,
                group,
            };
        });
        const systemMatches = systems.map(system => {
            const parentId = system.groupId;
            const pathInfo = parentId ? paths[parentId] : null;
            const path = pathInfo ? `${orgName} ${pathInfo.pathString}` : orgName;
            return {
                path,
                pathParents: pathInfo ? pathInfo.path : [],
                system,
                group: null,
            };
        });
        const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue =>
            value !== null && value !== undefined;
        return Object.entries(groupBy([...groupMatches, ...systemMatches], 'path'))
            .map(([path, groups]) => ({
                path,
                pathParents: groups[0].pathParents,
                groups: groups
                    .map(({ group }) => group)
                    .filter(notEmpty)
                    .sort(alphabeticalSort(group => group.name)),
                systems: groups
                    .map(({ system }) => system)
                    .filter(notEmpty)
                    .sort(alphabeticalSort(system => system.name)),
            }))
            .filter(({ groups, systems }) => groups.length || systems.length)
            .sort((a, b) => {
                const aParents = a.pathParents.map(({ name }) => name);
                const bParents = b.pathParents.map(({ name }) => name);
                const zipped = zip(aParents, bParents);
                const [first = '', second = ''] =
                    zipped.find(([aParent, bParent]) => aParent !== bParent) || [];
                return alphabeticalSort(identity)(first, second);
            })
            .map(result => ({
                ...result,
                matches: result.systems.length + result.groups.length,
            }));
    };

    currentOrganizationResults$$ = computed(() =>
        this.mapSearchResults(
            this.currentOrganizationGroupsSearchResults$$(),
            this.currentOrganizationSystemsSearchResults$$(),
        ),
    );

    currentFolderResults$$ = computed(() =>
        this.mapSearchResults(
            this.currentGroupGroupsSearchResults$$(),
            this.currentGroupSystemsSearchResults$$(),
        ),
    );

    getCount = (results: { matches: number }[]): number =>
        results.reduce((acc, { matches }) => acc + matches, 0);

    currentFolderResultsCount$$ = computed(() => this.getCount(this.currentFolderResults$$()));

    currentOrganizationResultsCount$$ = computed(() =>
        this.getCount(this.currentOrganizationResults$$()),
    );

    totalResults$$ = computed(
        () => this.currentFolderResultsCount$$() + this.currentOrganizationResultsCount$$(),
    );

    systemsSearchResults$$ = computed(() => {
        const search = this.search$$();

        if (!search) {
            return {
                current: [],
                other: [],
            };
        }

        const currentGroup = this.groupsStore.currentGroupId$$();
        const allOrgSystems = this.groupsStore
            .allOrgSystems$$()
            .filter(system => caseInsenstiveSearch(system.name, search));

        return allOrgSystems.reduce(
            (acc, system) => {
                const inCurrentGroup = currentGroup.isRoot
                    ? !system.groupId
                    : system.groupId === currentGroup.id;
                if (inCurrentGroup) {
                    acc.current.push(system);
                } else {
                    acc.other.push(system);
                }
                return acc;
            },
            { current: [] as SystemItem[], other: [] as SystemItem[] },
        );
    });

    systemSearchResultsFactory =
        (
            resultsFor: keyof ReturnType<
                NxOrganizationCardContainerComponent['systemsSearchResults$$']
            >,
        ) =>
        () =>
            this.search$$()
                ? this.systemsSearchResults$$()[resultsFor]
                : this.groupsStore.currentSystems$$();

    /**
     * Placeholder until endpoint is updated
     */
    currentGroupSystemsSearchResults$$ = computed<SystemItem[]>(
        this.systemSearchResultsFactory('current'),
    );

    /**
     * Placeholder until endpoint is updated
     */
    currentOrganizationSystemsSearchResults$$ = computed<SystemItem[]>(
        this.systemSearchResultsFactory('other'),
    );

    groupActions$$ = computed<Record<string, ActionItems[]>>(() => {
        const groups = this.groupsStore.currentGroups$$() || [];
        if (!this.canManageSystems$$()) {
            return groups.reduce((groupActions, { id }) => ({ ...groupActions, [id]: [] }), {});
        }
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
                            .moveGroupItem({
                                item: group,
                                organization: this.currentOrg$$(),
                                groups: this.groupsStore.groupsEntities(),
                            })
                            .then(newGroup => {
                                if (newGroup) {
                                    this.groupsStore.moveItemWithUndo(group, {
                                        id: newGroup.parentId,
                                    });
                                }
                            });
                    },
                },
                {
                    name: renameAction,
                    id: group.id,
                    action: () => {
                        this.dialogsService.updateGroupName(group.id).then(updatedGroup => {
                            if (updatedGroup) {
                                this.groupsStore.renameItemWithUndo(group.id, updatedGroup.name);
                            }
                        });
                    },
                },
                {
                    name: deleteAction,
                    id: group.id,
                    action: async () => {
                        const groupUsers = await this.getGroupUsers(group.id, false);
                        const warning =
                            groupUsers.length && group.systemCount
                                ? ({
                                      type: 'warning',
                                      title: staticLang.channelPartners.orgs.groupAction
                                          .deleteWarning.title,
                                      message: {
                                          value: staticLang.channelPartners.orgs.groupAction
                                              .deleteWarning.message,
                                          params: {
                                              systemCount: group.systemCount.toString(),
                                              userCount: groupUsers.length.toString(),
                                          },
                                      },
                                  } as const)
                                : undefined;
                        this.dialogsService
                            .confirm(
                                {
                                    title: deleteAction,
                                    warning,
                                    footer: {
                                        actionLabel: deleteAction,
                                        cancelLabel:
                                            staticLang.channelPartners.orgs.groupAction.cancel,
                                        buttonClass: 'btn-danger',
                                    },
                                    message: this.translateService.instant(
                                        staticLang.channelPartners.orgs.groupAction.deleteMessage,
                                        {
                                            folderName: `<span class=\"text-contrast-bold\">${group.name}</span>`,
                                        },
                                    ),
                                },
                                { width: DIALOG_SIZE.MICRO_SMALL },
                            )
                            .then(confirm => {
                                if (confirm) {
                                    const currentOrgId =
                                        this.cpService.paramStateHandler.state$$().params
                                            .organizationId!;
                                    const systemsSource = this.inRoot
                                        ? this.cpService.getOrgSystems(currentOrgId)
                                        : this.cpService.getGroup(group.parentId);
                                    this.cpService
                                        .deleteGroup(group.id)
                                        .pipe(switchMap(() => systemsSource))
                                        .subscribe(
                                            res => {
                                                this.groupsStore.deleteGroupWithUndo(
                                                    group.id,
                                                    currentOrgId,
                                                );
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
        const systems = this.groupsStore.currentSystems$$() || [];
        const canMangeSystems = this.canManageSystems$$();
        const openVms = this.translateService.instant('Open in %VMS_NAME%');
        const moveToAction = this.translateService.instant(
            staticLang.channelPartners.orgs.groupAction.moveTo,
        );
        return systems.reduce((systemActions, system) => {
            const actions: ActionItems[] = [];
            if (system.stateOfHealth === 'online') {
                actions.push({
                    name: openVms,
                    id: system.systemId,
                    action: this.protocolFactory(system.systemId, true),
                });
            }
            if (canMangeSystems) {
                actions.unshift({
                    name: moveToAction,
                    id: system.systemId,
                    action: () => {
                        this.dialogsService
                            .moveSystemItem({
                                item: system,
                                organization: this.currentOrg$$(),
                                groups: this.groupsStore.groupsEntities(),
                            })
                            .then(newSystem => {
                                if (newSystem) {
                                    this.groupsStore.moveItemWithUndo(system, {
                                        id: newSystem.groupId,
                                    });
                                }
                            });
                    },
                });
            }
            systemActions[system.systemId] = actions;
            return systemActions;
        }, {});
    });

    protocolFactory = (id: string, useRest: boolean) => () =>
        this.urlProtocol.open(id, useRest).catch(() =>
            this.dialogsService
                .confirm({
                    title: this.LANG.dialogs.titles.noClientDetected,
                    message: this.LANG.errorCodes.cantOpenClient,
                    footer: {
                        actionLabel: this.LANG.dialogs.buttons.download,
                        cancelLabel: this.LANG.dialogs.buttons.cancel,
                    },
                })
                .then(result => {
                    if (result) {
                        this.router.navigate(['/download']).catch(error => {
                            console.error(error);
                        });
                    }
                }),
        );

    @HostBinding('style.--channel-partners-header-height') headerHeight = '324px';

    updateHeaderSize(el: HTMLElement): void {
        const padding = 16 as const;
        const headerHeight = el.getBoundingClientRect().top;
        this.headerHeight = `${Math.floor(headerHeight + padding)}px`;
    }
}
