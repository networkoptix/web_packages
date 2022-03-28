import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { cloneDeep } from 'lodash-es';
import { Observable } from 'rxjs';
import { v4 as uuid } from 'uuid';

import * as GroupActions from '../store/groups/groups.actions';
import { initialState } from '../store/groups/groups.reducer';
import { selectGroupState } from '../store/groups/groups.selectors';
import { GroupsState } from '../store/groups/groups.state';

type ExportFormat = 'base64';
const API_URL = '/api/custom-properties/systemGroup';

@Injectable({
    providedIn: 'root'
})
export class NxSystemGroupsService {
    private _groups$: Observable<GroupsState> = this.store.select(selectGroupState);
    private _groups: GroupsState;

    constructor(
        public http: HttpClient,
        private store: Store,
    ) {
        this._groups$.subscribe(groups => {
            this._groups = cloneDeep(groups);
        });
    }

    private _isValidSystemGroupsObject(obj) {
        // return is<GroupState>(obj), see https://github.com/woutervh-/typescript-is
        return obj &&
            typeof (obj?.systemGroups) === 'object' &&
            typeof (obj?.groupNames) === 'object' &&
            typeof (obj?.groupParents) === 'object';
    }

    private _sanitize(groups: GroupsState): GroupsState {
        if (!this._isValidSystemGroupsObject(groups)) {
            return initialState;
        }
        return groups;
    }

    private _handleHttp(query: Observable<GroupsState>): Promise<void> {
        return query.toPromise().then(groups => {
            this.store.dispatch(GroupActions.load(
                { newState: this._sanitize(groups) }
            ));
        });
    }

    public fetch(): Promise<void> {
        return this._handleHttp(this.http.get<GroupsState>(API_URL));
    }

    public _save(groups = this._groups): Promise<void> {
        return this._handleHttp(this.http.post<GroupsState>(API_URL, groups));
    }

    public export(format: ExportFormat = 'base64'): string {
        return btoa(JSON.stringify(this._groups));
    }

    public import(data: string, format: ExportFormat = 'base64'): void {
        this._save(JSON.parse(atob(data)));
    }

    public addGroup(groupName: string, parentId?: string, id?: string): Promise<void> {
        id = id || uuid();
        this._groups.groupNames[id] = groupName;
        if (parentId && this._groups.groupNames[parentId]) {
            this._groups.groupParents[id] = parentId;
        }
        return this._save();
    }

    public renameGroup(groupId: string, newName: string): Promise<void> {
        this._groups.groupNames[groupId] = newName;
        return this._save();
    }

    public setGroupParent(groupId: string, parentId: string): Promise<void> {
        if (!(groupId in this._groups.groupNames)) {
            return Promise.reject('wrong group id ' + groupId);
        }
        if (!parentId) {
            delete this._groups.groupParents[groupId];
            return this._save();
        } else if (!(parentId in this._groups.groupNames)) {
            return Promise.reject('wrong parent group id ' + parentId);
        }
        if (this._noLoopWouldOccur(groupId, parentId)) {
            this._groups.groupParents[groupId] = parentId;
        } else {
            return Promise.reject(`loop prevented: ${groupId} -> ${parentId}`);
        }
        return this._save();
    }

    protected _noLoopWouldOccur(groupId: string, parentId: string): boolean {
        // check if parent is group's child now
        while (parentId) {
            if (parentId === groupId) {
                return false;
            }
            parentId = this._groups.groupParents[parentId];
        }
        return true;
    }

    public getGroupNewPotentialParentIds(groupId: string): Array<string> {
        return Object.keys(this._groups.groupNames).filter(
            parentId => this._noLoopWouldOccur(groupId, parentId)
        );
    }

    public setSystemGroup(systemId: string, groupId: string): Promise<void> {
        if (!(groupId in this._groups.groupNames)) {
            return Promise.reject('wrong group id ' + groupId);
        }
        this._groups.systemGroups[systemId] = groupId;
        return this._save();
    }
}
