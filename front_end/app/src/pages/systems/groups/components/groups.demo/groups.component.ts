import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import * as GroupActions from '../../store/groups/groups.actions';
import { selectGroupList, selectGroupForest } from '../../store/groups/groups.selectors';
import { GroupsState } from '../../store/groups/groups.state';

@Component({
    selector: 'ngrx-demo-counter',
    templateUrl: 'groups.component.html',
})
export class NgrxDemoGroupsComponent {
    state$: Observable<GroupsState>
    groupList$ = this.store.select(selectGroupList)
    groupForest$ = this.store.select(selectGroupForest)

    constructor(private store: Store<{ groups: GroupsState }>) {
        this.state$ = store.select('groups');
    }

    reset() {
        this.store.dispatch(GroupActions.reset());
    }

    changeGroupName({ groupId, newName }) {
        this.store.dispatch(GroupActions.setGroupName({ groupId, name: newName }));
    }

    changeGroupParent({ groupId, newParentId }) {
        this.store.dispatch(GroupActions.setGroupParent({ groupId, parentId: newParentId }));
    }
}
