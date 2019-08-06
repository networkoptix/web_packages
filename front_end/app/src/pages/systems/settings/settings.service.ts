import { Injectable, OnDestroy }       from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NxCloudApiService }           from '../../../services/nx-cloud-api';
import { NxConfigService }             from '../../../services/nx-config';
import { NxDialogsService }            from '../../../dialogs/dialogs.service';

@Injectable({
    providedIn: 'root'
})
export class NxSettingsService implements OnDestroy {
    config: any = {};
    systemSubject = new BehaviorSubject(undefined);
    selectedSectionSubject = new BehaviorSubject([]);
    plugin: any = {};
    inReview: boolean;

    constructor(private api: NxCloudApiService,
                private configService: NxConfigService,
                private dialogs: NxDialogsService) {

        this.config = this.configService.getConfig();
    }

    setSystem(system) {
        this.systemSubject.next(system);
    }

    setSection(section) {
        this.selectedSectionSubject.next(section);
    }

    loadUsers() {
        return this.systemSubject.getValue().getUsers(true);
    }

    loadUsersFor(system) {
        return system.getUsers(true);
    }

    addUser(systemId?) {
        // Call share dialog, run process inside
        return this.dialogs
                   .addUser(systemId || this.systemSubject.getValue())
                   .then((result) => {
                       if (result) {
                           this.loadUsers();
                       }
                   }, (reason) => {
                       // dialog was dismissed ... this handler is required if dialog is dismissible
                       // if we don't handle it will raise a JS error
                       // ERROR Error: Uncaught (in promise): [object Number]
                   });
    }

    ngOnDestroy() {
        this.systemSubject.unsubscribe();
    }
}
