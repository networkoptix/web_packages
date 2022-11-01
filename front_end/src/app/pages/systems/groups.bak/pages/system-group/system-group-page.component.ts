import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';

import { ParentIdChangeRequestedEvent } from '../../components/events';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import { selectGroup } from '../../store/groups/groups.selectors';
import { GroupListItem } from '../../store/groups/groups.types';

@Component({
    selector: 'nx-system-group-page',
    templateUrl: 'system-group-page.component.html',
    styleUrls: ['system-group-page.component.scss']
})
export class NxSystemGroupPageComponent implements OnInit, OnDestroy {
    private _titleSubscription: Subscription;
    private _routeSubscription: Subscription;

    public group$: Observable<GroupListItem>;

    constructor(
        protected route: ActivatedRoute,
        private groupsService: NxSystemGroupsService,
        private store: Store,
    ) {
    }

    ngOnInit(): void {
        this._routeSubscription = this.route.params
            .subscribe(params => this._onRouteChange(params));
    }

    protected _onRouteChange(params: Params): void {
        this.group$ = this.store.select(selectGroup, params.groupId);
    }

    ngOnDestroy(): void {
        if (this._routeSubscription) {
            this._routeSubscription.unsubscribe();
        }
        if (this._titleSubscription) {
            this._titleSubscription.unsubscribe();
        }
    }

    changeGroupParent({ type, id, newParentId }: ParentIdChangeRequestedEvent): void {
        this.groupsService.move(id, newParentId, type);
    }
}
