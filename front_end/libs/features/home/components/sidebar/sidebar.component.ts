import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { selectCurrentOrganization } from '@common/store/channel-partners/channel-partners.selectors';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { selectRootGroups } from '@pages/home/store/groups/groups.selectors';
import {
    GroupItem,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@variables/static-variables';

import { OpenGroups } from '../../home.types';
import { NxGroupsSidebarLevelComponent } from '../sidebar-level/sidebar-level.component';

@Component({
    selector: 'nx-groups-sidebar',
    templateUrl: 'sidebar.component.html',
    styleUrls: ['sidebar.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxGroupsSidebarLevelComponent,
        AsyncPipe,
        AngularSvgIconModule,
        TranslateModule,
        NxAddSvgSrcDirective,
    ],
})
export class NxSystemGroupsSidebarComponent {
    @Input() currentGroupId: string;
    @Input() openGroups: OpenGroups;
    @Input() hasGroups: boolean;
    @Input() userEmail: string;
    @Output() dismiss = new EventEmitter<void>();
    rootGroupItems$ = this.store.select<GroupItem[]>(selectRootGroups);
    currentOrg$$ = this.store.selectSignal<Organization>(selectCurrentOrganization);
    icons = icons;
    LANG = staticLang;
    constructor(
        private dialogsService: NxDialogsService,
        private store: Store,
    ) {}

    newGroupDialog(): void {
        this.dialogsService.createSystemGroup({
            parentGroup: this.currentGroupId,
            orgId: this.currentOrg$$().id,
            hasGroups: this.hasGroups,
        });
    }
}
