import { Injectable }               from '@angular/core';
import { NxConfigService, IConfig } from './nx-config';
import { BehaviorSubject }          from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxHeaderService {
    CONFIG: IConfig;

    // Only to communicate with AJS
    systemIdSubject = new BehaviorSubject(undefined);

    constructor(
        configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
    }
}
