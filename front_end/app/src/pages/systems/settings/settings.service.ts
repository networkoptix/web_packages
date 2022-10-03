import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { NxSystem } from '@services/system.service';

@Injectable({
    providedIn: 'root'
})
export class NxSettingsService {
    footerSubject = new BehaviorSubject<boolean>(false);
    systemSubject = new BehaviorSubject<NxSystem>(undefined);

    constructor() {}

    get system(): NxSystem {
        return this.systemSubject.getValue();
    }

    set system(system: NxSystem) {
        this.system && system?.id !== this.system?.id && this.system?.stopPoll();
        this.systemSubject.next(system);
    }

    get footer(): boolean {
        return this.footerSubject.getValue();
    }

    set footer(value: boolean) {
        this.footerSubject.next(value);
    }
}
