import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { firstValueFrom, map, switchMap } from 'rxjs';

import {
    selectCurrentOrganization,
    selectCurrentPartner,
} from '@common/store/channel-partners/channel-partners.selectors';
import { ActionItems } from '@components/dropdowns/three-dot/three-dot.component.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxCardComponent } from '@pages/home/components/card/card.component';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    CloudSystem,
    GroupItem,
    GroupUser,
    OrgPermissions,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxUrlProtocolService } from '@services/url-protocol.service';
import { caseInsenstiveSearch } from '@utils/general';
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
    ],
})
export class NxOrganizationCardContainerComponent {
    groupsStore = inject(GroupsStore);

    LANG = staticLang;
    icons = icons;
    searchConfig = searchConfig;
    @Input({ transform: booleanAttribute }) inRoot: boolean;

    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);
    openServices$$ = computed(() => {
        const currentOrg = this.currentOrg$$();
        return (
            currentOrg?.channelPartner === this.currentPartner$$()?.id &&
            currentOrg?.channelPartnerAccessLevel === null
        );
    });
    orgPermissions$$ = computed(() => this.currentOrg$$()?.ownPermissions || []);
    canManageSystems$$ = computed<boolean>(() =>
        this.orgPermissions$$().includes(OrgPermissions.MANAGE_SYSTEMS),
    );

    hasEnoughGroupsOrSystems$$ = computed(() => {
        return (
            this.groupsStore.currentGroups$$().length + this.groupsStore.currentSystems$$().length >
            searchConfig.channelPartners.searchMinimumCards
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

    onDrop(event: CdkDragDrop<GroupItem, GroupItem, GroupItem>): void {
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
    filteredGroups$$ = computed(() => {
        const search = this.search$$();
        const groups = this.groupsStore.currentGroups$$();
        if (!search) {
            return groups;
        }
        return groups.filter(group => caseInsenstiveSearch(group.name, search));
    });
    filteredSystems$$ = computed(() => {
        const search = this.search$$();
        const systems = this.groupsStore.currentSystems$$();
        if (!search) {
            return systems;
        }
        return systems.filter(system => caseInsenstiveSearch(system.name, search));
    });
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
                            .moveOrgItem({
                                item: group,
                                organization: this.currentOrg$$(),
                                groups: this.groupsStore.groupsEntities(),
                            })
                            .then(newGroup => {
                                if (newGroup && 'parentId' in newGroup) {
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
                            .confirm({
                                title: deleteAction,
                                warning,
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
            const actions: ActionItems[] = [
                {
                    name: openVms,
                    id: system.systemId,
                    action: this.protocolFactory(system.systemId, true),
                },
            ];
            if (canMangeSystems) {
                actions.unshift({
                    name: moveToAction,
                    id: system.systemId,
                    action: () => {
                        this.dialogsService
                            .moveOrgItem({
                                item: system,
                                organization: this.currentOrg$$(),
                                groups: this.groupsStore.groupsEntities(),
                            })
                            .then(newSystem => {
                                this.groupsStore.moveItemWithUndo(system, {
                                    id:
                                        'parentId' in newSystem
                                            ? newSystem.parentId
                                            : newSystem.groupId,
                                });
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
}
