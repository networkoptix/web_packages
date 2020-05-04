import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject }       from 'rxjs';
import {
    NxCloudApiService,
    NxAccountService, NxUriService
}                                from '../../../services';
import { NxDialogsService }      from '../../../dialogs';
import { NxMenuService }         from '../../../components/menu';

@Injectable({
    providedIn: 'root'
})
export class NxSettingsService implements OnDestroy {
    footerSubject = new BehaviorSubject(false);
    systemSubject = new BehaviorSubject(undefined);
    selectedSectionSubject = new BehaviorSubject([]);

    constructor(private api: NxCloudApiService,
                private accountService: NxAccountService,
                private uriService: NxUriService,
                private menuService: NxMenuService,
                private dialogs: NxDialogsService
    ) {}

    get system() {
        return this.systemSubject.getValue();
    }

    set system(system) {
        this.systemSubject.next(system);
    }

    setSection(section) {
        this.selectedSectionSubject.next(section);
    }

    loadUsers() {
        return this.system.getUsers(true);
    }

    addUser() {
        return this.dialogs.addUser(this.system)
            .then((userId) => {
                if (userId) {
                    userId = this.system.mediaserver.cleanId(userId);
                    this.menuService.setDetailsSection(userId);

                    this.uriService
                        .updateURI(`systems/${this.system.id}/users/${userId}`)
                        .catch(error => console.error(error));
                }
            })
            .catch(err => console.error(err));
    }

    ngOnDestroy() {
        this.systemSubject.unsubscribe();
    }
}
