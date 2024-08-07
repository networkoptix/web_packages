import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { useNewCloud } from '@utils/general';

import { NxGroupsSidebarLevelComponent } from '../sidebar-level/sidebar-level.component';

@Component({
    selector: 'nx-groups-sidebar',
    templateUrl: 'sidebar.component.html',
    styleUrls: ['sidebar.component.scss'],
    standalone: true,
    imports: [CommonModule, NxGroupsSidebarLevelComponent],
})
export class NxSystemGroupsSidebarComponent {
    useNewCloud = useNewCloud();
    groups$$ = inject(GroupsStore).sortedGroups$$;
}
