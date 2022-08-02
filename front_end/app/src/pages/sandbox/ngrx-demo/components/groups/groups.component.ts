import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import * as GroupActions from '../../store/groups/groups.actions';
import { selectGroupState, selectGroupList, selectGroupForest } from '../../store/groups/groups.selectors';
import { GroupsState } from '../../store/groups/groups.state';

@Component({
    selector: 'ngrx-demo-counter',
    templateUrl: 'groups.component.html',
    styleUrls: ['groups.component.scss']
})
export class NgrxDemoGroupsComponent {
    state$: Observable<GroupsState> = this.store.select(selectGroupState);
    groupList$ = this.store.select(selectGroupList);
    groupForest$ = this.store.select(selectGroupForest);

    constructor(private store: Store) { }

    reset(): void {
        this.store.dispatch(GroupActions.reset());
    }

    changeGroupName({ groupId, newName }: { groupId: string; newName: string }): void {
        this.store.dispatch(GroupActions.setGroupName({ groupId, name: newName }));
    }

    changeGroupParent({ groupId, newParentId }: { groupId: string; newParentId: string }): void {
        this.store.dispatch(GroupActions.setGroupParent({ groupId, parentId: newParentId }));
    }
}
