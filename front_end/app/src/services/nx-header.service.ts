import { Injectable }             from '@angular/core';
import { NxConfigService }        from './nx-config';
import { BehaviorSubject, timer } from 'rxjs';

@Injectable({
    providedIn : 'root'
})
export class NxHeaderService {
    CONFIG: any;

    // Only to communicate with AJS
    systemIdSubject = new BehaviorSubject(undefined);

    constructor(configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
    }
}
