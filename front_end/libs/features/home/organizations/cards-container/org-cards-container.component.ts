import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Observable, distinctUntilChanged, map } from 'rxjs';
import stringify from 'safe-stable-stringify';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
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
import { icons } from '@variables/static-variables';

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
    ],
})
export class NxOrganizationCardContainerComponent {
    LANG = staticLang;
    icons = icons;
    @Input({ transform: booleanAttribute }) inRoot: boolean;
    canCreateGroups$$ = computed(() => {
        const currOrg = this.store.selectSignal(selectCurrentOrganization);
        return currOrg()?.ownPermissions.includes(OrgPermissions.MANAGE_SYSTEMS);
    });
    hasGroups$$ = this.store.selectSignal<boolean>(selectHasGroups);
    currentGroupId$$ = this.store.selectSignal<string>(selectCurrentGroupId);
    currentGroup$$ = this.store.selectSignal<GroupItem>(selectCurrentGroup);
    currentGroups$ = this.store.select<GroupItem[]>(selectCurrentGroups);
    currentOrgId$$ = this.store.selectSignal<string>(selectCurrentOrgId);
    currentSystems$: Observable<SystemItem[]>;
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
}
