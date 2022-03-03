import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface IGroups {
    systemsToGroupsHash: Record<string, string>,
    groupNames: Record<string, string>,
    groupParents: Record<string, string>,
}

const EMPTY_GROUPS_OBJECT: IGroups = {
    systemsToGroupsHash: {},
    groupNames: {},
    groupParents: {},
};

@Injectable({
    providedIn: 'root'
})
export class NxSystemGroupsService {
    constructor(
        public http: HttpClient,
    ) {
        this._handleGroupsReceived = this._handleGroupsReceived.bind(this);
    }

    protected _groups: IGroups = null;

    protected _subject = new BehaviorSubject<IGroups>({ ...EMPTY_GROUPS_OBJECT });

    public get subject() {
        return this._subject;
    }

    protected _emit() {
        this._subject.next({ ...this._groups });
    }

    public isValidSystemGroupsObject(obj: IGroups) {
        // return is<IGroups>(obj), see https://github.com/woutervh-/typescript-is
        return obj &&
            typeof (obj?.systemsToGroupsHash) === 'object' &&
            typeof (obj?.groupNames) === 'object' &&
            typeof (obj?.groupParents) === 'object';
    }

    protected _handleGroupsReceived(groups: IGroups) {
        this._groups = this.isValidSystemGroupsObject(groups)
            ? { ...groups }
            : { ...EMPTY_GROUPS_OBJECT };
        this._emit();
        return this._groups;
    }

    public refetch() {
        return this.http.get('/api/custom-properties/systemGroup')
            .toPromise().then(this._handleGroupsReceived);
    }

    public get() {
        if (this._groups) {
            return Promise.resolve({ ...this._groups });
        }
        return this.refetch();
    }

    protected _post(groups) {
        return this.http.post('/api/custom-properties/systemGroup', groups)
            .toPromise().then(this._handleGroupsReceived);
    }

    public reset() {
        return this._post(EMPTY_GROUPS_OBJECT);
    }

    public save() {
        return this._post(this._groups);
    }

    public exportBase64() {
        return this.get().then(groups => btoa(JSON.stringify(groups)));
    }

    public importBase64(base64string) {
        this._groups = JSON.parse(atob(base64string));
        return this._post(this._groups);
    }

    public addGroup(groupName, id?) {
        id = id || this._generateUUID();
        this._groups.groupNames[id] = groupName;
        return this.save();
    }

    public renameGroup(groupId, newName) {
        this._groups.groupNames[groupId] = newName;
        return this.save();
    }

    public setGroupParent(groupId, parentId) {
        if (!(groupId in this._groups.groupNames)) {
            return Promise.reject('wrong group id ' + groupId);
        }
        if (!parentId) {
            delete this._groups.groupParents[groupId];
            return this.save();
        } else if (!(parentId in this._groups.groupNames)) {
            return Promise.reject('wrong parent group id ' + parentId);
        }
        this._groups.groupParents[groupId] = parentId;
        return this.save();
    }

    public setGroupForTheSystem(systemId, groupId) {
        if (!(groupId in this._groups.groupNames)) {
            return Promise.reject('wrong group id ' + groupId);
        }
        this._groups.systemsToGroupsHash[systemId] = groupId;
        return this.save();
    }

    // TODO: maybe find a more robust solution
    protected _generateUUID() {
        return window.URL.createObjectURL(new Blob([])).substr(-36);
    }
}
