import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { ParentIdChangeRequestedEvent } from '../../components/events';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import { selectRootGroups, selectRootSystems } from '../../store/groups/groups.selectors';
import { GroupListItem, SystemListItem } from '../../store/groups/groups.types';

@Component({
    selector: 'nx-system-groups-index-page',
    templateUrl: 'system-groups-index-page.component.html',
    styleUrls: ['system-groups-index-page.component.scss']
})
export class NxSystemGroupsIndexPageComponent {
    constructor(
        private store: Store,
        private groupsService: NxSystemGroupsService,
    ) {
    }

    public rootGroups$: Observable<Array<GroupListItem>>;
    public rootSystems$: Observable<Array<SystemListItem>>;

    ngOnInit(): void {
        this.rootGroups$ = this.store.select(selectRootGroups) as Observable<Array<GroupListItem>>;
        this.rootSystems$ = this.store.select(selectRootSystems) as Observable<Array<SystemListItem>>;
    }

    changeGroupParent({ type, id, newParentId }: ParentIdChangeRequestedEvent): void {
        this.groupsService.move(id, newParentId, type);
    }
}
