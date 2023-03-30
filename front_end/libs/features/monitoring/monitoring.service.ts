import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { NxSystem } from '@services/system.service/system';

@Injectable({
    providedIn: 'root',
})
export class NxMonitoringService {
    systemSubject = new BehaviorSubject<NxSystem>(undefined);
    selectedServerIdSubject = new BehaviorSubject<string>('');

    get system(): NxSystem {
        return this.systemSubject.getValue();
    }

    set system(system: NxSystem) {
        this.system && system?.id !== this.system?.id && this.system?.stopPoll();
        this.systemSubject.next(system);
    }

    get selectedServerId(): string {
        return this.selectedServerIdSubject.getValue();
    }

    set selectedServerId(value: string) {
        this.selectedServerIdSubject.next(value);
    }
}
