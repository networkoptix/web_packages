import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject }       from 'rxjs';
import { NxDialogsService }      from '../../../dialogs/dialogs.service';
import { NxMenuService }         from '../../../menu';
import { NxCloudApiService }     from '../../../services/nx-cloud-api';
import { NxAccountService }      from '../../../services/account.service';
import { NxUriService }          from '../../../services/uri.service';

@Injectable({
    providedIn: 'root'
})
export class NxSettingsService implements OnDestroy {
    footerSubject = new BehaviorSubject(false);
    systemSubject = new BehaviorSubject(undefined);
    selectedSectionSubject = new BehaviorSubject([]);

    constructor(
        private api: NxCloudApiService,
        private accountService: NxAccountService,
        private uriService: NxUriService,
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

    ngOnDestroy() {
        this.systemSubject.unsubscribe();
    }
}
