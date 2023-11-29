import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Observable, map } from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxCardComponent } from '@pages/home/components/card/card.component';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { selectCurrentOrgId } from '@pages/home/store/channel-partners/channel-partners.selectors';
import {
    CloudSystem,
    GroupItem,
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
    selectHasGroups,
} from '../../store/groups/groups.selectors';

interface SystemInfo {
    name: string;
    systemId: string;
}
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
    ],
})
export class NxOrganizationCardContainerComponent {
    LANG = staticLang;
    icons = icons;
    @Input({ transform: booleanAttribute }) inRoot: boolean;
    hasGroups$$ = this.store.selectSignal<boolean>(selectHasGroups);
    currentGroupId$$ = this.store.selectSignal<string>(selectCurrentGroupId);
    currentGroup$$ = this.store.selectSignal<GroupItem>(selectCurrentGroup);
    currentGroups$$ = this.store.selectSignal<GroupItem[]>(selectCurrentGroups);
    currentOrgId$$ = this.store.selectSignal<string>(selectCurrentOrgId);
    currentSystems$: Observable<SystemInfo[]>;

    isAdmin = true;
    isLoading = true;
    constructor(
        private store: Store,
        private dialogsService: NxDialogsService,
        private route: ActivatedRoute,
        private router: Router,
        private cpService: NxChannelPartnersService,
        private systemsService: NxSystemsService,
    ) {
        this.route.params.subscribe(({ groupId }) => {
            this.store.dispatch(GroupActions.setCurrentGroupId({ currentGroupId: groupId }));
        });

        effect(() => {
            this.currentSystems$ = this.inRoot
                ? this.cpService.getOrgSystems(this.currentOrgId$$())
                : this.cpService.getGroup(this.currentGroupId$$()).pipe(
                      map(group => {
                          const systems = this.systemsService.systems;
                          return group.systems.map(sys => {
                              return {
                                  systemId: sys,
                                  name: systems.find(system => system.id === sys)?.name,
                              };
                          });
                      }),
                  );
            if (this.currentGroups$$()) {
                this.isLoading = false;
            }
        });
    }

    trackGroup(_index: number, item: GroupItem): string {
        return item.id;
    }

    trackSystem(_index: number, item: CloudSystem | SystemInfo): string {
        return item.systemId;
    }

    onDrop(event: CdkDragDrop<GroupItem, GroupItem, GroupItem>): void {
        // const dragged = event.item.data;
        // const droppedOn = event.container.data;
        // if (!event.isPointerOverContainer || dragged.id === droppedOn.id) {
        // }
        // Placeholder for new logic
    }

    newGroupDialog(): void {
        this.dialogsService.createSystemGroup({
            parentGroup: this.currentGroupId$$(),
            orgId: this.currentOrgId$$(),
            hasGroups: this.hasGroups$$(),
        });
    }

    handleGroupClick(group: GroupItem): void {
        this.router.navigate(['group', group.id], { relativeTo: this.route.parent });
    }

    handleSystemClick(system: CloudSystem | SystemInfo): void {
        this.router.navigate(['systems', system.systemId]);
    }
}
