import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, interval } from 'rxjs';
import { map } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';

import { ParentIdChangeRequestedEvent } from '../../components/events';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import { selectForest } from '../../store/groups/groups.selectors';
import { ListItem } from '../../store/groups/groups.types';

@Component({
    selector: 'nx-system-groups-page-component',
    templateUrl: 'system-groups-page.component.html',
    styleUrls: ['./system-groups-page.component.scss']
})
export class NxSystemGroupsPageComponent implements OnInit, OnDestroy {
    public forest$: Observable<Array<ListItem>> = this.store.select(selectForest);
    public activeItemId$: Observable<string>;

    constructor(
        private groupsService: NxSystemGroupsService,
        private store: Store,
        private dialogsService: NxDialogsService,
    ) {
    }

    ngOnInit(): void {
        this.groupsService.connect();
        // TODO: find a better approach (listen route params for the child route somehow?)
        this.activeItemId$ = interval(500).pipe(map(_ => location.pathname.split('/').pop()));
    }

    ngOnDestroy(): void {
    }

    refresh(): void {
        this.groupsService.act('list_groups');
    }

    initNewGroupDialog(): void {
        this.dialogsService.createSystemGroup();
    }

    changeGroupParent({ type, id, newParentId }: ParentIdChangeRequestedEvent): void {
        this.groupsService.move(id, newParentId, type);
    }
}
