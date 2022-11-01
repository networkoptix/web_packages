/** This should be refactored to not be its own service */
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import type { NxSystem } from '@services/system.service/system';

@Injectable({
    providedIn: 'root'
})
export class NxSettingsService implements OnDestroy {
    systemSubject = new BehaviorSubject<NxSystem>(undefined);

    get system(): NxSystem {
        return this.systemSubject.getValue();
    }

    set system(system: NxSystem) {
        if (this.system && system?.id !== this.system?.id) {
            this.system?.stopPoll();
        }
        this.systemSubject.next(system);
    }

    ngOnDestroy(): void {
        this.systemSubject.complete();
    }
}
